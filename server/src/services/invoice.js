import { env } from '../config/env.js';

export function renderInvoice(order) {
  const money = (n) => `${env.currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`;
  const store = {
    name: env.storeName,
    email: env.storeEmail,
    phone: env.storePhone,
    address: env.storeAddress,
  };
  const a = order.shippingAddress || {};
  const rows = (order.items || [])
    .map(
      (it) => `<tr>
        <td style="padding:10px;border-bottom:1px solid #e5e5e5;">${it.name}<br><small style="color:#86868b;">${it.slug || ''}</small></td>
        <td style="padding:10px;border-bottom:1px solid #e5e5e5;text-align:center;">${it.qty}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e5e5;text-align:right;">${money(it.price)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e5e5;text-align:right;">${money(it.price * it.qty)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${order.orderNumber}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;margin:0;padding:32px;}
  .box{max-width:760px;margin:0 auto;border:1px solid #e5e5e5;border-radius:16px;padding:32px;}
  h1{margin:0;font-size:20px;}
  .muted{color:#86868b;font-size:13px;}
  table{width:100%;border-collapse:collapse;font-size:14px;margin-top:20px;}
  th{text-align:left;padding:10px;border-bottom:2px solid #d2d2d7;font-size:12px;text-transform:uppercase;color:#86868b;}
  .totals{width:260px;margin-left:auto;margin-top:12px;font-size:14px;}
  .totals td{padding:6px 10px;}
  .print{display:block;margin:20px 0;background:#0071e3;color:#fff;border:0;padding:12px 20px;border-radius:980px;font-size:14px;cursor:pointer;}
  @media print{.print{display:none;}}
</style></head>
<body><div class="box">
  <button class="print" onclick="window.print()">Print / Save PDF</button>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h1>${store.name}</h1>
      <div class="muted">${store.address}</div>
      <div class="muted">${store.email}${store.phone ? ' · ' + store.phone : ''}</div>
    </div>
    <div style="text-align:right;">
      <h1 style="font-size:22px;">INVOICE</h1>
      <div class="muted">${order.orderNumber}</div>
      <div class="muted">${new Date(order.createdAt).toLocaleString()}</div>
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:24px;">
    <div>
      <div style="font-size:12px;text-transform:uppercase;color:#86868b;">Billed To</div>
      <div style="font-weight:600;margin-top:4px;">${a.name || ''}</div>
      <div class="muted">${[a.line1, a.line2].filter(Boolean).join(', ')}</div>
      <div class="muted">${[a.city, a.state, a.zip].filter(Boolean).join(', ')}</div>
      <div class="muted">${a.country || ''}</div>
      <div class="muted">${a.phone || ''}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;text-transform:uppercase;color:#86868b;">Payment</div>
      <div style="font-weight:600;margin-top:4px;text-transform:capitalize;">${order.payment?.method || ''}</div>
      <div class="muted">${order.payment?.status || ''}</div>
      <div class="muted">${order.payment?.transactionId ? 'Txn: ' + order.payment.transactionId : ''}</div>
    </div>
  </div>
  <table>
    <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr>
    ${rows}
  </table>
  <table class="totals">
    <tr><td class="muted">Subtotal</td><td style="text-align:right;">${money(order.totals?.subtotal)}</td></tr>
    ${order.totals?.discount ? `<tr><td class="muted">Discount${order.coupon?.code ? ' (' + order.coupon.code + ')' : ''}</td><td style="text-align:right;">−${money(order.totals.discount)}</td></tr>` : ''}
    <tr><td class="muted">Shipping</td><td style="text-align:right;">${money(order.totals?.shipping)}</td></tr>
    ${order.totals?.tax ? `<tr><td class="muted">Tax</td><td style="text-align:right;">${money(order.totals.tax)}</td></tr>` : ''}
    <tr><td style="font-weight:700;">Total</td><td style="text-align:right;font-weight:700;font-size:17px;">${money(order.totals?.grandTotal)}</td></tr>
  </table>
  <div class="muted" style="margin-top:32px;">Thank you for shopping with ${store.name}.</div>
</div></body></html>`;
}
