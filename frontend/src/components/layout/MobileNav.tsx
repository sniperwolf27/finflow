import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Wallet,
  MoreHorizontal,
  Tag,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'

/* ─── Main tab items (4 routes + 1 "More" action) ────────────── */

interface TabItem {
  to?: string
  icon: React.ElementType
  label: string
  action?: 'sheet'
}

const tabItems: TabItem[] = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Inicio' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Movimientos' },
  { to: '/budget',       icon: Wallet,          label: 'Presupuesto' },
  { to: '/goals',        icon: Target,          label: 'Metas' },
  { icon: MoreHorizontal, label: 'Más', action: 'sheet' },
]

/* ─── Items inside the "More" sheet ──────────────────────────── */

const moreItems = [
  { to: '/categories', icon: Tag,      label: 'Categorías' },
  { to: '/alerts',     icon: Target,   label: 'Alertas' },
  { to: '/settings',   icon: Settings, label: 'Configuración' },
]

/* ─── More bottom sheet ──────────────────────────────────────── */

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()

  const handleNav = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm',
          'transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-card rounded-t-2xl border-t border-border shadow-modal',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Más opciones de navegación"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-headline text-foreground">Más</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors duration-200"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <div className="px-4 pb-6 space-y-1" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {moreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => { e.preventDefault(); handleNav(item.to) }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 px-4 py-3.5 rounded-xl',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-accent/50',
                )
              }
            >
              <item.icon size={20} className="shrink-0" />
              <span className="text-callout font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  )
}

/* ─── Tab bar item ───────────────────────────────────────────── */

function TabBarItem({
  item,
  onMoreClick,
}: {
  item: TabItem
  onMoreClick: () => void
}) {
  const Icon = item.icon

  // "More" button (not a NavLink)
  if (item.action === 'sheet') {
    return (
      <button
        onClick={onMoreClick}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label="Más opciones"
      >
        <div className="w-10 h-6 flex items-center justify-center">
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <span className="text-[11px] font-medium leading-tight mt-0.5">
          {item.label}
        </span>
      </button>
    )
  }

  // Standard NavLink tab
  return (
    <NavLink
      to={item.to!}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-0.5 flex-1',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              'w-10 h-6 flex items-center justify-center rounded-full',
              'transition-all duration-200',
              isActive ? 'bg-primary/12' : '',
            )}
          >
            <Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 2.2 : 1.8} />
          </div>
          <span
            className={cn(
              'text-[11px] leading-tight mt-0.5',
              'transition-all duration-200',
              isActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium',
            )}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  )
}

/* ─── Mobile nav bar ─────────────────────────────────────────── */

export function MobileNav() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/90 backdrop-blur-lg border-t border-border">
        <div
          className="flex items-stretch justify-around h-[58px]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {tabItems.map((item) => (
            <TabBarItem
              key={item.label}
              item={item}
              onMoreClick={() => setSheetOpen(true)}
            />
          ))}
        </div>
      </nav>

      <MoreSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
