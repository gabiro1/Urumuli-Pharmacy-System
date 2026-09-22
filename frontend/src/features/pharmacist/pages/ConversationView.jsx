import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChatHeader, MessageHistory, Composer } from '@/components/chat/ChatUI'
import AvailabilityRequestPanel from '@/components/availability/AvailabilityRequestPanel'

export default function ConversationView({ conversationId, onBack }) {
  const id = conversationId
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [privateNote, setPrivateNote] = useState(false)
  const conversation = useQuery({ queryKey: ['pharmacist-conversation', id], queryFn: () => api.get(`/chat/conversations/${id}`).then(r => r.data.data), enabled: !!id, refetchInterval: 3000 })
  const messages = useQuery({ queryKey: ['pharmacist-messages', id], queryFn: () => api.get(`/chat/conversations/${id}/messages?limit=100`).then(r => r.data), enabled: !!id, refetchInterval: 2000 })
  const availability = useQuery({ queryKey: ['availability-conversation', id], queryFn: () => api.get(`/availability/conversations/${id}`).then(r => r.data.data), enabled: !!id, refetchInterval: 4000 })
  const canned = useQuery({ queryKey: ['canned-replies'], queryFn: () => api.get('/chat/canned-replies').then(r => r.data.data || []) })
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['pharmacist-messages', id] }); qc.invalidateQueries({ queryKey: ['pharmacist-conversation', id] }); qc.invalidateQueries({ queryKey: ['pharmacist-inbox'] }) }
  const send = useMutation({ mutationFn: () => api.post(`/chat/conversations/${id}/messages`, { content: text.trim(), isPrivateNote: privateNote }), onSuccess: () => { setText(''); setPrivateNote(false); invalidate() }, onError: (error) => toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Message could not be sent') })
  const action = useMutation({ mutationFn: (type) => api.put(`/chat/conversations/${id}/${type}`), onSuccess: () => { invalidate(); toast.success('Conversation closed') } })
  useEffect(() => { if (id) api.put(`/chat/conversations/${id}/read`).then(() => qc.invalidateQueries({ queryKey: ['pharmacist-inbox'] })).catch(() => {}) }, [id])
  const c = conversation.data
  return (
    <div className="flex h-full flex-col">
      <ChatHeader name={c?.patientName || 'Patient'} subject={c?.subject || 'Loading conversation…'} status={c?.status} onBack={onBack} actions={<div className="flex items-center gap-1"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={c?.status === 'CLOSED'} onClick={() => action.mutate('close')}>Close conversation</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>} />
      <AvailabilityRequestPanel request={availability.data || null} conversationId={id} />
      <div className="min-h-0 flex-1"><MessageHistory messages={messages.data?.data || []} loading={messages.isLoading || conversation.isLoading} ownRole="STAFF" /></div>
      <Composer value={text} onChange={setText} onSend={() => send.mutate()} pending={send.isPending} disabled={c?.status === 'CLOSED'} placeholder="Reply to the patient…" privateNote={privateNote} onTogglePrivate={() => setPrivateNote(v => !v)} quickReplies={canned.data || []} />
    </div>
  )
}
