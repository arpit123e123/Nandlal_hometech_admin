// ======================================================================
// MOCK API LAYER (DEMO). Stands in for Express + Prisma + Postgres.
// - State lives in Zustand + localStorage (browser only, NOT secure).
// - Every function enforces RBAC the way a real server guard would and
//   scrubs cost_price to null for roles without products.cost.
//   When you build the real backend, keep these function names as the
//   contract and replace the bodies with fetch() calls.
// ======================================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as seed from './seed'
import { uid, slugify, calcBill, ymd, round2 } from './utils'
import { can } from './rbac'
import { IS_DEMO } from './config'
import { SHOP } from './shop'

const demoState = () => ({
  seedVersion: seed.SEED_VERSION,
  branches: seed.branches, users: seed.users, categories: seed.categories, products: seed.products, suppliers: seed.suppliers,
  customers: seed.customers, bills: seed.bills, repairs: seed.repairs, stock_movements: seed.stock_movements, purchases: seed.purchases,
  notifications: seed.notifications, settings: seed.settings, activity_logs: seed.activity_logs, login_history: seed.login_history,
  session: null, branchId: 'b1', lastActive: Date.now(),
})
// EMPTY mode: no fake records at all. Shop's real data is entered or imported.
const emptyState = () => ({
  seedVersion: seed.SEED_VERSION,
  branches: [{ id: 'b1', name: 'Main Branch (Basti)', address: SHOP.address, phone: SHOP.operators[1].phone, gstin: '', manager: SHOP.operators[1].name, is_active: true }],
  users: [], categories: [], products: [], suppliers: [], customers: [], bills: [], repairs: [], stock_movements: [], purchases: [],
  notifications: [], activity_logs: [], login_history: [],
  settings: { ...seed.settings, business: { name: SHOP.name, address: SHOP.address, gstin: '', phone: SHOP.operators[1].phone, whatsapp: SHOP.operators[1].whatsapp, email: '', upi_id: '', maps_link: SHOP.mapsLink, operators: SHOP.operators.map((o) => `${o.name}: ${o.phone}`).join(', ') }, notify: { ...seed.settings.notify, email: '' } },
  session: null, branchId: 'b1', lastActive: Date.now(),
})
const initial = () => (IS_DEMO ? demoState() : emptyState())
export const useDB = create(persist((set) => ({ ...initial(), _set: set }), {
  name: IS_DEMO ? 'nhu-admin-demo-v1' : 'nhu-admin-empty-v1',
  version: seed.SEED_VERSION,
  migrate: () => initial(),
}))
const S = () => useDB.getState()
const set = (patch) => useDB.setState(typeof patch === 'function' ? patch(S()) : patch)
export const resetDemo = () => { useDB.setState({ ...initial() }); }

export class ApiError extends Error { constructor(m, code = 403) { super(m); this.code = code } }
export const me = () => S().users.find((u) => u.id === S().session)
function guard(perm) {
  const u = me()
  if (!u || !u.is_active) throw new ApiError('Login karein (401)', 401)
  if (perm && !can(u.role, perm)) throw new ApiError(`Permission nahi hai: ${perm} (403, ${u.role})`)
  return u
}
const now = () => new Date().toISOString()

export function audit(action, entity_type, entity_id, summary, old_value = null, new_value = null) {
  const u = me()
  const row = { id: uid('a'), user_id: u?.id || 'system', action, entity_type, entity_id, summary, old_value, new_value, ip: 'demo-local', branch_id: S().branchId, created_at: now() }
  set((s) => ({ activity_logs: [row, ...s.activity_logs] })) // append-only: no update/delete function exists
}
function notify(type, title, message, link) {
  set((s) => ({ notifications: [{ id: uid('n'), type, title, message, link, is_read: false, created_at: now() }, ...s.notifications] }))
}
const scrub = (p, role) => (can(role, 'products.cost') ? p : { ...p, cost_price: null })

// ---------- Auth ----------
// First-run only (EMPTY mode, zero users). LOCAL browser storage, not real security.
export function createFirstOwner(name, email, password) {
  if (S().users.length) throw new ApiError('Owner already exists', 403)
  const u = { id: uid('u'), name, email, phone: '', password, role: 'OWNER', branch_id: 'b1', is_active: true, last_login: null }
  set({ users: [u] })
  return u
}
export function login(email, password) {
  const u = S().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
  const attempts = (S().login_history || []).filter((h) => h.email === email && !h.ok && Date.now() - h.t < 15 * 60000).length
  if (attempts >= 5) throw new ApiError('Bahut attempts. 15 min baad try karein (rate limit)', 429)
  const ok = u && u.is_active && u.password === password
  set((s) => ({ login_history: [{ id: uid('l'), email, user_id: u?.id, ok: !!ok, t: Date.now() }, ...s.login_history].slice(0, 200) }))
  if (!ok) throw new ApiError('Email ya password galat hai', 401)
  set((s) => ({ session: u.id, lastActive: Date.now(), users: s.users.map((x) => (x.id === u.id ? { ...x, last_login: now() } : x)), branchId: u.branch_id }))
  audit('auth.login', 'user', u.id, `${u.name} logged in`)
  return u
}
export const logout = () => { if (me()) audit('auth.logout', 'user', me().id, `${me().name} logged out`); set({ session: null }) }
export const touch = () => set({ lastActive: Date.now() })

// ---------- Reads ----------
export const getDashboard = () => { guard('dashboard'); return { ...S() } }
export const listProducts = () => { const u = guard('products.view'); return S().products.filter((p) => !p.deleted).map((p) => ({ ...scrub(p, u.role), stock_quantity: p.branch_stock?.[S().branchId] ?? p.stock_quantity })) }
export const getProduct = (id) => listProducts().find((p) => p.id === id)
export const listCategories = () => { guard(); return [...S().categories].sort((a, b) => a.display_order - b.display_order) }
export const listBills = () => { guard('billing.view'); return S().bills.filter((b) => b.branch_id === S().branchId) }
export const listCustomers = () => { guard('customers.view'); return S().customers }
export const listSuppliers = () => { guard('suppliers.view'); return S().suppliers }
export const listPurchases = () => { guard('suppliers.view'); return S().purchases }
export const listMovements = () => { guard('inventory.view'); return S().stock_movements }
export function listRepairs() {
  const u = guard()
  if (can(u.role, 'repairs.all')) return S().repairs
  if (can(u.role, 'repairs.assigned')) return S().repairs.filter((r) => r.assigned_to === u.id).map((r) => ({ ...r, customer_id: null }))
  throw new ApiError('Permission nahi hai: repairs')
}
export function listActivity() {
  const u = guard()
  if (can(u.role, 'activity.all')) return S().activity_logs
  if (can(u.role, 'activity.branch')) return S().activity_logs.filter((a) => a.branch_id === S().branchId)
  if (can(u.role, 'activity.own')) return S().activity_logs.filter((a) => a.user_id === u.id)
  throw new ApiError('Permission nahi hai: activity')
}
export const listUsers = () => { guard('users'); return S().users.map(({ password, ...u }) => u) }
export const listBranches = () => { guard(); return S().branches }
export const listNotifications = () => { guard(); return S().notifications }
export const getSettings = () => { guard(); return S().settings }

// ---------- Derived ----------
export function customerStats(id) {
  const bills = S().bills.filter((b) => b.customer_id === id && !b.cancelled_at)
  return { total: bills.reduce((a, b) => a + b.grand_total, 0), due: bills.reduce((a, b) => a + b.amount_due, 0), last: bills.length ? bills[bills.length - 1].created_at : null, count: bills.length }
}
export const udhaarRows = () => {
  guard('udhaar.view')
  const map = {}
  S().bills.filter((b) => !b.cancelled_at && b.amount_due > 0 && b.customer_id).forEach((b) => {
    const m = (map[b.customer_id] ||= { customer_id: b.customer_id, due: 0, bills: [], oldest: b.created_at })
    m.due += b.amount_due; m.bills.push(b); if (b.created_at < m.oldest) m.oldest = b.created_at
  })
  return Object.values(map)
}

// ---------- Mutations ----------
function adjustStock(productId, delta, reason, ref = '', notes = '') {
  const u = me(); const bid = S().branchId
  set((s) => ({
    products: s.products.map((p) => p.id !== productId ? p : { ...p, stock_quantity: p.stock_quantity + delta, branch_stock: { ...p.branch_stock, [bid]: (p.branch_stock?.[bid] ?? 0) + delta } }),
    stock_movements: [{ id: uid('sm'), product_id: productId, branch_id: bid, change_qty: delta, reason, reference_id: ref, notes, user_id: u.id, created_at: now() }, ...s.stock_movements],
  }))
  const p = S().products.find((x) => x.id === productId)
  const cur = p.branch_stock?.[bid] ?? p.stock_quantity
  if (cur <= p.low_stock_threshold && delta < 0) notify('low_stock', 'Low stock', `${p.name}: sirf ${cur} bacha`, '/inventory/low-stock')
}
export function saveProduct(data) {
  guard('products.write')
  const exists = data.id && S().products.find((p) => p.id === data.id)
  if (exists) {
    const patch = { ...data }
    if (!can(me().role, 'products.cost')) delete patch.cost_price
    set((s) => ({ products: s.products.map((p) => (p.id === data.id ? { ...p, ...patch, slug: slugify(patch.slug || patch.name) } : p)) }))
    audit('product.update', 'product', data.id, `Product edit: ${data.name}`, { selling_price: exists.selling_price }, { selling_price: data.selling_price })
    return data.id
  }
  const id = uid('p'); const sku = data.sku || 'NHU-' + (1001 + S().products.length)
  const open = Number(data.stock_quantity) || 0
  set((s) => ({ products: [{ ...data, id, sku, slug: slugify(data.name), deleted: false, branch_stock: { [s.branchId]: open }, created_at: now() }, ...s.products] }))
  audit('product.create', 'product', id, `Naya product: ${data.name}`)
  return id
}
export function importProducts(rows) {
  const user = guard('products.write')
  if (!Array.isArray(rows) || !rows.length) throw new ApiError('Import ke liye products nahi hain', 400)
  const activeSkus = new Set(S().products.filter((p) => !p.deleted).map((p) => String(p.sku || '').trim().toLowerCase()).filter(Boolean))
  const inFile = new Set()
  for (const row of rows) {
    const sku = String(row.sku || '').trim().toLowerCase()
    if (sku && (activeSkus.has(sku) || inFile.has(sku))) throw new ApiError(`SKU pehle se maujood hai: ${row.sku}`, 409)
    if (sku) inFile.add(sku)
  }
  const bid = S().branchId
  const products = rows.map((row, index) => {
    const id = uid('p'); const stock = Number(row.stock_quantity) || 0
    const product = { ...row, id, sku: row.sku || `NHU-${1001 + S().products.length + index}`, slug: slugify(row.name), deleted: false, branch_stock: { [bid]: stock }, created_at: now(), images: [], tags: row.tags || [] }
    if (!can(user.role, 'products.cost')) delete product.cost_price
    return product
  })
  set((s) => ({ products: [...products, ...s.products] }))
  audit('product.import', 'product', products.map((p) => p.id).join(','), `${products.length} products Excel se import hue`)
  return products.length
}
export function deleteProducts(ids) {
  guard('products.delete')
  set((s) => ({ products: s.products.map((p) => (ids.includes(p.id) ? { ...p, deleted: true } : p)) }))
  audit('product.delete', 'product', ids.join(','), `${ids.length} product(s) soft-deleted`)
}
export function bulkCategory(ids, category_id) {
  guard('products.write')
  set((s) => ({ products: s.products.map((p) => (ids.includes(p.id) ? { ...p, category_id } : p)) }))
  audit('product.bulk_category', 'product', ids.join(','), `${ids.length} products ki category badli`)
}
export function toggleProduct(id, field) {
  guard('products.write')
  set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, [field]: !p[field] } : p)) }))
  audit('product.toggle', 'product', id, `${field} toggled`)
}
export function duplicateProduct(id) {
  guard('products.write')
  const p = S().products.find((x) => x.id === id); const nid = uid('p')
  set((s) => ({ products: [{ ...p, id: nid, name: p.name + ' (copy)', slug: p.slug + '-copy', sku: 'NHU-' + (1001 + s.products.length), stock_quantity: 0, branch_stock: { [s.branchId]: 0 }, created_at: now() }, ...s.products] }))
  audit('product.duplicate', 'product', nid, `Duplicate: ${p.name}`)
}
export function saveCategory(data) {
  guard('categories.write')
  if (data.id) { set((s) => ({ categories: s.categories.map((c) => (c.id === data.id ? { ...c, ...data, slug: slugify(data.slug || data.name) } : c)) })); audit('category.update', 'category', data.id, `Category edit: ${data.name}`) }
  else { const id = uid('c'); set((s) => ({ categories: [...s.categories, { ...data, id, slug: slugify(data.name), display_order: s.categories.length + 1 }] })); audit('category.create', 'category', id, `Nayi category: ${data.name}`) }
}
export function deleteCategory(id) {
  guard('products.delete')
  const n = S().products.filter((p) => !p.deleted && p.category_id === id).length
  if (n) throw new ApiError(`Is category mein ${n} products hain. Pehle unhe hatayein/move karein.`, 409)
  set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })); audit('category.delete', 'category', id, 'Category deleted')
}
export function reorderCategories(ids) {
  guard('categories.write')
  set((s) => ({ categories: s.categories.map((c) => ({ ...c, display_order: ids.indexOf(c.id) + 1 })) })); audit('category.reorder', 'category', '-', 'Categories reorder hui')
}
export function stockOut(productId, qty, reason, notes) {
  guard('stock.write'); qty = Number(qty)
  const p = S().products.find((x) => x.id === productId)
  if (!qty || qty <= 0) throw new ApiError('Quantity sahi daalein', 400)
  if ((p.branch_stock?.[S().branchId] ?? 0) < qty) throw new ApiError('Itna stock nahi hai', 409)
  adjustStock(productId, -qty, reason, '', notes); audit('stock.out', 'product', productId, `${p.name} stock -${qty} (${reason})`)
}
export function saveSupplier(data) {
  guard('suppliers.view')
  if (data.id) set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === data.id ? { ...x, ...data } : x)) }))
  else set((s) => ({ suppliers: [...s.suppliers, { ...data, id: uid('s') }] }))
  audit('supplier.save', 'supplier', data.id || 'new', `Supplier: ${data.name}`)
}
export function createPurchase(d) {
  guard('purchases.write')
  const total = d.items.reduce((a, i) => a + i.qty * i.cost_price, 0)
  const id = uid('pu')
  const paid = Number(d.paid_amount) || 0
  set((s) => ({ purchases: [{ id, supplier_id: d.supplier_id, branch_id: s.branchId, invoice_no: d.invoice_no, purchase_date: d.purchase_date, total_amount: total, paid_amount: paid, status: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'pending', notes: d.notes || '', user_id: s.session, items: d.items.map((i) => ({ ...i, total: i.qty * i.cost_price })) }, ...s.purchases] }))
  d.items.forEach((i) => {
    const p = S().products.find((x) => x.id === i.product_id)
    const totalQty = p.stock_quantity + i.qty
    const avg = round2(((p.cost_price * p.stock_quantity) + i.cost_price * i.qty) / (totalQty || 1)) // weighted average cost
    set((s) => ({ products: s.products.map((x) => (x.id === i.product_id ? { ...x, cost_price: avg } : x)) }))
    adjustStock(i.product_id, i.qty, 'purchase', id, `Inv ${d.invoice_no}`)
  })
  audit('purchase.create', 'purchase', id, `Purchase ${d.invoice_no} ₹${total}`)
  return id
}
export function setBillDueDate(billId, due_date) {
  guard('udhaar.collect')
  set((s) => ({ bills: s.bills.map((x) => (x.id === billId ? { ...x, due_date: due_date || null } : x)) }))
  audit('bill.due_date', 'bill', billId, `Due date ${due_date || 'hata di'}`)
}
export function createBill(d) {
  const u = guard('billing.create')
  const inclusive = S().settings.tax.inclusive
  const calc = calcBill(d.items, d.billDiscount, inclusive)
  const pay = Math.min(Number(d.amount_paid) || 0, calc.grand_total)
  if (d.payment_mode === 'Udhaar' && !d.customer_id) throw new ApiError('Udhaar ke liye customer chunna zaroori hai', 400)
  for (const i of d.items) { const p = S().products.find((x) => x.id === i.product_id); if ((p.branch_stock?.[S().branchId] ?? 0) < i.qty) throw new ApiError(`${p.name}: stock kam hai`, 409) }
  const ym = ymd(); const count = S().bills.filter((b) => b.invoice_no.startsWith(`NHU-${ym}`)).length
  const inv = `${S().settings.invoice.prefix || 'NHU'}-${ym}-${String(count + S().settings.invoice.start_number).padStart(4, '0')}`
  const paid = d.payment_mode === 'Udhaar' ? pay : calc.grand_total
  const id = uid('bl')
  const bill = {
    id, invoice_no: inv, branch_id: S().branchId, customer_id: d.customer_id || null,
    items: calc.lines.map((l) => { const p = S().products.find((x) => x.id === l.product_id); return { product_id: l.product_id, name: l.name, hsn: p.hsn_code, qty: l.qty, price: l.price, cost: p.cost_price, discount: l.discount || 0, gst_rate: l.gst_rate, taxable: l.taxable, tax: l.tax, total: l.total } }),
    subtotal: calc.subtotal, discount_total: calc.discount_total, gst_total: calc.gst_total, roundoff: calc.roundoff, grand_total: calc.grand_total,
    payment_mode: d.payment_mode, payment_status: paid >= calc.grand_total ? 'paid' : paid > 0 ? 'partial' : 'pending', amount_paid: paid, amount_due: calc.grand_total - paid,
    notes: d.notes || '', due_date: d.payment_mode === 'Udhaar' && paid < calc.grand_total ? (d.due_date || null) : null, user_id: u.id, created_at: now(), cancelled_at: null, cancel_reason: '',
    payments: paid ? [{ id: uid('pay'), amount: paid, mode: d.payment_mode === 'Udhaar' ? 'Cash' : d.payment_mode, reference_no: '', paid_at: now(), user_id: u.id }] : [],
  }
  set((s) => ({ bills: [...s.bills, bill] }))
  bill.items.forEach((i) => adjustStock(i.product_id, -i.qty, 'sale', id, inv))
  audit('bill.create', 'bill', id, `${u.name.split(' ')[0]} ne ₹${calc.grand_total.toLocaleString('en-IN')} ka bill banaya (${inv})`)
  const cust = S().customers.find((c) => c.id === bill.customer_id)
  if (cust && bill.amount_due > 0) {
    const due = customerStats(cust.id).due
    if (due >= S().settings.notify.udhaar_threshold) notify('udhaar', 'Udhaar alert', `${cust.name} ka udhaar ₹${due} ho gaya`, '/billing/udhaar')
  }
  return id
}
export function collectPayment(billId, amount, mode, reference_no = '') {
  guard('udhaar.collect'); amount = Number(amount)
  const b = S().bills.find((x) => x.id === billId)
  if (!amount || amount <= 0 || amount > b.amount_due) throw new ApiError('Amount galat hai (due se zyada nahi ho sakta)', 400)
  set((s) => ({ bills: s.bills.map((x) => x.id !== billId ? x : { ...x, amount_paid: x.amount_paid + amount, amount_due: x.amount_due - amount, payment_status: x.amount_due - amount <= 0 ? 'paid' : 'partial', payments: [...x.payments, { id: uid('pay'), amount, mode, reference_no, paid_at: now(), user_id: s.session }] }) }))
  audit('payment.create', 'bill', billId, `₹${amount} mila (${mode}) - ${b.invoice_no}`)
}
export function cancelBill(id, reason) {
  guard('billing.cancel')
  const b = S().bills.find((x) => x.id === id)
  if (b.cancelled_at) return
  set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, cancelled_at: now(), cancel_reason: reason, payment_status: 'cancelled', amount_due: 0 } : x)) }))
  b.items.forEach((i) => adjustStock(i.product_id, i.qty, 'return', id, 'Bill cancelled ' + b.invoice_no))
  audit('bill.cancel', 'bill', id, `Bill cancel ${b.invoice_no}: ${reason}`)
}
export function saveCustomer(data) {
  guard('customers.write')
  const dup = S().customers.find((c) => c.phone === data.phone && c.id !== data.id)
  if (dup) throw new ApiError(`Yeh phone pehle se hai (${dup.name})`, 409)
  if (data.id) set((s) => ({ customers: s.customers.map((c) => (c.id === data.id ? { ...c, ...data } : c)) }))
  else { data = { ...data, id: uid('cu'), created_at: now(), note_log: [] }; set((s) => ({ customers: [data, ...s.customers] })) }
  audit('customer.save', 'customer', data.id, `Customer: ${data.name}`)
  return data.id
}
export function addCustomerNote(id, text) {
  guard('customers.write')
  set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, note_log: [{ text, at: now(), by: s.session }, ...(c.note_log || [])] } : c)) }))
  audit('customer.note', 'customer', id, 'Customer note added')
}
export function createRepair(d) {
  const u = guard('repairs.create')
  const ym = ymd(); const n = S().repairs.filter((r) => r.repair_id.startsWith(`R-${ym}`)).length + 1
  const rid = `R-${ym}-${String(n + 1041 > 9999 ? n : n).padStart(4, '0')}`
  const id = uid('r')
  set((s) => ({ repairs: [{ id, repair_id: rid, branch_id: s.branchId, parts_used: [], labor_charge: 0, final_amount: 0, technician_notes: '', diagnosis: '', delivered_at: null, customer_signature_url: '', status: 'Received', user_id: u.id, created_at: now(), updated_at: now(), ...d }, ...s.repairs] }))
  audit('repair.create', 'repair', id, `Nayi repair ${rid}`)
  return id
}
export function updateRepair(id, patch, action = 'repair.update') {
  const u = guard('repairs.update')
  const r = S().repairs.find((x) => x.id === id)
  if (!can(u.role, 'repairs.all') && r.assigned_to !== u.id) throw new ApiError('Yeh repair aapko assign nahi hai (403)')
  if (patch.status === 'Delivered' && !r.final_amount && !patch.final_amount) patch = { ...patch, final_amount: (r.total_estimate || 0) }
  set((s) => ({ repairs: s.repairs.map((x) => (x.id === id ? { ...x, ...patch, delivered_at: patch.status === 'Delivered' ? now() : x.delivered_at, updated_at: now() } : x)) }))
  if (patch.status && patch.status !== r.status) {
    audit('repair.status', 'repair', id, `Repair #${r.repair_id} ${patch.status} (${u.name.split(' ')[0]})`, { status: r.status }, { status: patch.status })
    notify('repair', 'Repair update', `${r.repair_id}: ${patch.status}`, '/repairs/' + id)
  } else audit(action, 'repair', id, `Repair ${r.repair_id} updated`)
}
export function addRepairPart(id, product_id, qty) {
  guard('repairs.update')
  const p = S().products.find((x) => x.id === product_id); const r = S().repairs.find((x) => x.id === id)
  const part = { product_id, name: p.name, qty: Number(qty), cost: p.selling_price * Number(qty) }
  set((s) => ({ repairs: s.repairs.map((x) => (x.id === id ? { ...x, parts_used: [...x.parts_used, part] } : x)) }))
  adjustStock(product_id, -Number(qty), 'repair_part', id, r.repair_id)
  audit('repair.part', 'repair', id, `${p.name} x${qty} added to ${r.repair_id}`)
}
export function saveUser(d) {
  guard('users')
  if (d.id) set((s) => ({ users: s.users.map((u) => (u.id === d.id ? { ...u, ...d } : u)) }))
  else set((s) => ({ users: [...s.users, { ...d, id: uid('u'), is_active: true, last_login: null }] }))
  audit('user.save', 'user', d.id || 'new', `User: ${d.name} (${d.role})`)
}
export function saveBranch(d) {
  guard('branches')
  if (d.id) set((s) => ({ branches: s.branches.map((b) => (b.id === d.id ? { ...b, ...d } : b)) }))
  else set((s) => ({ branches: [...s.branches, { ...d, id: uid('b'), is_active: true }] }))
  audit('branch.save', 'branch', d.id || 'new', `Branch: ${d.name}`)
}
export const switchBranch = (id) => { guard(); set({ branchId: id }) }
export function saveSettings(key, value) {
  guard('settings')
  const old = S().settings[key]
  set((s) => ({ settings: { ...s.settings, [key]: { ...s.settings[key], ...value } } }))
  audit('settings.update', 'settings', key, `Settings badli: ${key}`, old, value)
}
export const markNotifs = () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, is_read: true })) }))
export function exportBackup() { guard('settings'); const { _set, session, ...rest } = S(); audit('backup.export', 'settings', '-', 'Backup JSON download'); return JSON.stringify(rest, null, 2) }
