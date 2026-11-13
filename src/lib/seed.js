// ======================================================================
// DEMO SEED DATA. Every name, phone, GSTIN, amount below is FAKE.
// Production must start empty (or import the shop's real data).
// ======================================================================
import { daysAgo, slugify } from './utils'

export const SEED_VERSION = 3
const H = 36e5
const ago = (hours) => new Date(Date.now() - hours * H).toISOString()

export const branches = [
  { id: 'b1', name: 'Basti Main (DEMO)', address: 'Station Road, Basti, UP 272001', phone: '9000000001', gstin: '09AAAAA0000A1Z5', manager: 'u2', is_active: true },
  { id: 'b2', name: 'Harraiya Counter (DEMO)', address: 'Harraiya Bazaar, Basti, UP', phone: '9000000002', gstin: '09AAAAA0000A1Z5', manager: '', is_active: false },
]

export const users = [
  { id: 'u1', name: 'Nandlal (Owner)', email: 'owner@demo.nhu', phone: '9000000010', password: 'owner123', role: 'OWNER', branch_id: 'b1', is_active: true, last_login: ago(1) },
  { id: 'u2', name: 'Ramesh (Manager)', email: 'manager@demo.nhu', phone: '9000000011', password: 'manager123', role: 'MANAGER', branch_id: 'b1', is_active: true, last_login: ago(5) },
  { id: 'u3', name: 'Mohit (Counter)', email: 'staff@demo.nhu', phone: '9000000012', password: 'staff123', role: 'STAFF', branch_id: 'b1', is_active: true, last_login: ago(2) },
  { id: 'u4', name: 'Suresh (Technician)', email: 'tech@demo.nhu', phone: '9000000013', password: 'tech123', role: 'TECHNICIAN', branch_id: 'b1', is_active: true, last_login: ago(3) },
  { id: 'u5', name: 'Imran (Technician)', email: 'tech2@demo.nhu', phone: '9000000014', password: 'tech123', role: 'TECHNICIAN', branch_id: 'b1', is_active: true, last_login: ago(30) },
]

const catNames = ['Mixer Grinder', 'Cooler & Fan', 'Kitchen Appliances', 'Iron & Heater', 'Utensils', 'Lighting', 'Water Purifier', 'Spare Parts']
export const categories = catNames.map((name, i) => ({ id: 'c' + (i + 1), name, slug: slugify(name), image_url: '', description: name + ' ki range', display_order: i + 1, is_active: true }))

// name, cat, brand, cost, sell, mrp, stock, hsn, gst, unit, warranty, thr
const P = [
  ['Mixer Grinder 750W 3 Jar', 'c1', 'Bajaj', 2100, 2650, 3290, 3, '8509', 18, 'pcs', 24, 5],
  ['Mixer Grinder 500W 2 Jar', 'c1', 'Preethi', 1500, 1899, 2299, 12, '8509', 18, 'pcs', 24, 5],
  ['Juicer Mixer Grinder 900W', 'c1', 'Philips', 3400, 4199, 4995, 6, '8509', 18, 'pcs', 24, 4],
  ['Desert Cooler 55L', 'c2', 'Symphony', 6800, 8200, 9990, 4, '8479', 18, 'pcs', 12, 3],
  ['Personal Cooler 22L', 'c2', 'Usha', 3300, 4100, 4999, 9, '8479', 18, 'pcs', 12, 3],
  ['Ceiling Fan 1200mm', 'c2', 'Havells', 1700, 2150, 2650, 18, '8414', 18, 'pcs', 24, 6],
  ['Table Fan 400mm', 'c2', 'Orient', 1100, 1450, 1790, 14, '8414', 18, 'pcs', 12, 5],
  ['Induction Cooktop 2000W', 'c3', 'Prestige', 1750, 2250, 2995, 8, '8516', 18, 'pcs', 12, 4],
  ['Electric Kettle 1.5L', 'c3', 'Pigeon', 480, 695, 995, 22, '8516', 18, 'pcs', 12, 6],
  ['Pressure Cooker 5L', 'c3', 'Hawkins', 1250, 1590, 1875, 15, '7615', 12, 'pcs', 0, 5],
  ['Gas Stove 3 Burner', 'c3', 'Sunflame', 2800, 3499, 4290, 5, '7321', 18, 'pcs', 24, 3],
  ['Steam Iron 1100W', 'c4', 'Philips', 900, 1199, 1495, 16, '8516', 18, 'pcs', 24, 5],
  ['Room Heater 2000W', 'c4', 'Bajaj', 1350, 1750, 2195, 2, '8516', 18, 'pcs', 12, 4],
  ['Geyser 15L', 'c4', 'Racold', 4300, 5450, 6490, 7, '8516', 18, 'pcs', 24, 3],
  ['Steel Tiffin 3 Container', 'c5', 'Milton', 380, 549, 725, 30, '7323', 12, 'set', 0, 8],
  ['Steel Dinner Set 24pc', 'c5', 'Borosil', 1650, 2199, 2799, 10, '7323', 12, 'set', 0, 3],
  ['Non-stick Kadhai 26cm', 'c5', 'Prestige', 520, 749, 995, 25, '7615', 12, 'pcs', 12, 6],
  ['LED Bulb 9W (pack of 4)', 'c6', 'Syska', 220, 330, 420, 60, '8539', 12, 'set', 12, 15],
  ['LED Tube Light 20W', 'c6', 'Philips', 190, 280, 360, 4, '8539', 12, 'pcs', 12, 10],
  ['RO Water Purifier 8L', 'c7', 'Kent', 11200, 13500, 16500, 3, '8421', 18, 'pcs', 12, 2],
  ['Mixer Jar (spare)', 'c8', 'Bajaj', 180, 320, 420, 20, '8509', 18, 'pcs', 3, 8],
  ['Heating Element (iron/heater)', 'c8', 'Generic', 90, 190, 250, 28, '8516', 18, 'pcs', 0, 10],
  ['Fan Capacitor 2.5uF', 'c8', 'Generic', 25, 60, 80, 70, '8532', 18, 'pcs', 0, 20],
  ['Mixer Motor Brush Set', 'c8', 'Generic', 35, 80, 100, 3, '8509', 18, 'pcs', 0, 15],
]
export const products = P.map((r, i) => ({
  id: 'p' + (i + 1), name: r[0], slug: slugify(r[0]), sku: 'NHU-' + String(1001 + i), category_id: r[1], brand: r[2], description: '',
  images: [], cost_price: r[3], selling_price: r[4], mrp: r[5], stock_quantity: r[6], low_stock_threshold: r[11], unit: r[9],
  warranty_months: r[10], hsn_code: r[7], gst_rate: r[8], is_active: true, is_featured: i % 5 === 0, tags: [r[2].toLowerCase(), slugify(r[0]).split('-')[0]],
  branch_stock: { b1: r[6] }, deleted: false, created_at: daysAgo(120 - i * 3).toISOString(),
}))

export const suppliers = [
  { id: 's1', name: 'Gorakhpur Appliance Traders (DEMO)', contact_person: 'Anil', phone: '9000001001', whatsapp: '9000001001', email: 'anil@demo.test', address: 'Gorakhpur', gstin: '09BBBBB0000B1Z5', notes: '' },
  { id: 's2', name: 'Lucknow Home Wholesale (DEMO)', contact_person: 'Faizan', phone: '9000001002', whatsapp: '9000001002', email: 'faizan@demo.test', address: 'Aminabad, Lucknow', gstin: '09CCCCC0000C1Z5', notes: 'Pays in 30 days' },
]

export const customers = [
  ['Sunita Devi', '9000002001', 'Basti City', 'retail'], ['Rajendra Prasad', '9000002002', 'Harraiya', 'regular'],
  ['Vikas Maurya', '9000002003', 'Rudhauli', 'regular'], ['Meena Gupta', '9000002004', 'Basti City', 'retail'],
  ['Arif Khan', '9000002005', 'Captainganj', 'wholesale'], ['Pooja Verma', '9000002006', 'Basti City', 'retail'],
  ['Santosh Yadav', '9000002007', 'Gaur', 'regular'], ['Kamla Singh', '9000002008', 'Walterganj', 'retail'],
].map((c, i) => ({ id: 'cu' + (i + 1), name: c[0], phone: c[1], alternate_phone: '', email: '', address: '', area: c[2], customer_type: c[3], notes: '', created_at: daysAgo(100 - i * 5).toISOString(), note_log: [] }))

function mkBills() {
  const out = []
  const modes = ['Cash', 'UPI', 'Cash', 'Card', 'UPI', 'Cash']
  let seq = {}
  for (let d = 60; d >= 0; d--) {
    const n = (d * 7) % 4 + (d < 7 ? 2 : 1)
    for (let k = 0; k < n; k++) {
      const date = new Date(Date.now() - d * 864e5 - k * 2.2 * H - (d === 0 ? 0 : 3 * H))
      const pick = [((d * 3 + k * 5) % 24), ((d + k * 7 + 3) % 24)]
      const items = [...new Set(pick)].map((pi) => {
        const p = products[pi]; const qty = 1 + ((d + k) % (p.selling_price < 800 ? 3 : 2))
        return { product_id: p.id, name: p.name, hsn: p.hsn_code, qty, price: p.selling_price, cost: p.cost_price, discount: 0, gst_rate: p.gst_rate }
      })
      let subtotal = 0, gst = 0
      items.forEach((i) => { const t = i.qty * i.price; const taxable = t / (1 + i.gst_rate / 100); subtotal += taxable; gst += t - taxable; i.total = t })
      const grand = Math.round(subtotal + gst)
      const mode = modes[(d + k) % modes.length]
      const cust = (d + k) % 3 === 0 ? customers[(d + k) % customers.length].id : null
      const isUdhaar = cust && (d * 5 + k) % 9 === 0
      const partial = isUdhaar && d % 2 === 0
      const paid = isUdhaar ? (partial ? Math.round(grand * 0.4) : 0) : grand
      const ym = date.getFullYear() * 100 + date.getMonth() + 1
      seq[ym] = (seq[ym] || 0) + 1
      out.push({
        id: 'bl' + out.length, invoice_no: `NHU-${ym}-${String(seq[ym]).padStart(4, '0')}`, branch_id: 'b1', customer_id: cust,
        items, subtotal: Math.round(subtotal * 100) / 100, discount_total: 0, gst_total: Math.round(gst * 100) / 100, grand_total: grand,
        payment_mode: isUdhaar ? 'Udhaar' : mode, payment_status: paid >= grand ? 'paid' : paid > 0 ? 'partial' : 'pending',
        amount_paid: paid, amount_due: grand - paid, notes: '', user_id: k % 2 ? 'u3' : 'u2', created_at: date.toISOString(), cancelled_at: null, cancel_reason: '',
        payments: paid ? [{ id: 'pay' + out.length, amount: paid, mode: isUdhaar ? 'Cash' : mode, reference_no: '', paid_at: date.toISOString(), user_id: 'u3' }] : [],
      })
    }
  }
  return out
}
export const bills = mkBills().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

const dev = [['Mixer Grinder', 'Bajaj', 'GX3', 'Motor se awaaz aa rahi hai'], ['Desert Cooler', 'Symphony', '', 'Pump kaam nahi kar raha'], ['Ceiling Fan', 'Havells', '', 'Speed slow hai'], ['Induction', 'Prestige', 'PIC20', 'Display blank'], ['Geyser', 'Racold', '', 'Heating nahi'], ['Iron', 'Philips', '', 'Garam nahi hota'], ['Room Heater', 'Bajaj', '', 'Spark aa raha hai'], ['Water Purifier', 'Kent', '', 'Pani slow aata hai']]
const sts = ['Received', 'Diagnosing', 'In Progress', 'Waiting for Parts', 'Ready for Pickup', 'Delivered', 'Closed', 'In Progress', 'Received', 'Ready for Pickup']
export const repairs = sts.map((s, i) => {
  const d = dev[i % dev.length]; const created = new Date(Date.now() - (i * 20 + 3) * H)
  const done = ['Delivered', 'Closed'].includes(s)
  return {
    id: 'r' + i, repair_id: `R-${created.getFullYear() * 100 + created.getMonth() + 1}-${String(1042 + i).padStart(4, '0')}`.replace('R-', 'R-'), branch_id: 'b1',
    customer_id: customers[i % customers.length].id, device_type: d[0], brand: d[1], model: d[2], problem_description: d[3], diagnosis: i > 0 ? 'Check kiya, part badalna padega' : '', technician_notes: '',
    parts_used: i % 3 === 0 && i > 0 ? [{ product_id: 'p21', name: 'Mixer Jar (spare)', qty: 1, cost: 180 }] : [], labor_charge: i > 1 ? 150 : 0, total_estimate: 300 + i * 60, final_amount: done ? 350 + i * 40 : 0,
    advance_paid: i % 2 ? 100 : 0, status: s, assigned_to: i % 3 === 2 ? 'u5' : 'u4', expected_delivery_date: new Date(Date.now() + (3 - i) * 864e5).toISOString().slice(0, 10),
    delivered_at: done ? new Date(created.getTime() + 2 * 864e5).toISOString() : null, customer_signature_url: '', user_id: 'u3', created_at: created.toISOString(), updated_at: created.toISOString(),
  }
})

export const stock_movements = products.slice(0, 10).map((p, i) => ({
  id: 'sm' + i, product_id: p.id, branch_id: 'b1', change_qty: i % 4 === 3 ? -1 : 10 + i, reason: i % 4 === 3 ? 'damage' : 'purchase', reference_id: '', notes: 'DEMO opening entry', user_id: 'u2', created_at: ago(24 * (30 - i)),
}))

export const purchases = [
  { id: 'pu1', supplier_id: 's1', branch_id: 'b1', invoice_no: 'GAT/2291', purchase_date: daysAgo(14).toISOString().slice(0, 10), total_amount: 42500, paid_amount: 30000, status: 'partial', notes: '', user_id: 'u2', items: [{ product_id: 'p4', qty: 5, cost_price: 6800, total: 34000 }, { product_id: 'p5', qty: 2, cost_price: 4250, total: 8500 }] },
  { id: 'pu2', supplier_id: 's2', branch_id: 'b1', invoice_no: 'LHW/118', purchase_date: daysAgo(30).toISOString().slice(0, 10), total_amount: 18000, paid_amount: 18000, status: 'paid', notes: '', user_id: 'u2', items: [{ product_id: 'p2', qty: 12, cost_price: 1500, total: 18000 }] },
]

export const notifications = [
  { id: 'n1', type: 'low_stock', title: 'Low stock', message: 'Mixer Grinder 750W: sirf 3 bacha', link: '/inventory/low-stock', is_read: false, created_at: ago(1) },
  { id: 'n2', type: 'repair', title: 'Repair update', message: 'Repair R-1042 ready for pickup', link: '/repairs', is_read: false, created_at: ago(2) },
  { id: 'n3', type: 'udhaar', title: 'Udhaar alert', message: 'Arif Khan ka udhaar threshold cross', link: '/billing/udhaar', is_read: true, created_at: ago(26) },
]

export const settings = {
  business: { name: 'NANDLAL HOMETECH & UTILITY', address: 'Station Road, Basti, UP 272001', gstin: '09AAAAA0000A1Z5 (DEMO)', phone: '9000000001', whatsapp: '9000000001', email: 'shop@demo.test', upi_id: 'nandlal@upi' },
  invoice: { prefix: 'NHU', start_number: 1, footer: 'Thank you, phir aaiye', logo: '' },
  tax: { default_gst: 18, inclusive: false },
  notify: { email: 'owner@demo.test', low_stock_default: 5, udhaar_overdue_days: 30, udhaar_threshold: 10000, wa_bill: 'Namaste {name}, aapka bill {invoice} ₹{amount} ka. Dhanyavaad - Nandlal Hometech', wa_ready: 'Aapka repair {id} ready hai. Dukaan pe aayein.', wa_progress: 'Repair {id} in progress. Estimated: ₹{amount}.', wa_udhaar: 'Namaste {name}, aapka ₹{amount} udhaar baaki hai. Kripya jaldi chukayein. - Nandlal Hometech' },
  website: { sync_active_only: true },
}
export const activity_logs = [
  { id: 'a1', user_id: 'u3', action: 'bill.create', entity_type: 'bill', entity_id: 'bl_demo', summary: 'Mohit ne ₹2,450 ka bill banaya', old_value: null, new_value: null, ip: 'demo', branch_id: 'b1', created_at: ago(0.17) },
  { id: 'a2', user_id: 'u2', action: 'stock.out', entity_type: 'product', entity_id: 'p1', summary: 'Mixer grinder stock 3 bacha', old_value: null, new_value: null, ip: 'demo', branch_id: 'b1', created_at: ago(1) },
  { id: 'a3', user_id: 'u4', action: 'repair.status', entity_type: 'repair', entity_id: 'r4', summary: 'Repair #R-1042 completed by Suresh', old_value: null, new_value: null, ip: 'demo', branch_id: 'b1', created_at: ago(2) },
]
export const login_history = []
