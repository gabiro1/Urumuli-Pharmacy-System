import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  Shield,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Target,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'

const stats = [
  { value: '50K+', label: 'Prescriptions Processed', icon: TrendingUp },
  { value: '10K+', label: 'Active Patients', icon: Users },
  { value: '500+', label: 'Partner Pharmacies', icon: Heart },
  { value: '98%', label: 'Satisfaction Rate', icon: Shield },
]

const values = [
  {
    icon: Heart,
    title: 'Patient-Centered Care',
    description: 'Every feature we build puts patients first — making healthcare more accessible, transparent, and convenient.',
  },
  {
    icon: Shield,
    title: 'Safety & Compliance',
    description: 'Drug interaction checks, allergy alerts, and secure data handling ensure every prescription is safe.',
  },
  {
    icon: Users,
    title: 'Collaborative Healthcare',
    description: 'Bridging the gap between patients and pharmacists with real-time communication and shared visibility.',
  },
  {
    icon: Target,
    title: 'Efficiency at Scale',
    description: 'Digital workflows eliminate paperwork, reduce errors, and speed up prescription processing.',
  },
]

export default function AboutPage() {
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
        </div>

        <div className="content-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Heart className="w-3 h-3" />
              About Us
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Connecting Patients with{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Pharmacists Digitally
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Urumuli is a digital prescription and communication platform that makes managing
              medications easier for patients and more efficient for pharmacists. We replace
              paper prescriptions, phone calls, and manual follow-ups with a streamlined,
              secure online system.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground mb-3">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
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
              <Eye className="w-3 h-3" />
              Our Mission
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              What Drives Us
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-8">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground mb-4">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To simplify prescription management by connecting patients and pharmacists
                  through a secure, user-friendly digital platform. We eliminate paperwork,
                  reduce wait times, and improve medication safety for everyone.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-8">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground mb-4">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Our Vision</h3>
                <p className="text-muted-foreground leading-relaxed">
                  A world where every prescription is handled digitally — from submission to
                  fulfillment — making healthcare faster, safer, and more accessible for
                  patients and providers alike.
                </p>
              </CardContent>
            </Card>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              Our Values
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="inline-flex p-3 rounded-lg bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground mb-4">
                      <value.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
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
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Join thousands of patients and pharmacists already using Urumuli to manage
              prescriptions digitally.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/patient/register')} className="h-12 px-8 gap-2">
                Patient Portal
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/contact')} className="h-12 px-8">
                Contact Us
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
