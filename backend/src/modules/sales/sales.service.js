import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { parsePagination } from '../../utils/pagination.js';
import { mapSale } from '../../utils/serializers.js';
import { addJob } from '../../services/queue.service.js';
import * as salesRepository from './sales.repository.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function publishSaleEvent(sale) {
  if (!sale) return;
  addJob('sales-events', 'sale.completed', {
    saleId: sale.id,
    referenceNumber: sale.reference_number,
    totalAmount: Number(sale.grand_total || 0),
    itemsCount: sale.item_count || 0,
  }).catch((error) => {
    console.error('Failed to enqueue sales event:', error.message);
  });
}

export async function createSale(data, user) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    throw new ValidationError('At least one sale item is required');
  }

  const result = await salesRepository.createSale({
    items,
    customer: data.customer || {},
    paymentMethod: data.paymentMethod || 'CASH',
    amountTendered: data.amountTendered ?? null,
    discountAmount: data.discountAmount || 0,
    taxAmount: data.taxAmount || 0,
    pharmacistId: data.pharmacistId || null,
    prescriptionId: data.prescriptionId || null,
    notes: data.notes || null,
    cashierId: user?.userId || null,
  });

  const sale = mapSale(result.sale, result.items);
  publishSaleEvent({ ...result.sale, item_count: result.items.length });

  return sale;
}

export async function voidSale(id, user) {
  const result = await salesRepository.transitionSaleStatus(id, 'VOIDED', {
    userId: user?.userId,
    restoreStock: true,
  });
  if (!result) throw new NotFoundError('Sale', id);
  return mapSale(result);
}

export async function refundSale(id, user) {
  const result = await salesRepository.transitionSaleStatus(id, 'REFUNDED', {
    userId: user?.userId,
    restoreStock: true,
  });
  if (!result) throw new NotFoundError('Sale', id);
  return mapSale(result);
}

export async function getReceipt(id) {
  return getSale(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(value) {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function getPrintableReceipt(id) {
  const sale = await getSale(id);

  const itemsHtml = (sale.items || [])
    .map(
      (item) => `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(item.medicineName || 'Item')}</div>
          <div class="item-qty">${item.quantity} × RWF ${formatMoney(item.unitPrice)}</div>
        </td>
        <td class="num">RWF ${formatMoney(item.totalPrice)}</td>
      </tr>`
    )
    .join('');

  const paymentLine = sale.amountTendered != null
    ? `
      <tr>
        <td class="label">Tendered</td>
        <td class="num">RWF ${formatMoney(sale.amountTendered)}</td>
      </tr>
      <tr>
        <td class="label">Change</td>
        <td class="num">RWF ${formatMoney(sale.changeAmount)}</td>
      </tr>`
    : '';

  const discountLine = Number(sale.discountAmount) > 0
    ? `<tr><td class="label">Discount</td><td class="num">- RWF ${formatMoney(sale.discountAmount)}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${escapeHtml(sale.referenceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      margin: 0;
      padding: 24px;
      color: #0f172a;
    }
    .receipt {
      max-width: 420px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 50px -20px rgba(15, 23, 42, 0.25);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 55%, #34d399 100%);
      color: #ffffff;
      padding: 28px 28px 24px;
      text-align: center;
    }
    .header .brand { font-size: 22px; font-weight: 800; letter-spacing: 0.04em; }
    .header .tagline { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    .header .ref {
      display: inline-block;
      margin-top: 14px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px dashed rgba(255, 255, 255, 0.55);
      border-radius: 999px;
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .body { padding: 24px 28px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; font-size: 13px; }
    .meta .k { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .meta .v { font-weight: 600; margin-top: 2px; }
    .meta .full { grid-column: 1 / -1; }
    .divider { border-top: 1px dashed #cbd5e1; margin: 20px 0; }
    table.items { width: 100%; border-collapse: collapse; font-size: 13px; }
    table.items td { padding: 6px 0; vertical-align: top; }
    .item-name { font-weight: 600; }
    .item-qty { color: #64748b; font-size: 12px; margin-top: 2px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .totals { margin-top: 12px; font-size: 13px; }
    .totals tr td { padding: 5px 0; }
    .label { color: #64748b; }
    .grand { font-size: 17px; font-weight: 800; border-top: 2px solid #0f172a; padding-top: 10px !important; }
    .grand .label { color: #0f172a; }
    .status {
      margin-top: 18px;
      text-align: center;
    }
    .status span {
      display: inline-block;
      padding: 6px 18px;
      border-radius: 999px;
      background: #d1fae5;
      color: #065f46;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .footer { padding: 0 28px 26px; text-align: center; }
    .footer p { font-size: 12px; color: #64748b; line-height: 1.6; margin: 0; }
    .toolbar { max-width: 420px; margin: 0 auto 18px; text-align: right; }
    .toolbar button {
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .toolbar button:hover { background: #1e293b; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none; }
      .receipt { max-width: 100%; border: none; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print receipt</button>
  </div>
  <div class="receipt">
    <div class="header">
      <div class="brand">URUMULI PHARMACY</div>
      <div class="tagline">Kigali, Rwanda · Safe dispensing first</div>
      <div class="ref">${escapeHtml(sale.referenceNumber)}</div>
    </div>
    <div class="body">
      <div class="meta">
        <div>
          <div class="k">Date</div>
          <div class="v">${escapeHtml(new Date(sale.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }))}</div>
        </div>
        <div>
          <div class="k">Cashier</div>
          <div class="v">${escapeHtml(sale.cashierName || '—')}</div>
        </div>
        <div>
          <div class="k">Payment</div>
          <div class="v">${escapeHtml((sale.paymentMethod || '').replace(/_/g, ' '))}</div>
        </div>
        <div>
          <div class="k">Pharmacist</div>
          <div class="v">${escapeHtml(sale.pharmacistName || '—')}</div>
        </div>
        ${(sale.customerName || sale.customerPhone || sale.customerEmail)
          ? `<div class="full">
              <div class="k">Customer</div>
              <div class="v">${escapeHtml([sale.customerName, sale.customerPhone, sale.customerEmail].filter(Boolean).join(' · '))}</div>
            </div>`
          : ''}
      </div>

      <div class="divider"></div>

      <table class="items">
        ${itemsHtml}
      </table>

      <table class="totals">
        <tr><td class="label">Subtotal</td><td class="num">RWF ${formatMoney(sale.totalAmount)}</td></tr>
        ${discountLine}
        <tr><td class="label">Tax</td><td class="num">RWF ${formatMoney(sale.taxAmount)}</td></tr>
        <tr class="grand"><td class="label">Total</td><td class="num">RWF ${formatMoney(sale.grandTotal)}</td></tr>
        ${paymentLine}
      </table>

      <div class="status"><span>${escapeHtml(sale.status)}</span></div>
    </div>
    <div class="footer">
      <p>Medicines are supplied only after pharmacist review when required.<br />This receipt is not a substitute for medical advice.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

export async function listSales(queryParams) {
  const pagination = parsePagination(queryParams);
  const result = await salesRepository.listSales({
    limit: pagination.limit,
    offset: pagination.offset,
    search: queryParams.search || queryParams.q || null,
    status: queryParams.status || null,
    paymentMethod: queryParams.paymentMethod || queryParams.payment_method || null,
    fromDate: queryParams.fromDate || null,
    toDate: queryParams.toDate || null,
  });

  return {
    data: result.rows.map((row) => mapSale(row)),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pagination.limit)),
    },
  };
}

export async function getSale(id) {
  const result = await salesRepository.findSaleById(id);
  if (!result) {
    throw new NotFoundError('Sale', id);
  }

  return mapSale(result.sale, result.items);
}

export async function getSummary(queryParams) {
  const days = Math.min(365, Math.max(7, parseInt(queryParams.days, 10) || 30));
  const recentLimit = Math.min(25, Math.max(5, parseInt(queryParams.recentLimit, 10) || 10));
  const topLimit = Math.min(20, Math.max(5, parseInt(queryParams.topLimit, 10) || 8));
  const dashboard = await salesRepository.getDashboardData({ days, recentLimit, topLimit });

  return {
    totals: {
      totalSales: toNumber(dashboard.totals?.total_sales),
      totalRevenue: toNumber(dashboard.totals?.total_revenue),
      totalDiscount: toNumber(dashboard.totals?.total_discount),
      totalTax: toNumber(dashboard.totals?.total_tax),
      averageTransactionValue: toNumber(dashboard.totals?.average_transaction_value),
      completedSales: toNumber(dashboard.totals?.completed_sales),
      refundedSales: toNumber(dashboard.totals?.refunded_sales),
      voidedSales: toNumber(dashboard.totals?.voided_sales),
      todaySales: toNumber(dashboard.totals?.today_sales),
      todayRevenue: toNumber(dashboard.totals?.today_revenue),
    },
    paymentBreakdown: dashboard.paymentBreakdown.map((row) => ({
      paymentMethod: row.payment_method,
      count: toNumber(row.count),
      revenue: toNumber(row.revenue),
    })),
    statusBreakdown: dashboard.statusBreakdown.map((row) => ({
      status: row.status,
      count: toNumber(row.count),
      revenue: toNumber(row.revenue),
    })),
    dailyRevenue: dashboard.dailyRevenue.map((row) => ({
      day: row.day,
      salesCount: toNumber(row.sales_count),
      revenue: toNumber(row.revenue),
      discount: toNumber(row.discount),
      tax: toNumber(row.tax),
    })),
    recentSales: dashboard.recentSales.map((sale) => mapSale(sale)),
    topMedicines: dashboard.topMedicines.map((row) => ({
      medicineId: row.medicine_id,
      medicineName: row.medicine_name,
      totalQuantitySold: toNumber(row.total_quantity_sold),
      totalRevenue: toNumber(row.total_revenue),
      totalTransactions: toNumber(row.total_transactions),
    })),
  };
}
