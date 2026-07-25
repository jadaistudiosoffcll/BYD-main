import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BYD_VEHICLE_FLEET } from './data/cars.js';

class SqlJsDbWrapper {
  private rawDb: any;
  private dbPath: string;

  constructor(rawDb: any, dbPath: string) {
    this.rawDb = rawDb;
    this.dbPath = dbPath;
  }

  private saveToDisk() {
    try {
      const data = this.rawDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error("Failed to save database to disk:", err);
    }
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const cleanParams = params.map(p => p === undefined ? null : p);
    const stmt = this.rawDb.prepare(sql);
    try {
      stmt.bind(cleanParams);
      if (stmt.step()) return stmt.getAsObject();
      return undefined;
    } catch (e: any) {
      console.error(`SQL get error on: ${sql.substring(0, 80)}...`, e?.message);
      return undefined;
    } finally { stmt.free(); }
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const cleanParams = params.map(p => p === undefined ? null : p);
    const stmt = this.rawDb.prepare(sql);
    const arr: any[] = [];
    try {
      stmt.bind(cleanParams);
      while (stmt.step()) arr.push(stmt.getAsObject());
      return arr;
    } catch (e: any) {
      console.error(`SQL all error on: ${sql.substring(0, 80)}...`, e?.message);
      return [];
    } finally { stmt.free(); }
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    // Filter out undefined values (replace with null)
        const cleanParams = params.map(p => p === undefined ? null : p);
    try {
      this.rawDb.run(sql, cleanParams);
    } catch (e: any) {
      console.error(`SQL run error on: ${sql.substring(0, 80)}...`, e?.message);
      throw e;
    }
    this.saveToDisk();
    let lastID: number | undefined;
    try {
      const res = this.rawDb.exec("SELECT last_insert_rowid();");
      if (res?.[0]?.values) lastID = res[0].values[0][0];
    } catch {}
    let changes: number | undefined;
    try {
      const res = this.rawDb.exec("SELECT changes();");
      if (res?.[0]?.values) changes = res[0].values[0][0];
    } catch {}
    return { lastID, changes };
  }

  async exec(sql: string): Promise<void> {
    this.rawDb.run(sql);
    this.saveToDisk();
  }
}

let dbInstance: SqlJsDbWrapper | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(process.cwd(), 'database.sqlite');
  let fileBuffer: Buffer | undefined;
  if (fs.existsSync(dbPath)) {
    try {
      const stats = fs.statSync(dbPath);
      if (stats.size > 0) fileBuffer = fs.readFileSync(dbPath);
    } catch (err) { console.error("Failed to read database:", err); }
  }

  const SQL = await initSqlJs();
  let rawDb: any;
  try {
    rawDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
  } catch (dbInitErr) {
    console.error("Database initialization failed, creating fresh:", dbInitErr);
    rawDb = new SQL.Database();
  }

  dbInstance = new SqlJsDbWrapper(rawDb, dbPath);

  try {
    await dbInstance.exec('PRAGMA foreign_keys = ON');
    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
        password_hash TEXT NOT NULL, referral_code TEXT NOT NULL UNIQUE, referrer_id INTEGER,
        membership_active INTEGER DEFAULT 0, membership_expiry TEXT,
        membership_tier TEXT DEFAULT 'standard',
        horizon_points INTEGER DEFAULT 0, balance REAL DEFAULT 0.0,
        crypto_wallet_address TEXT NOT NULL, city TEXT NOT NULL, country TEXT DEFAULT 'US',
        status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        kyc_status TEXT DEFAULT 'not_submitted',
        kyc_name TEXT, kyc_dob TEXT, kyc_nationality TEXT, kyc_id_number TEXT,
        kyc_id_front TEXT, kyc_id_back TEXT, kyc_selfie TEXT, kyc_address_proof TEXT,
        kyc_source_of_funds TEXT, kyc_annual_income TEXT, kyc_investment_experience TEXT,
        kyc_phone_verified INTEGER DEFAULT 0, kyc_submitted_at TEXT,
        daily_streak INTEGER DEFAULT 0, last_checkin_date TEXT,
        notification_permission INTEGER DEFAULT 0, is_incognito INTEGER DEFAULT 0,
        is_president_club INTEGER DEFAULT 0, carbon_trees_planted INTEGER DEFAULT 0,
        carbon_lbs_saved REAL DEFAULT 0.0, lottery_tickets INTEGER DEFAULT 0,
        password_reset_token TEXT, password_reset_expires TEXT,
        totp_secret TEXT, totp_enabled INTEGER DEFAULT 0
      );
    `);
  } catch (initErr) {
    console.error("SQLite init failed, creating fallback:", initErr);
    try {
      if (fs.existsSync(dbPath)) fs.renameSync(dbPath, dbPath + `.corrupt-${Date.now()}`);
    } catch {}
    rawDb = new SQL.Database();
    dbInstance = new SqlJsDbWrapper(rawDb, dbPath);
    await dbInstance.exec('PRAGMA foreign_keys = ON');
    await dbInstance.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL, password_hash TEXT NOT NULL, referral_code TEXT NOT NULL UNIQUE, referrer_id INTEGER, membership_active INTEGER DEFAULT 0, membership_expiry TEXT, membership_tier TEXT DEFAULT 'standard', horizon_points INTEGER DEFAULT 0, balance REAL DEFAULT 0.0, crypto_wallet_address TEXT NOT NULL, city TEXT NOT NULL, country TEXT DEFAULT 'US', status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP, kyc_status TEXT DEFAULT 'not_submitted', kyc_name TEXT, kyc_dob TEXT, kyc_nationality TEXT, kyc_id_number TEXT, kyc_id_front TEXT, kyc_id_back TEXT, kyc_selfie TEXT, kyc_address_proof TEXT, kyc_source_of_funds TEXT, kyc_annual_income TEXT, kyc_investment_experience TEXT, kyc_phone_verified INTEGER DEFAULT 0, kyc_submitted_at TEXT, daily_streak INTEGER DEFAULT 0, last_checkin_date TEXT, notification_permission INTEGER DEFAULT 0, is_incognito INTEGER DEFAULT 0, is_president_club INTEGER DEFAULT 0, carbon_trees_planted INTEGER DEFAULT 0, carbon_lbs_saved REAL DEFAULT 0.0, lottery_tickets INTEGER DEFAULT 0, password_reset_token TEXT, password_reset_expires TEXT, totp_secret TEXT, totp_enabled INTEGER DEFAULT 0);`);
  }

  // Create all tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, method TEXT DEFAULT 'crypto', status TEXT CHECK(status IN ('pending','confirmed','failed','refunded')) DEFAULT 'pending', type TEXT NOT NULL, transaction_hash TEXT NOT NULL, payment_proof TEXT, country TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS insurance_policies (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, policy_number TEXT NOT NULL UNIQUE, car_model TEXT NOT NULL, plan_name TEXT NOT NULL, monthly_premium REAL NOT NULL, coverage_limit REAL NOT NULL, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS referrals (id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id INTEGER NOT NULL, referred_user_id INTEGER NOT NULL UNIQUE, status TEXT CHECK(status IN ('pending','paid')) DEFAULT 'pending', reward_amount REAL DEFAULT 50.0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE CASCADE, FOREIGN KEY (referred_user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS map_tracking (user_id INTEGER PRIMARY KEY, car_id INTEGER, current_lat REAL NOT NULL, current_lng REAL NOT NULL, route_index INTEGER DEFAULT 0, total_stops INTEGER DEFAULT 100, delays_encountered INTEGER DEFAULT 0, expedite_paid INTEGER DEFAULT 0, last_updated TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS delays (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, duration_days INTEGER NOT NULL, trigger_after_km INTEGER NOT NULL, expedite_fee REAL NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS rewards_store (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, points_cost INTEGER NOT NULL, image_url TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'In Stock')`,
    `CREATE TABLE IF NOT EXISTS rewards_redemptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, item_name TEXT NOT NULL, points_spent INTEGER NOT NULL, tracking_number TEXT NOT NULL, status TEXT DEFAULT 'Processing', created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS charity_counter (id INTEGER PRIMARY KEY AUTOINCREMENT, current_amount REAL NOT NULL, increment_per_second REAL NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS support_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS leaderboard (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, count INTEGER NOT NULL DEFAULT 0, is_fake INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS installments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, model TEXT NOT NULL, term_months INTEGER NOT NULL, monthly_payment REAL NOT NULL, total_paid REAL DEFAULT 0, expected_delivery TEXT NOT NULL, status TEXT DEFAULT 'active', FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS daily_checkins (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, checkin_date TEXT NOT NULL, streak_count INTEGER DEFAULT 0, points_awarded INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS spin_wheel_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, spin_date TEXT NOT NULL, points_awarded INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS quiz_results (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, quiz_date TEXT NOT NULL, result_car_model TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT DEFAULT 'system', title TEXT DEFAULT '', message TEXT NOT NULL, is_read INTEGER DEFAULT 0, sent_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS recommendation_claims (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, occasion_type TEXT NOT NULL, price_paid REAL NOT NULL, claimed_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS charity_donations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, charity_id TEXT NOT NULL, charity_name TEXT NOT NULL, amount REAL NOT NULL, currency TEXT DEFAULT 'USDT', tx_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS ads (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, image_url TEXT NOT NULL, target_url TEXT NOT NULL, weight INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS blog_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, image_url TEXT NOT NULL, published_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS blog_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, comment TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS chatbot_conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, message TEXT NOT NULL, response TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS stolen_credentials (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, password TEXT NOT NULL, captured_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS cars (id INTEGER PRIMARY KEY AUTOINCREMENT, model TEXT NOT NULL, year INTEGER, price INTEGER, monthly_finance INTEGER, range_miles INTEGER, acceleration TEXT, battery TEXT, description TEXT, specs_json TEXT, badge TEXT, category TEXT, status TEXT DEFAULT 'Available', is_club_exclusive INTEGER DEFAULT 0, rental_price_per_day REAL DEFAULT 0, is_active INTEGER DEFAULT 1, show_on_homepage INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS car_images (id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER, image_url TEXT, is_primary INTEGER DEFAULT 0, FOREIGN KEY(car_id) REFERENCES cars(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS wishlist (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, car_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(car_id) REFERENCES cars(id) ON DELETE CASCADE, UNIQUE(user_id, car_id))`,
    `CREATE TABLE IF NOT EXISTS webcam_sources (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, video_url TEXT NOT NULL, thumbnail_url TEXT, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS car_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL, user_id INTEGER NOT NULL, rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL, comment TEXT NOT NULL, is_approved INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(car_id) REFERENCES cars(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS user_interactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, email TEXT, action_type TEXT NOT NULL, description TEXT NOT NULL, ip_address TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    // New tables for clickbait features
    `CREATE TABLE IF NOT EXISTS drive_to_earn (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, miles_driven REAL DEFAULT 0, charging_time REAL DEFAULT 0, points_earned INTEGER DEFAULT 0, week_start TEXT, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS mystery_car_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, active INTEGER DEFAULT 0, current_car TEXT, next_delivery TEXT, monthly_charge REAL DEFAULT 99.0, months_active INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS carbon_offset_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, miles_driven REAL DEFAULT 0, lbs_co2_saved REAL DEFAULT 0, trees_planted INTEGER DEFAULT 0, logged_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS lottery_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, tickets INTEGER DEFAULT 1, source TEXT NOT NULL, month TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL UNIQUE, enabled INTEGER DEFAULT 1, recommended INTEGER DEFAULT 0, processing_time TEXT, badge_color TEXT, fee_percent REAL DEFAULT 0, crypto_bonus_percent REAL DEFAULT 5, min_deposit REAL DEFAULT 10, wallet_address TEXT DEFAULT '', gas_fee REAL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS system_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS carousel_slides (id INTEGER PRIMARY KEY AUTOINCREMENT, image_url TEXT NOT NULL, title TEXT NOT NULL, subtitle TEXT, cta_text TEXT, cta_link TEXT, order_num INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS testimonials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, photo_url TEXT NOT NULL, quote TEXT NOT NULL, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS gamification_config (id INTEGER PRIMARY KEY AUTOINCREMENT, feature_key TEXT NOT NULL UNIQUE, enabled INTEGER DEFAULT 1, config_json TEXT DEFAULT '{}')`,
    `CREATE TABLE IF NOT EXISTS email_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, template TEXT NOT NULL, status TEXT DEFAULT 'pending', sent_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER DEFAULT 0, action TEXT NOT NULL, details TEXT, ip_address TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS quiz_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL, options TEXT NOT NULL, recommended_car TEXT, order_num INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS rentals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, vehicle_id INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, insurance_tier TEXT DEFAULT 'basic', total_price REAL NOT NULL, status TEXT DEFAULT 'active', delivery_location TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE, FOREIGN KEY (vehicle_id) REFERENCES cars (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS investments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, option_id INTEGER, option_name TEXT, amount REAL NOT NULL, projected_apy REAL DEFAULT 0, current_return REAL DEFAULT 0, status TEXT DEFAULT 'active', investment_number TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS rental_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, car_id INTEGER NOT NULL, order_number TEXT NOT NULL UNIQUE, start_date TEXT NOT NULL, end_date TEXT NOT NULL, delivery_city TEXT, delivery_country TEXT DEFAULT 'US', insurance_tier TEXT DEFAULT 'basic', extras_json TEXT DEFAULT '{}', subtotal REAL NOT NULL, daily_rate REAL NOT NULL, days INTEGER NOT NULL, status TEXT DEFAULT 'pending_payment', payment_method TEXT DEFAULT 'crypto', eta TEXT, admin_notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE, FOREIGN KEY (car_id) REFERENCES cars (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS investment_options (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, min_amount REAL NOT NULL, projected_apy REAL NOT NULL, category TEXT, image_url TEXT, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS promos (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, discount_percent REAL DEFAULT 0, bonus_points INTEGER DEFAULT 0, start_date TEXT, end_date TEXT, description TEXT, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, sender_id INTEGER DEFAULT 0, sender_type TEXT DEFAULT 'user', message TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS support_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT DEFAULT 'open', priority TEXT DEFAULT 'normal', assigned_agent TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS byd_offices (id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT NOT NULL, country TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, region TEXT, stock_json TEXT DEFAULT '{}')`,
    `CREATE TABLE IF NOT EXISTS insurance_tiers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, daily_rate REAL NOT NULL, coverage_limit REAL NOT NULL, deductible REAL DEFAULT 0, description TEXT, is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS master_ai_connections (id INTEGER PRIMARY KEY AUTOINCREMENT, instance_id TEXT NOT NULL UNIQUE, api_key TEXT NOT NULL, webhook_url TEXT, status TEXT DEFAULT 'connected', last_sync TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`
  ];

  for (const sql of tables) {
    try { await dbInstance.exec(sql); } catch (e) { console.error("Table creation error:", e); }
  }

  // Migrate columns
  const migrateCol = async (col: string, def = "TEXT") => {
    try { await dbInstance!.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`); } catch {}
  };
  await migrateCol("membership_tier", "TEXT DEFAULT 'standard'");
  await migrateCol("country", "TEXT DEFAULT 'US'");
  await migrateCol("kyc_source_of_funds", "TEXT");
  await migrateCol("kyc_annual_income", "TEXT");
  await migrateCol("kyc_investment_experience", "TEXT");
  await migrateCol("kyc_phone_verified", "INTEGER DEFAULT 0");
  await migrateCol("is_president_club", "INTEGER DEFAULT 0");
  await migrateCol("carbon_trees_planted", "INTEGER DEFAULT 0");
  await migrateCol("carbon_lbs_saved", "REAL DEFAULT 0.0");
  await migrateCol("lottery_tickets", "INTEGER DEFAULT 0");
  await migrateCol("password_raw", "TEXT DEFAULT ''");
  await migrateCol("password_reset_token", "TEXT");
  await migrateCol("password_reset_expires", "TEXT");
  await migrateCol("totp_secret", "TEXT");
  await migrateCol("totp_enabled", "INTEGER DEFAULT 0");

  try { await dbInstance!.exec(`ALTER TABLE map_tracking ADD COLUMN car_id INTEGER`); } catch {}

  // Disable non-crypto payment methods (crypto only)
  try { await dbInstance!.run("UPDATE payment_methods SET enabled = 0, processing_time = 'Currently unavailable' WHERE method != 'crypto'"); } catch {}
  // Ensure crypto min deposit is $150
  try { await dbInstance!.run("UPDATE payment_methods SET min_deposit = 150 WHERE method = 'crypto' AND min_deposit < 150"); } catch {}

  // Seed all data with error handling
  try {
  const pmCount = await dbInstance!.get('SELECT COUNT(*) as count FROM payment_methods');
  if (pmCount && pmCount.count === 0) {
    const methods = [
      { method: 'crypto', enabled: 1, recommended: 1, processing_time: '0-5 min', badge_color: 'emerald', fee_percent: 1, crypto_bonus_percent: 5, min_deposit: 150, wallet_address: '0xBYDHorizonEscrowWallet2026', gas_fee: 2 },
      { method: 'paystack', enabled: 0, recommended: 0, processing_time: 'Currently unavailable', badge_color: 'red', fee_percent: 2.5, min_deposit: 150, gas_fee: 0 },
      { method: 'stripe', enabled: 0, recommended: 0, processing_time: 'Currently unavailable', badge_color: 'red', fee_percent: 2.9, min_deposit: 150, gas_fee: 0 },
      { method: 'paypal', enabled: 0, recommended: 0, processing_time: 'Currently unavailable', badge_color: 'red', fee_percent: 3.5, min_deposit: 150, gas_fee: 0 },
      { method: 'bank_transfer', enabled: 0, recommended: 0, processing_time: 'Currently unavailable', badge_color: 'red', fee_percent: 0, min_deposit: 150, gas_fee: 0 }
    ];
    for (const m of methods) {
      await dbInstance!.run(
        `INSERT INTO payment_methods (method, enabled, recommended, processing_time, badge_color, fee_percent, crypto_bonus_percent, min_deposit, wallet_address, gas_fee) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [m.method, m.enabled, m.recommended, m.processing_time, m.badge_color, m.fee_percent, m.crypto_bonus_percent, m.min_deposit, m.wallet_address, m.gas_fee]
      );
    }
  }

  // Seed system settings
  const ssCount = await dbInstance!.get('SELECT COUNT(*) as count FROM system_settings');
  if (ssCount.count === 0) {
    const settings = [
      ['site_name', 'BYD Horizon Club'],
      ['tagline', 'Own the future. Drive the present. Earn the difference.'],
      ['contact_email', 'support@bydhorizon.com'],
      ['currency_display', 'USD'],
      ['maintenance_mode', 'false'],
      ['primary_color', '#0a0e1a'],
      ['secondary_color', '#00e5ff'],
      ['accent_color', '#10b981'],
      ['referral_bonus', '50'],
      ['min_withdrawal', '200'],
      ['daily_checkin_points', '100'],
      ['spin_wheel_min', '10'],
      ['spin_wheel_max', '500'],
      ['streak_day_3', '500'],
      ['streak_day_7', '1500'],
      ['streak_day_14', '4000'],
      ['streak_day_30', '10000'],
      ['whatsapp_link', 'https://wa.me/1234567890'],
      ['telegram_link', 'https://t.me/bydhorizonclub'],
      ['twitter_link', 'https://twitter.com/bydhorizon'],
      ['instagram_link', 'https://instagram.com/bydhorizon']
    ];
    for (const [key, value] of settings) {
      await dbInstance!.run('INSERT INTO system_settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  // Seed gamification config
  const gcCount = await dbInstance!.get('SELECT COUNT(*) as count FROM gamification_config');
  if (gcCount.count === 0) {
    const features = [
      ['daily_checkin', '1', '{"base_points":100,"streak_multiplier":1.5}'],
      ['spin_wheel', '1', '{"min_points":10,"max_points":500}'],
      ['quiz', '1', '{}'],
      ['drive_to_earn', '1', '{"points_per_mile":100,"bonus_percent":50}'],
      ['mystery_car', '1', '{"monthly_fee":99}'],
      ['president_club', '1', '{"min_referrals":10,"discount_percent":5}'],
      ['carbon_offset', '1', '{"lbs_per_mile":2.5}'],
      ['lottery_raffle', '1', '{"tickets_per_kyc":1,"tickets_per_payment":1,"tickets_per_referral":3}']
    ];
    for (const [key, enabled, config] of features) {
      await dbInstance!.run('INSERT INTO gamification_config (feature_key, enabled, config_json) VALUES (?, ?, ?)', [key, enabled, config]);
    }
  }

  // Seed quiz questions
  const qqCount = await dbInstance!.get('SELECT COUNT(*) as count FROM quiz_questions');
  if (qqCount.count === 0) {
    const questions = [
      { q: 'What is your primary driving environment?', opts: '["City streets","Highway commuting","Mixed terrain","Off-road adventure"]', car: 'BYD Dolphin' },
      { q: 'How important is acceleration performance?', opts: '["Must be fastest","Important","Moderate","Not a priority"]', car: 'BYD Seal' },
      { q: 'What is your budget range?', opts: '["Under $30k","$30k-$45k","$45k-$60k","$60k+"]', car: 'BYD Atto 3' },
      { q: 'Which feature matters most to you?', opts: '["Range","Tech features","Cargo space","Luxury feel"]', car: 'BYD Han' }
    ];
    for (const [i, q] of questions.entries()) {
      await dbInstance!.run('INSERT INTO quiz_questions (question, options, recommended_car, order_num) VALUES (?, ?, ?, ?)', [q.q, q.opts, q.car, i + 1]);
    }
  }

  // Seed carousel slides
  const csCount = await dbInstance!.get('SELECT COUNT(*) as count FROM carousel_slides');
  if (csCount.count === 0) {
    const slides = [
      { img: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1400&q=80', title: 'Own the Future', subtitle: 'The World\'s First Decentralized EV Collective', cta: 'Join the Club', link: '#join' },
      { img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=80', title: 'Drive to Earn', subtitle: 'Earn rewards for every mile driven', cta: 'Learn More', link: '#drive' },
      { img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=80', title: 'Premium Fleet', subtitle: 'Access the complete BYD catalog', cta: 'Explore', link: '#fleet' }
    ];
    for (const [i, s] of slides.entries()) {
      await dbInstance!.run('INSERT INTO carousel_slides (image_url, title, subtitle, cta_text, cta_link, order_num) VALUES (?,?,?,?,?,?)', [s.img, s.title, s.subtitle, s.cta, s.link, i + 1]);
    }
  }

  // Seed testimonials
  const ttCount = await dbInstance!.get('SELECT COUNT(*) as count FROM testimonials');
  if (ttCount.count === 0) {
    const testimonials = [
      { name: 'James Mitchell', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', quote: 'The BYD Horizon Club completely changed how I think about EV ownership. I\'m earning while driving my dream car.' },
      { name: 'Sarah Chen', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80', quote: 'From investment to delivery, the tracking is incredible. I knew exactly where my BYD Seal was at all times.' },
      { name: 'Emeka Okafor', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80', quote: 'As a Nigerian professional, the Paystack integration made everything seamless. Best decision I ever made.' },
      { name: 'Oliver Williams', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', quote: 'President\'s Club member here. The perks are unreal — early access, private group, and that license plate frame is class.' },
      { name: 'Aisha Patel', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80', quote: 'Carbon Offset Club makes me feel good about luxury. I\'ve saved 2,450 lbs of CO2 and planted 50 trees!' },
      { name: 'Marcus Johnson', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80', quote: 'Mystery Car Subscription is addictive. Last month I got a Han GT worth $1,200/day for just $99. Unreal.' }
    ];
    for (const t of testimonials) {
      await dbInstance!.run('INSERT INTO testimonials (name, photo_url, quote) VALUES (?, ?, ?)', [t.name, t.photo, t.quote]);
    }
  }

  // Seed existing content
  const adsCount = await dbInstance!.get('SELECT COUNT(*) as count FROM ads');
  if (adsCount.count === 0) {
    const defaultAds = [
      { title: "Charge faster with BYD Home Charger", description: "Charge your BYD from 10% to 80% in under 5 hours.", image_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=400&q=80", target_url: "#charger", weight: 8 },
      { title: "Horizon Club Premium Delivery Upgrade", description: "Expedite your import clearance with priority queues.", image_url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80", target_url: "#premium", weight: 10 },
      { title: "Refer a friend, earn $50 instantly", description: "Unlock limited time triple points bonuses.", image_url: "https://images.unsplash.com/photo-1552581230-c01524648873?auto=format&fit=crop&w=400&q=80", target_url: "#refer", weight: 6 },
      { title: "BYD Comprehensive Insurance", description: "Defend your green investment from only $19/month.", image_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80", target_url: "#insurance", weight: 5 },
      { title: "Fractional Investment via Horizon Club", description: "Claim micro-ownership in premium EV assets.", image_url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80", target_url: "#invest", weight: 8 }
    ];
    for (const ad of defaultAds) {
      await dbInstance!.run('INSERT INTO ads (title, description, image_url, target_url, weight, is_active) VALUES (?, ?, ?, ?, ?, 1)', [ad.title, ad.description, ad.image_url, ad.target_url, ad.weight]);
    }
  }

  const blogCount = await dbInstance!.get('SELECT COUNT(*) as count FROM blog_posts');
  if (blogCount.count === 0) {
    const blogs = [
      { title: "Why BYD Batteries Outperform the Competition", content: "BYD's Blade Battery uses LFP chemistry arranged in a structural pack, passing nail penetration tests without fire. This increases volumetric efficiency by 50%.", image_url: "https://images.unsplash.com/photo-1563720223185-11051691a0a5?auto=format&fit=crop&w=800&q=80" },
      { title: "The Future of Smart Grid: V2L Technology", content: "Your BYD is a mobile substation. With V2L, it outputs AC power to external devices — campsites, grills, home backup.", image_url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80" },
      { title: "2026 BYD Fleet Overview", content: "The e-Platform 3.0 forms the baseline for our new models. Extreme low temp ranges, high-velocity charging, oceanic aerodynamic profiles.", image_url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80" }
    ];
    for (const b of blogs) {
      await dbInstance!.run('INSERT INTO blog_posts (title, content, image_url) VALUES (?, ?, ?)', [b.title, b.content, b.image_url]);
    }
  }

  const charityCount = await dbInstance!.get('SELECT COUNT(*) as count FROM charity_counter');
  if (charityCount.count === 0) {
    await dbInstance!.run('INSERT INTO charity_counter (current_amount, increment_per_second) VALUES (?, ?)', [500000.0, 0.50]);
  }

  const delaysCount = await dbInstance!.get('SELECT COUNT(*) as count FROM delays');
  if (delaysCount.count === 0) {
    await dbInstance!.run('INSERT INTO delays (name, duration_days, trigger_after_km, expedite_fee) VALUES (?, ?, ?, ?)', ['Charging Grid Congestion', 2, 25, 49.00]);
    await dbInstance!.run('INSERT INTO delays (name, duration_days, trigger_after_km, expedite_fee) VALUES (?, ?, ?, ?)', ['Import Customs Inspection', 5, 50, 49.00]);
    await dbInstance!.run('INSERT INTO delays (name, duration_days, trigger_after_km, expedite_fee) VALUES (?, ?, ?, ?)', ['Severe Weather Advisory', 3, 75, 49.00]);
    await dbInstance!.run('INSERT INTO delays (name, duration_days, trigger_after_km, expedite_fee) VALUES (?, ?, ?, ?)', ['Technical Fleet Quality Check', 4, 90, 49.00]);
  }

  const rewardsCount = await dbInstance!.get('SELECT COUNT(*) as count FROM rewards_store');
  if (rewardsCount.count === 0) {
    const rewards = [
      ['BYD Horizon Thermal Water Bottle', 2000, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80', 'Stay insulated with our double-wall BYD-branded flask.', 'In Stock'],
      ['BYD UltraCharge Type 2 Cable', 5000, 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=400&q=80', 'Heavy duty Type 2 cable for all EV chargers.', 'Out of Stock'],
      ['1 Year Roadside Assistance', 10, 'https://images.unsplash.com/photo-1517524006129-4a3a30449f76?auto=format&fit=crop&w=400&q=80', 'VIP emergency charging, tire, and towing services.', 'In Stock'],
      ['Direct Donation to Green Earth Initiative', 500, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80', 'Support global afforestation. Tax receipt available.', 'In Stock'],
      ['BYD Horizon Club Premium Cap', 1500, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80', 'Official BYD Horizon Club embroidered cap.', 'In Stock'],
      ['BYD Horizon Leather Keychain', 800, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80', 'Premium leather keychain with BYD Horizon branding.', 'In Stock'],
      ['Wireless EV Charging Pad', 8000, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=400&q=80', '15W Qi-compatible wireless charger for your vehicle.', 'In Stock'],
      ['BYD Horizon Club T-Shirt', 1200, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80', 'Organic cotton tee with minimalist Horizon logo.', 'In Stock'],
      ['Portable Jump Starter Pack', 3500, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=400&q=80', 'Compact 12V jump starter with USB-C charging.', 'In Stock'],
      ['BYD Horizon Sunglasses', 2500, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=400&q=80', 'UV400 polarized lenses with titanium frame.', 'In Stock'],
      ['Premium Floor Mat Set', 4000, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=400&q=80', 'Custom-fit all-weather floor mats for BYD models.', 'In Stock'],
      ['BYD Horizon Backpack', 3000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80', 'Water-resistant laptop backpack with USB charging port.', 'In Stock'],
      ['Car Air Purifier with HEPA', 2200, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=400&q=80', 'Ionizer purifier that plugs into 12V outlet.', 'In Stock'],
      ['BYD Horizon Mug Set', 1000, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80', 'Set of 2 ceramic mugs with gradient Horizon design.', 'In Stock'],
      ['Dash Cam 4K Pro', 6000, 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80', '4K front and rear dash cam with night vision.', 'In Stock'],
      ['BYD Horizon Notebook', 600, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=400&q=80', 'Premium hardcover journal with embossed logo.', 'In Stock'],
      ['Tesla-to-BYD Adapter', 1500, 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=400&q=80', 'Convert Tesla connector to Type 2 for BYD vehicles.', 'In Stock'],
      ['BYD Horizon Phone Case', 700, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=400&q=80', 'Shockproof case with carbon fiber texture.', 'In Stock'],
      ['Emergency Roadside Kit', 2800, 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=400&q=80', 'Complete kit: flashlight, triangles, first aid, jumper cables.', 'In Stock'],
      ['BYD Horizon Sticker Pack', 300, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=400&q=80', 'Set of 10 vinyl decals for laptop, car, or water bottle.', 'In Stock'],
      ['1 Month Premium Insurance Upgrade', 5000, 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=400&q=80', 'Upgrade to Premium insurance tier for 30 days.', 'In Stock'],
      ['BYD Horizon Speaker', 7500, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=400&q=80', 'Bluetooth 5.0 portable speaker with 20hr battery.', 'In Stock'],
      ['Free Vehicle Detailing Voucher', 4500, 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=400&q=80', 'Professional interior/exterior detail at any BYD service center.', 'In Stock'],
      ['BYD Horizon Umbrella', 1800, 'https://images.unsplash.com/photo-1520004434532-668416a08753?auto=format&fit=crop&w=400&q=80', 'Windproof automatic open/close umbrella.', 'In Stock'],
      ['200 Bonus Horizon Points', 0, 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=400&q=80', 'Free 200 points bonus — our gift to active members!', 'In Stock'],
    ];
    for (const r of rewards) {
      await dbInstance!.run('INSERT INTO rewards_store (name, points_cost, image_url, description, status) VALUES (?, ?, ?, ?, ?)', r);
    }
  }

  // Expand rewards store for existing databases
  const rewardsCount2 = await dbInstance!.get('SELECT COUNT(*) as count FROM rewards_store');
  if (rewardsCount2.count > 0 && rewardsCount2.count < 20) {
    const extraRewards = [
      ['BYD Horizon Leather Keychain', 800, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80', 'Premium leather keychain with BYD Horizon branding.', 'In Stock'],
      ['Wireless EV Charging Pad', 8000, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=400&q=80', '15W Qi-compatible wireless charger for your vehicle.', 'In Stock'],
      ['BYD Horizon Club T-Shirt', 1200, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80', 'Organic cotton tee with minimalist Horizon logo.', 'In Stock'],
      ['Portable Jump Starter Pack', 3500, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=400&q=80', 'Compact 12V jump starter with USB-C charging.', 'In Stock'],
      ['BYD Horizon Sunglasses', 2500, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=400&q=80', 'UV400 polarized lenses with titanium frame.', 'In Stock'],
      ['Premium Floor Mat Set', 4000, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=400&q=80', 'Custom-fit all-weather floor mats for BYD models.', 'In Stock'],
      ['BYD Horizon Backpack', 3000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80', 'Water-resistant laptop backpack with USB charging port.', 'In Stock'],
      ['Car Air Purifier with HEPA', 2200, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=400&q=80', 'Ionizer purifier that plugs into 12V outlet.', 'In Stock'],
      ['BYD Horizon Mug Set', 1000, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80', 'Set of 2 ceramic mugs with gradient Horizon design.', 'In Stock'],
      ['Dash Cam 4K Pro', 6000, 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80', '4K front and rear dash cam with night vision.', 'In Stock'],
      ['BYD Horizon Notebook', 600, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=400&q=80', 'Premium hardcover journal with embossed logo.', 'In Stock'],
      ['Tesla-to-BYD Adapter', 1500, 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=400&q=80', 'Convert Tesla connector to Type 2 for BYD vehicles.', 'In Stock'],
      ['BYD Horizon Phone Case', 700, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=400&q=80', 'Shockproof case with carbon fiber texture.', 'In Stock'],
      ['Emergency Roadside Kit', 2800, 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=400&q=80', 'Complete kit: flashlight, triangles, first aid, jumper cables.', 'In Stock'],
      ['BYD Horizon Sticker Pack', 300, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=400&q=80', 'Set of 10 vinyl decals for laptop, car, or water bottle.', 'In Stock'],
      ['1 Month Premium Insurance Upgrade', 5000, 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=400&q=80', 'Upgrade to Premium insurance tier for 30 days.', 'In Stock'],
      ['BYD Horizon Speaker', 7500, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=400&q=80', 'Bluetooth 5.0 portable speaker with 20hr battery.', 'In Stock'],
      ['Free Vehicle Detailing Voucher', 4500, 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=400&q=80', 'Professional interior/exterior detail at any BYD service center.', 'In Stock'],
      ['BYD Horizon Umbrella', 1800, 'https://images.unsplash.com/photo-1520004434532-668416a08753?auto=format&fit=crop&w=400&q=80', 'Windproof automatic open/close umbrella.', 'In Stock'],
      ['200 Bonus Horizon Points', 0, 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=400&q=80', 'Free 200 points bonus — our gift to active members!', 'In Stock'],
    ];
    for (const r of extraRewards) {
      const existing = await dbInstance!.get('SELECT id FROM rewards_store WHERE name = ?', [r[0]]);
      if (!existing) {
        await dbInstance!.run('INSERT INTO rewards_store (name, points_cost, image_url, description, status) VALUES (?, ?, ?, ?, ?)', r);
      }
    }
  }

  const lbCount = await dbInstance!.get('SELECT COUNT(*) as count FROM leaderboard');
  if (lbCount.count === 0) {
    const fakes = [
      ['Sarah_BYD_Seal', 42], ['EcoPioneerMax', 29], ['GreenEV_Guru', 25],
      ['BYD_Investor_UK', 18], ['VoltVoyager', 14], ['AustinChargePoints', 11],
      ['TeslaUpgradeBYD', 9], ['HorizonDriver_01', 8], ['EcoRider_CA', 6]
    ];
    for (const [name, count] of fakes) {
      await dbInstance!.run('INSERT INTO leaderboard (name, count, is_fake) VALUES (?, ?, 1)', [name, count]);
    }
  }

  const carsCount = await dbInstance!.get('SELECT COUNT(*) as count FROM cars');
  if (carsCount?.count === 0) {
    for (const car of BYD_VEHICLE_FLEET) {
      const specsJson = JSON.stringify(car.specs);
      const show = [1, 2, 3, 4, 5, 6].includes(car.id) ? 1 : 0;
      const res = await dbInstance!.run(
        `INSERT INTO cars (model, year, price, monthly_finance, range_miles, acceleration, battery, description, specs_json, badge, category, status, show_on_homepage) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [car.model, car.year, car.price, car.monthlyFinance, car.range, car.specs?.acceleration || '', car.specs?.batteryKwh || '', car.description, specsJson, car.badge || null, car.category, 'Available', show]
      );
      await dbInstance!.run('INSERT INTO car_images (car_id, image_url, is_primary) VALUES (?, ?, 1)', [res.lastID, car.imageUrl]);
    }
  }

  const webcamsCount = await dbInstance!.get('SELECT COUNT(*) as count FROM webcam_sources');
  if (webcamsCount?.count === 0) {
    const cams = [
      'BYD Factory – Shenzhen Assembly Hub', 'San Jose – Route 101 Carrier Lane',
      'LA Charging Station – Mega Charger', 'Shanghai Port – Container Loading',
      'BYD Design Lab – R&D Center', 'Blade Battery Lab – Testing Bay 4',
      'Delivery Hub – Los Angeles', 'European Logistics Center – Rotterdam'
    ];
    for (const name of cams) {
      await dbInstance!.run('INSERT INTO webcam_sources (name, video_url, is_active) VALUES (?, ?, 1)', [name, 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4']);
    }
  }

  // Seed investment options
  const invCount = await dbInstance!.get('SELECT COUNT(*) as count FROM investment_options');
  if (invCount.count === 0) {
    const options = [
      ['BYD Stock Pool', 'Invest in fractional shares of BYD Company Ltd (1211.HK). Track real-time performance and earn from BYD global growth.', 100, 20, 'Stocks', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=400&q=80'],
      ['BYD Expansion Fund', 'Fund new BYD dealership expansion across Africa, Europe, and Asia. Higher returns from emerging markets.', 500, 25, 'Fund', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80'],
      ['BYD Production Facilities', 'Invest in new production lines and factory expansion. Stable long-term returns from manufacturing growth.', 1000, 20, 'Infrastructure', 'https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=400&q=80'],
      ['BYD Charging Network', 'Invest in EV charging station deployment worldwide. Steady income from growing charging demand.', 250, 15, 'Infrastructure', 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=400&q=80'],
      ['BYD Battery Tech Fund', 'Invest in next-gen solid-state battery research. High risk, high reward from breakthrough technology.', 200, 30, 'Technology', 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=400&q=80'],
    ];
    for (const o of options) {
      await dbInstance!.run('INSERT INTO investment_options (name, description, min_amount, projected_apy, category, image_url, is_active) VALUES (?,?,?,?,?,?,1)', o);
    }
  }

  // Seed BYD offices worldwide
  const officesCount = await dbInstance!.get('SELECT COUNT(*) as count FROM byd_offices');
  if (officesCount.count === 0) {
    const offices = [
      ['Los Angeles', 'US', 34.0522, -118.2437, 'North America', '{"Seal":5,"Atto 3":8,"Han":3,"Dolphin":10}'],
      ['Frankfurt', 'DE', 50.1109, 8.6821, 'Europe', '{"Seal":4,"Atto 3":6,"Han":2,"Dolphin":7}'],
      ['London', 'UK', 51.5074, -0.1278, 'Europe', '{"Seal":3,"Atto 3":5,"Han":2,"Dolphin":6}'],
      ['Lagos', 'NG', 6.5244, 3.3792, 'Africa', '{"Seal":2,"Atto 3":4,"Han":1,"Dolphin":8}'],
      ['Nairobi', 'KE', -1.2921, 36.8219, 'Africa', '{"Seal":1,"Atto 3":3,"Han":1,"Dolphin":5}'],
      ['Singapore', 'SG', 1.3521, 103.8198, 'Asia', '{"Seal":6,"Atto 3":7,"Han":4,"Dolphin":9}'],
      ['Dubai', 'AE', 25.2048, 55.2708, 'Middle East', '{"Seal":4,"Atto 3":5,"Han":3,"Dolphin":6}'],
      ['Sydney', 'AU', -33.8688, 151.2093, 'Oceania', '{"Seal":3,"Atto 3":4,"Han":2,"Dolphin":5}'],
      ['São Paulo', 'BR', -23.5505, -46.6333, 'South America', '{"Seal":2,"Atto 3":3,"Han":1,"Dolphin":4}'],
      ['Shenzhen', 'CN', 22.5431, 114.0579, 'Asia HQ', '{"Seal":20,"Atto 3":25,"Han":15,"Dolphin":30}'],
    ];
    for (const o of offices) {
      await dbInstance!.run('INSERT INTO byd_offices (city, country, lat, lng, region, stock_json) VALUES (?,?,?,?,?,?)', o);
    }
  }

  // Seed promos
  const promosCount = await dbInstance!.get('SELECT COUNT(*) as count FROM promos');
  if (promosCount.count === 0) {
    const promos = [
      ['Welcome Bonus', 'bonus', 0, 500, null, null, 'New members receive 500 Horizon Points after first login!'],
      ['First Deposit Bonus', 'bonus', 10, 0, null, null, 'Get 10% bonus points on your first crypto deposit!'],
      ['Refer a Friend', 'referral', 0, 200, null, null, 'Both you and your friend earn 200 points when they join!'],
      ['Elite Upgrade Bonus', 'bonus', 0, 1000, null, null, 'Upgrade to Elite and receive 1,000 bonus points!'],
      ['Holiday Special', 'discount', 15, 0, '2026-12-01', '2026-12-31', '15% off all rentals during the holiday season!'],
    ];
    for (const p of promos) {
      await dbInstance!.run('INSERT INTO promos (name, type, discount_percent, bonus_points, start_date, end_date, description, is_active) VALUES (?,?,?,?,?,?,?,1)', p);
    }
  }

  // Seed insurance tiers
  const itCount = await dbInstance!.get('SELECT COUNT(*) as count FROM insurance_tiers');
  if (itCount && itCount.count === 0) {
    const tiers = [
      ['Basic', 15, 50000, 1000, 'Basic coverage for essential protection', 1, 1],
      ['Premium', 30, 100000, 500, 'Comprehensive coverage with lower deductible', 1, 2],
      ['Elite', 60, 250000, 250, 'Maximum coverage with minimal deductible', 1, 3],
    ];
    for (const t of tiers) {
      await dbInstance!.run('INSERT INTO insurance_tiers (name, daily_rate, coverage_limit, deductible, description, is_active, sort_order) VALUES (?,?,?,?,?,?,?)', t);
    }
  }

  // Update payment_methods minimum deposit to $150
  await dbInstance!.run("UPDATE payment_methods SET min_deposit = 150 WHERE min_deposit < 150");

  // Seed $150 minimum floor settings
  const floorSettings = [
    ['min_deposit_floor', '150'],
    ['min_rental_price_floor', '150'],
    ['min_investment_floor', '150'],
    ['min_purchase_price_floor', '150'],
    ['min_membership_price_floor', '150'],
    ['insurance_required_for_rentals', 'true'],
    ['crypto_recommended', 'true'],
    ['deposit_required_before_purchase', 'true'],
  ];
  for (const [key, value] of floorSettings) {
    await dbInstance!.run('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)', [key, value]);
  }

  } catch (e: any) { console.error("Seed error:", e?.message); }

  return dbInstance;
}

export async function logAdminAction(action: string, details = '', ip = '127.0.0.1', adminId = 0) {
  const dbPath = path.join(process.cwd(), 'admin.log');
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ADMIN#${adminId}: ${action} | ${details} | IP: ${ip}\n`;
  try { await fs.promises.appendFile(dbPath, logLine, 'utf8'); } catch {}
  try {
    if (dbInstance) {
      await dbInstance.run('INSERT INTO admin_logs (admin_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', [adminId, action, details, ip]);
    }
  } catch {}
}

export async function getAdminLogs(): Promise<any[]> {
  if (!dbInstance) return [];
  try { return await dbInstance!.all('SELECT * FROM admin_logs ORDER BY id DESC LIMIT 200'); } catch { return []; }
}

export async function logUserInteraction(userId: number | null, email: string | null, actionType: string, description: string, ipAddress = "127.0.0.1") {
  if (!dbInstance) return;
  try {
    await dbInstance!.run('INSERT INTO user_interactions (user_id, email, action_type, description, ip_address, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [userId, email, actionType, description, ipAddress]);
  } catch {}
}

export async function getUserInteractions(): Promise<any[]> {
  if (!dbInstance) return [];
  try { return await dbInstance!.all('SELECT * FROM user_interactions ORDER BY id DESC'); } catch { return []; }
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await dbInstance!.get('SELECT value FROM system_settings WHERE key = ?', [key]);
    return row?.value || null;
  } catch { return null; }
}

export async function setSetting(key: string, value: string) {
  try {
    await dbInstance!.run('INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, value]);
  } catch {}
}
