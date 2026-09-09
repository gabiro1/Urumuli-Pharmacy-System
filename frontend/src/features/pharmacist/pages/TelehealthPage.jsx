import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const statusColors = { SCHEDULED: 'bg-blue-100 text-blue-800', WAITING: 'bg-yellow-100 text-yellow-800', IN_PROGRESS: 'bg-green-100 text-green-800', COMPLETED: 'bg-gray-100 text-gray-800', CANCELLED: 'bg-red-100 text-red-800' };

export default function TelehealthPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['telehealth'],
    queryFn: async () => { const r = await api.get('/telehealth'); return r.data.data; },
  });

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Telehealth Sessions</h2><p className="text-muted-foreground">Manage video consultations</p></div>
      {isLoading ? <p>Loading...</p> : !sessions?.length ? <p className="text-muted-foreground">No sessions.</p> : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Session with {s.patient_name}</p>
                  <p className="text-sm text-muted-foreground">Pharmacist: {s.pharmacist_name} | {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'Not scheduled'}</p>
                </div>
                <Badge className={statusColors[s.status]}>{s.status.replace(/_/g, ' ')}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
