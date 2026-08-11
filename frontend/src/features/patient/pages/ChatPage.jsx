import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChatHeader, Composer, MessageHistory } from '@/components/chat/ChatUI'

export default function ChatPage({ conversationId, onBack }) {
  const id=conversationId; const qc=useQueryClient(); const [text,setText]=useState('')
  const conversation=useQuery({queryKey:['conversation',id],queryFn:()=>api.get(`/chat/conversations/${id}`).then(r=>r.data.data),enabled:!!id})
  const messages=useQuery({queryKey:['messages',id],queryFn:()=>api.get(`/chat/conversations/${id}/messages?limit=100`).then(r=>r.data),enabled:!!id,refetchInterval:4000})
  const refresh=()=>{qc.invalidateQueries({queryKey:['messages',id]});qc.invalidateQueries({queryKey:['conversation',id]});qc.invalidateQueries({queryKey:['patient-conversations']})}
  const send=useMutation({mutationFn:()=>api.post(`/chat/conversations/${id}/messages`,{content:text.trim()}),onSuccess:()=>{setText('');refresh()},onError:()=>toast.error('Message could not be sent')})
  const status=useMutation({mutationFn:(type)=>api.put(`/chat/conversations/${id}/${type}`),onSuccess:(_,type)=>{refresh();toast.success(type==='reopen'?'Conversation reopened':'Conversation closed')}})
  useEffect(()=>{if(id)api.put(`/chat/conversations/${id}/read`).then(()=>qc.invalidateQueries({queryKey:['patient-conversations']})).catch(()=>{})},[id])
  const c=conversation.data; const name=c?.pharmacistName||'Urumuli care team'
  const actions=<>{c?.status==='CLOSED'?<Button variant="outline" size="sm" className="rounded-xl" onClick={()=>status.mutate('reopen')}><RotateCcw className="mr-2 h-4 w-4"/>Reopen</Button>:<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>status.mutate('close')}>Close conversation</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</>
  return <div className="flex h-full flex-col"><ChatHeader name={name} subject={c?.subject||'Loading conversation…'} status={c?.status} onBack={onBack} actions={actions}/><div className="min-h-0 flex-1"><MessageHistory messages={messages.data?.data||[]} loading={messages.isLoading||conversation.isLoading} ownRole="PATIENT"/></div><Composer value={text} onChange={setText} onSend={()=>send.mutate()} pending={send.isPending} disabled={c?.status==='CLOSED'} placeholder="Message your pharmacist…"/></div>
}
