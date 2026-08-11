import { useNavigate } from 'react-router-dom'
import { Pill } from 'lucide-react'

function PublicFooter() {
  const navigate = useNavigate()

  return (
    <footer className="border-t border-border/50 section-shell-tight bg-background">
      <div className="content-shell">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-white/10">
                <Pill className="w-5 h-5 text-primary dark:text-foreground" />
              </div>
              <span className="text-lg font-bold">Urumuli</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              A digital prescription and communication platform connecting
              patients with pharmacists for modern healthcare management.
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
              <h4 className="text-sm font-semibold">Portals</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Patient Portal', path: '/patient/login' },
                  { label: 'Staff Portal', path: '/login' },
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
  )
}

export default PublicFooter
