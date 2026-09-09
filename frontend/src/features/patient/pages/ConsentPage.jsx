import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

const CONSENT_TYPES = [
  { type: 'SMS_NOTIFICATIONS', title: 'SMS Notifications', description: 'Receive order updates and reminders via SMS' },
  { type: 'MARKETING_EMAILS', title: 'Marketing Emails', description: 'Receive promotional offers and health tips' },
  { type: 'PRESCRIPTION_STORAGE', title: 'Prescription Storage', description: 'Allow secure storage of your prescriptions' },
  { type: 'CHAT_RECORDING', title: 'Chat Recording', description: 'Allow recording of chat sessions for quality' },
  { type: 'ANONYMOUS_DATA_RESEARCH', title: 'Anonymous Data Research', description: 'Contribute anonymized data for research' },
  { type: 'INSURANCE_DATA_SHARING', title: 'Insurance Data Sharing', description: 'Share data with your insurance provider' },
  { type: 'TELEHEALTH_CONSENT', title: 'Telehealth Consent', description: 'Consent to video consultation recording' },
];

export default function ConsentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consents = [] } = useQuery({
    queryKey: ['consents'],
    queryFn: async () => { const r = await api.get('/consents'); return r.data.data; },
  });

  const mutation = useMutation({
    mutationFn: async ({ consentType, granted }) => {
      await api.put(`/consents/${consentType}`, { granted });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['consents'] }); toast({ title: 'Consent updated' }); },
    onError: (e) => { toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const consentMap = {};
  (consents || []).forEach(c => { consentMap[c.consent_type] = c.granted; });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Privacy & Consent</h2>
        <p className="text-muted-foreground">Manage your data sharing preferences</p>
      </div>
      <div className="grid gap-4">
        {CONSENT_TYPES.map(({ type, title, description }) => (
          <Card key={type}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">{title}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={consentMap[type] || false}
                onCheckedChange={(checked) => mutation.mutate({ consentType: type, granted: checked })}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
