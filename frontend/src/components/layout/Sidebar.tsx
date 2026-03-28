import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  Bell,
  Settings,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { cn } from '../../lib/utils'

/* ─── Navigation structure: 3 groups per Apple HIG ───────────── */

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Finanzas',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Inicio' },
      { to: '/analytics',    icon: TrendingUp,      label: 'Analytics' },
      { to: '/transactions', icon: ArrowLeftRight,  label: 'Movimientos' },
      { to: '/budget',       icon: Wallet,          label: 'Presupuestos' },
    ],
  },
  {
    label: 'Planificación',
    items: [
      { to: '/goals',        icon: Target, label: 'Metas' },
      { to: '/categories',   icon: Tag,    label: 'Categorías' },
      { to: '/alerts',       icon: Bell,   label: 'Alertas' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/settings', icon: Settings, label: 'Ajustes' },
    ],
  },
]

/* ─── Section label ──────────────────────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 select-none">
      {label}
    </p>
  )
}

/* ─── Nav item with animated active pill ─────────────────────── */

function SidebarItem({ to, icon: Icon, label }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 px-3 py-2 min-h-[36px] rounded-lg text-sm',
          'transition-all duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isActive
            ? 'bg-primary/10 text-primary font-semibold shadow-sm'
            : 'text-muted-foreground font-medium hover:bg-accent/60 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            className={cn(
              'shrink-0 transition-all duration-200',
              'group-hover:scale-110',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          {label}
        </>
      )}
    </NavLink>
  )
}

/* ─── Sidebar component ──────────────────────────────────────── */

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card border-r border-border">
      {/* Logo — Apple HIG spacing: 24px top, 20px bottom */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/25">
          <TrendingUp size={15} className="text-primary-foreground" />
        </div>
        <span className="text-subhead font-bold text-foreground tracking-tight">FinFlow</span>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <SectionLabel label={group.label} />
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-caption text-muted-foreground/40 font-medium">FinFlow v1.0</p>
      </div>
    </aside>
  )
}
