import { useState, FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { login, isAuthenticated } from '../lib/auth'
import { ShieldCheck, BarChart3, Zap } from 'lucide-react'
import { useAdminLang } from '../lib/adminI18n'

const FEATURES = [
  { icon: BarChart3, labelKey: 'login.eyebrowAnalytics', descKey: 'login.analyticsDesc' },
  { icon: Zap, labelKey: 'login.instantTheming', descKey: 'login.themingDesc' },
  { icon: ShieldCheck, labelKey: 'login.secure', descKey: 'login.secureDesc' },
]

export default function Login() {
  const navigate = useNavigate()
  const { t } = useAdminLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated()) {
    return <Navigate to="/admin" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (!result.ok) {
      // The two client-side fallback messages are known strings we can
      // localize; anything else is a raw message from the backend itself
      // (e.g. FastAPI's `detail`), which we can't translate statically.
      const KNOWN_ERRORS: Record<string, string> = {
        'Could not reach the server. Please try again.': t('login.errUnreachable'),
        'Invalid email or password.': t('login.errInvalid'),
      }
      setError(KNOWN_ERRORS[result.error] ?? result.error)
      return
    }
    // Platform admins land on the dashboard; a tombola admin gets bounced
    // straight to their one workspace by RequireSuperAdmin.
    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--pf-bg)] px-4 py-10">
      <div className="grid w-full max-w-[960px] items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        {/* Left — brand + features */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0C2340] shadow-[var(--pf-shadow-md)]">
              <img src="/marjane-mark-white.png" alt="Marjane" className="h-6 w-6 object-contain" />
            </span>
            <span className="text-[17px] font-bold tracking-[-0.01em] text-[var(--pf-ink)]">
              Marjane Campaign Studio
            </span>
          </div>
          <h1 className="mt-8 text-[32px] font-bold leading-tight tracking-[-0.02em] text-[var(--pf-ink)]">
            {t('login.heroTitle')}
          </h1>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-[var(--pf-ink-muted)]">
            {t('login.heroSub')}
          </p>
          <div className="mt-10 space-y-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.labelKey} className="flex items-center gap-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-white text-[var(--pf-accent)] shadow-[var(--pf-shadow-xs)]">
<Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-[var(--pf-ink)]">{t(f.labelKey)}</div>
                    <div className="text-[12.5px] text-[var(--pf-ink-muted)]">{t(f.descKey)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — auth card */}
        <div className="mx-auto w-full max-w-[400px]">
          <div className="rounded-[var(--pf-radius-lg)] border border-[var(--pf-border)] bg-white p-7 shadow-[var(--pf-shadow-lg)] sm:p-8">
            <div className="mb-6 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0C2340]">
                <img src="/marjane-mark-white.png" alt="Marjane" className="h-5 w-5 object-contain" />
              </span>
              <span className="text-[15px] font-bold tracking-[-0.01em] text-[var(--pf-ink)]">
                Marjane Campaign Studio
              </span>
            </div>

            <h2 className="text-[21px] font-bold tracking-[-0.01em] text-[var(--pf-ink)]">
              {t('login.signIn')}
            </h2>
            <p className="mt-1.5 text-[13.5px] text-[var(--pf-ink-muted)]">
              {t('login.signInSub')}
            </p>

            <form className="mt-7 space-y-3.5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-[var(--pf-ink)]">
                  {t('login.email')}
                </label>
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-[var(--pf-ink)]">
                  {t('login.password')}
                </label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.password')}
                  required
                />
              </div>

              {error && (
                <div className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--pf-danger)]">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                {t('login.submit')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
