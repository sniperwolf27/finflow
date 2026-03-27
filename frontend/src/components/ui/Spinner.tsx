import { clsx } from 'clsx'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-border border-t-primary',
        className ?? 'h-5 w-5'
      )}
    />
  )
}
