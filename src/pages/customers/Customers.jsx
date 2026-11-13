import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Phone, MessageCircle } from 'lucide-react'
import { useApi, useAct } from '../../lib/hooks'
import * as api from '../../lib/api'
import { useDB } from '../../lib/api'
import { can } from '../../lib/rbac'
import { inr, fmtDate, fmtDateTime } from '../../lib/utils'
import { PageHead, SearchBox, Badge, Empty, TableWrap, Field } from '../../components/ui'

export function Customers() {
  const { data: cs = [] } = useApi('cust', api.listCustomers); useDB((s) => s.bills.length)
  const user = api.me(); const [q, setQ] = useState(''); const [type, setType] = useState(''); const [sort, setSort] = useState('name')
  const rows = cs.map((c) => ({ ...c, st: api.customerStats(c.id) })).filter((c) => (c.name + c.phone).toLowerCase().includes(q.toLowerCase()) && (!type || c.customer_type === type))
    .sort((a, b) => sort === 'spent' ? b.st.total - a.st.total : sort === 'due' ? b.st.due - a.st.due : sort === 'visit' ? (b.st.last || '').localeCompare(a.st.last || '') : a.name.localeCompare(b.name))
  return (
    <div>
      <PageHead title="Customers" sub={`${rows.length} customers`}>{can(user.role, 'customers.write') && <Link to="/customers/new" className="btn btn-primary"><Plus size={16} />Add</Link>}</PageHead>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><SearchBox value={q} onChange={setQ} placeholder="Naam / phone" />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{['retail', 'wholesale', 'regular'].map((t) => <option key={t}>{t}</option>)}</select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Sort: naam</option><option value="spent">Total spent</option><option value="visit">Last visit</option><option value="due">Outstanding</option></select></div>
      <TableWrap><table className="tbl"><thead><tr><th>Naam</th><th>Phone</th><th>Area</th><th>Type</th><th className="r">Total</th><th className="r">Baaki</th><th>Last visit</th></tr></thead><tbody>
        {rows.map((c) => <tr key={c.id}><td><Link className="text-brass-hover underline" to={`/customers/${c.id}`}>{c.name}</Link></td><td>{c.phone}</td><td>{c.area}</td><td>{c.customer_type}</td><td className="r">{inr(c.st.total)}</td><td className={`r ${c.st.due ? 'text-danger' : ''}`}>{inr(c.st.due)}</td><td>{fmtDate(c.st.last)}</td></tr>)}
      </tbody></table></TableWrap>
    </div>
  )
}

const schema = z.object({ name: z.string().min(2, 'Naam zaroori hai'), phone: z.string().regex(/^[6-9]\d{9}$/, '10 digit mobile number daalein'), alternate_phone: z.string().optional(), email: z.string().email('Email sahi nahi').optional().or(z.literal('')), area: z.string().optional(), address: z.string().optional(), customer_type: z.enum(['retail', 'wholesale', 'regular']), notes: z.string().optional() })
export function CustomerForm() {
  const nav = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { customer_type: 'retail' } })
  const act = useAct((d) => api.saveCustomer(d), 'Customer save hua')
  return (
    <form className="mx-auto max-w-2xl space-y-4 pb-20" onSubmit={handleSubmit(async (d) => { await act.mutateAsync(d); nav('/customers') })}>
      <PageHead title="Naya Customer" />
      <div className="card grid gap-3 sm:grid-cols-2">
        <Field label="Naam" error={errors.name}><input className="input" {...register('name')} /></Field>
        <Field label="Phone" error={errors.phone}><input className="input" inputMode="numeric" {...register('phone')} /></Field>
        <Field label="Alternate phone"><input className="input" {...register('alternate_phone')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" {...register('email')} /></Field>
        <Field label="Area / gaon"><input className="input" {...register('area')} /></Field>
        <Field label="Type"><select className="input" {...register('customer_type')}><option>retail</option><option>wholesale</option><option>regular</option></select></Field>
        <Field label="Address" className="sm:col-span-2"><input className="input" {...register('address')} /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea rows={2} className="input" {...register('notes')} /></Field>
      </div>
      <button className="btn btn-primary w-full sm:w-auto">Save karein</button>
    </form>
  )
}

export function CustomerDetail() {
  const { id } = useParams(); const c = useDB((s) => s.customers.find((x) => x.id === id))
  const bills = useDB((s) => s.bills).filter((b) => b.customer_id === id); const repairs = useDB((s) => s.repairs).filter((r) => r.customer_id === id)
  const user = api.me(); const [note, setNote] = useState(''); const add = useAct((t) => api.addCustomerNote(id, t), 'Note add hua')
  if (!c) return <Empty>Customer nahi mila</Empty>
  const st = api.customerStats(id)
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHead title={c.name} sub={`${c.phone} | ${c.area} | ${c.customer_type}`}>
        <a className="btn btn-ghost" href={`tel:${c.phone}`}><Phone size={16} />Call</a>
        <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/91${c.phone}`}><MessageCircle size={16} />WhatsApp</a>
        {can(user.role, 'billing.create') && <Link className="btn btn-primary" to="/billing/new">New bill</Link>}
        {can(user.role, 'repairs.create') && <Link className="btn btn-ghost" to="/repairs/new">New repair</Link>}
      </PageHead>
      <div className="grid grid-cols-3 gap-2 text-center"><div className="card"><div className="text-xs text-ink2">Total purchases</div><div className="num font-semibold">{inr(st.total)}</div></div><div className="card"><div className="text-xs text-ink2">Baaki (udhaar)</div><div className="num font-semibold text-danger">{inr(st.due)}</div></div><div className="card"><div className="text-xs text-ink2">Last visit</div><div className="font-semibold">{fmtDate(st.last)}</div></div></div>
      <div className="card text-sm"><h3 className="mb-2 font-semibold">Bills</h3>{bills.length ? [...bills].reverse().map((b) => <Link key={b.id} to={`/billing/${b.id}`} className="flex justify-between border-b border-line py-1"><span>{b.invoice_no} <Badge t={b.payment_status === 'paid' ? 'ok' : 'warn'}>{b.payment_status}</Badge></span><span className="num">{inr(b.grand_total)}</span></Link>) : <p className="text-ink2">Koi bill nahi</p>}</div>
      <div className="card text-sm"><h3 className="mb-2 font-semibold">Repairs</h3>{repairs.length ? repairs.map((r) => <Link key={r.id} to={`/repairs/${r.id}`} className="flex justify-between border-b border-line py-1"><span>{r.repair_id} {r.device_type}</span><span>{r.status}</span></Link>) : <p className="text-ink2">Koi repair nahi</p>}</div>
      <div className="card text-sm"><h3 className="mb-2 font-semibold">Notes timeline</h3>
        {can(user.role, 'customers.write') && <div className="mb-2 flex gap-2"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Jaise: cooler liya, discount maanga" /><button className="btn btn-primary" disabled={!note} onClick={async () => { await add.mutateAsync(note); setNote('') }}>Add</button></div>}
        {(c.note_log || []).map((n, i) => <div key={i} className="border-b border-line py-1"><div>{n.text}</div><div className="text-xs text-ink2">{fmtDateTime(n.at)}</div></div>)}
      </div>
    </div>
  )
}
