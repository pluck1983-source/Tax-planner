export type ExpiryStatus = 'expired' | 'due-soon' | 'ok' | 'unset'

const DUE_SOON_WINDOW_DAYS = 60

export function daysUntil(isoDate: string): number | null {
  if (!isoDate) return null
  const target = new Date(isoDate)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = target.getTime() - startOfToday.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function expiryStatus(isoDate: string): ExpiryStatus {
  const days = daysUntil(isoDate)
  if (days === null) return 'unset'
  if (days < 0) return 'expired'
  if (days <= DUE_SOON_WINDOW_DAYS) return 'due-soon'
  return 'ok'
}

export function expiryLabel(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days === null) return 'No expiry set'
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0) return 'Expires today'
  return `Expires in ${days} day${days === 1 ? '' : 's'}`
}

export const expiryStatusStyles: Record<ExpiryStatus, string> = {
  expired: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  'due-soon':
    'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  unset: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
}
