import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { useState } from 'react';

export default function ControlledSubstancesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['controlled-substances', page],
    queryFn: async () => { const r = await api.get('/controlled-substances', { params: { page, limit: 20 } }); return r.data; },
  });

  const { data: summary } = useQuery({
    queryKey: ['cs-summary'],
    queryFn: async () => { const r = await api.get('/controlled-substances/summary'); return r.data.data; },
  });

  const entries = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Controlled Substance Register</h2><p className="text-muted-foreground">Track controlled substance transactions</p></div>

      {summary?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summary.map((s) => (
            <Card key={s.schedule}><CardContent className="p-4"><p className="text-lg font-bold">Schedule {s.schedule}</p><p className="text-sm text-muted-foreground">{s.total_quantity} units | {s.unique_medicines} medicines</p></CardContent></Card>
          ))}
        </div>
      )}

      {isLoading ? <p>Loading...</p> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Pharmacist</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{e.medicine_name}</TableCell>
                    <TableCell><Badge>{e.schedule}</Badge></TableCell>
                    <TableCell>{e.transaction_type}</TableCell>
                    <TableCell>{e.quantity}</TableCell>
                    <TableCell>{e.pharmacist_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {meta.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="py-2 text-sm">Page {page} of {meta.pages}</span>
          <Button variant="outline" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function Button({ variant, size, disabled, onClick, children, className }) {
  return <button className={`px-3 py-1.5 rounded-md text-sm font-medium ${disabled ? 'opacity-50' : ''} ${variant === 'outline' ? 'border' : 'bg-primary text-primary-foreground'} ${className || ''}`} disabled={disabled} onClick={onClick}>{children}</button>;
}
