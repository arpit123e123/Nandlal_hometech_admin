import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Plus, Minus, Trash2, Printer, MessageCircle, Ban, ShoppingCart } from 'lucide-react'
import { useApi, useAct } from '../../lib/hooks'
import * as api from '../../lib/api'
import { useDB } from '../../lib/api'
import { can } from '../../lib/rbac'
import { inr, fmtDate, fmtDateTime, calcBill, amountInWords, isToday } from '../../lib/utils'
import { PageHead, SearchBox, Badge, Empty, TableWrap, Field, Modal } from '../../components/ui'

const payTone = { paid: 'ok', partial: 'warn', pending: 'danger', cancelled: 'info' }
const waLink = (phone, text) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`
const fill = (t, o) => Object.entries(o).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, v), t)

export function BillList() {
  const { data: bills = [] } = useApi('bills', api.listBills)
  const customers = useDB((s) => s.customers); const cn = Object.fromEntries(customers.map((c) => [c.id, c]))
  const user = api.me()
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [mode, setMode] = useState(''); const [date, setDate] = useState('')
  const rows = [...bills].reverse().filter((b) => {
    const c = cn[b.customer_id]
    const hay = (b.invoice_no + (c?.name || '') + (c?.phone || '')).toLowerCase()
    return hay.includes(q.toLowerCase()) && (!st || b.payment_status === st) && (!mode || b.payment_mode === mode) && (!date || b.created_at.slice(0, 10) === date)
  })
  return (
    <div>
      <PageHead title="Billing" sub={`${bills.length} bills`}>
        <Link to="/billing/udhaar" className="btn btn-ghost">Udhaar list</Link>
        {can(user.role, 'billing.create') && <Link to="/billing/new" className="btn btn-primary"><Plus size={16} />New Bill</Link>}
      </PageHead>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SearchBox value={q} onChange={setQ} placeholder="Invoice / naam / phone" />
        <select className="input" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All status</option><option>paid</option><option>partial</option><option>pending</option><option>cancelled</option></select>
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="">All modes</option>{['Cash', 'UPI', 'Card', 'Udhaar'].map((m) => <option key={m}>{m}</option>)}</select>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {!rows.length ? <Empty>Koi bill nahi mila</Empty> : <TableWrap><table className="tbl"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Mode</th><th className="r">Total</th><th className="r">Baaki</th><th>Status</th></tr></thead><tbody>
        {rows.slice(0, 100).map((b) => <tr key={b.id}><td><Link className="text-brass-hover underline" to={`/billing/${b.id}`}>{b.invoice_no}</Link></td><td>{fmtDateTime(b.created_at)}</td><td>{cn[b.customer_id]?.name || 'Walk-in'}</td><td>{b.payment_mode}</td><td className="r">{inr(b.grand_total)}</td><td className="r">{inr(b.amount_due)}</td><td><Badge t={payTone[b.payment_status]}>{b.payment_status}</Badge></td></tr>)}
      </tbody></table></TableWrap>}
    </div>
  )
}

export function POS() {
  const nav = useNavigate()
  const { data: products = [] } = useApi('pos-products', api.listProducts)
  const customers = useDB((s) => s.customers); const settings = useDB((s) => s.settings)
  const [q, setQ] = useState(''); const [cart, setCart] = useState([]); const [cust, setCust] = useState('')
  const [mode, setMode] = useState('Cash'); const [paid, setPaid] = useState(''); const [billDisc, setBillDisc] = useState(0); const [notes, setNotes] = useState('')
  const [showCart, setShowCart] = useState(false); const [dueDate, setDueDate] = useState('')
  const act = useAct((d) => api.createBill(d), 'Bill ban gaya')
  const list = products.filter((p) => p.is_active && (p.name + p.sku + (p.tags || []).join(' ')).toLowerCase().includes(q.toLowerCase())).slice(0, 30)
  const add = (p) => setCart((c) => { const x = c.find((i) => i.product_id === p.id); if (x) return c.map((i) => (i.product_id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock_quantity) } : i)); return [...c, { product_id: p.id, name: p.name, price: p.selling_price, qty: 1, discount: 0, gst_rate: p.gst_rate, max: p.stock_quantity }] })
  const upd = (id, patch) => setCart((c) => c.map((i) => (i.product_id === id ? { ...i, ...patch } : i)))
  const calc = useMemo(() => calcBill(cart, Number(billDisc) || 0, settings.tax.inclusive), [cart, billDisc, settings])
  const submit = async () => {
    const id = await act.mutateAsync({ items: cart.map(({ max, ...i }) => ({ ...i, qty: Number(i.qty), discount: Number(i.discount) || 0 })), billDiscount: Number(billDisc) || 0, customer_id: cust || null, payment_mode: mode, due_date: mode === 'Udhaar' ? dueDate || null : null, amount_paid: mode === 'Udhaar' ? Number(paid) || 0 : calc.grand_total, notes })
    nav(`/billing/${id}`)
  }
  const cartUI = (
    <div className="space-y-3">
      <select className="input" value={cust} onChange={(e) => setCust(e.target.value)}><option value="">Walk-in customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}</select>
      {!cart.length ? <Empty>Cart khali hai. Product tap karein.</Empty> : cart.map((i) => (
        <div key={i.product_id} className="rounded-lg border border-line p-2 text-sm">
          <div className="flex justify-between"><span>{i.name}</span><button onClick={() => setCart(cart.filter((x) => x !== i))}><Trash2 size={14} className="text-danger" /></button></div>
          <div className="mt-1 flex items-center gap-2">
            <button className="btn btn-ghost !p-1 !min-h-0" onClick={() => upd(i.product_id, { qty: Math.max(1, i.qty - 1) })}><Minus size={14} /></button>
            <span className="w-6 text-center num">{i.qty}</span>
            <button className="btn btn-ghost !p-1 !min-h-0" onClick={() => upd(i.product_id, { qty: Math.min(i.max, i.qty + 1) })}><Plus size={14} /></button>
            <span className="num ml-auto">{inr(i.price)} | GST {i.gst_rate}%</span>
          </div>
          <input type="number" className="input mt-1 !py-1" placeholder="Item discount (₹)" value={i.discount || ''} onChange={(e) => upd(i.product_id, { discount: e.target.value })} />
        </div>
      ))}
      <input type="number" className="input" placeholder="Total discount (₹ flat)" value={billDisc || ''} onChange={(e) => setBillDisc(e.target.value)} />
      <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>{['Cash', 'UPI', 'Card', 'Udhaar'].map((m) => <option key={m}>{m}</option>)}</select>
      {mode === 'Udhaar' && <><input type="number" className="input" placeholder="Abhi kitna mila? (partial, optional)" value={paid} onChange={(e) => setPaid(e.target.value)} /><label className="block text-xs text-ink2">Customer ne kab tak dene ka bola? (due date, manual)<input type="date" className="input mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label></>}
      <input className="input" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="space-y-1 rounded-lg bg-cream p-3 text-sm num">
        <div className="flex justify-between"><span>Subtotal (taxable)</span><span>{inr(calc.subtotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>-{inr(calc.discount_total)}</span></div>
        <div className="flex justify-between"><span>CGST + SGST</span><span>{inr(calc.gst_total)}</span></div>
        <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{inr(calc.grand_total)}</span></div>
      </div>
      <button className="btn btn-primary w-full" disabled={!cart.length || act.isPending} onClick={submit}>Bill banayein {inr(calc.grand_total)}</button>
    </div>
  )
  return (
    <div>
      <PageHead title="Naya Bill (POS)" sub="Product search karein ya SKU/barcode type karein" />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div>
          <SearchBox value={q} onChange={setQ} placeholder="Naam / SKU / barcode" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {list.map((p) => (
              <button key={p.id} disabled={p.stock_quantity <= 0} onClick={() => add(p)} className="card text-left text-sm hover:border-brass disabled:opacity-40">
                <div className="font-medium leading-tight">{p.name}</div>
                <div className="num mt-1 text-brass-hover">{inr(p.selling_price)}</div>
                <div className="text-xs text-ink2">Stock {p.stock_quantity}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="card hidden h-fit lg:block">{cartUI}</div>
      </div>
      <button className="fixed bottom-16 right-4 z-30 flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm text-cream shadow-lg lg:hidden" onClick={() => setShowCart(true)}><ShoppingCart size={16} />{cart.length} items | {inr(calc.grand_total)}</button>
      <Modal open={showCart} onClose={() => setShowCart(false)} title="Cart">{cartUI}</Modal>
    </div>
  )
}

export function BillView() {
  const { id } = useParams(); const nav = useNavigate()
  const { data: bills = [] } = useApi('bills', api.listBills)
  const customers = useDB((s) => s.customers); const settings = useDB((s) => s.settings); const branches = useDB((s) => s.branches)
  const b = bills.find((x) => x.id === id); const user = api.me()
  const [qr, setQr] = useState(''); const [pay, setPay] = useState(null); const [cancel, setCancel] = useState(false)
  const [amt, setAmt] = useState(''); const [pm, setPm] = useState('Cash'); const [reason, setReason] = useState('')
  const collect = useAct((a, m) => api.collectPayment(b.id, a, m), 'Payment record ho gaya')
  const cancelAct = useAct((r) => api.cancelBill(b.id, r), 'Bill cancel ho gaya')
  useEffect(() => { if (b && b.amount_due > 0) QRCode.toDataURL(`upi://pay?pa=${settings.business.upi_id}&pn=${encodeURIComponent(settings.business.name)}&am=${b.amount_due}&cu=INR`).then(setQr) }, [b?.amount_due, b?.id])
  if (!b) return <Empty>Bill nahi mila</Empty>
  const c = customers.find((x) => x.id === b.customer_id); const br = branches.find((x) => x.id === b.branch_id)
  const w = amountInWords(b.grand_total)
  const msg = fill(settings.notify.wa_bill, { name: c?.name || '', invoice: b.invoice_no, amount: b.grand_total })
  const intra = true
  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title={b.invoice_no} sub={fmtDateTime(b.created_at)}>
        <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} />Print / PDF</button>
        {c && <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={waLink(c.phone, msg)}><MessageCircle size={16} />WhatsApp</a>}
        {b.amount_due > 0 && can(user.role, 'udhaar.collect') && <button className="btn btn-primary" onClick={() => { setAmt(b.amount_due); setPay(true) }}>Payment mila</button>}
        {can(user.role, 'billing.cancel') && !b.cancelled_at && <button className="btn btn-danger" onClick={() => setCancel(true)}><Ban size={16} />Cancel</button>}
      </PageHead>
      <div className="card print-area space-y-3 text-sm">
        <div className="text-center"><div className="font-serif text-xl">{settings.business.name}</div><div>{br?.address || settings.business.address}</div><div>GSTIN: {settings.business.gstin} | Ph: {settings.business.phone}</div><div className="mt-1 font-semibold">TAX INVOICE {b.cancelled_at && <span className="text-danger">(CANCELLED)</span>}</div></div>
        <div className="flex justify-between"><span>Customer: {c ? `${c.name} (${c.phone})` : 'Walk-in'}</span><span>{fmtDate(b.created_at)}</span></div>
        <div className="overflow-auto"><table className="tbl"><thead><tr><th>Item</th><th>HSN</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">GST%</th><th className="r">Amount</th></tr></thead><tbody>
          {b.items.map((i, k) => <tr key={k}><td>{i.name}</td><td>{i.hsn}</td><td className="r">{i.qty}</td><td className="r">{inr(i.price)}</td><td className="r">{i.gst_rate}</td><td className="r">{inr(i.total)}</td></tr>)}
        </tbody></table></div>
        <div className="ml-auto max-w-xs space-y-1 num">
          <div className="flex justify-between"><span>Taxable value</span><span>{inr(b.subtotal)}</span></div>
          {intra && <><div className="flex justify-between"><span>CGST</span><span>{inr(b.gst_total / 2)}</span></div><div className="flex justify-between"><span>SGST</span><span>{inr(b.gst_total / 2)}</span></div></>}
          {b.discount_total > 0 && <div className="flex justify-between"><span>Discount</span><span>-{inr(b.discount_total)}</span></div>}
          <div className="flex justify-between border-t border-line pt-1 text-base font-semibold"><span>Grand total</span><span>{inr(b.grand_total)}</span></div>
          <div className="flex justify-between"><span>Paid</span><span>{inr(b.amount_paid)}</span></div>
          <div className="flex justify-between text-danger"><span>Baaki</span><span>{inr(b.amount_due)}</span></div>
        </div>
        <div className="text-xs text-ink2"><div>{w.en}</div><div>{w.hi}</div></div>
        <div className="flex items-end justify-between">{qr ? <div><img src={qr} alt="UPI QR" className="h-24 w-24" /><div className="text-xs">UPI se pay karein</div></div> : <span />}<div className="font-serif">{settings.invoice.footer}</div></div>
        <p className="text-[10px] text-ink2">DEMO invoice. GSTIN/UPI are placeholders.</p>
      </div>
      {!!b.payments?.length && <div className="card mt-4 text-sm no-print"><h3 className="mb-2 font-semibold">Payments</h3>{b.payments.map((p) => <div key={p.id} className="flex justify-between"><span>{fmtDateTime(p.paid_at)} ({p.mode})</span><span className="num">{inr(p.amount)}</span></div>)}</div>}
      <Modal open={!!pay} onClose={() => setPay(null)} title="Payment record karein">
        <div className="space-y-3"><Field label="Amount"><input type="number" className="input" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
          <Field label="Mode"><select className="input" value={pm} onChange={(e) => setPm(e.target.value)}>{['Cash', 'UPI', 'Card'].map((m) => <option key={m}>{m}</option>)}</select></Field>
          <button className="btn btn-primary w-full" onClick={async () => { await collect.mutateAsync([amt, pm]); setPay(null) }}>Save</button></div>
      </Modal>
      <Modal open={cancel} onClose={() => setCancel(false)} title="Bill cancel karein">
        <div className="space-y-3"><Field label="Reason (zaroori)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <button className="btn btn-danger w-full" disabled={reason.length < 3} onClick={async () => { await cancelAct.mutateAsync(reason); setCancel(false) }}>Cancel bill (stock wapas)</button></div>
      </Modal>
    </div>
  )
}

export function Udhaar() {
  const { data: rows = [] } = useApi('udhaar', api.udhaarRows)
  const customers = useDB((s) => s.customers); const settings = useDB((s) => s.settings)
  const cn = Object.fromEntries(customers.map((c) => [c.id, c]))
  const total = rows.reduce((a, r) => a + r.due, 0)
  const od = settings.notify.udhaar_overdue_days
  const sorted = [...rows].sort((a, b) => b.due - a.due)
  return (
    <div>
      <PageHead title="Udhaar (Credit)" sub={`Total baaki ${inr(total)} | ${od} din se purana = overdue`} />
      {!sorted.length ? <Empty>Koi udhaar baaki nahi</Empty> : <TableWrap><table className="tbl"><thead><tr><th>Customer</th><th>Phone</th><th className="r">Baaki</th><th>Sabse purana</th><th>Promised date</th><th>Status</th><th></th></tr></thead><tbody>
        {sorted.map((r) => { const c = cn[r.customer_id]; const days = Math.floor((Date.now() - new Date(r.oldest)) / 864e5); const dues = r.bills.map((x) => x.due_date).filter(Boolean).sort(); const dd = dues[0]; const over = dd ? dd < new Date().toISOString().slice(0, 10) : days > od
          return <tr key={r.customer_id}><td><Link className="text-brass-hover underline" to={`/customers/${c.id}`}>{c.name}</Link></td><td>{c.phone}</td><td className="r">{inr(r.due)}</td><td>{days} din</td><td>{dd || <span className="text-ink2">set nahi</span>}<input type="date" className="input mt-1 !py-0.5" value={dd || ''} onChange={(e) => r.bills.forEach((x) => api.setBillDueDate(x.id, e.target.value))} /></td><td>{over ? <Badge t="danger">Overdue</Badge> : <Badge t="warn">Pending</Badge>}</td>
            <td className="space-x-2"><a className="btn btn-ghost !py-1" target="_blank" rel="noreferrer" href={waLink(c.phone, fill(settings.notify.wa_udhaar, { name: c.name, amount: r.due }))}><MessageCircle size={14} />Reminder</a>
              {r.bills.slice(0, 1).map((b) => <Link key={b.id} className="btn btn-primary !py-1" to={`/billing/${b.id}`}>Bill kholein</Link>)}</td></tr> })}
      </tbody></table></TableWrap>}
    </div>
  )
}
