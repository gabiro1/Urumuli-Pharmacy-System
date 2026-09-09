import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import { useState } from 'react';

const alertColors = { EXPIRED: 'bg-red-100 text-red-800', THIRTY_DAY: 'bg-orange-100 text-orange-800', SIXTY_DAY: 'bg-yellow-100 text-yellow-800', NINETY_DAY: 'bg-blue-100 text-blue-800' };

export default function ExpiryAlertsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ACTIVE');

  const { data, isLoading } = useQuery({
    queryKey: ['expiry-alerts', filter],
    queryFn: async () => { const r = await api.get('/expiry-alerts', { params: { status: filter } }); return r.data; },
  });

  const { data: stats } = useQuery({
    queryKey: ['expiry-stats'],
    queryFn: async () => { const r = await api.get('/expiry-alerts/stats'); return r.data.data; },
  });

  const ackMutation = useMutation({
    mutationFn: async (id) => { await api.put(`/expiry-alerts/${id}/acknowledge`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expiry-alerts'] }); toast({ title: 'Alert acknowledged' }); },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id) => { await api.put(`/expiry-alerts/${id}/dismiss`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expiry-alerts'] }); toast({ title: 'Alert dismissed' }); },
  });

  const scanMutation = useMutation({
    mutationFn: async () => { const r = await api.post('/expiry-alerts/scan'); return r.data; },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['expiry-alerts'] }); toast({ title: `Scan complete: ${r.data?.scanned || 0} new alerts` }); },
  });

  const alerts = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Expiry Alerts</h2><p className="text-muted-foreground">Monitor medicine expiry dates</p></div>
        <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>Run Scan</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats).filter(([k]) => k !== 'acknowledged_count' && k !== 'disposed_count').map(([k, v]) => (
            <Card key={k}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{v}</p><p className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="ACTIVE">Active</TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED">Acknowledged</TabsTrigger>
          <TabsTrigger value="DISPOSED">Disposed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? <p>Loading...</p> : !alerts.length ? <p className="text-muted-foreground">No alerts.</p> : (
        <div className="grid gap-3">
          {alerts.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{a.medicine_name}</p>
                  <p className="text-sm text-muted-foreground">Batch: {a.batch_number} | Expires: {new Date(a.expiry_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={alertColors[a.alert_type]}>{a.alert_type.replace(/_/g, ' ')}</Badge>
                  {a.status === 'ACTIVE' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => ackMutation.mutate(a.id)}>Acknowledge</Button>
                      <Button variant="ghost" size="sm" onClick={() => dismissMutation.mutate(a.id)}>Dismiss</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
