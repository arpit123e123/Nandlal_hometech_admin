import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import QRCode from 'qrcode'
import { Plus, Copy, Trash2, Download, Pencil, Eye, FileSpreadsheet, Upload } from 'lucide-react'
import { useApi, useAct } from '../../lib/hooks'
import * as api from '../../lib/api'
import { can } from '../../lib/rbac'
import { inr, slugify, exportCSV, downloadFile, toCSV } from '../../lib/utils'
import { PageHead, SearchBox, Badge, Empty, TableWrap, Pager, Field, Denied } from '../../components/ui'

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') quoted = false; else cell += ch }
    else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some((v) => v.trim())) rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  row.push(cell); if (row.some((v) => v.trim())) rows.push(row)
  return rows
}

const importTemplate = [
  { name: 'LED Bulb 9W', sku: 'LED-9W-001', category: 'Lighting', brand: 'Nandlal', selling_price: 120, mrp: 150, cost_price: 80, stock_quantity: 20, low_stock_threshold: 5, unit: 'pcs', gst_rate: 18, hsn_code: '8539', warranty_months: 12, description: '', tags: 'led, bulb', is_active: true, is_featured: false },
]

function ProductImport({ cats, items, onImport }) {
  const [preview, setPreview] = useState(null); const [filename, setFilename] = useState('')
  const parseFile = async (file) => {
    setFilename(file.name)
    const data = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
    if (data.length < 2) { setPreview({ rows: [], errors: ['File mein header aur kam se kam ek product row honi chahiye.'] }); return }
    const headers = data[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
    const catMap = new Map(cats.map((c) => [c.name.trim().toLowerCase(), c.id]))
    const skuSet = new Set(items.map((p) => String(p.sku || '').trim().toLowerCase()).filter(Boolean)); const seen = new Set()
    const errors = []; const rows = data.slice(1).map((cells, idx) => {
      const raw = Object.fromEntries(headers.map((h, i) => [h, (cells[i] || '').trim()])); const rowNum = idx + 2
      const val = (key, ...aliases) => raw[key] ?? aliases.map((a) => raw[a]).find((v) => v !== undefined) ?? ''
      const name = val('name', 'product_name'); const category = val('category', 'category_name').trim(); const sku = val('sku')
      const n = (key, fallback, ...aliases) => { const v = val(key, ...aliases); return v === '' ? fallback : Number(v) }
      const price = n('selling_price', NaN, 'price')
      if (!name) errors.push(`Row ${rowNum}: name zaroori hai`)
      if (!category || !catMap.has(category.toLowerCase())) errors.push(`Row ${rowNum}: category '${category || '(blank)'}' existing category se match nahi hui`)
      if (!Number.isFinite(price) || price <= 0) errors.push(`Row ${rowNum}: selling_price 0 se zyada hona chahiye`)
      if (sku && (skuSet.has(sku.toLowerCase()) || seen.has(sku.toLowerCase()))) errors.push(`Row ${rowNum}: SKU '${sku}' duplicate hai`)
      if (sku) seen.add(sku.toLowerCase())
      const stock = n('stock_quantity', 0, 'stock'); const gst = n('gst_rate', 18, 'gst'); const mrp = n('mrp', price)
      if (!Number.isInteger(stock) || stock < 0) errors.push(`Row ${rowNum}: stock_quantity non-negative whole number hona chahiye`)
      if (!Number.isFinite(gst) || gst < 0) errors.push(`Row ${rowNum}: gst_rate valid number hona chahiye`)
      for (const [key, fallback] of [['cost_price', 0], ['low_stock_threshold', 5], ['warranty_months', 0]]) {
        const value = n(key, fallback)
        if (!Number.isFinite(value) || value < 0 || (key !== 'cost_price' && !Number.isInteger(value))) errors.push(`Row ${rowNum}: ${key} valid non-negative number hona chahiye`)
      }
      if (mrp < price) errors.push(`Row ${rowNum}: mrp selling_price se kam nahi ho sakta`)
      const bool = (key, fallback) => { const v = val(key).toLowerCase(); return v ? ['true', '1', 'yes', 'haan'].includes(v) : fallback }
      return { name, sku, category_id: catMap.get(category.toLowerCase()), brand: val('brand'), description: val('description'), selling_price: price, mrp, cost_price: n('cost_price', 0), stock_quantity: stock, low_stock_threshold: n('low_stock_threshold', 5), unit: val('unit') || 'pcs', gst_rate: gst, hsn_code: val('hsn_code'), warranty_months: n('warranty_months', 0), tags: val('tags').split(/[;,]/).map((t) => t.trim()).filter(Boolean), is_active: bool('is_active', true), is_featured: bool('is_featured', false) }
    })
    setPreview({ rows, errors })
  }
  return <div className="card mb-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Excel se products add karein</h2><p className="text-xs text-ink2">Template CSV Excel mein kholkar bharein, phir CSV format mein save karke upload karein.</p></div><button className="btn btn-ghost" onClick={() => downloadFile('products-template.csv', '\uFEFF' + toCSV(importTemplate))}><FileSpreadsheet size={16} />Template download</button></div>
    <label className="btn btn-ghost w-fit cursor-pointer"><Upload size={16} />CSV upload karein<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) parseFile(file); e.target.value = '' }} /></label>
    {filename && <p className="text-sm">{filename} · {preview?.rows.length || 0} rows</p>}
    {preview && <>
      {preview.errors.length > 0 && <div className="max-h-36 overflow-auto rounded-lg bg-danger/10 p-3 text-sm text-danger"><b>{preview.errors.length} galtiyan — import nahi hoga:</b><ul className="ml-5 list-disc">{preview.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul>{preview.errors.length > 20 && <p>Baaki galtiyan bhi fix karein.</p>}</div>}
      {!preview.errors.length && <p className="text-sm text-ok">{preview.rows.length} products sahi hain, import ke liye ready.</p>}
      {!!preview.rows.length && <TableWrap><table className="tbl"><thead><tr><th>Naam</th><th>SKU</th><th>Category</th><th className="r">Price</th><th className="r">Stock</th></tr></thead><tbody>{preview.rows.slice(0, 10).map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.sku || 'Auto'}</td><td>{cats.find((c) => c.id === r.category_id)?.name}</td><td className="r">{inr(r.selling_price)}</td><td className="r">{r.stock_quantity}</td></tr>)}</tbody></table></TableWrap>}
      <button className="btn btn-primary" disabled={!!preview.errors.length || !preview.rows.length || onImport.isPending} onClick={async () => { await onImport.mutateAsync([preview.rows]); setPreview(null); setFilename('') }}><Upload size={16} />{preview.rows.length} products import karein</button>
    </>}
  </div>
}

export function Products() {
  const [sp] = useSearchParams()
  const { data: items = [] } = useApi('products', api.listProducts)
  const { data: cats = [] } = useApi('cats', api.listCategories)
  const user = api.me(); const canCost = can(user.role, 'products.cost')
  const [q, setQ] = useState(sp.get('q') || ''); const [cat, setCat] = useState(''); const [brand, setBrand] = useState(''); const [stock, setStock] = useState(''); const [avail, setAvail] = useState('')
  const [sort, setSort] = useState('name'); const [page, setPage] = useState(1); const [size, setSize] = useState(20); const [sel, setSel] = useState([])
  useEffect(() => setQ(sp.get('q') || ''), [sp])
  const del = useAct(api.deleteProducts, 'Delete ho gaya'); const dup = useAct(api.duplicateProduct, 'Duplicate bana'); const tog = useAct((id, f) => api.toggleProduct(id, f)); const bulk = useAct(api.bulkCategory, 'Category badli')
  const importAct = useAct(api.importProducts, 'Products import ho gaye')
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]))
  const brands = [...new Set(items.map((p) => p.brand).filter(Boolean))]
  const rows = useMemo(() => {
    let r = items.filter((p) => {
      const s = q.toLowerCase()
      if (s && !(p.name + p.sku + (p.brand || '') + (p.tags || []).join(' ')).toLowerCase().includes(s)) return false
      if (cat && p.category_id !== cat) return false
      if (brand && p.brand !== brand) return false
      if (stock === 'out' && p.stock_quantity > 0) return false
      if (stock === 'low' && !(p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold)) return false
      if (stock === 'in' && p.stock_quantity <= p.low_stock_threshold) return false
      if (avail === 'on' && !p.is_active) return false
      if (avail === 'off' && p.is_active) return false
      return true
    })
    const k = { name: (a, b) => a.name.localeCompare(b.name), price: (a, b) => a.selling_price - b.selling_price, stock: (a, b) => a.stock_quantity - b.stock_quantity, created: (a, b) => new Date(b.created_at) - new Date(a.created_at) }[sort]
    return r.sort(k)
  }, [items, q, cat, brand, stock, avail, sort])
  const pages = Math.ceil(rows.length / size); const view = rows.slice((page - 1) * size, page * size)
  const toggleSel = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  return (
    <div>
      <PageHead title="Products" sub={`${rows.length} products`}>
        <button className="btn btn-ghost" onClick={() => exportCSV('products', rows.map((p) => ({ sku: p.sku, name: p.name, brand: p.brand, category: catName[p.category_id], ...(canCost ? { cost_price: p.cost_price } : {}), selling_price: p.selling_price, mrp: p.mrp, stock: p.stock_quantity, gst: p.gst_rate, hsn: p.hsn_code })))}><Download size={16} />CSV</button>
        {can(user.role, 'products.write') && <Link to="/products/new" className="btn btn-primary"><Plus size={16} />Add Product</Link>}
      </PageHead>
      {can(user.role, 'products.write') && <ProductImport cats={cats} items={items} onImport={importAct} />}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-6">
        <div className="col-span-2"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Naam, SKU, brand" /></div>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Sab categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="input" value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Sab brands</option>{brands.map((b) => <option key={b}>{b}</option>)}</select>
        <select className="input" value={stock} onChange={(e) => setStock(e.target.value)}><option value="">Stock: sab</option><option value="in">Theek</option><option value="low">Low</option><option value="out">Khatam</option></select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Sort: Naam</option><option value="price">Price</option><option value="stock">Stock</option><option value="created">Naya pehle</option></select>
      </div>
      {sel.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-charcoal p-2 text-sm text-cream">
          <span>{sel.length} selected</span>
          <select className="input !w-auto !min-h-0 !py-1 text-charcoal" defaultValue="" onChange={(e) => { if (e.target.value) { bulk.mutate([sel, e.target.value]); setSel([]) } }}><option value="">Category badlein...</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button className="btn btn-ghost !py-1" onClick={() => exportCSV('selected', items.filter((p) => sel.includes(p.id)).map(({ images, tags, branch_stock, ...p }) => p))}>Export</button>
          {can(user.role, 'products.delete') && <button className="btn btn-danger !py-1" onClick={() => { if (confirm('Soft delete karein?')) { del.mutate([sel]); setSel([]) } }}><Trash2 size={14} />Delete</button>}
        </div>
      )}
      {!view.length ? <Empty>Koi product nahi mila.</Empty> : (
        <>
          <TableWrap><table className="tbl"><thead><tr><th></th><th>Product</th><th>SKU</th><th>Category</th><th className="r">Price</th>{canCost && <th className="r">Cost</th>}<th className="r">Stock</th><th>Website</th><th></th></tr></thead>
            <tbody>{view.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggleSel(p.id)} /></td>
                <td><Link to={`/products/${p.id}`} className="font-medium hover:text-brass-hover">{p.name}</Link><div className="text-xs text-ink2">{p.brand}</div></td>
                <td>{p.sku}</td><td>{catName[p.category_id]}</td><td className="r">{inr(p.selling_price)}</td>{canCost && <td className="r">{inr(p.cost_price)}</td>}
                <td className="r">{p.stock_quantity <= p.low_stock_threshold ? <Badge t={p.stock_quantity ? 'warn' : 'danger'}>{p.stock_quantity}</Badge> : p.stock_quantity}</td>
                <td><input type="checkbox" checked={p.is_active} disabled={!can(user.role, 'products.write')} onChange={() => tog.mutate([p.id, 'is_active'])} /></td>
                <td className="flex gap-1">{can(user.role, 'products.write') && <><Link className="btn btn-ghost !px-2" to={`/products/${p.id}/edit`}><Pencil size={14} /></Link><button className="btn btn-ghost !px-2" onClick={() => dup.mutate(p.id)}><Copy size={14} /></button></>}</td>
              </tr>))}</tbody></table></TableWrap>
          <Pager page={page} pages={pages} onPage={setPage} size={size} onSize={(n) => { setSize(n); setPage(1) }} />
        </>
      )}
    </div>
  )
}

const schema = z.object({
  name: z.string().min(2, 'Product ka naam zaroori hai'), sku: z.string().optional(), category_id: z.string().min(1, 'Category chunein'), brand: z.string().optional(), description: z.string().optional(),
  cost_price: z.coerce.number().min(0).optional(), selling_price: z.coerce.number({ invalid_type_error: 'Price daalein' }).positive('Selling price zaroori hai'), mrp: z.coerce.number().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0), low_stock_threshold: z.coerce.number().int().min(0), unit: z.string(), warranty_months: z.coerce.number().int().min(0).optional(),
  hsn_code: z.string().optional(), gst_rate: z.coerce.number(), is_active: z.boolean(), is_featured: z.boolean(), tags: z.string().optional(),
}).refine((d) => !d.mrp || d.mrp >= d.selling_price, { path: ['mrp'], message: 'MRP selling price se kam nahi ho sakta' })

export function ProductForm() {
  const { id } = useParams(); const nav = useNavigate(); const user = api.me()
  const { data: cats = [] } = useApi('cats', api.listCategories)
  const { data: items = [] } = useApi('products', api.listProducts)
  const ex = id && items.find((p) => p.id === id)
  const canCost = can(user.role, 'products.cost')
  const [images, setImages] = useState([])
  const [qr, setQr] = useState('')
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { unit: 'pcs', gst_rate: 18, low_stock_threshold: 5, stock_quantity: 0, is_active: true, is_featured: false } })
  useEffect(() => { if (ex) { reset({ ...ex, tags: (ex.tags || []).join(', '), cost_price: ex.cost_price ?? undefined }); setImages(ex.images || []) } }, [ex?.id])
  const v = watch()
  useEffect(() => { QRCode.toDataURL(v.sku || 'NHU-NEW', { margin: 1, width: 120 }).then(setQr) }, [v.sku])
  const save = useAct((d) => api.saveProduct(d), 'Product save ho gaya')
  const onFile = (e) => {
    Array.from(e.target.files).slice(0, 5 - images.length).forEach((f) => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 800; const x = c.getContext('2d'); const s = Math.min(img.width, img.height)
        x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 800, 800)  // center-crop square, resize to 800x800
        setImages((a) => [...a, c.toDataURL('image/jpeg', 0.7)].slice(0, 5))
      }; img.src = URL.createObjectURL(f)
    })
  }
  const submit = async (d) => { const r = await save.mutateAsync({ ...d, id, images, tags: (d.tags || '').split(',').map((t) => t.trim()).filter(Boolean) }); nav('/products') }
  const disc = v.mrp > v.selling_price ? Math.round((1 - v.selling_price / v.mrp) * 100) : 0
  const sec = 'card space-y-3'
  return (
    <form onSubmit={handleSubmit(submit)} className="pb-20">
      <PageHead title={id ? 'Product edit' : 'Naya Product'} />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className={sec}>
            <Field label="Product ka naam *" error={errors.name}><input className="input" {...register('name')} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="SKU (khud banta hai, edit kar sakte hain)"><input className="input" placeholder="auto" {...register('sku')} /></Field>
              <Field label="Slug (SEO)"><input className="input bg-cream" readOnly value={slugify(v.name)} /></Field>
              <Field label="Category *" error={errors.category_id}><select className="input" {...register('category_id')}><option value="">Chunein</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Brand"><input className="input" list="brands" {...register('brand')} /><datalist id="brands">{[...new Set(items.map((p) => p.brand))].map((b) => <option key={b} value={b} />)}</datalist></Field>
            </div>
            <Field label="Description"><textarea className="input" rows={3} {...register('description')} /></Field>
            <Field label="Tags (comma se alag)"><input className="input" {...register('tags')} /></Field>
          </div>
          <div className={sec}>
            <div className="grid gap-3 sm:grid-cols-3">
              {canCost && <Field label="Cost price (kharid)" error={errors.cost_price}><input type="number" step="any" className="input" {...register('cost_price')} /></Field>}
              <Field label="Selling price *" error={errors.selling_price}><input type="number" step="any" className="input" {...register('selling_price')} /></Field>
              <Field label="MRP" error={errors.mrp}><input type="number" step="any" className="input" {...register('mrp')} /></Field>
              <Field label="Stock kitna hai?" error={errors.stock_quantity}><input type="number" className="input" {...register('stock_quantity')} disabled={!!id} /></Field>
              <Field label="Low stock threshold"><input type="number" className="input" {...register('low_stock_threshold')} /></Field>
              <Field label="Unit"><select className="input" {...register('unit')}>{['pcs', 'set', 'kg', 'ltr', 'box', 'pair'].map((u) => <option key={u}>{u}</option>)}</select></Field>
              <Field label="Warranty (months)"><input type="number" className="input" {...register('warranty_months')} /></Field>
              <Field label="HSN code"><input className="input" {...register('hsn_code')} /></Field>
              <Field label="GST %"><select className="input" {...register('gst_rate')}>{[0, 5, 12, 18, 28].map((g) => <option key={g}>{g}</option>)}</select></Field>
            </div>
            {id && <p className="text-xs text-ink2">Stock badalne ke liye Inventory (Stock In/Out) use karein, taaki movement log ho.</p>}
            <div className="flex gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" {...register('is_active')} />Website par dikhayein</label><label className="flex items-center gap-2"><input type="checkbox" {...register('is_featured')} />Homepage featured</label></div>
          </div>
          <div className={sec}>
            <p className="label">Images (max 5, auto crop 800x800)</p>
            <div className="flex flex-wrap gap-2">{images.map((im, i) => <div key={i} className="relative"><img src={im} className="h-20 w-20 rounded-lg object-cover" />{i === 0 && <span className="absolute left-1 top-1 rounded bg-brass px-1 text-[9px] text-white">PRIMARY</span>}<button type="button" className="absolute -right-1 -top-1 rounded-full bg-danger px-1 text-xs text-white" onClick={() => setImages(images.filter((_, j) => j !== i))}>×</button></div>)}</div>
            {images.length < 5 && <input type="file" accept="image/*" multiple onChange={onFile} className="text-sm" />}
            <p className="text-xs text-ink2">Demo: images browser mein base64 save hoti hain. Production: Cloudinary/S3 upload.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="card"><p className="label">Website preview (live)</p>
            <div className="overflow-hidden rounded-xl border border-line"><div className="flex h-40 items-center justify-center bg-cream">{images[0] ? <img src={images[0]} className="h-full w-full object-cover" /> : <span className="text-xs text-ink2">no image</span>}</div>
              <div className="p-3"><p className="text-xs text-ink2">{v.brand}</p><p className="font-medium">{v.name || 'Product ka naam'}</p><p><b>{inr(v.selling_price || 0)}</b> {v.mrp > v.selling_price && <><s className="text-xs text-ink2">{inr(v.mrp)}</s> <span className="text-xs text-ok">{disc}% off</span></>}</p>{!v.is_active && <Badge t="warn">Website par hidden</Badge>}</div></div>
            <p className="mt-2 text-xs text-ink2">Approximate preview; customer site ka real card alag ho sakta hai.</p></div>
          <div className="card text-center"><p className="label">Barcode / QR (SKU)</p>{qr && <img src={qr} className="mx-auto" />}<p className="text-xs">{v.sku || 'auto on save'}</p><button type="button" className="btn btn-ghost mt-2" onClick={() => { const a = document.createElement('a'); a.href = qr; a.download = (v.sku || 'qr') + '.png'; a.click() }}>Download QR</button></div>
        </div>
      </div>
      <div className="fixed bottom-14 left-0 right-0 z-20 flex gap-2 border-t border-line bg-white p-3 md:static md:mt-4 md:border-0 md:bg-transparent md:p-0"><button className="btn btn-primary flex-1 md:flex-none">Save karein</button><Link to="/products" className="btn btn-ghost">Cancel</Link></div>
    </form>
  )
}

export function ProductView() {
  const { id } = useParams(); const { data: items = [] } = useApi('products', api.listProducts); const p = items.find((x) => x.id === id)
  const { data: mv = [] } = useApi('mv', api.listMovements)
  const user = api.me()
  if (!p) return <Empty>Product nahi mila</Empty>
  return (
    <div><PageHead title={p.name} sub={`${p.sku} · ${p.brand || ''}`}>{can(user.role, 'products.write') && <Link to={`/products/${id}/edit`} className="btn btn-primary">Edit</Link>}</PageHead>
      <div className="card grid gap-2 text-sm sm:grid-cols-3">
        <p>Selling: <b>{inr(p.selling_price)}</b></p><p>MRP: {inr(p.mrp)}</p>{p.cost_price != null && <p>Cost: {inr(p.cost_price)}</p>}
        <p>Stock: <b>{p.stock_quantity}</b> {p.unit}</p><p>GST: {p.gst_rate}% (HSN {p.hsn_code})</p><p>Warranty: {p.warranty_months || 0} mahine</p>
      </div>
      <h3 className="mb-2 mt-4 font-medium">Stock history</h3>
      <TableWrap><table className="tbl"><thead><tr><th>Date</th><th className="r">Qty</th><th>Reason</th></tr></thead><tbody>{mv.filter((m) => m.product_id === id).slice(0, 15).map((m) => <tr key={m.id}><td>{new Date(m.created_at).toLocaleString('en-IN')}</td><td className="r">{m.change_qty > 0 ? '+' : ''}{m.change_qty}</td><td>{m.reason}</td></tr>)}</tbody></table></TableWrap>
    </div>
  )
}
