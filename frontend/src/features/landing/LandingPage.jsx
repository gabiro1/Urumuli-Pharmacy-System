import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
} from 'framer-motion'
import {
  MessageSquare,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
  Pill,
  Activity,
  Layers,
  Bell,
  Heart,
  HeartPulse,
  Upload,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  Package,
  ShoppingCart,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import BackgroundBeams from '@/components/magicui/background-beams'
import PublicNavbar from '@/components/shared/PublicNavbar'
import HeroSection from '@/components/ui/hero-section-9'
import InteractiveMedicineCard from '@/components/ui/interactive-medicine-card'

function TiltCard({ children, className }) {
  const cardRef = useRef(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    setRotateX((y - centerY) / 20)
    setRotateY((centerX - x) / 20)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('perspective-[1000px]', className)}
    >
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative transform-gpu"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.3) 0%, transparent 60%)`,
          }}
        />
        {children}
      </motion.div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <TiltCard>
        <div className="relative h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]">
          <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </TiltCard>
    </motion.div>
  )
}

function LogoMarquee({ partners }) {
  const items = [...partners, ...partners]

  const partnerIcon = (type) => {
    if (type === 'PHARMACY') return HeartPulse
    if (type === 'INSURANCE') return ShieldCheck
    return Building2
  }

  return (
    <div className="relative mt-12 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex w-max items-center gap-14 animate-marquee hover:[animation-play-state:paused]">
          {items.map((partner, i) => {
            const Icon = partnerIcon(partner.partner_type)
            return (
              <a
                key={`${partner.id}-${i}`}
                href={partner.website_url || '#'}
                target={partner.website_url ? '_blank' : undefined}
                rel={partner.website_url ? 'noopener noreferrer' : undefined}
                className="flex shrink-0 items-center gap-2.5 text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className="h-8 w-auto max-w-[160px] object-contain"
                  />
                ) : (
                  <>
                    <Icon className="w-5 h-5" />
                    <span className="whitespace-nowrap text-xl font-bold tracking-tight">
                      {partner.name}
                    </span>
                  </>
                )}
              </a>
            )
          })}
        </div>
      </motion.div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [featuredMedicines, setFeaturedMedicines] = useState([])
  const [medicinesLoading, setMedicinesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get('/inventory/medicines?limit=6&isActive=true')
      .then((res) => {
        if (!cancelled) setFeaturedMedicines(res.data.data || [])
      })
      .catch(() => {
        if (!cancelled) setFeaturedMedicines([])
      })
      .finally(() => {
        if (!cancelled) setMedicinesLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const features = [
    {
      icon: Pill,
      title: 'Find your medicine',
      description:
        'Browse medicines, prices, dosage forms, and prescription requirements before you visit the pharmacy.',
    },
    {
      icon: MessageSquare,
      title: 'Ask a pharmacist',
      description:
        'Send a question to the Urumuli pharmacy team and continue the conversation in one secure place.',
    },
    {
      icon: Upload,
      title: 'Send your prescription',
      description:
        'Upload a clear photo or PDF and receive updates as the pharmacy team reviews it.',
    },
    {
      icon: Clock,
      title: 'Know what is happening',
      description:
        'See clear updates when your request is received, reviewed, approved, or ready.',
    },
    {
      icon: ShieldCheck,
      title: 'Make safer choices',
      description:
        'Get helpful checks and pharmacist guidance around interactions, allergies, and how to use your medicine.',
    },
    {
      icon: ShoppingCart,
      title: 'Order with confidence',
      description:
        'Confirm your quantity, choose the available payment and pickup option, and follow your order.',
    },
  ]

  const benefits = [
    {
      icon: Heart,
      title: 'Care in one simple account',
      description: 'Keep your messages, prescriptions, and orders together so you do not have to repeat yourself.',
    },
    {
      icon: Shield,
      title: 'More confidence before you order',
      description: 'See medicine details and get professional guidance before you make a decision.',
    },
    {
      icon: Heart,
      title: 'A pharmacist when you need one',
      description: 'Ask about a medicine, availability, quantity, or next step and hear back from Urumuli.',
    },
    {
      icon: Bell,
      title: 'Updates without the chasing',
      description: 'Receive clear messages and status updates instead of calling repeatedly to ask what is happening.',
    },
  ]

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <PublicNavbar />

      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[96px]" />
      </div>

      {/* ========== HERO ========== */}
      <HeroSection
        title={
          <>
            {' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Pharmacy care
            </span>
            <br />
            made simpler for you
          </>
        }
        subtitle="Find medicines, ask a pharmacist, send prescriptions, and follow your order from one simple patient account."
        actions={[
          {
            text: (
              <>
                Browse medicines
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ),
            onClick: () => navigate('/medicines'),
            variant: 'default',
          },
          {
            text: (
              <>
                Create patient account
                <Users className="ml-2 h-4 w-4" />
              </>
            ),
            onClick: () => navigate('/patient/register'),
            variant: 'outline',
          },
        ]}
        stats={[
          {
            value: 'One account',
            label: 'Messages, prescriptions & orders',
            icon: <HeartPulse className="h-5 w-5 text-muted-foreground" />,
          },
          {
            value: 'Real support',
            label: 'From Urumuli pharmacists',
            icon: <MessageSquare className="h-5 w-5 text-muted-foreground" />,
          },
          {
            value: 'Clear updates',
            label: 'From request to pickup',
            icon: <CheckCircle2 className="h-5 w-5 text-muted-foreground" />,
          },
        ]}
        images={[
          'https://images.unsplash.com/photo-1642055514517-7b52288890ec?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=800&fit=crop&q=80',
          'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&h=800&fit=crop&q=80',
        ]}
      />

      {/* ========== FEATURED MEDICINES ========== */}
      <section className="section-shell-tight relative border-y border-border/50">
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Find what you need
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Search the catalogue for medicine details, availability, pricing, and prescription requirements.
            </p>
          </motion.div>

          {medicinesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : featuredMedicines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Medicines will appear here as soon as catalog items are available.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {featuredMedicines.map((medicine, i) => (
                <motion.div
                  key={medicine.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
                  className="group h-full"
                >
                  <InteractiveMedicineCard
                    medicine={medicine}
                    publicMode={false}
                    onView={() => navigate(`/medicines/${medicine.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          )}
          <div className="mt-10 text-center"><Button size="lg" onClick={() => navigate('/medicines')}>Browse all medicines <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="section-shell relative">
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Layers className="w-3 h-3" />
              For patients
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Everything you need for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                your next pharmacy step
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              From finding a medicine to getting pharmacist guidance and following your order,
              Urumuli keeps your next step clear.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRODUCT TOUR ========== */}
      <section id="tour" className="section-shell relative border-y border-border/50">
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Activity className="w-3 h-3" />
              Your next step
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              From question to medicine,{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                made simple
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              Start with a search or a question, get clear pharmacist guidance, and keep your order updates in one place.
            </p>
          </motion.div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div
              aria-hidden
              className="hidden md:block absolute top-12 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            />
            {[
              {
                number: '01',
                icon: Pill,
                title: 'Find or ask',
                description:
                  'Search the catalogue or tell a Urumuli pharmacist what you need.',
              },
              {
                number: '02',
                icon: ClipboardCheck,
                title: 'Get clear guidance',
                description:
                  'Upload a prescription when needed and receive a clear reply from the pharmacy team.',
              },
              {
                number: '03',
                icon: Package,
                title: 'Order and follow along',
                description:
                  'Confirm your quantity, pay or choose pickup when ready, and keep every update in your account.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative"
              >
              <TiltCard className="h-full">
                <div className="relative h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex p-3 rounded-lg bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-primary/50 dark:text-white/30">
                      STEP {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </TiltCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-14 flex flex-col items-center gap-4"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
              {['Find', 'Ask', 'Review', 'Order'].map((status, i, arr) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm text-sm font-medium">
                    <span className="w-5 h-5 rounded-full bg-primary/10 dark:bg-white/10 text-[10px] font-bold text-primary dark:text-foreground flex items-center justify-center">
                      {i + 1}
                    </span>
                    {status}
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xl">
              Your messages, prescription updates, and order details stay together in your account.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== WHY CHOOSE URUMULI ========== */}
      <section className="section-shell relative bg-gradient-to-b from-background via-primary/[0.02] to-background border-y border-border/50">
        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Heart className="w-3 h-3" />
              Made for your peace of mind
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Pharmacy support that{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                stays with you
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              Urumuli is built for patients and families who want clear answers and an easier way
              to get medicine support without unnecessary trips or phone calls.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground shrink-0">
                      <benefit.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-muted-foreground">Simple medicine search</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-muted-foreground">Clear status updates</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-muted-foreground">Pharmacist support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="section-shell relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight">
              Ready to make your next pharmacy visit{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                easier?
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Create a free patient account to browse medicines, upload a prescription,
              ask a pharmacist, and keep every update together.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/patient/register')}
                className="h-12 px-10 text-base font-medium gap-2 group"
              >
                Create patient account
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/medicines')}
                className="h-12 px-10 text-base font-medium"
              >
                Browse medicines
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <CheckCircle2 className="inline w-4 h-4 mr-1 text-green-500" />
              Private conversations &bull; Clear updates &bull; Urumuli pharmacist support
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border/50 py-12">
        <div className="content-shell">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Pill className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-bold">Urumuli</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                A simple way to find medicines, ask a pharmacist, and keep
                every prescription and order update in one place.
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Quick Links</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Home', path: '/' },
                    { label: 'Medicines', path: '/medicines' },
                    { label: 'Services', path: '/services' },
                    { label: 'About Us', path: '/about' },
                    { label: 'Contact', path: '/contact' },
                  ].map((item) => (
                    <li key={item.label}>
                      <button onClick={() => navigate(item.path)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Account</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Sign In', path: '/login' },
                    { label: 'Patient Registration', path: '/patient/register' },
                  ].map((item) => (
                    <li key={item.label}>
                      <button onClick={() => navigate(item.path)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Patient help</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'How it works', path: '#tour' },
                    { label: 'Find a medicine', path: '/medicines' },
                    { label: 'Contact us', path: '/contact' },
                    { label: 'Sign in', path: '/login' },
                  ].map((item) => (
                    <li key={item.label}>
                      <button onClick={() => item.path.startsWith('#') ? document.getElementById(item.path.slice(1))?.scrollIntoView({ behavior: 'smooth' }) : navigate(item.path)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Urumuli Pharmacy System. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs">
              <span>Connecting patients with pharmacists</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>v2.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
