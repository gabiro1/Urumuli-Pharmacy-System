import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import api from '@/lib/api'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessagingShell, ListHeader, ConversationRow, ConversationSkeletons, EmptyList, EmptyChat } from '@/components/chat/ChatUI'
import ConversationView from './ConversationView'

export default function InboxPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const inbox = useQuery({
    queryKey: ['pharmacist-inbox', tab],
    queryFn: () => api.get(`/chat/inbox?limit=50${tab === 'waiting' ? '&status=WAITING_PHARMACIST' : ''}`).then(r => r.data),
    refetchInterval: 3000,
  })
  const conversations = inbox.data?.data || []
  const needle = search.toLowerCase()
  const filtered = conversations.filter(c => `${c.patientName} ${c.subject} ${c.lastMessage}`.toLowerCase().includes(needle))
  const list = <>
    <ListHeader title="Care inbox" subtitle="Shared pharmacist conversations" search={search} onSearch={setSearch} action={<div className="rounded-xl bg-primary p-2.5 text-primary-foreground"><MessageSquareText className="h-5 w-5"/></div>}>
      <Tabs value={tab} onValueChange={setTab} className="mt-4"><TabsList className="grid h-9 w-full grid-cols-2 rounded-xl bg-muted/70 p-1"><TabsTrigger value="all" className="rounded-lg text-[11px]">All chats</TabsTrigger><TabsTrigger value="waiting" className="rounded-lg text-[11px]">Waiting</TabsTrigger></TabsList></Tabs>
    </ListHeader>
    <div className="flex-1 overflow-y-auto">{inbox.isLoading ? <ConversationSkeletons/> : filtered.length ? filtered.map(c => <ConversationRow key={c.id} conversation={c} audience="staff" selected={c.id === id} onClick={() => navigate(`/app/inbox/${c.id}`)}/>) : <EmptyList search={search}/>}</div>
    <div className="border-t px-5 py-3 text-[10px] text-muted-foreground"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-foreground"/>Live inbox · history automatically preserved</div>
  </>
  return <MessagingShell list={list} hasSelection={!!id}>{id ? <ConversationView conversationId={id} onBack={() => navigate('/app/inbox')}/> : <EmptyChat/>}</MessagingShell>
}
