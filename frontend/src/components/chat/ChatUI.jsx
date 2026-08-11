import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, CheckCheck, Clock3, Inbox, Loader2, LockKeyhole, MessageCircleMore, Search, Send } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export const statusCopy = {
  OPEN: 'Active', WAITING_PHARMACIST: 'Waiting for pharmacist',
  WAITING_PATIENT: 'Awaiting your reply', ESCALATED: 'Priority support', CLOSED: 'Closed',
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'UP'
}

export function chatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function MessagingShell({ list, children, hasSelection }) {
  return (
    <div className="h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-muted/40 p-0 lg:p-5">
      <div className="mx-auto flex h-full max-w-[1500px] overflow-hidden border-border/70 bg-background shadow-[0_24px_80px_-35px_rgba(15,23,42,.35)] lg:rounded-[28px] lg:border">
        <aside className={cn('h-full w-full shrink-0 border-r border-border/70 bg-card md:w-[370px] lg:w-[410px]', hasSelection && 'hidden md:flex', 'flex-col')}>{list}</aside>
        <main className={cn('relative h-full min-w-0 flex-1', !hasSelection && 'hidden md:block')}>{children}</main>
      </div>
    </div>
  )
}

export function ListHeader({ title, subtitle, search, onSearch, action, children }) {
  return <>
    <div className="border-b border-border/60 bg-card px-5 pb-4 pt-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold tracking-tight">{title}</h1><p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p></div>
        {action}
      </div>
      <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search conversations" className="h-11 rounded-xl border-0 bg-muted/70 pl-10 shadow-none focus-visible:ring-1"/></div>
      {children}
    </div>
  </>
}

export function ConversationRow({ conversation, selected, onClick, audience = 'patient' }) {
  const name = audience === 'staff' ? (conversation.patientName || 'Patient') : (conversation.pharmacistName || 'Urumuli care team')
  const unread = Number(conversation.unreadCount || 0)
  const preview = conversation.lastMessage || conversation.subject || 'Conversation started'
  return (
    <button onClick={onClick} className={cn('group relative flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent', selected && 'bg-accent')}>
      {selected && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary"/>}
      <div className="relative"><Avatar className="h-12 w-12 ring-2 ring-background shadow-sm"><AvatarFallback className="bg-primary font-semibold text-primary-foreground">{initials(name)}</AvatarFallback></Avatar><span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-card bg-foreground"/></div>
      <div className="min-w-0 flex-1 border-b border-border/50 pb-3 group-last:border-0">
        <div className="flex items-baseline justify-between gap-2"><p className={cn('truncate text-sm', unread ? 'font-bold' : 'font-semibold')}>{name}</p><time className={cn('shrink-0 text-[11px]', unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{chatTime(conversation.lastMessageAt || conversation.updatedAt)}</time></div>
        <p className="mt-0.5 truncate text-xs font-medium text-foreground/70">{conversation.subject}</p>
        <div className="mt-1 flex items-center gap-1.5"><p className={cn('min-w-0 flex-1 truncate text-xs', unread ? 'text-foreground' : 'text-muted-foreground')}>{conversation.lastMessageSenderRole === 'PATIENT' && audience === 'patient' ? 'You: ' : ''}{preview}</p>{unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{unread > 99 ? '99+' : unread}</span>}</div>
      </div>
    </button>
  )
}

export function ConversationSkeletons() { return <div className="space-y-1 p-3">{[1,2,3,4,5].map(i => <div key={i} className="flex gap-3 p-2"><Skeleton className="h-12 w-12 rounded-full"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3"/><Skeleton className="h-3 w-full"/><Skeleton className="h-3 w-4/5"/></div></div>)}</div> }

export function EmptyList({ search }) { return <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><div className="mb-4 rounded-2xl bg-accent p-4"><Inbox className="h-7 w-7 text-foreground"/></div><h3 className="font-semibold">{search ? 'Nothing matched' : 'No conversations yet'}</h3><p className="mt-1 text-sm text-muted-foreground">{search ? 'Try a different name or keyword.' : 'Your conversations will appear here.'}</p></div> }

export function EmptyChat({ patient = false }) { return <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,hsl(var(--muted)),transparent_35%)] px-8 text-center"><div className="relative mb-6"><div className="absolute inset-0 scale-150 rounded-full bg-foreground/5 blur-2xl"/><div className="relative rounded-[28px] bg-primary p-5 shadow-xl shadow-foreground/10"><MessageCircleMore className="h-10 w-10 text-primary-foreground"/></div></div><h2 className="text-xl font-bold">{patient ? 'Your private pharmacy chat' : 'Care starts with a conversation'}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Select a conversation to see its complete history and continue securely with {patient ? 'the Urumuli care team' : 'your patient'}.</p><div className="mt-6 flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm"><LockKeyhole className="h-3.5 w-3.5 text-foreground"/> Private & securely stored</div></div> }

export function ChatHeader({ name, subject, status, onBack, actions }) {
  return <div className="flex h-[76px] items-center gap-3 border-b border-border/60 bg-card/95 px-3 backdrop-blur md:px-5"><Button variant="ghost" size="icon" onClick={onBack} className="md:hidden"><ArrowLeft className="h-5 w-5"/></Button><Avatar className="h-11 w-11"><AvatarFallback className="bg-primary font-semibold text-primary-foreground">{initials(name)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-bold">{name}</h2><span className="h-2 w-2 rounded-full bg-foreground"/></div><p className="truncate text-xs text-muted-foreground">{subject} · {statusCopy[status] || status}</p></div>{actions}</div>
}

function dayLabel(value) { const d = new Date(value); const today = new Date(); if (d.toDateString() === today.toDateString()) return 'Today'; const y = new Date(today); y.setDate(today.getDate()-1); if (d.toDateString() === y.toDateString()) return 'Yesterday'; return d.toLocaleDateString([], { weekday:'short', month:'long', day:'numeric' }) }

export function MessageHistory({ messages = [], loading, ownRole }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages.length])
  let lastDay = ''
  return <div className="h-full overflow-y-auto bg-muted/35 px-3 py-5 md:px-6"><div className="mx-auto max-w-3xl space-y-1.5">
    <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-[10px] font-medium text-amber-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><LockKeyhole className="h-3 w-3"/>Messages are securely stored for continuity of care</div>
    {loading ? [1,2,3,4].map(i => <Skeleton key={i} className={cn('h-14 rounded-2xl', i%2 ? 'mr-auto w-2/3' : 'ml-auto w-1/2')}/>) : messages.map((m) => { const day = new Date(m.createdAt).toDateString(); const divider = day !== lastDay; lastDay = day; const own = ownRole === 'STAFF' ? m.senderRole !== 'PATIENT' : m.senderRole === ownRole; return <div key={m.id}>{divider && <div className="my-5 flex justify-center"><span className="rounded-full border bg-card/90 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">{dayLabel(m.createdAt)}</span></div>}<motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className={cn('flex', own ? 'justify-end' : 'justify-start')}><div className={cn('relative max-w-[86%] rounded-2xl px-3.5 pb-2 pt-2.5 text-[13px] leading-5 shadow-sm md:max-w-[72%]', m.isPrivateNote ? 'border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100' : own ? 'rounded-tr-md bg-primary text-primary-foreground' : 'rounded-tl-md border border-border/50 bg-card text-card-foreground')}>{m.isPrivateNote && <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"><LockKeyhole className="h-3 w-3"/>Private team note</p>}<span className="whitespace-pre-wrap break-words">{m.content}</span><span className={cn('ml-3 inline-flex translate-y-1 items-center gap-0.5 whitespace-nowrap text-[9px]', own ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{chatTime(m.createdAt)}{own && (m.readAt ? <CheckCheck className="h-3.5 w-3.5"/> : <Check className="h-3.5 w-3.5"/>)}</span></div></motion.div></div> })}
    {!loading && !messages.length && <div className="py-20 text-center text-sm text-muted-foreground">This is the beginning of the conversation.</div>}<div ref={endRef}/>
  </div></div>
}

export function Composer({ value, onChange, onSend, pending, disabled, placeholder = 'Type a message', privateNote, onTogglePrivate, quickReplies = [] }) {
  const submit = (e) => { e?.preventDefault(); if (value.trim() && !pending && !disabled) onSend() }
  return <div className="border-t border-border/60 bg-card">
    {!!quickReplies.length && <div className="flex gap-2 overflow-x-auto border-b border-border/40 px-4 py-2 scrollbar-none">{quickReplies.slice(0,6).map(r => <button key={r.id} onClick={() => onChange(r.content)} className="whitespace-nowrap rounded-full border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-foreground hover:text-foreground">{r.title}</button>)}</div>}
    {disabled ? <div className="flex h-[78px] items-center justify-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4"/>This conversation is closed</div> : <form onSubmit={submit} className="px-3 py-3 md:px-5"><div className={cn('mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-muted/40 p-2 transition focus-within:border-foreground focus-within:ring-4 focus-within:ring-foreground/10', privateNote && 'border-amber-300 bg-amber-50 dark:bg-amber-950/30')}>
      {onTogglePrivate && <Button type="button" size="icon" variant="ghost" onClick={onTogglePrivate} title="Private team note" className={cn('h-10 w-10 shrink-0 rounded-xl', privateNote && 'bg-amber-200 text-amber-900 hover:bg-amber-200')}><LockKeyhole className="h-4 w-4"/></Button>}
      <div className="min-w-0 flex-1">{privateNote && <p className="px-2 pt-1 text-[9px] font-bold uppercase tracking-wider text-amber-700">Private note · invisible to patient</p>}<Textarea value={value} onChange={(e)=>onChange(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit()}}} rows={1} placeholder={privateNote ? 'Add a private care-team note…' : placeholder} className="max-h-32 min-h-10 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"/></div>
      <Button type="submit" size="icon" disabled={!value.trim() || pending} className="h-10 w-10 shrink-0 rounded-xl shadow-md shadow-foreground/10">{pending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}</Button>
    </div></form>}
  </div>
}
