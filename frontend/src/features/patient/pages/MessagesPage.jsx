import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MessagingShell, ListHeader, ConversationRow, ConversationSkeletons, EmptyList, EmptyChat } from '@/components/chat/ChatUI'
import ChatPage from './ChatPage'

function NewConversationDialog({ open, onOpenChange }) {
  const qc = useQueryClient(); const navigate = useNavigate()
  const [subject,setSubject]=useState(''); const [message,setMessage]=useState(''); const [contextType,setContextType]=useState('GENERAL')
  const create = useMutation({ mutationFn:()=>api.post('/chat/conversations',{subject:subject.trim(),message:message.trim(),contextType}), onSuccess:(r)=>{const id=r?.data?.data?.id;qc.invalidateQueries({queryKey:['patient-conversations']});onOpenChange(false);setSubject('');setMessage('');if(id)navigate(`/patient/messages/${id}`);toast.success('Your conversation is ready')}, onError:(error)=>toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Conversation could not be started') })
  const canSubmit = subject.trim().length >= 2 && message.trim().length > 0
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-lg"><div className="bg-primary px-6 py-6 text-primary-foreground"><DialogHeader><DialogTitle className="text-xl">How can we help?</DialogTitle></DialogHeader><p className="mt-1 text-sm text-primary-foreground/70">Start a secure conversation with our pharmacy care team.</p></div><form onSubmit={e=>{e.preventDefault();if(canSubmit)create.mutate()}} className="space-y-4 p-6"><div className="space-y-2"><Label>Topic</Label><select value={contextType} onChange={e=>setContextType(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="GENERAL">General question</option><option value="MEDICINE">Medicine inquiry</option><option value="PRESCRIPTION">Prescription</option><option value="ORDER">Order</option><option value="ALLERGY">Allergy concern</option></select></div><div className="space-y-2"><Label>Subject</Label><Input required minLength={2} maxLength={300} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="A short title for your question" className="h-11 rounded-xl"/></div><div className="space-y-2"><Label>Your message</Label><Textarea required maxLength={5000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what you need help with…" rows={5} className="rounded-xl"/></div><Button type="submit" className="h-11 w-full rounded-xl" disabled={!canSubmit || create.isPending}>{create.isPending?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Starting…</>:'Start secure conversation'}</Button></form></DialogContent></Dialog>
}

export default function MessagesPage() {
  const { id }=useParams(); const navigate=useNavigate(); const [search,setSearch]=useState(''); const [open,setOpen]=useState(false)
  const query=useQuery({queryKey:['patient-conversations'],queryFn:()=>api.get('/chat/conversations?limit=50').then(r=>r.data),refetchInterval:10000})
  const conversations=query.data?.data||[]; const needle=search.toLowerCase(); const filtered=conversations.filter(c=>`${c.subject} ${c.lastMessage} ${c.pharmacistName}`.toLowerCase().includes(needle))
  const list=<><ListHeader title="Messages" subtitle="Your Urumuli pharmacy care team" search={search} onSearch={setSearch} action={<Button size="icon" onClick={()=>setOpen(true)} className="h-10 w-10 rounded-xl shadow-md shadow-foreground/10"><Plus className="h-5 w-5"/></Button>}/><div className="flex-1 overflow-y-auto">{query.isLoading?<ConversationSkeletons/>:filtered.length?filtered.map(c=><ConversationRow key={c.id} conversation={c} selected={c.id===id} onClick={()=>navigate(`/patient/messages/${c.id}`)}/>):<EmptyList search={search}/>}</div><button onClick={()=>setOpen(true)} className="m-4 rounded-2xl border border-dashed bg-muted/60 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-accent"><Plus className="mr-1 inline h-4 w-4"/> Start a new conversation</button></>
  return <><MessagingShell list={list} hasSelection={!!id}>{id?<ChatPage conversationId={id} onBack={()=>navigate('/patient/messages')}/>:<EmptyChat patient/>}</MessagingShell><NewConversationDialog open={open} onOpenChange={setOpen}/></>
}
