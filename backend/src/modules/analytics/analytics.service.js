import { mapMedicine, mapSale } from '../../utils/serializers.js';
import * as inventoryRepository from '../inventory/inventory.repository.js';
import * as salesRepository from '../sales/sales.repository.js';
import * as analyticsRepository from './analytics.repository.js';
import { cacheRemember } from '../../services/redis.service.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

export async function getOverview(queryParams) {
  const days = Math.min(365, Math.max(7, parseInt(queryParams.days, 10) || 30));
  const cacheKey = `analytics:overview:${days}`;

  return cacheRemember(cacheKey, 60, async () => {
    const [salesDashboard, inventorySummary, prescriptionSummary, systemHealth, lowStockMedicines, expiringBatches, profitSummary, demandForecast] = await Promise.all([
      salesRepository.getDashboardData({ days, recentLimit: 10, topLimit: 10 }),
      inventoryRepository.getInventorySummary(),
      analyticsRepository.getPrescriptionSummary(),
      analyticsRepository.getLatestSystemHealth(),
      analyticsRepository.getLowStockMedicines(10),
      analyticsRepository.getExpiringBatches(10),
      analyticsRepository.getProfitSummary({ days }),
      analyticsRepository.getDemandForecast({ days, horizon: 14, top: 8 }),
    ]);

    const revenue = toNumber(profitSummary.totals?.revenue);
    const costOfGoods = toNumber(profitSummary.totals?.cost_of_goods);
    const grossProfit = revenue - costOfGoods;

    return {
      periodDays: days,
      profit: {
        revenue,
        costOfGoods,
        grossProfit: round2(grossProfit),
        margin: revenue > 0 ? round2((grossProfit / revenue) * 100) : 0,
        transactions: toNumber(profitSummary.totals?.transactions),
        daily: profitSummary.daily.map((row) => ({
          day: row.day,
          revenue: round2(row.revenue),
          costOfGoods: round2(row.cost_of_goods),
          profit: round2(toNumber(row.revenue) - toNumber(row.cost_of_goods)),
        })),
      },
      demandForecast: {
        horizonDays: 14,
        items: demandForecast.map((row) => ({
          medicineId: row.medicine_id,
          medicineName: row.medicine_name,
          genericName: row.generic_name,
          currentStock: toNumber(row.current_stock),
          reorderPoint: toNumber(row.reorder_point),
          totalQuantitySold: toNumber(row.total_qty),
          avgDailyQty: round2(row.avg_daily_qty),
          forecastQty: round2(row.forecast_qty),
          stockGap: round2(row.stock_gap),
          needsRestock: toNumber(row.stock_gap) > 0,
        })),
      },
      sales: {
        totals: {
          totalSales: toNumber(salesDashboard.totals?.total_sales),
          totalRevenue: toNumber(salesDashboard.totals?.total_revenue),
          totalDiscount: toNumber(salesDashboard.totals?.total_discount),
          totalTax: toNumber(salesDashboard.totals?.total_tax),
          averageTransactionValue: toNumber(salesDashboard.totals?.average_transaction_value),
          completedSales: toNumber(salesDashboard.totals?.completed_sales),
          refundedSales: toNumber(salesDashboard.totals?.refunded_sales),
          voidedSales: toNumber(salesDashboard.totals?.voided_sales),
          todaySales: toNumber(salesDashboard.totals?.today_sales),
          todayRevenue: toNumber(salesDashboard.totals?.today_revenue),
        },
        dailyRevenue: salesDashboard.dailyRevenue.map((row) => ({
          day: row.day,
          salesCount: toNumber(row.sales_count),
          revenue: toNumber(row.revenue),
          discount: toNumber(row.discount),
          tax: toNumber(row.tax),
        })),
        paymentBreakdown: salesDashboard.paymentBreakdown.map((row) => ({
          paymentMethod: row.payment_method,
          count: toNumber(row.count),
          revenue: toNumber(row.revenue),
        })),
        statusBreakdown: salesDashboard.statusBreakdown.map((row) => ({
          status: row.status,
          count: toNumber(row.count),
          revenue: toNumber(row.revenue),
        })),
        recentSales: salesDashboard.recentSales.map((sale) => mapSale(sale)),
        topMedicines: salesDashboard.topMedicines.map((row) => ({
          medicineId: row.medicine_id,
          medicineName: row.medicine_name,
          totalQuantitySold: toNumber(row.total_quantity_sold),
          totalRevenue: toNumber(row.total_revenue),
          totalTransactions: toNumber(row.total_transactions),
        })),
      },
      inventory: {
        ...inventorySummary,
        lowStockMedicines: lowStockMedicines.map((medicine) => mapMedicine(medicine)),
        expiringBatches: expiringBatches.map((batch) => ({
          id: batch.id,
          batchNumber: batch.batch_number,
          medicineId: batch.medicine_id,
          medicineName: batch.medicine_name,
          genericName: batch.generic_name,
          brandName: batch.brand_name,
          categoryName: batch.category_name,
          supplierName: batch.supplier_name,
          quantity: Number(batch.quantity || 0),
          remainingQuantity: Number(batch.remaining_quantity || 0),
          unitCost: Number(batch.unit_cost || 0),
          sellingPrice: batch.selling_price !== null && batch.selling_price !== undefined ? Number(batch.selling_price) : null,
          manufacturingDate: batch.manufacturing_date || null,
          expiryDate: batch.expiry_date || null,
          receivedDate: batch.received_date || null,
          isExpired: batch.is_expired,
        })),
      },
      prescriptions: {
        total: toNumber(prescriptionSummary?.total),
        pending: toNumber(prescriptionSummary?.pending),
        underReview: toNumber(prescriptionSummary?.under_review),
        approved: toNumber(prescriptionSummary?.approved),
        completed: toNumber(prescriptionSummary?.completed),
        rejected: toNumber(prescriptionSummary?.rejected),
      },
      systemHealth: systemHealth.map((entry) => ({
        ...entry,
        checkedAt: entry.checked_at || null,
      })),
    };
  });
}
