import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import { env } from '../config/env.js';

const allowedOrigins = env.clientUrl
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((u) => {
    try { return new URL(u).origin; } catch { return u; }
  });

const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
});

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const isDev = env.nodeEnv !== 'production';
    if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return cb(null, true);
    }
    try {
      const o = new URL(origin).origin;
      if (allowedOrigins.includes(o)) return cb(null, true);
    } catch {
      /* invalid origin */
    }
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    stripKeys(req.body);
  }
  next();
}

function stripKeys(obj) {
  for (const key of Object.keys(obj)) {
    if (['$', '.'].some((c) => key.includes(c))) {
      delete obj[key];
      continue;
    }
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key].trim(), {
        whiteList: {},
        stripIgnoreTag: true,
        onIgnoreTagAttr: () => '',
      });
    } else if (Array.isArray(obj[key])) {
      obj[key].forEach((item, i) => {
        if (typeof item === 'string') obj[key][i] = xss(item, { whiteList: {}, stripIgnoreTag: true });
        else if (item && typeof item === 'object') stripKeys(item);
      });
    } else if (obj[key] && typeof obj[key] === 'object') {
      stripKeys(obj[key]);
    }
  }
}

export { securityHeaders, corsOptions, limiter, authLimiter, mongoSanitize, sanitizeBody };
