import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, LayoutGrid, List, MessageCircle } from 'lucide-react'
import { useApi, useAct } from '../../lib/hooks'
import * as api from '../../lib/api'
import { useDB } from '../../lib/api'
import { can, STATUSES } from '../../lib/rbac'
import { inr, fmtDate, fmtDateTime } from '../../lib/utils'
import { PageHead, SearchBox, Badge, Empty, TableWrap, Field } from '../../components/ui'

const tone = (s) => (['Delivered', 'Closed'].includes(s) ? 'ok' : s === 'Ready for Pickup' ? 'warn' : s === 'Waiting for Parts' ? 'danger' : 'info')

export function RepairList({ kanban }) {
  const { data: repairs = [] } = useApi('repairs', api.listRepairs)
  const users = useDB((s) => s.users); const customers = useDB((s) => s.customers)
  const un = Object.fromEntries(users.map((u) => [u.id, u.name])); const cn = Object.fromEntries(customers.map((c) => [c.id, c]))
  const user = api.me(); const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [drag, setDrag] = useState(null)
  const move = useAct((id, status) => api.updateRepair(id, { status }), 'Status badal gaya')
  const rows = repairs.filter((r) => (r.repair_id + (cn[r.customer_id]?.phone || '') + r.device_type).toLowerCase().includes(q.toLowerCase()) && (!st || r.status === st))
  const workload = users.filter((u) => u.role === 'TECHNICIAN').map((u) => [u.name, repairs.filter((r) => r.assigned_to === u.id && !['Delivered', 'Closed'].includes(r.status)).length])
  return (
    <div>
      <PageHead title="Repairs" sub={`${rows.length} jobs`}>
        <Link to="/repairs" className={`btn ${kanban ? 'btn-ghost' : 'btn-dark'}`}><List size={16} />Table</Link>
        <Link to="/repairs/kanban" className={`btn ${kanban ? 'btn-dark' : 'btn-ghost'}`}><LayoutGrid size={16} />Kanban</Link>
        {can(user.role, 'repairs.create') && <Link to="/repairs/new" className="btn btn-primary"><Plus size={16} />New Repair</Link>}
      </PageHead>
      {can(user.role, 'repairs.all') && <div className="mb-3 flex flex-wrap gap-2 text-xs">{workload.map(([n, c]) => <span key={n} className="rounded-full border border-line bg-white px-3 py-1">{n}: {c} open</span>)}</div>}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:max-w-lg"><SearchBox value={q} onChange={setQ} placeholder="Repair ID / phone" />
        <select className="input" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
      {kanban ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STATUSES.map((s) => (
            <div key={s} className="w-64 shrink-0 rounded-xl bg-line/50 p-2" onDragOver={(e) => e.preventDefault()} onDrop={() => drag && move.mutate([drag, s])}>
              <div className="mb-2 flex justify-between px-1 text-xs font-semibold uppercase text-ink2"><span>{s}</span><span>{rows.filter((r) => r.status === s).length}</span></div>
              <div className="space-y-2">
                {rows.filter((r) => r.status === s).map((r) => (
                  <div key={r.id} draggable onDragStart={() => setDrag(r.id)} className="card cursor-grab text-sm">
                    <Link to={`/repairs/${r.id}`} className="font-medium text-brass-hover">{r.repair_id}</Link>
                    <div>{r.device_type} {r.brand}</div><div className="text-xs text-ink2">{un[r.assigned_to]}</div>
                    <select className="input mt-1 !py-1 text-xs lg:hidden" value={r.status} onChange={(e) => move.mutate([r.id, e.target.value])}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
                  </div>))}
              </div>
            </div>))}
        </div>
      ) : !rows.length ? <Empty>Koi repair nahi mili</Empty> : (
        <TableWrap><table className="tbl"><thead><tr><th>ID</th><th>Device</th><th>Problem</th><th>Technician</th><th>Delivery</th><th>Status</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td><Link className="text-brass-hover underline" to={`/repairs/${r.id}`}>{r.repair_id}</Link></td><td>{r.device_type} {r.brand}</td><td className="max-w-[220px] truncate">{r.problem_description}</td><td>{un[r.assigned_to]}</td><td>{fmtDate(r.expected_delivery_date)}</td><td><Badge t={tone(r.status)}>{r.status}</Badge></td></tr>)}
        </tbody></table></TableWrap>)}
    </div>
  )
}

const schema = z.object({
  customer_id: z.string().min(1, 'Customer chunein'), device_type: z.string().min(2, 'Device type zaroori'), brand: z.string().optional(), model: z.string().optional(),
  problem_description: z.string().min(5, 'Problem thodi detail mein likhein'), total_estimate: z.coerce.number().min(0).optional(), advance_paid: z.coerce.number().min(0).optional(),
  expected_delivery_date: z.string().min(1, 'Date chunein'), assigned_to: z.string().optional(),
})
export function RepairNew() {
  const nav = useNavigate(); const customers = useDB((s) => s.customers); const users = useDB((s) => s.users)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { total_estimate: 0, advance_paid: 0 } })
  const act = useAct((d) => api.createRepair(d), 'Repair request ban gayi')
  return (
    <form className="mx-auto max-w-2xl space-y-4 pb-20" onSubmit={handleSubmit(async (d) => { const id = await act.mutateAsync(d); nav('/repairs/' + id) })}>
      <PageHead title="Nayi Repair" sub="Repair ID auto banegi (R-YYYYMM-NNNN)" />
      <div className="card grid gap-3 sm:grid-cols-2">
        <Field label="Customer" error={errors.customer_id} className="sm:col-span-2"><select className="input" {...register('customer_id')}><option value="">Chunein</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}</select></Field>
        <Field label="Kya cheez hai? (device)" error={errors.device_type}><input className="input" list="dev" {...register('device_type')} /><datalist id="dev">{['Mixer Grinder', 'Desert Cooler', 'Ceiling Fan', 'Induction', 'Geyser', 'Iron', 'Room Heater', 'Water Purifier'].map((d) => <option key={d} value={d} />)}</datalist></Field>
        <Field label="Brand"><input className="input" {...register('brand')} /></Field>
        <Field label="Model"><input className="input" {...register('model')} /></Field>
        <Field label="Technician"><select className="input" {...register('assigned_to')}><option value="">Baad mein</option>{users.filter((u) => u.role === 'TECHNICIAN').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Problem kya hai?" error={errors.problem_description} className="sm:col-span-2"><textarea rows={3} className="input" {...register('problem_description')} /></Field>
        <Field label="Estimate (₹)"><input type="number" className="input" {...register('total_estimate')} /></Field>
        <Field label="Advance mila (₹)"><input type="number" className="input" {...register('advance_paid')} /></Field>
        <Field label="Delivery date" error={errors.expected_delivery_date}><input type="date" className="input" {...register('expected_delivery_date')} /></Field>
      </div>
      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-line bg-white p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0"><button className="btn btn-primary w-full lg:w-auto">Repair save karein</button></div>
    </form>
  )
}

export function RepairDetail() {
  const { id } = useParams()
  const { data: repairs = [] } = useApi('repairs', api.listRepairs)
  const { data: products = [] } = useApi('rp-products', () => { try { return api.listProducts() } catch { return [] } })
  const customers = useDB((s) => s.customers); const settings = useDB((s) => s.settings)
  const r = repairs.find((x) => x.id === id); const user = api.me()
  const [notes, setNotes] = useState(null); const [part, setPart] = useState(''); const [qty, setQty] = useState(1)
  const upd = useAct((p) => api.updateRepair(id, p), 'Update ho gaya')
  const addPart = useAct(() => api.addRepairPart(id, part, qty), 'Part add hua')
  if (!r) return <Empty>Repair nahi mili (ya aapko assign nahi hai)</Empty>
  const c = customers.find((x) => x.id === r.customer_id)
  const tmpl = r.status === 'Ready for Pickup' ? settings.notify.wa_ready : settings.notify.wa_progress
  const msg = tmpl.replace('{id}', r.repair_id).replace('{amount}', r.total_estimate)
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHead title={r.repair_id} sub={`${r.device_type} ${r.brand} ${r.model}`}>
        {c && <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`}><MessageCircle size={16} />WhatsApp update</a>}
      </PageHead>
      <div className="card space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2"><Badge t={tone(r.status)}>{r.status}</Badge><span className="text-ink2">Delivery: {fmtDate(r.expected_delivery_date)}</span></div>
        <p><b>Problem:</b> {r.problem_description}</p>
        {c && <p><b>Customer:</b> {c.name} ({c.phone})</p>}
        {can(user.role, 'repairs.all') && <p className="num"><b>Estimate:</b> {inr(r.total_estimate)} | Advance: {inr(r.advance_paid)} | Labor: {inr(r.labor_charge)} | Final: {inr(r.final_amount)}</p>}
        <Field label="Status badlein"><select className="input" value={r.status} onChange={(e) => upd.mutate({ status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Technician notes (internal)"><textarea rows={3} className="input" value={notes ?? r.technician_notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <button className="btn btn-primary" onClick={() => upd.mutate({ technician_notes: notes ?? r.technician_notes })}>Notes save</button>
      </div>
      <div className="card text-sm">
        <h3 className="mb-2 font-semibold">Parts used</h3>
        {r.parts_used.length ? r.parts_used.map((p, i) => <div key={i} className="flex justify-between"><span>{p.name} x{p.qty}</span><span className="num">{inr(p.cost)}</span></div>) : <p className="text-ink2">Koi part nahi lagaya</p>}
        {products.length > 0 && <div className="mt-3 flex gap-2"><select className="input" value={part} onChange={(e) => setPart(e.target.value)}><option value="">Part chunein</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" className="input w-20" value={qty} onChange={(e) => setQty(e.target.value)} /><button className="btn btn-ghost" disabled={!part} onClick={() => addPart.mutate()}>Add</button></div>}
      </div>
    </div>
  )
}
