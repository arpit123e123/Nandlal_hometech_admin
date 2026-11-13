import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import * as api from '../../lib/api'
import { useDB } from '../../lib/api'
import { can } from '../../lib/rbac'
import { inr, exportCSV, ymd } from '../../lib/utils'
import { PageHead, TableWrap } from '../../components/ui'

const TABS = [['sales', 'Sales'], ['inventory', 'Inventory'], ['customers', 'Customers'], ['repairs', 'Repairs'], ['gst', 'GST']]
const sum = (a, f) => a.reduce((x, i) => x + f(i), 0)
const group = (arr, key) => arr.reduce((m, i) => { const k = key(i); (m[k] = m[k] || []).push(i); return m }, {})
const DT = ({ cols, rows }) => <TableWrap><table className="tbl"><thead><tr>{cols.map((c, i) => <th key={i} className={i ? 'r' : ''}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, k) => <td key={k} className={k ? 'r' : ''}>{v}</td>)}</tr>)}</tbody></table></TableWrap>

export default function Reports({ tab }) {
  const user = api.me(); const s = useDB()
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)); const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [branch, setBranch] = useState('all')
  const profit = can(user.role, 'reports.profit')
  const bills = useMemo(() => s.bills.filter((b) => !b.cancelled_at && b.created_at.slice(0, 10) >= from && b.created_at.slice(0, 10) <= to && (branch === 'all' || b.branch_id === branch)), [s.bills, from, to, branch])
  const items = bills.flatMap((b) => b.items.map((i) => ({ ...i, bill: b })))
  const catOf = Object.fromEntries(s.products.map((p) => [p.id, s.categories.find((c) => c.id === p.category_id)?.name || '-']))
  let body, csv = []

  if (tab === 'sales') {
    const days = Object.entries(group(bills, (b) => b.created_at.slice(0, 10))).sort().map(([d, bs]) => ({ d: d.slice(5), sales: Math.round(sum(bs, (b) => b.grand_total)) }))
    const byCat = Object.entries(group(items, (i) => catOf[i.product_id])).map(([k, v]) => [k, inr(sum(v, (i) => i.total))])
    const byMode = Object.entries(group(bills, (b) => b.payment_mode)).map(([k, v]) => [k, v.length, inr(sum(v, (b) => b.grand_total))])
    const byProd = Object.entries(group(items, (i) => i.name)).map(([k, v]) => ({ k, qty: sum(v, (i) => i.qty), rev: sum(v, (i) => i.total), pr: sum(v, (i) => i.total - (i.cost || 0) * i.qty) })).sort((a, b) => b.rev - a.rev)
    csv = byProd.map((p) => ({ product: p.k, qty: p.qty, revenue: Math.round(p.rev), ...(profit ? { profit: Math.round(p.pr) } : {}) }))
    body = <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="card"><div className="text-xs text-ink2">Bills</div><div className="num text-lg font-semibold">{bills.length}</div></div><div className="card"><div className="text-xs text-ink2">Sales</div><div className="num text-lg font-semibold">{inr(sum(bills, (b) => b.grand_total))}</div></div><div className="card"><div className="text-xs text-ink2">GST collected</div><div className="num text-lg font-semibold">{inr(sum(bills, (b) => b.gst_total))}</div></div>
        {profit ? <div className="card"><div className="text-xs text-ink2">Profit (owner only)</div><div className="num text-lg font-semibold text-ok">{inr(sum(byProd, (p) => p.pr))}</div></div> : <div className="card text-xs text-ink2">Profit sirf owner ko dikhta hai</div>}</div>
      <div className="card h-64"><ResponsiveContainer><BarChart data={days}><XAxis dataKey="d" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="sales" fill="#B8894A" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <h3 className="font-semibold">By category</h3><DT cols={['Category', 'Revenue']} rows={byCat} />
      <h3 className="font-semibold">By payment mode</h3><DT cols={['Mode', 'Bills', 'Amount']} rows={byMode} />
      <h3 className="font-semibold">By product</h3><DT cols={profit ? ['Product', 'Qty', 'Revenue', 'Profit'] : ['Product', 'Qty', 'Revenue']} rows={byProd.map((p) => [p.k, p.qty, inr(p.rev), ...(profit ? [inr(p.pr)] : [])])} />
    </div>
  } else if (tab === 'inventory') {
    const showCost = can(user.role, 'products.cost')
    const last = {}; s.bills.filter((b) => !b.cancelled_at).forEach((b) => b.items.forEach((i) => { if (!last[i.product_id] || b.created_at > last[i.product_id]) last[i.product_id] = b.created_at }))
    const dead = s.products.filter((p) => p.stock_quantity > 0 && (!last[p.id] || Date.now() - new Date(last[p.id]) > 60 * 864e5))
    const fast = Object.entries(group(items, (i) => i.name)).map(([k, v]) => [k, sum(v, (i) => i.qty)]).sort((a, b) => b[1] - a[1]).slice(0, 20)
    csv = fast.map(([product, qty_sold]) => ({ product, qty_sold }))
    body = <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">{showCost && <div className="card"><div className="text-xs text-ink2">Stock value (cost)</div><div className="num text-lg font-semibold">{inr(sum(s.products, (p) => (p.cost_price || 0) * p.stock_quantity))}</div></div>}<div className="card"><div className="text-xs text-ink2">Stock value (selling)</div><div className="num text-lg font-semibold">{inr(sum(s.products, (p) => p.selling_price * p.stock_quantity))}</div></div></div>
      <h3 className="font-semibold">Fast moving (top 20)</h3><DT cols={['Product', 'Qty sold']} rows={fast} />
      <h3 className="font-semibold">Dead stock (60+ din, no sale)</h3><DT cols={['Product', 'Stock']} rows={dead.map((p) => [p.name, p.stock_quantity])} />
      <h3 className="font-semibold">Movement summary</h3><DT cols={['Reason', 'Entries', 'Net qty']} rows={Object.entries(group(s.stock_movements, (m) => m.reason)).map(([k, v]) => [k, v.length, sum(v, (m) => m.change_qty)])} />
    </div>
  } else if (tab === 'customers') {
    const cn = Object.fromEntries(s.customers.map((c) => [c.id, c]))
    const top = Object.entries(group(bills.filter((b) => b.customer_id), (b) => b.customer_id)).map(([id, v]) => [cn[id]?.name, v.length, inr(sum(v, (b) => b.grand_total)), sum(v, (b) => b.grand_total)]).sort((a, b) => b[3] - a[3]).slice(0, 20)
    const age = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    s.bills.filter((b) => !b.cancelled_at && b.amount_due > 0).forEach((b) => { const d = (Date.now() - new Date(b.created_at)) / 864e5; age[d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+'] += b.amount_due })
    const ret = new Set(bills.filter((b) => b.customer_id && s.bills.some((o) => o.customer_id === b.customer_id && o.created_at < from)).map((b) => b.customer_id)).size
    const all = new Set(bills.filter((b) => b.customer_id).map((b) => b.customer_id)).size
    csv = top.map((r) => ({ customer: r[0], bills: r[1], revenue: r[3] }))
    body = <div className="space-y-4"><div className="grid grid-cols-2 gap-2"><div className="card"><div className="text-xs text-ink2">Returning</div><div className="num text-lg font-semibold">{ret}</div></div><div className="card"><div className="text-xs text-ink2">New</div><div className="num text-lg font-semibold">{all - ret}</div></div></div>
      <h3 className="font-semibold">Top customers</h3><DT cols={['Customer', 'Bills', 'Revenue']} rows={top.map((r) => r.slice(0, 3))} />
      <h3 className="font-semibold">Udhaar aging (din)</h3><DT cols={['Bucket', 'Outstanding']} rows={Object.entries(age).map(([k, v]) => [k, inr(v)])} /></div>
  } else if (tab === 'repairs') {
    const reps = s.repairs
    const byStatus = Object.entries(group(reps, (r) => r.status)).map(([k, v]) => [k, v.length])
    const done = reps.filter((r) => r.delivered_at)
    const avg = done.length ? sum(done, (r) => (new Date(r.delivered_at) - new Date(r.created_at)) / 864e5) / done.length : 0
    const tn = Object.fromEntries(s.users.map((u) => [u.id, u.name]))
    const perf = Object.entries(group(reps, (r) => r.assigned_to)).map(([k, v]) => [tn[k], v.length, v.filter((r) => r.delivered_at).length])
    const repRev = sum(done, (r) => r.final_amount); const saleRev = sum(bills, (b) => b.grand_total)
    csv = byStatus.map(([status, count]) => ({ status, count }))
    body = <div className="space-y-4"><div className="grid grid-cols-3 gap-2"><div className="card"><div className="text-xs text-ink2">Avg turnaround</div><div className="num font-semibold">{avg.toFixed(1)} din</div></div><div className="card"><div className="text-xs text-ink2">Repair revenue</div><div className="num font-semibold">{inr(repRev)}</div></div><div className="card"><div className="text-xs text-ink2">Product sales</div><div className="num font-semibold">{inr(saleRev)}</div></div></div>
      <h3 className="font-semibold">By status</h3><DT cols={['Status', 'Count']} rows={byStatus} /><h3 className="font-semibold">Technician performance</h3><DT cols={['Technician', 'Assigned', 'Delivered']} rows={perf} /></div>
  } else {
    const gstRows = Object.entries(group(bills, (b) => b.invoice_no)).map(([k, v]) => { const b = v[0]; const cu = s.customers.find((c) => c.id === b.customer_id); return { invoice: k, date: b.created_at.slice(0, 10), customer: cu?.name || 'Walk-in', taxable: Math.round((b.grand_total - b.gst_total - b.roundoff) * 100) / 100, cgst: Math.round(b.gst_total * 50) / 100, sgst: Math.round(b.gst_total * 50) / 100, total: b.grand_total } })
    const hsn = Object.entries(group(items, (i) => i.hsn + '|' + i.gst_rate)).map(([k, v]) => ({ hsn: k.split('|')[0], gst_rate: k.split('|')[1], qty: sum(v, (i) => i.qty), taxable: Math.round(sum(v, (i) => i.taxable)), cgst: Math.round(sum(v, (i) => i.tax) * 50) / 100, sgst: Math.round(sum(v, (i) => i.tax) * 50) / 100 }))
    csv = gstRows
    body = <div className="space-y-4"><p className="text-xs text-ink2">GSTR-1 style outward supplies (B2C, intra-state CGST+SGST). Demo data, CA se verify karein.</p>
      <div className="grid grid-cols-3 gap-2"><div className="card"><div className="text-xs text-ink2">Taxable</div><div className="num font-semibold">{inr(sum(gstRows, (r) => r.taxable))}</div></div><div className="card"><div className="text-xs text-ink2">CGST</div><div className="num font-semibold">{inr(sum(gstRows, (r) => r.cgst))}</div></div><div className="card"><div className="text-xs text-ink2">SGST</div><div className="num font-semibold">{inr(sum(gstRows, (r) => r.sgst))}</div></div></div>
      <h3 className="font-semibold">HSN summary</h3><DT cols={['HSN', 'GST%', 'Qty', 'Taxable', 'CGST', 'SGST']} rows={hsn.map((h) => [h.hsn, h.gst_rate, h.qty, inr(h.taxable), inr(h.cgst), inr(h.sgst)])} />
      <h3 className="font-semibold">Invoices</h3><DT cols={['Invoice', 'Taxable', 'CGST', 'SGST', 'Total']} rows={gstRows.map((r) => [r.invoice, inr(r.taxable), inr(r.cgst), inr(r.sgst), inr(r.total)])} /></div>
  }
  return (
    <div>
      <PageHead title="Reports" sub="Demo data se bani reports"><button className="btn btn-ghost" onClick={() => exportCSV(`report-${tab}-${ymd()}`, csv)}><Download size={16} />CSV</button><button className="btn btn-ghost" onClick={() => window.print()}>PDF / Print</button></PageHead>
      <div className="mb-3 flex gap-2 overflow-x-auto text-sm">{TABS.map(([t, l]) => <Link key={t} to={`/reports/${t}`} className={`btn whitespace-nowrap ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>{l}</Link>)}</div>
      <div className="mb-3 grid grid-cols-3 gap-2"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="input" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="all">All branches</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      {body}
    </div>
  )
}
