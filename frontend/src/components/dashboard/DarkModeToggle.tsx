import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'

export function DarkModeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn(
        'relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <Sun size={15} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon size={15} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}
