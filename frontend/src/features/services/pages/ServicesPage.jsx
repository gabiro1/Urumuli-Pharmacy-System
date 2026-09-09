import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  MessageSquare,
  Shield,
  Clock,
  Bell,
  Pill,
  Search,
  Users,
  ArrowRight,
  CheckCircle2,
  Layers,
  Package,
  ShoppingCart,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'

const services = [
  {
    icon: FileText,
    title: 'Digital Prescription Management',
    description: 'Submit, track, and manage prescriptions entirely online. Patients upload prescriptions digitally, and pharmacists review, approve, or reject them in real time.',
    features: [
      'Upload prescription images directly from your phone',
      'Track status from Pending to Completed',
      'Automated audit trail for every action',
    ],
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Keep medicine stock, pricing, categories, and availability organized so your team always has an accurate view of the pharmacy.',
    features: [
      'Centralized medicine catalog and stock records',
      'Availability and pricing management',
      'Stock-aware fulfillment workflows',
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Sales & Order Fulfillment',
    description: 'Process medicine requests and sales while keeping fulfillment progress and inventory records connected.',
    features: [
      'Manage medicine requests in one workspace',
      'Complete sales with clear fulfillment status',
      'Keep stock aligned with daily transactions',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Secure Patient-Pharmacist Messaging',
    description: 'Encrypted real-time chat between patients and pharmacists for prescription inquiries, refill requests, and follow-up consultations.',
    features: [
      'Real-time messaging with read receipts',
      'Canned replies for common pharmacist responses',
      'Conversation history accessible to both parties',
    ],
  },
  {
    icon: Shield,
    title: 'Drug Safety & Interaction Checks',
    description: 'Built-in safety engine cross-references medications against known drug-drug and drug-allergy interactions before approval.',
    features: [
      'Automatic interaction screening',
      'Allergy alert notifications',
      'Pharmacist review before final approval',
    ],
  },
  {
    icon: Clock,
    title: 'Real-Time Status Tracking',
    description: 'Patients and staff always know exactly where a prescription stands — from submission through review, approval, and completion.',
    features: [
      'Visual kanban-style workflow board',
      'Status history timeline with timestamps',
      'Instant notifications on status changes',
    ],
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Automatic alerts keep everyone informed. Patients get notified when prescriptions are reviewed, and pharmacists know when new submissions arrive.',
    features: [
      'Push notifications for status updates',
      'New message alerts',
      'Escalation alerts for urgent prescriptions',
    ],
  },
  {
    icon: Pill,
    title: 'Medicine Information Database',
    description: 'A comprehensive, read-only catalog of medicines with detailed information on usage, dosage, side effects, and contraindications.',
    features: [
      'Searchable medicine directory',
      'Dosage and administration guidelines',
      'Side effect and interaction information',
    ],
  },
  {
    icon: Search,
    title: 'Audit Trail & Compliance',
    description: 'Important pharmacy actions are logged in an immutable audit trail, supporting accountability and compliance.',
    features: [
      'Tamper-proof activity logs',
      'User action tracking per prescription',
      'Exportable compliance reports',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description: 'Monitor pharmacy activity with clear insight into inventory, sales, prescriptions, and operational performance.',
    features: [
      'At-a-glance operational dashboards',
      'Sales and inventory visibility',
      'Data to support better daily decisions',
    ],
  },
  {
    icon: Users,
    title: 'Patient & Staff Portals',
    description: 'Dedicated interfaces for patients and pharmacy staff, each tailored to their specific needs and permissions.',
    features: [
      'Patient portal for submissions and tracking',
      'Staff dashboard for review and management',
      'Role-based access control',
    ],
  },
]

const process = [
  {
    step: 1,
    title: 'Set Up Your Pharmacy',
    description: 'Organize your medicines, inventory, pricing, staff access, and workflows in one system.',
  },
  {
    step: 2,
    title: 'Receive Digital Requests',
    description: 'Patients submit prescriptions or medicine requests through the portal while staff see them in one dashboard.',
  },
  {
    step: 3,
    title: 'Review and Fulfill Safely',
    description: 'Use medication safety checks, pharmacist review, and clear status updates before completing fulfillment or sale.',
  },
  {
    step: 4,
    title: 'Track and Improve Operations',
    description: 'Keep inventory current, communicate securely with patients, and use reporting and audit records to improve service.',
  },
]

export default function ServicesPage() {
  const navigate = useNavigate()

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
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[96px]" />
        </div>

        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Layers className="w-3 h-3" />
              Our Services
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Everything You Need for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Complete Pharmacy Operations
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              From prescription submission to pharmacist review and secure communication —
              Urumuli provides a complete platform for modern pharmacy management.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground shrink-0 group-hover:scale-110 transition-transform">
                        <service.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">{service.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {service.description}
                        </p>
                        <ul className="space-y-1.5">
                          {service.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Clock className="w-3 h-3" />
              How It Works
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              From Setup to Better Service
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
            {process.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative"
              >
                <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-4">
                      {step.step}
                    </div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {i < process.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 text-muted-foreground/30">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-12 border border-primary/10"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Start Using Urumuli Today
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Whether you're a patient looking to manage prescriptions or a pharmacy wanting
              to digitize workflows, Urumuli has you covered.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/patient/register')} className="h-12 px-8 gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/contact')} className="h-12 px-8">
                Talk to Us
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
