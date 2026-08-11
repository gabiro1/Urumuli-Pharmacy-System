import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'

const contactInfo = [
  {
    icon: MapPin,
    title: 'Our Location',
    details: ['KG 123 St, Kigali', 'Rwanda'],
  },
  {
    icon: Phone,
    title: 'Phone',
    details: ['+250 788 000 000', '+250 722 000 000'],
  },
  {
    icon: Mail,
    title: 'Email',
    details: ['info@urumuli.rw', 'support@urumuli.rw'],
  },
  {
    icon: Clock,
    title: 'Business Hours',
    details: ['Monday - Friday: 8:00 AM - 6:00 PM', 'Saturday: 9:00 AM - 2:00 PM'],
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/contact', form)
      setSubmitted(true)
      setForm({ name: '', email: '', subject: '', message: '' })
      toast.success('Message sent successfully! We will get back to you soon.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not send your message'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <section className="hero-shell relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        </div>

        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <MessageSquare className="w-3 h-3" />
              Contact Us
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Get in{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Have questions about Urumuli? Want to partner with us? We'd love to hear from you.
              Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="p-8">
                    {submitted ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                      >
                        <div className="inline-flex p-4 rounded-full bg-green-500/10 mb-6">
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                          Thank you for reaching out. Our team will review your message and
                          get back to you within 24 hours.
                        </p>
                        <Button onClick={() => setSubmitted(false)} variant="outline">
                          Send Another Message
                        </Button>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                            <Input
                              placeholder="Your name"
                              value={form.name}
                              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              value={form.email}
                              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Subject</label>
                          <Input
                            placeholder="How can we help you?"
                            value={form.subject}
                            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Message <span className="text-destructive">*</span></label>
                          <Textarea
                            placeholder="Tell us more about your inquiry..."
                            value={form.message}
                            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                            className="min-h-[150px] resize-y"
                            required
                          />
                        </div>
                        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                          {submitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                          ) : (
                            <><Send className="w-4 h-4 mr-2" />Send Message</>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="space-y-4">
              {contactInfo.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground shrink-0">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">{item.title}</h4>
                          {item.details.map((d) => (
                            <p key={d} className="text-sm text-muted-foreground">{d}</p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
