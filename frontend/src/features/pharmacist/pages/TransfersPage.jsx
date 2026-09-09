import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';

const statusColors = { PENDING: 'bg-yellow-100 text-yellow-800', APPROVED: 'bg-blue-100 text-blue-800', IN_TRANSIT: 'bg-purple-100 text-purple-800', RECEIVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800' };

export default function TransfersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => { const r = await api.get('/transfers'); return r.data; },
  });

  const transfers = data?.data || [];

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Pharmacy Transfers</h2><p className="text-muted-foreground">Manage inter-pharmacy stock transfers</p></div>
      {isLoading ? <p>Loading...</p> : !transfers.length ? <p className="text-muted-foreground">No transfers.</p> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{t.medicine_name}</TableCell>
                    <TableCell>{t.from_pharmacy_name}</TableCell>
                    <TableCell>{t.to_pharmacy_name}</TableCell>
                    <TableCell>{t.quantity}</TableCell>
                    <TableCell><Badge className={statusColors[t.status]}>{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
