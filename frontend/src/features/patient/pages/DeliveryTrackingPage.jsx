import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const STATUS_STEPS = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function DeliveryTimeline({ status }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-2 mt-3">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${i <= currentIdx ? 'bg-green-500' : 'bg-gray-300'}`} />
          {i < STATUS_STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < currentIdx ? 'bg-green-500' : 'bg-gray-300'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function DeliveryTrackingPage() {
  const { data: orders } = useQuery({
    queryKey: ['patient-orders'],
    queryFn: async () => { const r = await api.get('/orders/my'); return r.data.data; },
  });

  const ordersWithDelivery = (orders || []).filter(o => ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'COMPLETED'].includes(o.status));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Delivery Tracking</h2>
        <p className="text-muted-foreground">Track your order deliveries</p>
      </div>
      {!ordersWithDelivery.length ? <p className="text-muted-foreground">No active deliveries.</p> : (
        <div className="grid gap-4">
          {ordersWithDelivery.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #{o.id?.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">{o.status.replace(/_/g, ' ')}</p>
                  </div>
                  <Badge>{o.status}</Badge>
                </div>
                <DeliveryTimeline status={o.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
