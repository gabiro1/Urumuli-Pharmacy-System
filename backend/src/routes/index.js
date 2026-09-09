import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import prescriptionRoutes from '../modules/prescription/prescription.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import chatRoutes from '../modules/chat/chat.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import salesRoutes from '../modules/sales/sales.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import safetyRoutes from '../modules/safety/safety.routes.js';
import partnerRoutes from '../modules/partners/partners.routes.js';
import contactRoutes from '../modules/contact/contact.routes.js';
import notificationRoutes from '../modules/notifications/notifications.routes.js';
import orderRoutes from '../modules/orders/orders.routes.js';
import pharmacyRoutes from '../modules/pharmacy/pharmacy.routes.js';
import expiryRoutes from '../modules/expiry/expiry.routes.js';
import medicationHistoryRoutes from '../modules/medication-history/medication-history.routes.js';
import dispensingRoutes from '../modules/dispensing/dispensing.routes.js';
import deliveryRoutes from '../modules/delivery/delivery.routes.js';
import operatingHoursRoutes from '../modules/operating-hours/operating-hours.routes.js';
import consentRoutes from '../modules/consent/consent.routes.js';
import refillRoutes from '../modules/refills/refills.routes.js';
import substitutionRoutes from '../modules/substitutions/substitutions.routes.js';
import insuranceRoutes from '../modules/insurance/insurance.routes.js';
import controlledSubstanceRoutes from '../modules/controlled-substances/controlled-substances.routes.js';
import transferRoutes from '../modules/transfers/transfers.routes.js';
import adherenceRoutes from '../modules/adherence/adherence.routes.js';
import feedbackRoutes from '../modules/feedback/feedback.routes.js';
import telehealthRoutes from '../modules/telehealth/telehealth.routes.js';
import reorderRoutes from '../modules/reorder/reorder.routes.js';
import regulatoryRoutes from '../modules/regulatory/regulatory.routes.js';
import * as inventoryController from '../modules/inventory/inventory.controller.js';
import { healthCheck, getPoolStats } from '../config/database.js';
import { healthCheckRedis } from '../config/redis.js';
import { optionalAuth } from '../middlewares/authenticate.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/audit', auditRoutes);
router.use('/chat', chatRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/safety', safetyRoutes);
router.use('/partners', partnerRoutes);
router.use('/contact', contactRoutes);
router.use('/notifications', notificationRoutes);
router.use('/orders', orderRoutes);
router.use('/pharmacies', pharmacyRoutes);
router.use('/expiry-alerts', expiryRoutes);
router.use('/medication-history', medicationHistoryRoutes);
router.use('/dispensing', dispensingRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/operating-hours', operatingHoursRoutes);
router.use('/consents', consentRoutes);
router.use('/refills', refillRoutes);
router.use('/substitutions', substitutionRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/controlled-substances', controlledSubstanceRoutes);
router.use('/transfers', transferRoutes);
router.use('/adherence', adherenceRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/telehealth', telehealthRoutes);
router.use('/reorder', reorderRoutes);
router.use('/regulatory', regulatoryRoutes);
router.get('/search/autocomplete', optionalAuth, inventoryController.autocompleteMedicines);
router.get('/search', optionalAuth, inventoryController.searchMedicines);

router.get('/health', async (req, res) => {
  const [dbHealthy, redisHealthy] = await Promise.all([
    healthCheck(),
    healthCheckRedis().catch(() => false),
  ]);

  const poolStats = getPoolStats();

  const status = dbHealthy ? 'healthy' : 'degraded';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: true,
    data: {
      service: 'Urumuli Pharmacy Prescription System',
      version: '1.0.0',
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: { status: dbHealthy ? 'up' : 'down', ...poolStats },
        redis: { status: redisHealthy ? 'up' : 'down' },
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      },
    },
  });
});

export default router;
