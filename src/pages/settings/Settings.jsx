import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'
import { useDB } from '../../lib/api'
import { useAct } from '../../lib/hooks'
import { useToast } from '../../components/ui/Toast'
import { downloadFile, fmtDateTime, ymd } from '../../lib/utils'
import { ROLES } from '../../lib/rbac'
import { PageHead, Field, Badge, TableWrap, Modal } from '../../components/ui'

const TABS = ['business', 'billing', 'notifications', 'users', 'branches', 'backup']

function KV({ section, fields, bool = [] }) {
  const cur = useDB((s) => s.settings[section]); const [f, setF] = useState(cur)
  const act = useAct((v) => api.saveSettings(section, v), 'Settings save hui')
  return (
    <div className="card max-w-2xl space-y-3">
      {fields.map(([k, l, type]) => <Field key={k} label={l}>{type === 'area' ? <textarea rows={2} className="input" value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> : <input className="input" type={type || 'text'} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} />}</Field>)}
      {bool.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{l}</label>)}
      <button className="btn btn-primary" onClick={() => act.mutate(f)}>Save</button>
    </div>
  )
}

function Users() {
  const users = useDB((s) => s.users); const hist = useDB((s) => s.login_history); const [m, setM] = useState(null)
  const act = useAct((d) => api.saveUser(d), 'User save hua'); const toast = useToast()
  return (
    <div className="space-y-3">
      <button className="btn btn-primary" onClick={() => setM({ name: '', email: '', phone: '', password: '', role: 'STAFF', branch_id: 'b1' })}>+ User</button>
      <TableWrap><table className="tbl"><thead><tr><th>Naam</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead><tbody>
        {users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td><Badge t={u.is_active ? 'ok' : 'danger'}>{u.is_active ? 'active' : 'off'}</Badge></td><td>{fmtDateTime(u.last_login)}</td>
          <td className="whitespace-nowrap"><button className="btn btn-ghost !py-1" onClick={() => setM({ ...u, password: '' })}>Edit</button> <button className="btn btn-ghost !py-1" onClick={() => act.mutate({ ...u, is_active: !u.is_active })}>{u.is_active ? 'Deactivate' : 'Activate'}</button></td></tr>)}
      </tbody></table></TableWrap>
      <button className="btn btn-ghost" onClick={() => toast('Demo: real backend mein saare sessions revoke honge', 'ok')}>Force logout all sessions (demo)</button>
      <h3 className="font-semibold">Login history</h3>
      <TableWrap><table className="tbl"><thead><tr><th>Email</th><th>Result</th><th>Time</th></tr></thead><tbody>{hist.slice(0, 30).map((h) => <tr key={h.id}><td>{h.email}</td><td>{h.ok ? 'ok' : 'failed'}</td><td>{fmtDateTime(new Date(h.t))}</td></tr>)}</tbody></table></TableWrap>
      <Modal open={!!m} onClose={() => setM(null)} title={m?.id ? 'Edit user' : 'Naya user'}>
        {m && <div className="space-y-3">{[['name', 'Naam'], ['email', 'Email'], ['phone', 'Phone']].map(([k, l]) => <Field key={k} label={l}><input className="input" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></Field>)}
          <Field label={m.id ? 'Naya password (reset, optional)' : 'Password'}><input type="password" className="input" value={m.password} onChange={(e) => setM({ ...m, password: e.target.value })} /></Field>
          <Field label="Role"><select className="input" value={m.role} onChange={(e) => setM({ ...m, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <button className="btn btn-primary w-full" disabled={!m.name || !m.email || (!m.id && m.password.length < 6)} onClick={async () => { const d = { ...m }; if (!d.password) delete d.password; await act.mutateAsync(d); setM(null) }}>Save</button></div>}
      </Modal>
    </div>
  )
}

function Branches() {
  const branches = useDB((s) => s.branches); const [m, setM] = useState(null); const act = useAct((d) => api.saveBranch(d), 'Branch save hui')
  const cur = useDB((s) => s.branchId)
  return (
    <div className="space-y-3">
      <button className="btn btn-primary" onClick={() => setM({ name: '', address: '', phone: '', gstin: '', manager: '', is_active: true })}>+ Branch</button>
      <p className="text-xs text-ink2">Stock, bills aur repairs branch ke hisaab se alag track hote hain. Top bar se branch badal sakte hain.</p>
      <TableWrap><table className="tbl"><thead><tr><th>Name</th><th>Address</th><th>GSTIN</th><th>Status</th><th></th></tr></thead><tbody>
        {branches.map((b) => <tr key={b.id}><td>{b.name}{b.id === cur && ' (current)'}</td><td>{b.address}</td><td>{b.gstin}</td><td><Badge t={b.is_active ? 'ok' : 'danger'}>{b.is_active ? 'active' : 'off'}</Badge></td><td><button className="btn btn-ghost !py-1" onClick={() => setM(b)}>Edit</button></td></tr>)}
      </tbody></table></TableWrap>
      <Modal open={!!m} onClose={() => setM(null)} title="Branch">
        {m && <div className="space-y-3">{[['name', 'Naam'], ['address', 'Address'], ['phone', 'Phone'], ['gstin', 'GSTIN']].map(([k, l]) => <Field key={k} label={l}><input className="input" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></Field>)}
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={m.is_active} onChange={(e) => setM({ ...m, is_active: e.target.checked })} />Active</label>
          <button className="btn btn-primary w-full" disabled={!m.name} onClick={async () => { await act.mutateAsync(m); setM(null) }}>Save</button></div>}
      </Modal>
    </div>
  )
}

function Backup() {
  const toast = useToast()
  return (
    <div className="card max-w-xl space-y-3 text-sm">
      <p>Poora data JSON mein download karein. Yeh demo ka local data hai. Production mein daily DB backup + weekly email server karega.</p>
      <button className="btn btn-primary" onClick={() => { downloadFile(`nandlal-backup-${ymd()}.json`, api.exportBackup(), 'application/json'); toast('Backup download hua', 'ok') }}>Download backup (JSON)</button>
      <hr className="border-line" />
      <p className="text-danger">Demo reset: saara local data wapas seed data par aa jayega.</p>
      <button className="btn btn-ghost" onClick={() => { if (confirm('Demo data reset karein?')) { api.resetDemo(); toast('Demo reset ho gaya', 'ok') } }}>Reset demo data</button>
    </div>
  )
}

export function SettingsPage({ tab }) {
  return (
    <div>
      <PageHead title="Settings" sub="Owner only. Demo: sab kuch browser mein save hota hai" />
      <div className="mb-3 flex gap-2 overflow-x-auto text-sm">{TABS.map((t) => <Link key={t} to={`/settings/${t}`} className={`btn whitespace-nowrap capitalize ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>{t}</Link>)}</div>
      {tab === 'business' && <div className="space-y-3"><KV section="business" fields={[['name', 'Dukaan ka naam'], ['address', 'Address', 'area'], ['gstin', 'GSTIN'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['upi_id', 'UPI ID'], ['maps_link', 'Google Maps link'], ['operators', 'Operators (naam: phone)']]} /><KV section="website" fields={[]} bool={[['sync_active_only', 'Website par sirf active products dikhao']]} /></div>}
      {tab === 'billing' && <div className="space-y-3"><KV section="invoice" fields={[['prefix', 'Invoice prefix'], ['start_number', 'Starting number', 'number'], ['footer', 'Footer text']]} /><KV section="tax" fields={[['default_gst', 'Default GST %', 'number']]} bool={[['inclusive', 'Prices GST inclusive hain']]} /></div>}
      {tab === 'notifications' && <KV section="notify" fields={[['email', 'Owner email'], ['low_stock_default', 'Default low stock threshold', 'number'], ['udhaar_overdue_days', 'Udhaar overdue (din)', 'number'], ['udhaar_threshold', 'Udhaar alert threshold (₹)', 'number'], ['wa_bill', 'WhatsApp: bill template', 'area'], ['wa_ready', 'WhatsApp: repair ready template', 'area']]} />}
      {tab === 'users' && <Users />}
      {tab === 'branches' && <Branches />}
      {tab === 'backup' && <Backup />}
    </div>
  )
}
