# Shopora — E-Commerce Platform

A production-ready, full-stack e-commerce platform with a customer storefront and an admin dashboard. Built with **Next.js 15 (App Router)** on the frontend and **Express** on the backend, with a **MongoDB-compatible data layer** that runs on a zero-setup local JSON file out of the box.

## Features

**Storefront**
- Home, shop (search + filters: category, brand, price, in-stock, rating), product pages with gallery, reviews, related & recently-viewed
- Cart drawer, wishlist, guest + account checkout
- Payments: **COD**, and test-mode **Razorpay / Stripe / PayPal** (mock, no keys needed)
- Coupons, live shipping/free-shipping threshold, order tracking timeline, printable invoice
- JWT auth (register, login, profile), dark mode, responsive mobile-first UI
- SEO: dynamic sitemap.xml + robots.txt

**Admin** (`/admin`)
- Dashboard with revenue (paid + COD split), sales trend, top products, category revenue, order status breakdown, low-stock alerts
- Product CRUD (pricing, stock, images, tags, SEO), quick stock adjustments with history
- Order management with status updates + auto-emails + auto stock restore on cancellation
- Categories + subcategories, coupons, customers, inventory (CSV import/export), newsletter (subscribers + broadcast), store settings (branding, hero, announcement)

**Infrastructure**
- Storage: local JSON database by default; switch to MongoDB by setting `MONGODB_URI`
- Security: helmet, CORS, rate limiting, mongo-sanitize, XSS body sanitizer, JWT auth (user + admin roles)
- Email: SMTP configured via env; falls back to console logging in local mode

## Tech Stack

| Layer      | Stack |
|------------|-------|
| Client     | Next.js 15, React 19, Tailwind CSS v4, lucide-react |
| Server     | Node.js, Express |
| Data       | MongoDB (Mongoose) with built-in local JSON fallback |
| Auth       | JWT (bcrypt password hashing) |
| Payments   | Razorpay / Stripe / PayPal SDKs (test-mode mock when unconfigured) + COD |

## Quick Start

Requires Node.js 18+ (built and tested on Node 24).

```bash
# 1. Install all dependencies
npm run install:all

# 2. Seed demo data (19 products, 5 categories, 3 coupons, admin user)
npm run seed

# 3. Start server + client together
npm run dev
```

Open:

- **Storefront:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin
  - Email: `admin@shopora.com`
  - Password: `Admin@12345`
- **API:** http://localhost:4000/api/health

> The seed script is safe to re-run (it skips when products already exist). Delete `server/data/db.json` and re-seed to reset the demo data.

### Running separately

```bash
npm run dev:server   # API on http://localhost:4000
npm run dev:client   # Storefront on http://localhost:3000
```

## Demo Coupons

| Code      | Discount            |
|-----------|---------------------|
| `WELCOME10` | 10% off (min ₹999) |
| `SAVE200`   | ₹200 off (min ₹999) |
| `FESTIVE15` | 15% off (min ₹499) |

## Test Payments

Without any gateway keys, online payment methods run in **test mode**:

1. Choose any payment method at checkout.
2. A reference code is generated server-side and shown (e.g. `test_...`).
3. The order is marked **paid** and stock is deducted.

To enable real payments, add the gateway keys to `server/.env` (see `.env.example`). Test mode automatically disables for that gateway once its keys are present.

## Configuration

Copy `server/.env.example` to `server/.env` and edit as needed:

```env
PORT=4000
JWT_SECRET=change-me-in-production
MONGODB_URI=            # leave empty for local JSON database
STORE_NAME=Shopora
STORE_EMAIL=no-reply@shopora.example
CURRENCY=INR
CURRENCY_SYMBOL=₹
FREE_SHIPPING_THRESHOLD=499
SHIPPING_FEE=49
ADMIN_EMAIL=admin@shopora.com
ADMIN_PASSWORD=Admin@12345
ALLOW_TEST_PAYMENTS=true

# Email (optional - falls back to console logging)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Payment gateways (optional - enables live mode when set)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Client env (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Project Structure

```
ecommerce-store/
├── server/                  # Express API
│   ├── src/
│   │   ├── config/          # env
│   │   ├── db/              # localStore (JSON) + mongoStore + schemas
│   │   ├── middleware/      # auth, errors, security
│   │   ├── routes/          # auth, catalog, checkout, admin, newsletter, settings
│   │   ├── services/        # payments, email, stock, invoice
│   │   └── utils/           # validators, helpers
│   ├── data/db.json         # local JSON database
│   └── src/seed.js          # demo data seeder
├── client/                  # Next.js storefront + admin
│   ├── app/                 # pages (storefront + admin)
│   ├── components/          # UI + feature components
│   └── lib/                 # api client, global store, formatters
└── package.json             # root scripts (concurrently)
```

## Deployment

### Server (Render / Railway / Fly.io)

1. Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `MONGODB_URI` (or keep the local file database with a persistent disk).
2. Start command: `cd server && npm start`
3. Set `CLIENT_URL` to your frontend URL.

### Client (Vercel)

1. Import the `client/` directory (or set the root directory to `client`).
2. Env vars: `NEXT_PUBLIC_API_URL=https://your-api-url/api`, `NEXT_PUBLIC_SITE_URL=https://your-store.vercel.app`.
3. `outputFileTracingRoot` is already configured so the build resolves the monorepo root correctly.

## API Overview

Public: `POST /api/auth/register|login`, `GET /api/products`, `GET /api/products/slug/:slug`, `GET /api/categories`, `GET /api/home`, `GET /api/settings/public`, `POST /api/checkout`, `POST /api/checkout/validate-coupon`, `POST /api/payments/verify`, `GET /api/orders/:orderNumber`, `GET /api/orders/:orderNumber/invoice`.

Authenticated: `GET/PATCH /api/auth/me`, `GET /api/orders/my`, `POST /api/products/:id/reviews`.

Admin (`Authorization: Bearer <admin-token>`): `/api/admin/*` — dashboard, products, categories, coupons, orders, customers, inventory, newsletter, settings.

## License

MIT
