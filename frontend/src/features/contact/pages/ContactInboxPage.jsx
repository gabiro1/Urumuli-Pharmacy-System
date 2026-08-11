import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { RefreshCw, Inbox, MailOpen, MailCheck, Loader2, Eye } from 'lucide-react'
import api from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

export default function ContactInboxPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [detailStatus, setDetailStatus] = useState('')

  const messagesQuery = useQuery({
    queryKey: ['contact-inbox', status],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (status !== 'ALL') params.set('status', status)
      return api.get(`/contact?${params.toString()}`).then((res) => res.data)
    },
  })
  const messages = messagesQuery.data?.data || []

  const statusMutation = useMutation({
    mutationFn: ({ id, status: next }) => api.patch(`/contact/${id}/status`, { status: next }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contact-inbox'] })
      toast.success(res.data?.message || 'Status updated')
      setSelected((prev) => (prev ? { ...prev, status: detailStatus } : prev))
    },
    onError: (error) => toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update status'),
  })

  const openDetail = (message) => {
    setSelected(message)
    setDetailStatus(message.status)
    if (message.status === 'NEW') {
      api.patch(`/contact/${message.id}/status`, { status: 'READ' })
        .then(() => queryClient.invalidateQueries({ queryKey: ['contact-inbox'] }))
        .catch(() => {})
    }
  }

  const changeStatus = (next) => {
    setDetailStatus(next)
    statusMutation.mutate({ id: selected.id, status: next })
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Inbox</h1>
          <p className="text-muted-foreground mt-1">Messages sent through the public contact form.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
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
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Messages</CardTitle>
            <span className="text-xs text-muted-foreground">{messages.length} messages</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="w-16">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messagesQuery.isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  ))
                ) : messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No messages match this filter.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((message) => (
                    <TableRow
                      key={message.id}
                      className={cn('cursor-pointer', message.status === 'NEW' && 'bg-primary/5')}
                      onClick={() => openDetail(message)}
                    >
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className={cn('font-medium', message.status === 'NEW' && 'font-semibold')}>{message.name}</p>
                          <p className="text-xs text-muted-foreground">{message.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{message.subject || 'No subject'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">{message.message}</TableCell>
                      <TableCell>
                        <Badge color={STATUS_COLOR[message.status] || 'default'}>{message.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(message.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(message) }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                {selected?.status === 'RESOLVED' ? <MailCheck className="w-5 h-5" /> : <MailOpen className="w-5 h-5" />}
                Message
              </span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-medium">{selected.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{selected.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="font-medium">{formatDate(selected.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge color={STATUS_COLOR[selected.status] || 'default'}>{selected.status}</Badge>
                </div>
                {selected.subject && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="font-medium">{selected.subject}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Message</p>
                <Textarea readOnly value={selected.message} rows={6} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Mark as</p>
                <div className="flex gap-2">
                  {['NEW', 'READ', 'RESOLVED'].map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={detailStatus === option ? 'default' : 'outline'}
                      onClick={() => changeStatus(option)}
                      disabled={statusMutation.isPending}
                    >
                      {statusMutation.isPending && detailStatus === option && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
