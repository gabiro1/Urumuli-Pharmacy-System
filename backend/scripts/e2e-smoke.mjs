const BASE = 'http://localhost:4000/api/v1';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name} ${extra}`); }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

// 1. Login
const login = await api('/auth/login', {
  method: 'POST',
  body: { email: 'e2e-admin@test.com', password: 'TestPass@123' },
});
check('login returns 200', login.status === 200, JSON.stringify(login.json));
const token = login.json?.data?.tokens?.accessToken || login.json?.data?.accessToken;
check('login returns accessToken', !!token);

// 2. Suppliers
const suppliers = await api('/inventory/suppliers', { token });
check('list suppliers 200', suppliers.status === 200, JSON.stringify(suppliers.json));
const supplier = await api('/inventory/suppliers', {
  method: 'POST',
  token,
  body: { name: 'E2E Pharma Wholesale', contactPerson: 'Jane Doe', phone: '+250700000099', email: 'wholesale@e2e.com', address: 'Kigali, Rwanda', isActive: true },
});
check('create supplier 201', supplier.status === 201, JSON.stringify(supplier.json));
const supplierId = supplier.json?.data?.id;
check('supplier has id', !!supplierId);

// 3. Find a medicine
const search = await api('/inventory/medicines?limit=3', { token });
check('list medicines 200', search.status === 200, JSON.stringify(search.json));
const med = search.json?.data?.[0];
check('found medicine', !!med?.id, JSON.stringify(med));
const medId = med?.id;

// 4. Batches
const batches = await api('/inventory/batches', { token });
check('list batches 200', batches.status === 200, JSON.stringify(batches.json));
const batch = await api('/inventory/batches', {
  method: 'POST',
  token,
  body: { medicineId: medId, batchNumber: 'E2E-BATCH-001', supplierId, quantity: 120, costPerUnit: med?.costPrice || 50, expiryDate: '2028-12-31' },
});
check('create batch 201', batch.status === 201, JSON.stringify(batch.json));
const batchId = batch.json?.data?.id;
check('batch has id', !!batchId);

// 5. Stock movements after batch
const movements = await api('/inventory/stock-movements?limit=5', { token });
check('list stock movements 200', movements.status === 200, JSON.stringify(movements.json));

// 6. Stock adjust
const adjust = await api('/inventory/stock-adjust', {
  method: 'POST',
  token,
  body: { medicineId: medId, quantity: 10, reason: 'E2E adjustment', notes: 'manual count correction' },
});
check('stock adjust 200/201', [200, 201].includes(adjust.status), JSON.stringify(adjust.json));

// 7. Create sale (POS)
const sale = await api('/sales', {
  method: 'POST',
  token,
  body: {
    items: [{ medicineId: medId, quantity: 2 }],
    customer: { name: 'E2E Customer', phone: '+250700000088' },
    paymentMethod: 'CASH',
    amountTendered: 50000,
    discountAmount: 0,
    taxAmount: 0,
    notes: 'e2e test sale',
  },
});
check('create sale 201', sale.status === 201, JSON.stringify(sale.json));
const saleId = sale.json?.data?.id;
check('sale has id', !!saleId);

// 8. Sale receipt
if (saleId) {
  const receipt = await api(`/sales/${saleId}/receipt`, { token });
  check('get receipt 200', receipt.status === 200, JSON.stringify(receipt.json));

  const getSale = await api(`/sales/${saleId}`, { token });
  check('get sale 200', getSale.status === 200, JSON.stringify(getSale.json));

  // 9. Refund
  const refund = await api(`/sales/${saleId}/refund`, { method: 'POST', token, body: { reason: 'e2e refund' } });
  check('refund sale 200', refund.status === 200, JSON.stringify(refund.json));

  const refunded = await api(`/sales/${saleId}`, { token });
  check('sale now REFUNDED', refunded.json?.data?.status === 'REFUNDED', JSON.stringify(refunded.json?.data?.status));
}

// 10. Analytics endpoint
const analytics = await api('/analytics/overview', { token });
check('analytics overview reachable', analytics.status === 200, JSON.stringify(analytics.json?.error || analytics.json?.message));

// 11. Contact public message
const contact = await api('/contact', {
  method: 'POST',
  body: { name: 'E2E Visitor', email: 'visitor@e2e.com', subject: 'Test', message: 'This is a test contact message with enough length to pass validation.' },
});
check('public contact create 201', contact.status === 201, JSON.stringify(contact.json));
const contactId = contact.json?.data?.id;

// 12. Contact admin inbox
const inbox = await api('/contact', { token });
check('contact inbox list 200', inbox.status === 200, JSON.stringify(inbox.json));
const inboxMsg = inbox.json?.data?.find((m) => m.id === contactId);
check('inbox contains new message', !!inboxMsg);

// 13. Update contact status
const statusUpdate = await api(`/contact/${contactId}/status`, { method: 'PATCH', token, body: { status: 'RESOLVED' } });
check('contact status update 200', statusUpdate.status === 200, JSON.stringify(statusUpdate.json));

// 14. Notifications
const notifs = await api('/notifications', { token });
check('notifications list 200', notifs.status === 200, JSON.stringify(notifs.json));
const unread = await api('/notifications/unread-count', { token });
check('notifications unread-count 200', unread.status === 200, JSON.stringify(unread.json));
const firstNotif = notifs.json?.data?.[0];
if (firstNotif?.id) {
  const markRead = await api(`/notifications/${firstNotif.id}/read`, { method: 'PUT', token });
  check('mark notification read 200', markRead.status === 200, JSON.stringify(markRead.json));
}
const markAll = await api('/notifications/read-all', { method: 'PUT', token });
check('mark all read 200', markAll.status === 200, JSON.stringify(markAll.json));

console.log(failures === 0 ? '\nALL E2E CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
