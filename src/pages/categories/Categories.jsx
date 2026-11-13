import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, GripVertical, Trash2, Pencil } from 'lucide-react'
import { useApi, useAct } from '../../lib/hooks'
import * as api from '../../lib/api'
import { can } from '../../lib/rbac'
import { PageHead, Modal, Field, Badge } from '../../components/ui'

const schema = z.object({ name: z.string().min(2, 'Naam zaroori hai'), slug: z.string().optional(), description: z.string().optional(), is_active: z.boolean() })

function CatForm({ cat, onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: cat || { is_active: true } })
  const save = useAct((d) => api.saveCategory({ ...cat, ...d }), 'Category save hui')
  return (
    <form className="space-y-3" onSubmit={handleSubmit(async (d) => { await save.mutateAsync(d); onClose() })}>
      <Field label="Category ka naam" error={errors.name}><input className="input" {...register('name')} /></Field>
      <Field label="Slug"><input className="input" placeholder="auto" {...register('slug')} /></Field>
      <Field label="Description"><textarea className="input" {...register('description')} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('is_active')} />Active</label>
      <button className="btn btn-primary w-full">Save</button>
    </form>
  )
}
export function Categories({ open }) {
  const { data: cats = [] } = useApi('cats', api.listCategories); const { data: prods = [] } = useApi('products', api.listProducts)
  const user = api.me(); const nav = useNavigate(); const { id } = useParams()
  const [dragId, setDragId] = useState(null)
  const edit = open === 'edit' ? cats.find((c) => c.id === id) : null
  const [local, setLocal] = useState(null)
  const del = useAct(api.deleteCategory, 'Category delete hui'); const reorder = useAct(api.reorderCategories)
  const list = local || cats; const w = can(user.role, 'categories.write')
  const drop = (overId) => {
    if (!dragId || dragId === overId) return
    const a = [...list]; const from = a.findIndex((c) => c.id === dragId); const [m] = a.splice(from, 1); a.splice(a.findIndex((c) => c.id === overId), 0, m)
    setLocal(a); reorder.mutate([a.map((c) => c.id)]); setTimeout(() => setLocal(null), 300)
  }
  return (
    <div>
      <PageHead title="Categories" sub="Drag karke order badlein">{w && <button className="btn btn-primary" onClick={() => nav('/categories/new')}><Plus size={16} />Nayi Category</button>}</PageHead>
      <div className="space-y-2">{list.map((c) => {
        const n = prods.filter((p) => p.category_id === c.id).length
        return (
          <div key={c.id} draggable={w} onDragStart={() => setDragId(c.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(c.id)} className="card flex items-center gap-3 !p-3">
            {w && <GripVertical size={18} className="cursor-grab text-ink2" />}
            <div className="flex-1"><p className="font-medium">{c.name}</p><p className="text-xs text-ink2">/{c.slug} · {n} products</p></div>
            {!c.is_active && <Badge t="warn">Hidden</Badge>}
            {w && <button className="btn btn-ghost !px-2" onClick={() => nav(`/categories/${c.id}/edit`)}><Pencil size={14} /></button>}
            {can(user.role, 'products.delete') && <button className="btn btn-ghost !px-2 text-danger" onClick={() => { if (n) alert(`Is category mein ${n} products hain. Delete nahi ho sakti.`); else if (confirm('Delete?')) del.mutate(c.id) }}><Trash2 size={14} /></button>}
          </div>
        )
      })}</div>
      <Modal open={open === 'new' || (open === 'edit' && !!edit)} onClose={() => nav('/categories')} title={open === 'new' ? 'Nayi Category' : 'Category edit'}><CatForm cat={edit} onClose={() => nav('/categories')} /></Modal>
    </div>
  )
}
