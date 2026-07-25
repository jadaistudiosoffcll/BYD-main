# BYD Horizon Club — AGENTS.md

## Build & Run

```bash
# Install
npm install

# Dev
npx tsx server.ts

# Production build
npx vite build && npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=dist/server.cjs
Copy-Item "node_modules\sql.js\dist\sql-wasm.wasm" "dist\sql-wasm.wasm"

# Start
node dist/server.cjs
```

## Key Architecture

- **Frontend:** React + Vite + Tailwind + Lucide icons
- **Backend:** Express.js + SQLite (sql.js)
- **Auth:** JWT tokens, bcrypt passwords
- **DB:** 48+ tables, auto-created on first run, persisted in `database.sqlite`

## Server Startup

Server runs on port 3000. Requires `dist/sql-wasm.wasm` to be copied from `node_modules/sql.js/dist/` after every build. Kill all node processes before restart: `taskkill /F /IM node.exe /T`.

## Critical Files

| File | Purpose |
|------|---------|
| `server.ts` | All API endpoints (1800+ lines) |
| `src/App.tsx` | Root routing, nav, admin emblem 5-click |
| `src/components/UserDashboard.tsx` | All user tabs (1618 lines) |
| `src/components/AdminPanel.tsx` | Admin god-mode (15 tabs, 1800+ lines) |
| `src/components/PaymentFlow.tsx` | Crypto payment flow |
| `src/components/rental/RentVehiclePage.tsx` | Vehicle rental booking |
| `src/components/investment/InvestPage.tsx` | Investment options |
| `src/components/referrals/ReferralTreeSection.tsx` | 3-level referral tree |
| `src/components/map/LiveTrackingMap.tsx` | Leaflet GPS tracking |
| `src/components/live/LiveWebcamGrid.tsx` | Facility webcams (paywalled) |
| `src/db.ts` | DB schema, migrations, seed data (600+ lines) |
| `src/data/carImages.ts` | Car model → image URL mapping |

## User Flow

1. Register → Login → KYC verification
2. Deposit crypto (USDT/BTC/ETH) → Admin confirms → Balance credited
3. Browse vehicles → Select → Purchase or Rental
4. Admin confirms order → Balance deducted → Tracking initialized
5. Admin updates distance (route_index 0-100%) → User sees live map
6. Admin dispatches → In Transit → Delivered

## Admin Access

- **ONLY** via Jadai Studio "J" emblem in footer (5 clicks)
- Login: `jehuhudson@gmail.com` / `admin1234`
- 15 tabs: Dashboard, Users, Payments, Vehicles, Tracking, Rentals, Investments, Promos, Referrals, Content, Gamification, Insurance, Wallets, AI Master, Settings

## Payment Rules

- **Crypto is the ONLY active payment method** (Paystack/Stripe/PayPal/Bank Transfer disabled)
- **$150 minimum deposit** enforced in frontend and backend
- **Admin must confirm every deposit** before balance is credited
- **Balance required before any purchase/rental/investment**

## Elite Membership

- Silver: $299/mo | Gold: $599/mo | Platinum: $999/mo
- Users subscribe via `/api/elite/subscribe` → Admin confirms via `/api/admin/elite/:payId/confirm`
- Activates 30-day membership with tier-specific benefits

## Insurance Tiers

- Basic: $15/day, $50K coverage
- Premium: $30/day, $100K coverage
- Elite: $60/day, $250K coverage
- Admin CRUD via Insurance tab

## Tracking System

- `map_tracking` table: `route_index` (0-100%), `delays_encountered`, `expedite_paid`
- Admin updates distance via Tracking tab or `POST /api/admin/tracking/:userId`
- Tracking auto-initializes when admin confirms rental or purchase
- LiveTrackingMap renders Leaflet dark map with animated marker

## Webcam Paywall

- Webcams only accessible after: confirmed purchase, active rental, or Elite membership
- Endpoint: `GET /api/webcams/available` (authenticated)
- Admin manages webcam sources via Content tab

## Known Pre-existing Issues

- `server.ts` lines 898, 933-934: TS errors with `adminId` and `res` types
- `AdminPanel.tsx` line 1371: `Leaf` icon import unused
- `PaymentFlow.tsx` line 337: Overload signature mismatch
- Port 3000 zombie processes require `taskkill /F /IM node.exe /T`

## Git Remote

- `origin` → `https://github.com/zero7065/BYD-main.git`
- Branch: `main`
