import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Download, MinusCircle, MessageCircle, Trash2 } from 'lucide-react'
import { useApi, useAct } from '../../lib/hooks'
import * as api from '../../lib/api'
import { useDB } from '../../lib/api'
import { can } from '../../lib/rbac'
import { inr, fmtDate, fmtDateTime, exportCSV } from '../../lib/utils'
import { PageHead, SearchBox, Badge, Empty, TableWrap, Field, Modal } from '../../components/ui'

const Tabs = () => (
  <div className="mb-3 flex gap-2 overflow-x-auto text-sm">
    {[['/inventory', 'Stock'], ['/inventory/movements', 'Movements'], ['/inventory/low-stock', 'Reorder list'], ['/inventory/purchases', 'Purchases'], ['/inventory/suppliers', 'Suppliers']].map(([to, l]) => <Link key={to} to={to} className="btn btn-ghost whitespace-nowrap">{l}</Link>)}
  </div>
)

export function Inventory() {
  const { data: products = [] } = useApi('inv-products', api.listProducts)
  const user = api.me(); const [q, setQ] = useState(''); const [out, setOut] = useState(null)
  const [qty, setQty] = useState(1); const [reason, setReason] = useState('damage'); const [notes, setNotes] = useState('')
  const act = useAct((id, q, r, n) => api.stockOut(id, q, r, n), 'Stock kam ho gaya')
  const rows = products.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase()))
  const showCost = can(user.role, 'products.cost')
  const costVal = products.reduce((a, p) => a + (p.cost_price || 0) * p.stock_quantity, 0)
  const sellVal = products.reduce((a, p) => a + p.selling_price * p.stock_quantity, 0)
  return (
    <div>
      <PageHead title="Inventory" sub={showCost ? `Stock value: cost ${inr(costVal)} | selling ${inr(sellVal)}` : `Stock value (selling): ${inr(sellVal)}`}>
        {can(user.role, 'purchases.write') && <Link to="/inventory/purchases/new" className="btn btn-primary"><Plus size={16} />Stock In (Purchase)</Link>}
      </PageHead>
      <Tabs /><div className="mb-3 sm:max-w-sm"><SearchBox value={q} onChange={setQ} placeholder="Product / SKU" /></div>
      <TableWrap><table className="tbl"><thead><tr><th>Product</th><th>SKU</th><th className="r">Stock</th><th className="r">Threshold</th><th>Status</th><th></th></tr></thead><tbody>
        {rows.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.sku}</td><td className="r">{p.stock_quantity}</td><td className="r">{p.low_stock_threshold}</td>
          <td>{p.stock_quantity <= 0 ? <Badge t="danger">Out</Badge> : p.stock_quantity <= p.low_stock_threshold ? <Badge t="warn">Low</Badge> : <Badge t="ok">OK</Badge>}</td>
          <td>{can(user.role, 'stock.write') && <button className="btn btn-ghost !py-1" onClick={() => setOut(p)}><MinusCircle size={14} />Stock out</button>}</td></tr>)}
      </tbody></table></TableWrap>
      <Modal open={!!out} onClose={() => setOut(null)} title={`Stock out: ${out?.name}`}>
        <div className="space-y-3">
          <Field label="Kitna?"><input type="number" className="input" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Reason"><select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{['damage', 'return', 'correction'].map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Notes"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <button className="btn btn-primary w-full" onClick={async () => { await act.mutateAsync([out.id, qty, reason, notes]); setOut(null) }}>Save</button>
        </div>
      </Modal>
    </div>
  )
}

export function Movements() {
  const { data: mv = [] } = useApi('mv', api.listMovements)
  const products = useDB((s) => s.products); const users = useDB((s) => s.users)
  const pn = Object.fromEntries(products.map((p) => [p.id, p.name])); const un = Object.fromEntries(users.map((u) => [u.id, u.name]))
  const [reason, setReason] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [q, setQ] = useState('')
  const rows = [...mv].sort((a, b) => b.created_at.localeCompare(a.created_at)).filter((m) => (!reason || m.reason === reason) && (!from || m.created_at.slice(0, 10) >= from) && (!to || m.created_at.slice(0, 10) <= to) && (pn[m.product_id] || '').toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHead title="Stock Movements" sub={`${rows.length} entries`}><button className="btn btn-ghost" onClick={() => exportCSV('stock-movements', rows.map((m) => ({ time: m.created_at, product: pn[m.product_id], change: m.change_qty, reason: m.reason, user: un[m.user_id], notes: m.notes })))}><Download size={16} />CSV</button></PageHead>
      <Tabs />
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><SearchBox value={q} onChange={setQ} placeholder="Product" />
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">All reasons</option>{['purchase', 'sale', 'damage', 'return', 'correction'].map((r) => <option key={r}>{r}</option>)}</select>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <TableWrap><table className="tbl"><thead><tr><th>Time</th><th>Product</th><th className="r">Qty</th><th>Reason</th><th>User</th><th>Notes</th></tr></thead><tbody>
        {rows.slice(0, 200).map((m) => <tr key={m.id}><td>{fmtDateTime(m.created_at)}</td><td>{pn[m.product_id]}</td><td className={`r ${m.change_qty < 0 ? 'text-danger' : 'text-ok'}`}>{m.change_qty > 0 ? '+' : ''}{m.change_qty}</td><td>{m.reason}</td><td>{un[m.user_id]}</td><td>{m.notes}</td></tr>)}
      </tbody></table></TableWrap>
    </div>
  )
}

export function LowStock() {
  const { data: products = [] } = useApi('inv-products', api.listProducts)
  const rows = products.filter((p) => p.is_active && p.stock_quantity <= p.low_stock_threshold).map((p) => ({ ...p, suggest: Math.max(p.low_stock_threshold * 2 - p.stock_quantity, 1) }))
  return (
    <div>
      <PageHead title="Reorder list" sub={`${rows.length} products low`}><button className="btn btn-ghost" onClick={() => exportCSV('reorder-list', rows.map((p) => ({ product: p.name, sku: p.sku, stock: p.stock_quantity, threshold: p.low_stock_threshold, suggested_qty: p.suggest })))}><Download size={16} />CSV</button></PageHead>
      <Tabs />
      {!rows.length ? <Empty>Sab stock theek hai</Empty> : <TableWrap><table className="tbl"><thead><tr><th>Product</th><th className="r">Stock</th><th className="r">Threshold</th><th className="r">Suggested qty</th></tr></thead><tbody>
        {rows.map((p) => <tr key={p.id}><td>{p.name}</td><td className="r text-danger">{p.stock_quantity}</td><td className="r">{p.low_stock_threshold}</td><td className="r">{p.suggest}</td></tr>)}
      </tbody></table></TableWrap>}
    </div>
  )
}

export function Purchases() {
  const { data: pu = [] } = useApi('pu', api.listPurchases)
  const suppliers = useDB((s) => s.suppliers); const sn = Object.fromEntries(suppliers.map((s) => [s.id, s.name])); const user = api.me()
  return (
    <div>
      <PageHead title="Purchases" sub="Supplier se maal ki entry">{can(user.role, 'purchases.write') && <Link to="/inventory/purchases/new" className="btn btn-primary"><Plus size={16} />New Purchase</Link>}</PageHead>
      <Tabs />
      {!pu.length ? <Empty>Abhi koi purchase nahi</Empty> : <TableWrap><table className="tbl"><thead><tr><th>Date</th><th>Invoice</th><th>Supplier</th><th className="r">Total</th><th className="r">Paid</th><th>Status</th></tr></thead><tbody>
        {[...pu].reverse().map((p) => <tr key={p.id}><td>{fmtDate(p.purchase_date)}</td><td>{p.invoice_no}</td><td>{sn[p.supplier_id]}</td><td className="r">{inr(p.total_amount)}</td><td className="r">{inr(p.paid_amount)}</td><td><Badge t={p.status === 'paid' ? 'ok' : 'warn'}>{p.status}</Badge></td></tr>)}
      </tbody></table></TableWrap>}
    </div>
  )
}

export function PurchaseNew() {
  const nav = useNavigate(); const suppliers = useDB((s) => s.suppliers)
  const { data: products = [] } = useApi('inv-products', api.listProducts)
  const [sup, setSup] = useState(''); const [inv, setInv] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [paid, setPaid] = useState('')
  const [items, setItems] = useState([{ product_id: '', qty: 1, cost_price: '' }]); const [err, setErr] = useState('')
  const act = useAct((d) => api.createPurchase(d), 'Purchase save hui, stock badh gaya')
  const upd = (i, p) => setItems(items.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const total = items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.cost_price) || 0), 0)
  const submit = async () => {
    const clean = items.filter((i) => i.product_id)
    if (!sup || !inv || !clean.length || clean.some((i) => !(Number(i.qty) > 0) || !(Number(i.cost_price) > 0))) return setErr('Supplier, invoice no, aur har item ka qty + cost bharein')
    await act.mutateAsync({ supplier_id: sup, invoice_no: inv, purchase_date: date, paid_amount: paid, items: clean.map((i) => ({ product_id: i.product_id, qty: Number(i.qty), cost_price: Number(i.cost_price), total: Number(i.qty) * Number(i.cost_price) })) })
    nav('/inventory/purchases')
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20">
      <PageHead title="Nayi Purchase" sub="Cost price weighted average se update hoga" />
      <div className="card grid gap-3 sm:grid-cols-2">
        <Field label="Supplier"><select className="input" value={sup} onChange={(e) => setSup(e.target.value)}><option value="">Chunein</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Invoice no"><input className="input" value={inv} onChange={(e) => setInv(e.target.value)} /></Field>
        <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Abhi kitna diya (₹)"><input type="number" className="input" value={paid} onChange={(e) => setPaid(e.target.value)} /></Field>
      </div>
      <div className="card space-y-2">
        {items.map((it, i) => <div key={i} className="grid grid-cols-[1fr_70px_90px_28px] gap-2">
          <select className="input" value={it.product_id} onChange={(e) => upd(i, { product_id: e.target.value })}><option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input type="number" className="input" placeholder="Qty" value={it.qty} onChange={(e) => upd(i, { qty: e.target.value })} />
          <input type="number" className="input" placeholder="Cost" value={it.cost_price} onChange={(e) => upd(i, { cost_price: e.target.value })} />
          <button onClick={() => setItems(items.filter((_, k) => k !== i))}><Trash2 size={16} className="text-danger" /></button></div>)}
        <button className="btn btn-ghost" onClick={() => setItems([...items, { product_id: '', qty: 1, cost_price: '' }])}><Plus size={14} />Item</button>
        <div className="text-right font-semibold num">Total {inr(total)}</div>
      </div>
      {err && <p className="err">{err}</p>}
      <button className="btn btn-primary w-full sm:w-auto" onClick={submit}>Purchase save karein</button>
    </div>
  )
}

export function Suppliers() {
  const { data: sup = [] } = useApi('sup', api.listSuppliers); const pu = useDB((s) => s.purchases)
  const [open, setOpen] = useState(false); const [f, setF] = useState({ name: '', phone: '', contact_person: '', gstin: '' })
  const act = useAct((d) => api.saveSupplier(d), 'Supplier save hua')
  return (
    <div>
      <PageHead title="Suppliers"><button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add</button></PageHead>
      <Tabs />
      <TableWrap><table className="tbl"><thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th className="r">Outstanding</th></tr></thead><tbody>
        {sup.map((s) => { const out = pu.filter((p) => p.supplier_id === s.id).reduce((a, p) => a + p.total_amount - p.paid_amount, 0)
          return <tr key={s.id}><td><Link className="text-brass-hover underline" to={`/inventory/suppliers/${s.id}`}>{s.name}</Link></td><td>{s.contact_person}</td><td>{s.phone}</td><td className="r">{inr(out)}</td></tr> })}
      </tbody></table></TableWrap>
      <Modal open={open} onClose={() => setOpen(false)} title="Naya supplier">
        <div className="space-y-3">{[['name', 'Naam'], ['contact_person', 'Contact person'], ['phone', 'Phone'], ['gstin', 'GSTIN']].map(([k, l]) => <Field key={k} label={l}><input className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}
          <button className="btn btn-primary w-full" disabled={f.name.length < 2} onClick={async () => { await act.mutateAsync({ ...f, whatsapp: f.phone }); setOpen(false) }}>Save</button></div>
      </Modal>
    </div>
  )
}

export function SupplierDetail() {
  const { id } = useParams(); const s = useDB((x) => x.suppliers.find((y) => y.id === id)); const pu = useDB((x) => x.purchases).filter((p) => p.supplier_id === id)
  if (!s) return <Empty>Supplier nahi mila</Empty>
  const out = pu.reduce((a, p) => a + p.total_amount - p.paid_amount, 0)
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHead title={s.name} sub={`${s.contact_person} | ${s.phone} | GSTIN ${s.gstin}`}>{s.whatsapp && <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/91${s.whatsapp}`}><MessageCircle size={16} />WhatsApp</a>}</PageHead>
      <div className="card"><div className="text-sm text-ink2">Outstanding payment</div><div className="font-serif text-2xl">{inr(out)}</div></div>
      <TableWrap><table className="tbl"><thead><tr><th>Date</th><th>Invoice</th><th className="r">Total</th><th className="r">Paid</th></tr></thead><tbody>{pu.map((p) => <tr key={p.id}><td>{fmtDate(p.purchase_date)}</td><td>{p.invoice_no}</td><td className="r">{inr(p.total_amount)}</td><td className="r">{inr(p.paid_amount)}</td></tr>)}</tbody></table></TableWrap>
    </div>
  )
}
