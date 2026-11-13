import { Link } from 'react-router-dom'
import { IndianRupee, Wrench, AlertTriangle, HandCoins, Plus, ReceiptIndianRupee, Package, UserPlus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApi } from '../../lib/hooks'
import { getDashboard, me } from '../../lib/api'
import { can } from '../../lib/rbac'
import { inr, isToday, daysAgo, dayKey, timeAgo } from '../../lib/utils'
import { Stat, PageHead } from '../../components/ui'

const COLORS = ['#B8894A', '#1F1D1A', '#4F7A52', '#9C7239', '#5C554C', '#A64B3C', '#E5DDD1', '#7a6a55']

export default function Dashboard() {
  const { data: s } = useApi('dash', getDashboard)
  if (!s) return null
  const user = me(); const bid = s.branchId
  const bills = s.bills.filter((b) => b.branch_id === bid && !b.cancelled_at)
  const today = bills.filter((b) => isToday(b.created_at))
  const open = s.repairs.filter((r) => !['Delivered', 'Closed'].includes(r.status))
  const low = s.products.filter((p) => !p.deleted && (p.branch_stock?.[bid] ?? 0) <= p.low_stock_threshold)
  const due = bills.reduce((a, b) => a + b.amount_due, 0)
  const days = Array.from({ length: 7 }, (_, i) => { const d = daysAgo(6 - i); const k = dayKey(d); return { d: d.toLocaleDateString('en-IN', { weekday: 'short' }), v: Math.round(bills.filter((b) => dayKey(b.created_at) === k).reduce((a, b) => a + b.grand_total, 0)) } })
  const prod = {}, cat = {}
  const pc = Object.fromEntries(s.products.map((p) => [p.id, p.category_id])), cn = Object.fromEntries(s.categories.map((c) => [c.id, c.name]))
  bills.forEach((b) => b.items.forEach((i) => { prod[i.name] = (prod[i.name] || 0) + i.qty; const c = cn[pc[i.product_id]] || 'Other'; cat[c] = (cat[c] || 0) + i.total }))
  const top = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, v]) => ({ n: n.length > 20 ? n.slice(0, 20) + '…' : n, v }))
  const split = Object.entries(cat).map(([name, value]) => ({ name, value: Math.round(value) }))
  const feed = s.activity_logs.slice(0, 8)
  return (
    <div>
      <PageHead title={`Namaste, ${user.name.split(' ')[0]} ji`} sub="Aaj ka hisaab (demo data)" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/billing"><Stat icon={IndianRupee} label="Aaj ki Sales" value={inr(today.reduce((a, b) => a + b.grand_total, 0))} sub={`${today.length} bills`} /></Link>
        <Link to="/repairs?open=1"><Stat icon={Wrench} label="Pending Repairs" value={open.length} sub="tap karke dekhein" /></Link>
        <Link to="/inventory/low-stock"><Stat icon={AlertTriangle} label="Low Stock" value={low.length} tone={low.length ? 'danger' : ''} sub="reorder list" /></Link>
        <Link to="/billing/udhaar"><Stat icon={HandCoins} label="Udhaar Baaki" value={inr(due)} sub="outstanding" /></Link>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="card lg:col-span-1"><p className="mb-2 text-sm font-medium">Pichhle 7 din ki sales</p><div className="h-52"><ResponsiveContainer><BarChart data={days}><XAxis dataKey="d" fontSize={11} /><YAxis fontSize={11} width={40} /><Tooltip formatter={(v) => inr(v)} /><Bar dataKey="v" fill="#B8894A" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><p className="mb-2 text-sm font-medium">Top 5 products (qty)</p><div className="h-52"><ResponsiveContainer><BarChart data={top} layout="vertical"><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="n" width={110} fontSize={10} /><Tooltip /><Bar dataKey="v" fill="#1F1D1A" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><p className="mb-2 text-sm font-medium">Category-wise revenue</p><div className="h-52"><ResponsiveContainer><PieChart><Pie data={split} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{split.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => inr(v)} /></PieChart></ResponsiveContainer></div></div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p className="mb-3 text-sm font-medium">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['/billing/new', 'New Bill', ReceiptIndianRupee, 'billing.create'], ['/products/new', 'Add Product', Package, 'products.write'], ['/repairs/new', 'New Repair', Wrench, 'repairs.create'], ['/customers/new', 'Add Customer', UserPlus, 'customers.write']].filter((x) => can(user.role, x[3])).map(([to, l, I]) => <Link key={to} to={to} className="btn btn-dark flex-col !py-4"><I size={20} />+ {l}</Link>)}
          </div>
        </div>
        <div className="card"><p className="mb-2 text-sm font-medium">Recent Activity</p><ul className="space-y-2 text-sm">{feed.map((a) => <li key={a.id}>{a.summary}<span className="block text-xs text-ink2">{timeAgo(a.created_at)}</span></li>)}</ul></div>
      </div>
    </div>
  )
}
