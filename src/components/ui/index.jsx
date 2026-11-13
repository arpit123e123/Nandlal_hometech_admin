import { X, Search } from 'lucide-react'
import { createPortal } from 'react-dom'

export const Field = ({ label, error, children, className = '' }) => (
  <div className={className}><label className="label">{label}</label>{children}{error && <p className="err">{error.message || error}</p>}</div>
)
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center no-print" onClick={onClose}>
      <div className={`max-h-[90vh] w-full overflow-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-serif text-lg">{title}</h3><button onClick={onClose} className="p-1"><X size={18} /></button></div>
        {children}
      </div>
    </div>, document.body)
}
export const PageHead = ({ title, sub, children }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="page-title text-2xl">{title}</h1>{sub && <p className="text-sm text-ink2">{sub}</p>}</div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)
const tone = { ok: 'bg-ok/10 text-ok', warn: 'bg-brass/15 text-brass-hover', danger: 'bg-danger/10 text-danger', info: 'bg-line text-ink2' }
export const Badge = ({ t = 'info', children }) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone[t]}`}>{children}</span>
export const SearchBox = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative"><Search size={16} className="absolute left-3 top-3 text-ink2" /><input className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>
)
export const Empty = ({ children }) => <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink2">{children}</div>
export const TableWrap = ({ children }) => <div className="overflow-auto rounded-xl border border-line bg-white max-h-[70vh]">{children}</div>
export const Denied = ({ what = 'Yeh page' }) => <Empty>{what} aapke role ke liye nahi hai (403 Forbidden).</Empty>
export const Stat = ({ icon: Icon, label, value, sub, to, tone: t }) => (
  <div className="card flex items-start gap-3">
    <div className={`rounded-lg p-2 ${t === 'danger' ? 'bg-danger/10 text-danger' : 'bg-brass/15 text-brass-hover'}`}><Icon size={20} /></div>
    <div><p className="text-xs text-ink2">{label}</p><p className="num text-xl font-semibold">{value}</p>{sub && <p className="text-xs text-ink2">{sub}</p>}</div>
  </div>
)
export function Pager({ page, pages, onPage, size, onSize }) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <select className="input !w-auto" value={size} onChange={(e) => onSize(Number(e.target.value))}>{[20, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}</select>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        <span className="num">{page}/{pages || 1}</span>
        <button className="btn btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  )
}
