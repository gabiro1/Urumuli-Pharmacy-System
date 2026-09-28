import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  RefreshCw,
  Inbox,
  MailCheck,
  MailOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Send,
  ArrowLeft,
  Clock,
} from 'lucide-react'
import api from '@/lib/api'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const STATUS_COLOR = { NEW: 'yellow', READ: 'blue', RESOLVED: 'green' }

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function normalizeMessage(message) {
  return {
    ...message,
    createdAt: message.created_at ?? message.createdAt,
    repliedAt: message.replied_at ?? message.repliedAt,
    replies: Array.isArray(message.replies) ? message.replies : [],
  }
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'
}

function AvatarWithStatus({ name, isNew }) {
  return (
    <div className="relative shrink-0">
      <Avatar className="h-10 w-10 border border-border">
        <AvatarFallback className={cn('bg-primary/10 text-primary font-semibold', isNew && 'bg-primary text-primary-foreground')}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {isNew && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-background" />}
    </div>
  )
}

export default function ContactInboxPage() {
  const queryClient = useQueryClient()
  const isStacked = useMediaQuery('(max-width: 1023px)')

  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [localStatus, setLocalStatus] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [status, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  const messagesQuery = useQuery({
    queryKey: ['contact-messages', status, page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50', page: String(page) })
      if (status !== 'ALL') params.set('status', status)
      if (debouncedSearch) params.set('search', debouncedSearch)
      return api.get(`/contact?${params.toString()}`).then((res) => ({
        data: (res.data.data || []).map(normalizeMessage),
        meta: res.data.meta || {},
      }))
    },
    keepPreviousData: true,
  })
  const messages = messagesQuery.data?.data || []
  const messagesMeta = messagesQuery.data?.meta || {}
  const totalMessages = messagesMeta.total ?? messages.length
  const contactTotalPages = Math.max(1, messagesMeta.pages ?? 1)

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) || null, [messages, selectedId])

  const detailQuery = useQuery({
    queryKey: ['contact-message', selectedId],
    queryFn: () => api.get(`/contact/${selectedId}`).then((res) => normalizeMessage(res.data.data)),
    enabled: Boolean(selectedId),
  })
  const detail = detailQuery.data || selected
  const currentStatus = localStatus ?? detail?.status ?? 'NEW'

  const statusMutation = useMutation({
    mutationFn: ({ id, status: next }) => api.patch(`/contact/${id}/status`, { status: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] })
      toast.success('Status updated')
    },
    onError: (error) => {
      setLocalStatus(null)
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update status')
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, body }) => api.post(`/contact/${id}/reply`, { body }),
    onSuccess: (res) => {
      setReplyText('')
      setLocalStatus('RESOLVED')
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] })
      queryClient.invalidateQueries({ queryKey: ['contact-message', selectedId] })
      toast.success(res.data?.message || 'Reply sent')
    },
    onError: (error) =>
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to send reply'),
  })

  const openMessage = (message) => {
    setSelectedId(message.id)
    setLocalStatus(null)
    setReplyText('')
    if (message.status === 'NEW') {
      api.patch(`/contact/${message.id}/status`, { status: 'READ' })
        .then(() => queryClient.invalidateQueries({ queryKey: ['contact-messages'] }))
        .catch(() => {})
    }
  }

  const changeStatus = (next) => {
    if (!detail) return
    setLocalStatus(next)
    statusMutation.mutate({ id: detail.id, status: next })
  }

  const sendReply = () => {
    if (!detail || !replyText.trim()) return
    replyMutation.mutate({ id: detail.id, body: replyText.trim() })
  }

  const showList = !isStacked || !selectedId
  const showDetail = !isStacked || Boolean(selectedId)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Inbox</h1>
          <p className="text-muted-foreground mt-1">Messages sent through the public contact form — read them and reply to the sender.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender, subject…"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All messages</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="READ">Read</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => messagesQuery.refetch()}>
            <RefreshCw className={cn('w-4 h-4 mr-2', messagesQuery.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className={cn('grid gap-6 lg:h-[calc(100dvh-190px)] lg:min-h-[480px] lg:max-h-[840px]', 'lg:grid-cols-[400px_minmax(0,1fr)]')}
      >
        {showList && (
          <Card className="flex flex-col overflow-hidden shadow-sm">
            <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0 border-b px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                Inbox
              </CardTitle>
              <span className="text-xs text-muted-foreground">{totalMessages} message{totalMessages === 1 ? '' : 's'}</span>
            </CardHeader>

            <ScrollArea className="flex-1">
              {messagesQuery.isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Inbox className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">No messages</p>
                  <p className="text-xs text-muted-foreground mt-1">{debouncedSearch ? 'Nothing matches your search.' : 'Messages from the public contact form will appear here.'}</p>
                </div>
              ) : (
                <div>
                  {messages.map((message) => {
                    const isActive = message.id === selectedId
                    return (
                      <button
                        key={message.id}
                        data-active={isActive || undefined}
                        aria-label={`Open message from ${message.name}`}
                        onClick={() => openMessage(message)}
                        className={cn(
                          'w-full text-left border-b border-border/60 px-4 py-3.5 flex gap-3 transition-colors',
                          'hover:bg-muted/50',
                          isActive && 'bg-primary/5 hover:bg-primary/5',
                          message.status === 'NEW' && 'bg-amber-50/50 hover:bg-amber-50/70 dark:bg-amber-500/5'
                        )}
                      >
                        <AvatarWithStatus name={message.name} isNew={message.status === 'NEW'} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('truncate text-sm', message.status === 'NEW' ? 'font-semibold' : 'font-medium')}>{message.name}</p>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(message.createdAt)}</span>
                          </div>
                          <p className={cn('truncate text-sm text-foreground/90', message.status !== 'NEW' && 'text-muted-foreground')}>
                            {message.subject || 'No subject'}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-muted-foreground">{message.message}</p>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {message.repliedAt && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
                                  <MailCheck className="h-3.5 w-3.5" />
                                  Replied
                                </span>
                              )}
                              <Badge color={STATUS_COLOR[message.status] || 'default'} className="text-[10px] px-1.5 py-0">
                                {message.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {contactTotalPages > 1 && (
              <div className="shrink-0 flex items-center justify-between border-t px-4 py-2.5">
                <p className="text-xs text-muted-foreground">Page {page} of {contactTotalPages}</p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" disabled={page <= 1 || messagesQuery.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= contactTotalPages || messagesQuery.isFetching} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {showDetail && (
          <Card className="flex flex-col overflow-hidden shadow-sm">
            {!detail ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MailOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Select a message</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Choose a message from the inbox to read it, then reply to the sender with an email.
                </p>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b px-4 py-4 sm:px-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {isStacked && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedId(null)}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    <AvatarWithStatus name={detail.name} isNew={detail.status === 'NEW'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{detail.subject || 'New message'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {detail.name} &lt;{detail.email}&gt;
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(detail.createdAt)}
                      </span>
                      {detail.repliedAt && (
                        <Badge color="green" className="text-[10px] px-1.5 py-0">Replied</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {['NEW', 'READ', 'RESOLVED'].map((option) => (
                        <Button
                          key={option}
                          size="sm"
                          variant={currentStatus === option ? 'default' : 'outline'}
                          className="h-7 px-2.5 text-xs"
                          onClick={() => changeStatus(option)}
                          disabled={statusMutation.isPending}
                        >
                          {statusMutation.isPending && currentStatus === option && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-5 px-4 py-5 sm:px-5">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] space-y-2">
                        <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 border border-border/50 shadow-sm">
                          <div className="mb-1 flex items-center justify-between gap-4">
                            <p className="text-xs font-semibold text-foreground">{detail.name}</p>
                            <span className="text-[11px] text-muted-foreground">{formatDate(detail.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{detail.message}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                          <MailOpen className="h-3.5 w-3.5" />
                          Received at {formatDate(detail.createdAt)}
                        </div>
                      </div>
                    </div>

                    {detail.replies.map((reply) => (
                      <div key={reply.id} className="flex justify-end">
                        <div className="max-w-[85%] space-y-2">
                          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm">
                            <div className="mb-1 flex items-center justify-between gap-4">
                              <p className="text-xs font-semibold">Urumuli Pharmacy Team</p>
                              <span className="text-[11px] opacity-80">{formatRelativeTime(reply.createdAt)}</span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-end px-1">
                            <MailCheck className="h-3.5 w-3.5" />
                            Sent as email to {detail.email}
                          </div>
                        </div>
                      </div>
                    ))}

                    {detailQuery.isFetching && !detailQuery.data && (
                      <div className="space-y-3">
                        <Skeleton className="h-24 w-2/3 rounded-2xl" />
                        <Skeleton className="h-24 w-1/2 rounded-2xl ml-auto" />
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="shrink-0 border-t p-4 sm:p-5 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Send className="h-4 w-4 text-primary" />
                      Compose reply
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Emails <span className="font-medium text-foreground/80">{detail.email}</span> and marks as Resolved
                    </span>
                  </div>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply here…"
                    aria-label="Reply to sender"
                    rows={3}
                    className="bg-background resize-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      The sender will receive your reply by email.
                    </span>
                    <Button onClick={sendReply} disabled={!replyText.trim() || replyMutation.isPending}>
                      {replyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send reply
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}