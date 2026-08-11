import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, UserRoundCheck } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChatHeader, MessageHistory, Composer } from '@/components/chat/ChatUI'

export default function ConversationView({ conversationId, onBack }) {
  const id = conversationId
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [privateNote, setPrivateNote] = useState(false)
  const conversation = useQuery({ queryKey:['pharmacist-conversation',id], queryFn:()=>api.get(`/chat/conversations/${id}`).then(r=>r.data.data), enabled:!!id })
  const messages = useQuery({ queryKey:['pharmacist-messages',id], queryFn:()=>api.get(`/chat/conversations/${id}/messages?limit=100`).then(r=>r.data), enabled:!!id, refetchInterval:3000 })
  const canned = useQuery({ queryKey:['canned-replies'], queryFn:()=>api.get('/chat/canned-replies').then(r=>r.data.data || []) })
  const invalidate = () => { qc.invalidateQueries({queryKey:['pharmacist-messages',id]}); qc.invalidateQueries({queryKey:['pharmacist-conversation',id]}); qc.invalidateQueries({queryKey:['pharmacist-inbox']}); qc.invalidateQueries({queryKey:['open-conversations']}) }
  const send = useMutation({ mutationFn:()=>api.post(`/chat/conversations/${id}/messages`,{content:text.trim(),isPrivateNote:privateNote}), onSuccess:()=>{setText('');setPrivateNote(false);invalidate()}, onError:()=>toast.error('Message could not be sent') })
  const action = useMutation({ mutationFn:(type)=>api.put(`/chat/conversations/${id}/${type}`), onSuccess:(_,type)=>{invalidate();toast.success(type === 'assign' ? 'Conversation assigned to you' : 'Conversation closed')} })
  useEffect(()=>{ if(id) api.put(`/chat/conversations/${id}/read`).then(()=>qc.invalidateQueries({queryKey:['pharmacist-inbox']})).catch(()=>{}) },[id])
  const c = conversation.data
  return <div className="flex h-full flex-col">
    <ChatHeader name={c?.patientName || 'Patient'} subject={c?.subject || 'Loading conversation…'} status={c?.status} onBack={onBack} actions={<div className="flex items-center gap-1">{c && !c.assignedPharmacistId && <Button size="sm" variant="outline" className="hidden rounded-xl sm:flex" onClick={()=>action.mutate('assign')}><UserRoundCheck className="mr-2 h-4 w-4"/>Assign to me</Button>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={c?.status==='CLOSED'} onClick={()=>action.mutate('close')}>Close conversation</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>}/>
    <div className="min-h-0 flex-1"><MessageHistory messages={messages.data?.data || []} loading={messages.isLoading || conversation.isLoading} ownRole="STAFF"/></div>
    <Composer value={text} onChange={setText} onSend={()=>send.mutate()} pending={send.isPending} disabled={c?.status==='CLOSED'} placeholder="Reply to the patient…" privateNote={privateNote} onTogglePrivate={()=>setPrivateNote(v=>!v)} quickReplies={canned.data || []}/>
  </div>
}
