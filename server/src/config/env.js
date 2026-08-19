import dotenv from 'dotenv';

dotenv.config();

const num = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== '' && v !== undefined ? n : def;
};

const cashfreeAppId = process.env.CASHFREE_APP_ID || '';
const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Detect live mode based on key prefixes
const cashfreeIsLive = cashfreeAppId.startsWith('PROD_');
const stripeIsLive = stripeSecretKey.startsWith('sk_live_');

export const env = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtAdminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '12h',

  mongoUri: process.env.MONGODB_URI || '',

  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',

  storeName: process.env.STORE_NAME || 'saso',
  storeEmail: process.env.STORE_EMAIL || 'no-reply@shopora.example',
  storePhone: process.env.STORE_PHONE || '',
  storeAddress: process.env.STORE_ADDRESS || '',
  currency: process.env.CURRENCY || 'INR',
  currencySymbol: process.env.CURRENCY_SYMBOL || '₹',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.STORE_EMAIL || '',
  },

  cashfree: {
    appId: cashfreeAppId,
    secretKey: cashfreeSecretKey,
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || '',
    apiUrl: cashfreeIsLive ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg',
    isLive: cashfreeIsLive,
  },
  stripe: {
    secretKey: stripeSecretKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    isLive: stripeIsLive,
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: process.env.PAYPAL_MODE || 'sandbox',
  },
  upi: {
    vpa: process.env.UPI_VPA || '',
    merchantName: process.env.UPI_MERCHANT_NAME || process.env.STORE_NAME || 'saso',
    webhookSecret: process.env.UPI_WEBHOOK_SECRET || '',
    enabled: process.env.UPI_ENABLED !== 'false',
  },

  allowTestPayments: process.env.ALLOW_TEST_PAYMENTS !== 'false',

  freeShippingThreshold: num(process.env.FREE_SHIPPING_THRESHOLD, 499),
  shippingFee: num(process.env.SHIPPING_FEE, 49),

  adminEmail: process.env.ADMIN_EMAIL || 'admin@shopora.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',

  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
};

export const isProd = env.nodeEnv === 'production';

// Log payment mode on startup
const modes = [];
if (cashfreeAppId) modes.push(`Cashfree: ${cashfreeIsLive ? 'LIVE' : 'SANDBOX'}`);
if (stripeSecretKey) modes.push(`Stripe: ${stripeIsLive ? 'LIVE' : 'TEST'}`);
if (env.upi.vpa) modes.push(`UPI: ${env.allowTestPayments ? 'TEST' : 'LIVE'}`);
if (env.paypal.clientId) modes.push(`PayPal: ${env.paypal.mode}`);
if (modes.length) console.log(`[payments] Modes: ${modes.join(' | ')}`);
