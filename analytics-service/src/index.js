import { consumeSalesEvents } from './consumer.js';
import { startAggregationCron } from './aggregator.js';

async function main() {
  console.log('Analytics Service starting...');

  await consumeSalesEvents();

  startAggregationCron();

  console.log('Analytics Service running');
}

main().catch((err) => {
  console.error('Analytics Service failed:', err);
  process.exit(1);
});
