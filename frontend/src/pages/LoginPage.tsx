import { TrendingUp, Mail, Shield, Zap, Target } from 'lucide-react'
import { authApi } from '../api/auth.api'

const features = [
  { icon: Mail,   title: 'Sincronización automática',  desc: 'Recibos y comprobantes extraídos directo de tu Gmail' },
  { icon: Zap,    title: 'IA que categoriza por ti',   desc: 'Claude AI analiza y clasifica cada movimiento' },
  { icon: Target, title: 'Metas de ahorro',            desc: 'Define objetivos y monitorea tu progreso' },
  { icon: Shield, title: 'Privado y seguro',           desc: 'Tus datos viven en tu propio servidor' },
]

export function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel — branding (md+) ── */}
      <div className="hidden md:flex flex-col justify-between p-12 w-1/2
                      relative overflow-hidden
                      bg-gradient-to-br from-primary/8 via-background to-primary/4">

        {/* Decorative orbs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full
                     bg-primary/6 blur-[80px] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[350px] h-[350px] rounded-full
                     bg-[hsl(var(--income)/0.06)] blur-[60px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Logo + tagline */}
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center
                          shadow-lg shadow-primary/25 animate-float mb-6">
            <TrendingUp className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-title-1 font-bold text-foreground tracking-tight">FinFlow</h1>
          <p className="text-callout text-muted-foreground mt-1">
            Tus finanzas, bajo control.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-background/80 backdrop-blur-sm
                              flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-subhead font-semibold text-foreground">{title}</p>
                <p className="text-footnote text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy footer */}
        <p className="relative z-10 text-caption text-muted-foreground/60">
          Tu información está segura y cifrada.
        </p>
      </div>

      {/* ── Right panel — login ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo (hidden on md+) */}
          <div className="flex items-center gap-3 mb-8 md:hidden">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 animate-float">
              <TrendingUp size={22} className="text-primary-foreground" />
            </div>
            <span className="text-title-2 font-bold text-foreground tracking-tight">FinFlow</span>
          </div>

          {/* Card */}
          <div className="card p-8 shadow-modal">
            <h2 className="text-title-3 font-bold text-foreground mb-2 tracking-tight">Empezar ahora</h2>
            <p className="text-footnote text-muted-foreground mb-8">
              Inicia sesión con Google para conectar tu Gmail y empezar a rastrear automáticamente.
            </p>

            {/* Google button */}
            <a
              href={authApi.googleLoginUrl}
              className="w-full flex items-center justify-center gap-3 px-4 py-3
                         bg-background border border-border rounded-xl
                         text-subhead font-medium text-foreground
                         shadow-button hover:shadow-button-hover hover:-translate-y-px
                         transition-all duration-200 ease-in-out
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-shrink-0">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
                <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14l2.67-2.09z" />
                <path fill="#EA4335" d="M8.98 3.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.43L4.5 7.5a4.77 4.77 0 0 1 4.48-4.32z" />
              </svg>
              Continuar con Google
            </a>

            <p className="text-caption text-muted-foreground text-center mt-6">
              Solicitamos acceso de solo lectura a Gmail para escanear recibos. Nunca enviamos correos en tu nombre.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
