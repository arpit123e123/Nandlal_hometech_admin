import { IS_DEMO } from '../../lib/config'
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, Package, Tags, Boxes, ReceiptIndianRupee, Wrench, Users, BarChart3, Settings, ScrollText, Bell, LogOut, Menu, PanelLeftClose, PanelLeft, WifiOff, Search, Store } from 'lucide-react'
import { useDB, me, logout, touch, markNotifs } from '../../lib/api'
import { can } from '../../lib/rbac'
import { timeAgo } from '../../lib/utils'

const NAV = [
  ['/', 'Dashboard', LayoutDashboard, 'dashboard'],
  ['/billing', 'Billing / Udhaar', ReceiptIndianRupee, 'billing.view'],
  ['/products', 'Products', Package, 'products.view'],
  ['/categories', 'Categories', Tags, 'products.view'],
  ['/inventory', 'Inventory', Boxes, 'inventory.view'],
  ['/repairs', 'Repairs', Wrench, ['repairs.all', 'repairs.assigned']],
  ['/customers', 'Customers', Users, 'customers.view'],
  ['/reports', 'Reports', BarChart3, 'reports.view'],
  ['/settings', 'Settings', Settings, 'settings'],
  ['/activity', 'Activity Log', ScrollText, ['activity.all', 'activity.branch', 'activity.own']],
]
const BOTTOM = ['/', '/billing/new', '/repairs', '/products', '/customers']

export default function Layout() {
  const user = useDB((s) => s.users.find((u) => u.id === s.session))
  const notifs = useDB((s) => s.notifications)
  const branches = useDB((s) => s.branches)
  const branchId = useDB((s) => s.branchId)
  const lastActive = useDB((s) => s.lastActive)
  const nav = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [bell, setBell] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [q, setQ] = useState('')

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    const act = () => touch()
    window.addEventListener('click', act)
    const iv = setInterval(() => { if (Date.now() - useDB.getState().lastActive > 30 * 60000) { logout(); nav('/login') } }, 30000)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('click', act); clearInterval(iv) }
  }, [])

  const items = NAV.filter(([, , , p]) => [].concat(p).some((x) => can(user.role, x)))
  const unread = notifs.filter((n) => !n.is_read).length
  const SideBody = ({ mini }) => (
    <>
      <div className="flex items-center gap-2 px-4 py-4 text-cream"><img src="/logo.svg" alt="Nandlal Hometech" className="h-9 w-9 shrink-0 rounded-lg" />{!mini && <div className="leading-tight"><p className="font-serif text-sm">NANDLAL HOMETECH</p><p className="text-[10px] text-brass">ADMIN{IS_DEMO ? ' · DEMO' : ''}</p></div>}</div>
      <nav className="flex-1 space-y-1 px-2">
        {items.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setDrawer(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-brass text-white' : 'text-cream/80 hover:bg-white/10'}`}>
            <Icon size={18} className="shrink-0" />{!mini && label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3 text-cream">
        {!mini && <p className="truncate text-sm">{user.name}</p>}
        {!mini && <p className="mb-2 text-xs text-brass">{user.role}</p>}
        <button onClick={() => { logout(); nav('/login') }} className="flex items-center gap-2 text-sm text-cream/80 hover:text-white"><LogOut size={16} />{!mini && 'Logout'}</button>
      </div>
    </>
  )
  return (
    <div className="flex min-h-screen">
      <aside className={`no-print sticky top-0 hidden h-screen flex-col bg-charcoal md:flex ${collapsed ? 'w-16' : 'w-60'}`}><SideBody mini={collapsed} /></aside>
      {drawer && <div className="fixed inset-0 z-40 bg-black/50 md:hidden no-print" onClick={() => setDrawer(false)}><aside className="flex h-full w-64 flex-col bg-charcoal" onClick={(e) => e.stopPropagation()}><SideBody /></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        {IS_DEMO && <div className="bg-brass px-3 py-1 text-center text-xs text-white no-print">DEMO MODE: seed data, browser storage only. Real data/security ke liye backend chahiye.</div>}
        {!online && <div className="flex items-center justify-center gap-2 bg-danger px-3 py-1 text-xs text-white no-print"><WifiOff size={14} />Offline: cached data dikh raha hai</div>}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white px-3 md:px-6">
          <button className="md:hidden p-2" onClick={() => setDrawer(true)}><Menu /></button>
          <button className="hidden p-2 md:block" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}</button>
          {branches.filter((b) => b.is_active).length > 1 ? (
            <select className="input !w-auto !min-h-0 !py-1 text-xs" value={branchId} onChange={(e) => useDB.setState({ branchId: e.target.value })}>{branches.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          ) : <span className="hidden text-xs text-ink2 sm:block">{branches.find((b) => b.id === branchId)?.name}</span>}
          {can(user.role, 'products.view') && (
            <form className="relative mx-auto hidden max-w-md flex-1 sm:block" onSubmit={(e) => { e.preventDefault(); nav('/products?q=' + encodeURIComponent(q)) }}>
              <Search size={16} className="absolute left-3 top-3 text-ink2" /><input className="input pl-9" placeholder="Global search: product, SKU, brand" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button className="relative p-2" onClick={() => { setBell(!bell) }}><Bell size={20} />{unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-danger px-1 text-[10px] text-white">{unread}</span>}</button>
              {bell && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-line bg-white p-2 shadow-xl">
                  <div className="flex justify-between px-2 py-1 text-xs"><b>Notifications</b><button className="text-brass" onClick={() => markNotifs()}>Mark all read</button></div>
                  <div className="max-h-72 overflow-auto">{notifs.slice(0, 12).map((n) => (
                    <Link key={n.id} to={n.link || '/'} onClick={() => setBell(false)} className={`block rounded-lg px-2 py-2 text-sm hover:bg-cream ${n.is_read ? 'text-ink2' : 'font-medium'}`}>{n.message}<span className="block text-[11px] text-ink2">{timeAgo(n.created_at)}</span></Link>
                  ))}</div>
                </div>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-sm text-cream">{user.name[0]}</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-24 md:p-6 md:pb-6"><Outlet /></main>
        <nav className="no-print fixed bottom-0 left-0 right-0 z-30 flex border-t border-line bg-white md:hidden">
          {items.filter(([to]) => BOTTOM.includes(to) || to === '/billing').slice(0, 5).map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-1 flex-col items-center py-2 text-[10px] ${isActive ? 'text-brass-hover' : 'text-ink2'}`}><Icon size={20} />{label.split(' ')[0]}</NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
