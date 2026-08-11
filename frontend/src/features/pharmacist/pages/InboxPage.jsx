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
  const [tab, setTab] = useState('my')
  const inbox = useQuery({
    queryKey: ['pharmacist-inbox', tab],
    queryFn: () => api.get(`/chat/inbox?limit=50${tab === 'waiting' ? '&status=WAITING_PHARMACIST' : ''}`).then(r => r.data),
    enabled: tab !== 'unassigned', refetchInterval: 8000,
  })
  const open = useQuery({ queryKey: ['open-conversations'], queryFn: () => api.get('/chat/open?limit=50').then(r => r.data), enabled: tab === 'unassigned', refetchInterval: 8000 })
  const activeQuery = tab === 'unassigned' ? open : inbox
  const conversations = activeQuery.data?.data || []
  const needle = search.toLowerCase()
  const filtered = conversations.filter(c => `${c.patientName} ${c.subject} ${c.lastMessage}`.toLowerCase().includes(needle))
  const list = <>
    <ListHeader title="Care inbox" subtitle="Patient conversations, all in one place" search={search} onSearch={setSearch} action={<div className="rounded-xl bg-primary p-2.5 text-primary-foreground"><MessageSquareText className="h-5 w-5"/></div>}>
      <Tabs value={tab} onValueChange={setTab} className="mt-4"><TabsList className="grid h-9 w-full grid-cols-3 rounded-xl bg-muted/70 p-1"><TabsTrigger value="my" className="rounded-lg text-[11px]">My chats</TabsTrigger><TabsTrigger value="waiting" className="rounded-lg text-[11px]">Waiting</TabsTrigger><TabsTrigger value="unassigned" className="rounded-lg text-[11px]">Unassigned</TabsTrigger></TabsList></Tabs>
    </ListHeader>
    <div className="flex-1 overflow-y-auto">{activeQuery.isLoading ? <ConversationSkeletons/> : filtered.length ? filtered.map(c => <ConversationRow key={c.id} conversation={c} audience="staff" selected={c.id === id} onClick={() => navigate(`/app/inbox/${c.id}`)}/>) : <EmptyList search={search}/>}</div>
    <div className="border-t px-5 py-3 text-[10px] text-muted-foreground"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-foreground"/>Live inbox · history automatically preserved</div>
  </>
  return <MessagingShell list={list} hasSelection={!!id}>{id ? <ConversationView conversationId={id} onBack={() => navigate('/app/inbox')}/> : <EmptyChat/>}</MessagingShell>
}
