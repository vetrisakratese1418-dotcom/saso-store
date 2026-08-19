import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (env.smtp.host && env.smtp.user) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  } else {
    transporter = null;
  }
  return transporter;
}

export async function sendMail({ to, subject, html, text = '' }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email:console] To: ${to}\n[email:console] Subject: ${subject}\n`);
    return { delivered: false, console: true };
  }
  try {
    await t.sendMail({
      from: env.smtp.from || env.storeEmail,
      to,
      subject,
      text,
      html,
    });
    return { delivered: true };
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { delivered: false, error: err.message };
  }
}

export function orderHtml(templateName, data) {
  if (templateName === 'orderConfirmation') return orderConfirmationHtml(data);
  if (templateName === 'orderStatus') return orderStatusHtml(data);
  if (templateName === 'lowStock') return lowStockHtml(data);
  if (templateName === 'welcome') return welcomeHtml(data);
  if (templateName === 'newsletter') return newsletterHtml(data);
  return `<p>Hello ${data.name || ''},</p>`;
}

const wrap = (title, body) => `
<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:18px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.06);">
      <h1 style="font-size:20px;margin:0 0 4px;">${env.storeName}</h1>
      <p style="color:#86868b;font-size:13px;margin:0 0 24px;">${title}</p>
      ${body}
      <p style="color:#86868b;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
        ${env.storeName} &middot; ${env.storeAddress || ''}
      </p>
    </div>
  </div>
</body></html>`;

function orderConfirmationHtml({ order }) {
  const money = (n) => `${env.currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`;
  const rows = (order.items || [])
    .map(
      (it) => `<tr>
        <td style="padding:8px 0;">${it.name}</td>
        <td style="padding:8px 0;text-align:center;">${it.qty}</td>
        <td style="padding:8px 0;text-align:right;">${money(it.price)}</td>
      </tr>`,
    )
    .join('');
  const body = `
    <p style="font-size:15px;">Hi ${order.shippingAddress?.name || 'there'}, thank you for your order!</p>
    <p style="font-size:14px;color:#86868b;">Order <strong>${order.orderNumber}</strong> · ${new Date(order.createdAt).toLocaleString()}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="color:#86868b;border-bottom:1px solid #eee;"><th align="left" style="padding:8px 0;">Item</th><th style="padding:8px 0;">Qty</th><th align="right" style="padding:8px 0;">Price</th></tr>
      ${rows}
    </table>
    <div style="margin-top:16px;text-align:right;font-size:14px;">
      <p>Subtotal: ${money(order.totals?.subtotal)}</p>
      ${order.totals?.discount ? `<p>Discount: −${money(order.totals.discount)}</p>` : ''}
      <p>Shipping: ${money(order.totals?.shipping)}</p>
      <p style="font-size:17px;font-weight:600;">Total: ${money(order.totals?.grandTotal)}</p>
    </div>
    <p style="font-size:13px;color:#86868b;margin-top:16px;">Payment: ${order.payment?.method} (${order.payment?.status})</p>
    <p style="margin-top:24px;">
      <a href="${env.publicBaseUrl}/orders/${order.orderNumber}" style="background:#0071e3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:980px;font-size:14px;">Track your order</a>
    </p>`;
  return wrap('Order Confirmation', body);
}

function orderStatusHtml({ order }) {
  const body = `
    <p style="font-size:15px;">Hi ${order.shippingAddress?.name || 'there'},</p>
    <p style="font-size:14px;">Your order <strong>${order.orderNumber}</strong> is now <strong style="text-transform:uppercase;">${order.status}</strong>.</p>
    <p style="font-size:13px;color:#86868b;">You can track the full history anytime.</p>
    <p style="margin-top:24px;"><a href="${env.publicBaseUrl}/orders/${order.orderNumber}" style="background:#0071e3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:980px;font-size:14px;">View order</a></p>`;
  return wrap('Order Status Update', body);
}

function lowStockHtml({ products }) {
  const rows = products
    .map(
      (p) =>
        `<tr><td style="padding:8px 0;">${p.name}</td><td style="padding:8px 0;text-align:right;color:#d70015;">${p.stock} left</td></tr>`,
    )
    .join('');
  const body = `
    <p style="font-size:15px;">The following products are running low on stock:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
    <p style="margin-top:24px;"><a href="${env.publicBaseUrl}/admin/inventory" style="background:#d70015;color:#fff;text-decoration:none;padding:12px 20px;border-radius:980px;font-size:14px;">Restock now</a></p>`;
  return wrap('Low Stock Alert', body);
}

function welcomeHtml({ user }) {
  const body = `
    <p style="font-size:15px;">Welcome to ${env.storeName}, ${user.name}!</p>
    <p style="font-size:14px;color:#86868b;">Your account has been created. Happy shopping!</p>
    <p style="margin-top:24px;"><a href="${env.publicBaseUrl}/shop" style="background:#0071e3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:980px;font-size:14px;">Start shopping</a></p>`;
  return wrap('Welcome', body);
}

function newsletterHtml({ email }) {
  const body = `
    <p style="font-size:15px;">You're on the list! 🎉</p>
    <p style="font-size:14px;color:#86868b;">${email} is subscribed to ${env.storeName} updates.</p>`;
  return wrap('Newsletter Subscription', body);
}
