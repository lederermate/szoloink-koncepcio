import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { AlertTriangle, Info, Loader2, X, XCircle } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import type { ComplianceWarning } from '../../shared/types'

export const cx = (...a: ClassValue[]) => twMerge(clsx(a))

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export function Button({
  variant = 'primary', size = 'md', loading, icon, className, children, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vine-500 whitespace-nowrap',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-vine-700 text-white shadow-sm shadow-vine-900/20 hover:bg-vine-800 dark:bg-vine-500 dark:text-vine-950 dark:hover:bg-vine-400',
        variant === 'secondary' && 'border border-line bg-surface hover:bg-surface-2',
        variant === 'ghost' && 'hover:bg-surface-2 text-muted hover:text-fg',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={cx('rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,.04)]', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex items-center gap-2.5 min-w-0 flex-1 basis-56">
        {icon && <div className="text-vine-600 dark:text-vine-400">{icon}</div>}
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight truncate">{title}</h3>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-line bg-surface px-3 h-10 text-sm outline-none transition placeholder:text-muted/70 focus:border-vine-500 focus:ring-4 focus:ring-vine-500/15'

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, className)} />
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputCls, 'pr-8', className)}>
    {children}
  </select>
)
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(inputCls, 'h-auto min-h-20 py-2', className)} />
)

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'grape' | 'brand'
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap',
        tone === 'neutral' && 'bg-surface-2 text-muted ring-[var(--border)]',
        tone === 'green' && 'bg-leaf-50 text-leaf-800 ring-leaf-200 dark:bg-leaf-900/40 dark:text-leaf-200 dark:ring-leaf-800',
        tone === 'brand' && 'bg-vine-50 text-vine-800 ring-vine-200 dark:bg-vine-900/50 dark:text-vine-200 dark:ring-vine-800',
        tone === 'red' && 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900',
        tone === 'amber' && 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900',
        tone === 'blue' && 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900',
        tone === 'grape' && 'bg-rose-50 text-grape-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Stat({ label, value, unit, icon, tone = 'vine' }: { label: string; value: ReactNode; unit?: string; icon: ReactNode; tone?: 'vine' | 'grape' | 'amber' | 'sky' }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span
          className={cx(
            'grid size-8 place-items-center rounded-lg [&>svg]:size-4',
            tone === 'vine' && 'bg-vine-100 text-vine-700 dark:bg-vine-900/60 dark:text-vine-300',
            tone === 'grape' && 'bg-rose-100 text-grape-600 dark:bg-rose-950/60 dark:text-rose-300',
            tone === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
            tone === 'sky' && 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
    </Card>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl sm:rounded-3xl bg-surface border border-line shadow-2xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Bezárás">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-line">{footer}</div>}
      </div>
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted mb-3 [&>svg]:size-6">{icon}</div>
      <p className="font-medium">{title}</p>
      {text && <p className="text-sm text-muted mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Warnings({ items }: { items: ComplianceWarning[] }) {
  if (!items.length) return null
  const order = { error: 0, warning: 1, info: 2 }
  return (
    <ul className="flex flex-col gap-2">
      {[...items].sort((a, b) => order[a.level] - order[b.level]).map((w, i) => (
        <li
          key={i}
          className={cx(
            'flex gap-2.5 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset',
            w.level === 'error' && 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900',
            w.level === 'warning' && 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
            w.level === 'info' && 'bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900',
          )}
        >
          {w.level === 'error' ? <XCircle className="size-4 mt-0.5 shrink-0" /> : w.level === 'warning' ? <AlertTriangle className="size-4 mt-0.5 shrink-0" /> : <Info className="size-4 mt-0.5 shrink-0" />}
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16 text-muted">
      <Loader2 className="size-6 animate-spin" />
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1 border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg px-3 h-8 text-sm font-medium transition whitespace-nowrap',
            value === o.value ? 'bg-surface shadow-sm text-fg' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return <span className={cx('inline-block size-2.5 rounded-full ring-2 ring-white/60 dark:ring-black/30', className)} style={{ background: color }} />
}
