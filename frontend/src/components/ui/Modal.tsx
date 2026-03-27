import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

/**
 * Accessible modal built on HeadlessUI Dialog.
 *
 * Already handled by HeadlessUI:
 * - role="dialog" + aria-modal="true"
 * - Focus trap (Tab cycles within modal)
 * - Escape key closes modal
 * - Restores focus to trigger on close
 * - Body scroll lock
 *
 * We add:
 * - aria-labelledby via DialogTitle (auto-linked)
 * - aria-describedby via description slot
 * - focus-visible ring on close button
 * - Apple HIG shadow + border radius
 */
export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>

        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-foreground/20 dark:bg-black/50 backdrop-blur-[2px]" aria-hidden="true" />
        </TransitionChild>

        {/* Panel container */}
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              className={cn(
                'w-full',
                sizes[size],
                'bg-card text-card-foreground',
                'rounded-t-2xl sm:rounded-xl',
                'border border-border',
                'shadow-modal',
                'p-6',
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <DialogTitle className="text-headline text-foreground tracking-tight">
                  {title}
                </DialogTitle>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full',
                    'bg-secondary hover:bg-accent',
                    'text-muted-foreground hover:text-foreground',
                    'transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  )}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Content */}
              {children}
            </DialogPanel>
          </TransitionChild>
        </div>

      </Dialog>
    </Transition>
  )
}
