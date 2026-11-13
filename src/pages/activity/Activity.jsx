import { useState } from 'react'
import { Download } from 'lucide-react'
import { useApi } from '../../lib/hooks'
import * as api from '../../lib/api'
import { useDB } from '../../lib/api'
import { fmtDateTime, exportCSV } from '../../lib/utils'
import { PageHead, SearchBox, TableWrap, Empty } from '../../components/ui'

export default function Activity() {
  const { data: logs = [] } = useApi('activity', api.listActivity); const users = useDB((s) => s.users)
  const un = Object.fromEntries(users.map((u) => [u.id, u.name])); const [q, setQ] = useState(''); const [ent, setEnt] = useState('')
  const rows = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at)).filter((l) => (!ent || l.entity_type === ent) && (`${l.summary} ${l.action} ${un[l.user_id] || ''}`).toLowerCase().includes(q.toLowerCase()))
  const types = [...new Set(logs.map((l) => l.entity_type))]
  return (
    <div>
      <PageHead title="Activity Log" sub="Append-only (demo mein edit/delete ka option nahi hai)"><button className="btn btn-ghost" onClick={() => exportCSV('activity-log', rows.map((l) => ({ time: l.created_at, user: un[l.user_id], action: l.action, entity: l.entity_type, id: l.entity_id, summary: l.summary })))}><Download size={16} />CSV</button></PageHead>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:max-w-md"><SearchBox value={q} onChange={setQ} placeholder="Search" /><select className="input" value={ent} onChange={(e) => setEnt(e.target.value)}><option value="">All</option>{types.map((t) => <option key={t}>{t}</option>)}</select></div>
      {!rows.length ? <Empty>Kuch nahi mila</Empty> : <TableWrap><table className="tbl"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th><th>IP</th></tr></thead><tbody>
        {rows.slice(0, 300).map((l) => <tr key={l.id}><td>{fmtDateTime(l.created_at)}</td><td>{un[l.user_id]}</td><td>{l.action}</td><td>{l.summary}</td><td>{l.ip}</td></tr>)}
      </tbody></table></TableWrap>}
    </div>
  )
}
