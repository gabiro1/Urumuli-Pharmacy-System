import * as expiryRepository from './expiry.repository.js';
import { createNotification } from '../../services/notification.service.js';
import { query } from '../../config/database.js';

export async function listAlerts(filters) {
  return expiryRepository.listExpiryAlerts(filters);
}

export async function getStats() {
  return expiryRepository.getExpiryStats();
}

export async function acknowledgeAlert(alertId, userId) {
  const alert = await expiryRepository.acknowledgeAlert(alertId, userId);
  if (!alert) throw new Error('Alert not found or already processed');
  return alert;
}

export async function dismissAlert(alertId, userId) {
  const alert = await expiryRepository.dismissAlert(alertId, userId);
  if (!alert) throw new Error('Alert not found');
  return alert;
}

export async function markDisposed(alertId, userId) {
  const alert = await expiryRepository.markDisposed(alertId, userId);
  if (!alert) throw new Error('Alert not found');
  
  await query(
    `UPDATE stock_batches SET quantity = 0 WHERE id = $1`,
    [alert.stock_batch_id]
  );
  
  return alert;
}

export async function runExpiryScan() {
  const batches = await expiryRepository.scanExpiringBatches();
  
  for (const batch of batches) {
    const alert = await expiryRepository.createExpiryAlert({
      stockBatchId: batch.stock_batch_id,
      medicineId: batch.medicine_id,
      alertType: batch.alert_type,
    });

    const { rows: staff } = await query(
      `SELECT DISTINCT pm.user_id FROM pharmacy_memberships pm
       WHERE pm.role IN ('ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER')
       AND pm.status = 'ACTIVE'`
    );

    for (const s of staff) {
      await createNotification({
        userId: s.user_id,
        type: 'EXPIRY_ALERT',
        title: batch.alert_type === 'EXPIRED'
          ? `EXPIRED: ${batch.medicine_name} has expired`
          : `Expiry Warning: ${batch.medicine_name} expires on ${batch.expiry_date}`,
        message: `Batch quantity: ${batch.quantity}. Alert type: ${batch.alert_type}`,
        referenceType: 'MEDICINE',
        referenceId: batch.medicine_id,
      });
    }
  }
  
  return { scanned: batches.length };
}
