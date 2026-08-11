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
