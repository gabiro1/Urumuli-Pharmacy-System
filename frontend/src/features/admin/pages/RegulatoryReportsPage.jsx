import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import { useState } from 'react';

const REPORT_TYPES = ['MONTHLY_SALES', 'CONTROLLED_SUBSTANCE', 'EXPIRY_WASTE', 'DISPENSING_LOG', 'STOCK_RECONCILIATION', 'PATIENT_OUTCOMES'];

export default function RegulatoryReportsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reportType, setReportType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['regulatory-reports'],
    queryFn: async () => { const r = await api.get('/regulatory'); return r.data; },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = now.toISOString().split('T')[0];
      return api.post('/regulatory', { reportType, periodStart, periodEnd });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-reports'] }); toast({ title: 'Report generated' }); },
    onError: (e) => { toast({ title: 'Error', description: e.response?.data?.error || e.message, variant: 'destructive' }); },
  });

  const reports = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Regulatory Reports</h2><p className="text-muted-foreground">Generate and manage regulatory compliance reports</p></div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Report type" /></SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => generateMutation.mutate()} disabled={!reportType || generateMutation.isPending}>Generate</Button>
        </div>
      </div>

      {isLoading ? <p>Loading...</p> : !reports.length ? <p className="text-muted-foreground">No reports.</p> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.report_type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{r.period_start} to {r.period_end}</TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
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
