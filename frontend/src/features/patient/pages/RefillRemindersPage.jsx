import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

export default function RefillRemindersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['refills'],
    queryFn: async () => { const r = await api.get('/refills'); return r.data.data; },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id) => { await api.put(`/refills/${id}/cancel`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['refills'] }); toast({ title: 'Reminder cancelled' }); },
  });

  const statusColor = { ACTIVE: 'bg-green-100 text-green-800', SENT: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-gray-100 text-gray-800', CANCELLED: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Refill Reminders</h2>
        <p className="text-muted-foreground">Track and manage your medication refill schedule</p>
      </div>
      {isLoading ? <p>Loading...</p> : !reminders?.length ? <p className="text-muted-foreground">No refill reminders yet.</p> : (
        <div className="grid gap-4">
          {reminders.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.medicine_name}</p>
                    <p className="text-sm text-muted-foreground">Next refill: {r.next_refill_date || 'Not set'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor[r.status] || ''}>{r.status}</Badge>
                    {r.status === 'ACTIVE' && (
                      <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(r.id)}>Cancel</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
