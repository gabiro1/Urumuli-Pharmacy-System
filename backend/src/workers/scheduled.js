import { getQueue, addJob } from '../services/queue.service.js';
import * as refillsService from '../modules/refills/refills.service.js';
import * as expiryService from '../modules/expiry/expiry.service.js';
import * as reorderService from '../modules/reorder/reorder.service.js';
import { createNotification } from '../services/notification.service.js';
import { query } from '../config/database.js';

const SCHEDULED_JOBS = {
  refills: { type: 'process-due-refills', cron: '0 8 * * *' },
  expiry: { type: 'run-expiry-scan', cron: '0 7 * * *' },
  lowStock: { type: 'check-low-stock', cron: '0 */6 * * *' },
};

async function broadcastLowStockAlerts() {
  const suggestions = await reorderService.generateSuggestions();

  const { rows: staff } = await query(
    `SELECT DISTINCT pm.user_id FROM pharmacy_memberships pm
     WHERE pm.role IN ('ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER') AND pm.status = 'ACTIVE'`
  );

  for (const suggestion of suggestions) {
    for (const s of staff) {
      await createNotification({
        userId: s.user_id,
        type: 'LOW_STOCK_ALERT',
        title: `Low stock: ${suggestion.medicine_id}`,
        message: `A medicine has dropped to or below its reorder point. Suggested reorder quantity: ${suggestion.suggested_quantity}.`,
        referenceType: 'MEDICINE',
        referenceId: suggestion.medicine_id,
      });
    }
  }
  return { suggestions: suggestions.length };
}

export function registerScheduledWorkers() {
  const workers = [
    {
      queue: 'refills',
      jobType: SCHEDULED_JOBS.refills.type,
      handler: async () => refillsService.processDueReminders(),
      cron: SCHEDULED_JOBS.refills.cron,
    },
    {
      queue: 'expiry',
      jobType: SCHEDULED_JOBS.expiry.type,
      handler: async () => expiryService.runExpiryScan(),
      cron: SCHEDULED_JOBS.expiry.cron,
    },
    {
      queue: 'inventory',
      jobType: SCHEDULED_JOBS.lowStock.type,
      handler: async () => broadcastLowStockAlerts(),
      cron: SCHEDULED_JOBS.lowStock.cron,
    },
  ];

  for (const worker of workers) {
    const queue = getQueue(worker.queue);

    queue.process(worker.jobType, async (job) => {
      const startedAt = Date.now();
      const result = await worker.handler();
      console.log(`[worker] ${worker.jobType} (job ${job.id}) completed in ${Date.now() - startedAt}ms`, result);
      return result;
    });

    addJob(worker.queue, worker.jobType, {}, {
      repeat: { cron: worker.cron },
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: 50,
    }).catch((err) => {
      console.error(`[worker] failed to schedule ${worker.jobType}:`, err.message);
    });
  }

  console.log('[worker] Scheduled background workers registered');
}
