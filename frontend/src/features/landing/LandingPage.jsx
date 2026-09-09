import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
} from 'framer-motion'
import {
  FileText,
  MessageSquare,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
  Pill,
  Search,
  Activity,
  Layers,
  Bell,
  Heart,
  HeartPulse,
  Star,
  Upload,
  Zap,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  Package,
  ShoppingCart,
  BarChart3,
  PlayCircle,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import BackgroundBeams from '@/components/magicui/background-beams'
import PublicNavbar from '@/components/shared/PublicNavbar'
import HeroSection from '@/components/ui/hero-section-9'
import InteractiveMedicineCard from '@/components/ui/interactive-medicine-card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const DEMO_VIDEO_URL = 'https://videos.pexels.com/video-files/13367423/13367423-sd_640_360_30fps.mp4'

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
  const [demoOpen, setDemoOpen] = useState(false)

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
      icon: FileText,
      title: 'Prescription Workflow',
      description:
        'Process prescriptions digitally from patient submission through pharmacist review, approval, and fulfillment.',
    },
    {
      icon: Package,
      title: 'Inventory Management',
      description:
        'Track medicines, stock levels, pricing, and availability from one organized pharmacy dashboard.',
    },
    {
      icon: ShoppingCart,
      title: 'Sales & Orders',
      description:
        'Manage medicine requests, complete sales, and keep stock records accurate as orders are fulfilled.',
    },
    {
      icon: MessageSquare,
      title: 'Secure Messaging',
      description:
        'Encrypted real-time chat between patients and pharmacists for prescription inquiries, refills, and consultations.',
    },
    {
      icon: Shield,
      title: 'Drug Safety Checks',
      description:
        'Built-in interaction checker cross-references medications against known drug-drug and drug-allergy interactions.',
    },
    {
      icon: Clock,
      title: 'Status Tracking',
      description:
        'Patients track their prescriptions in real time — from PENDING to UNDER_REVIEW, APPROVED, and COMPLETED.',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description:
        'Automatic alerts when prescriptions are reviewed, approved, or when pharmacists send new messages.',
    },
    {
      icon: Pill,
      title: 'Medicine Catalog',
      description:
        'Comprehensive read-only medicine database with details on usage, dosage, side effects, and contraindications.',
    },
    {
      icon: Search,
      title: 'Audit Trail',
      description:
        'Immutable, tamper-proof audit logs tracking operational activity for accountability and compliance.',
    },
    {
      icon: Users,
      title: 'Patient Portal',
      description:
        'Dedicated patient interface to submit prescriptions, track status, view history, and communicate with pharmacists.',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description:
        'Role-based access, encrypted data, and complete audit trails protect your pharmacy operations.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      description:
        'Turn day-to-day pharmacy data into practical insight on inventory, sales, prescriptions, and performance.',
    },
  ]

  const benefits = [
    {
      icon: Zap,
      title: 'Faster Prescriptions',
      description: 'Patients get their medications faster with digital submission and real-time pharmacist review — no more waiting on phone calls or paper forms.',
    },
    {
      icon: Shield,
      title: 'Fewer Medication Errors',
      description: 'Built-in drug interaction checks and allergy alerts catch potential issues before they reach the patient.',
    },
    {
      icon: Heart,
      title: 'Better Patient Experience',
      description: 'Patients can track their prescriptions, message their pharmacist, and get updates — all from their phone.',
    },
    {
      icon: Star,
      title: 'Streamlined Pharmacy Operations',
      description: 'Pharmacists manage everything from a single dashboard: review prescriptions, chat with patients, and maintain compliance records.',
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
            Run your entire{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              pharmacy
            </span>
            <br />
            in one place
          </>
        }
        subtitle="Urumuli connects patients and pharmacists — digital prescriptions, inventory and sales, secure messaging, and real-time status tracking in a single streamlined platform."
        actions={[
          {
            text: (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ),
            onClick: () => navigate('/login'),
            variant: 'default',
          },
          {
            text: (
              <>
                Watch demo
                <PlayCircle className="ml-2 h-4 w-4" />
              </>
            ),
            onClick: () => setDemoOpen(true),
            variant: 'outline',
          },
        ]}
        stats={[
          {
            value: '800+',
            label: 'Active pharmacies',
            icon: <Building2 className="h-5 w-5 text-muted-foreground" />,
          },
          {
            value: '99%',
            label: 'Uptime SLA',
            icon: <ShieldCheck className="h-5 w-5 text-muted-foreground" />,
          },
          {
            value: '4.8',
            label: 'Rated by users',
            icon: <HeartPulse className="h-5 w-5 text-muted-foreground" />,
          },
        ]}
        images={[
          'https://images.unsplash.com/photo-1642055514517-7b52288890ec?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=800&fit=crop&q=80',
          'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&h=800&fit=crop&q=80',
        ]}
      />

      {/* ========== DEMO VIDEO MODAL ========== */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Urumuli demo</DialogTitle>
            <DialogDescription>Watch how Urumuli streamlines pharmacy operations.</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            <video
              key={demoOpen}
              src={DEMO_VIDEO_URL}
              className="h-full w-full"
              controls
              autoPlay={demoOpen}
              playsInline
              poster="https://images.unsplash.com/photo-1576091160550-112173f31c77?w=1280&h=720&fit=crop&q=80"
            />
          </div>
        </DialogContent>
      </Dialog>

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
              Medicines We Provide
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Browse available medicines, pricing, prescription requirements, and product details.
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
              Platform Features
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Everything You Need for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Pharmacy Operations
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              From inventory and sales to pharmacist review and secure
              communication — every tool built for modern healthcare.
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
              How It Works
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              A Simple, Secure{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Workflow
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              From stock setup to fulfillment, every pharmacy action moves through a transparent, audited process.
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
                icon: Package,
                title: 'Manage Your Pharmacy',
                description:
                  'Patients upload a photo of their prescription or request a refill through the patient portal in under a minute.',
              },
              {
                number: '02',
                icon: ClipboardCheck,
                title: 'Process Requests Safely',
                description:
                  'A pharmacist reviews the prescription, runs built-in drug interaction and allergy checks, then approves or rejects it.',
              },
              {
                number: '03',
                icon: MessageSquare,
                title: 'Fulfill, Track & Communicate',
                description:
                  'Patients follow real-time status updates and securely message their pharmacist for questions, refills, and follow-ups.',
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
              {['Inventory', 'Sales & Orders', 'Prescriptions', 'Patient Care'].map((status, i, arr) => (
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
              Every action is recorded in an immutable audit trail, keeping the entire process transparent and compliant.
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
              Why Choose Urumuli
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Better Care for Patients.{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Smarter Workflows for Pharmacists.
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
              Urumuli brings patients and pharmacists together on one platform — making
              prescription management faster, safer, and more convenient for everyone.
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
            <div className="inline-flex items-center gap-6 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">No more paper prescriptions</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Real-time status updates</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Secure patient communication</span>
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
              Ready to Streamline{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Your Pharmacy Operations?
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Patients can request medicines and chat with their pharmacist.
              Staff can manage inventory, sales, prescriptions, and workflows.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/patient/register')}
                className="h-12 px-10 text-base font-medium gap-2 group"
              >
                Create Account
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/login')}
                className="h-12 px-10 text-base font-medium"
              >
                Sign In
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <CheckCircle2 className="inline w-4 h-4 mr-1 text-green-500" />
              Secure &bull; HIPAA-compliant &bull; Built for modern healthcare
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
                A complete pharmacy operations platform for inventory, sales,
                prescriptions, and patient communication.
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Quick Links</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Home', path: '/' },
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
                    { label: 'Staff Registration', path: '/register' },
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
                <h4 className="text-sm font-semibold">Support</h4>
                <ul className="space-y-2">
                  {['Help Center', 'FAQ', 'Privacy Policy', 'Terms of Service'].map((item) => (
                    <li key={item}>
                      <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {item}
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
