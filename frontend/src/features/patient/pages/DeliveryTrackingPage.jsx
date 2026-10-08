import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Truck, PackageCheck, MapPin, Phone, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';
import api from '@/lib/api';

const STATUS_STEPS = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const STATUS_LABEL = {
  PENDING: 'Preparing for dispatch',
  PICKED_UP: 'Collected from the pharmacy',
  IN_TRANSIT: 'On the way',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery attempt failed',
  RETURNED: 'Returned to the pharmacy',
  CANCELLED: 'Delivery cancelled',
};

const STATUS_COLOR = {
  PENDING: 'yellow',
  PICKED_UP: 'blue',
  IN_TRANSIT: 'blue',
  OUT_FOR_DELIVERY: 'purple',
  DELIVERED: 'green',
  FAILED: 'red',
  RETURNED: 'orange',
  CANCELLED: 'default',
};

const EXCEPTIONS = ['FAILED', 'RETURNED', 'CANCELLED'];

function DeliveryTimeline({ status, actualDelivery }) {
  const isException = EXCEPTIONS.includes(status);
  const currentIdx = isException ? -1 : STATUS_STEPS.indexOf(status);
  const delivered = status === 'DELIVERED';

  return (
    <div className="mt-4">
      <ol className="flex items-center gap-1.5">
        {STATUS_STEPS.map((step, i) => {
          const done = delivered || (currentIdx >= 0 && i < currentIdx);
          const active = !delivered && i === currentIdx;
          return (
            <li key={step} title={STATUS_LABEL[step]} className="h-1.5 flex-1">
              <div
                className={cn(
                  'h-full rounded-full transition-colors',
                  done && 'bg-green-500',
                  active && 'bg-primary',
                  !done && !active && (isException ? 'bg-red-200' : 'bg-muted')
                )}
              />
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        {STATUS_LABEL[status] || status}
        {delivered && actualDelivery ? ` on ${formatDate(actualDelivery)}` : ''}
      </p>
    </div>
  );
}

export default function DeliveryTrackingPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-deliveries'],
    queryFn: () => api.get('/delivery/mine?limit=20').then((r) => r.data.data || []),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Delivery Tracking</h2>
        <p className="text-muted-foreground">Follow every order we are bringing to you.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-1.5 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium">Your deliveries could not be loaded</p>
            <p className="text-xs text-muted-foreground max-w-xs">{getApiErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : !data?.length ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed py-14 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Truck className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No deliveries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Orders placed for delivery will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium">{d.public_reference}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.item_count} item{d.item_count === 1 ? '' : 's'} · ordered{' '}
                      {formatRelativeTime(d.order_created_at)}
                    </p>
                  </div>
                  <Badge color={STATUS_COLOR[d.status] || 'default'}>
                    {STATUS_LABEL[d.status] || d.status}
                  </Badge>
                </div>

                <DeliveryTimeline status={d.status} actualDelivery={d.actual_delivery} />

                {(d.delivery_address || d.order_delivery_address) && (
                  <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {d.delivery_address || d.order_delivery_address}
                  </p>
                )}

                {d.status === 'DELIVERED' && d.receiver_name && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Received by {d.receiver_name}
                  </p>
                )}

                {d.status === 'FAILED' && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {d.failure_reason || 'We could not complete this delivery. Our team will contact you.'}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {d.patient_phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {d.patient_phone}
                    </span>
                  )}
                  <Link
                    to={`/orders/${d.order_id}`}
                    className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    View order
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
