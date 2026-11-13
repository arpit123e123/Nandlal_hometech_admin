export const inr = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(Number(n) || 0) ? 0 : 2 })
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9)
export const slugify = (s = '') => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-')
export const dayKey = (d) => new Date(d).toISOString().slice(0, 10)
export const daysAgo = (n) => new Date(Date.now() - n * 864e5)
export const isToday = (d) => new Date(d).toDateString() === new Date().toDateString()
export const ymd = (d = new Date()) => { const x = new Date(d); return x.getFullYear() * 100 + x.getMonth() + 1 }

export function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (m < 1) return 'abhi abhi'
  if (m < 60) return `${m} min pehle`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ghante pehle`
  return `${Math.floor(h / 24)} din pehle`
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const two = (n) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''))
const three = (n) => (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n))
function wordsEn(n) {
  if (n === 0) return 'Zero'
  const parts = []
  const cr = Math.floor(n / 1e7); n %= 1e7
  const lk = Math.floor(n / 1e5); n %= 1e5
  const th = Math.floor(n / 1e3); n %= 1e3
  if (cr) parts.push(three(cr) + ' Crore')
  if (lk) parts.push(two(lk) + ' Lakh')
  if (th) parts.push(two(th) + ' Thousand')
  if (n) parts.push(three(n))
  return parts.join(' ')
}
const hi = 'शून्य,एक,दो,तीन,चार,पाँच,छह,सात,आठ,नौ,दस,ग्यारह,बारह,तेरह,चौदह,पंद्रह,सोलह,सत्रह,अठारह,उन्नीस,बीस,इक्कीस,बाईस,तेईस,चौबीस,पच्चीस,छब्बीस,सत्ताईस,अट्ठाईस,उनतीस,तीस,इकतीस,बत्तीस,तैंतीस,चौंतीस,पैंतीस,छत्तीस,सैंतीस,अड़तीस,उनतालीस,चालीस,इकतालीस,बयालीस,तैंतालीस,चौवालीस,पैंतालीस,छियालीस,सैंतालीस,अड़तालीस,उनचास,पचास,इक्यावन,बावन,तिरपन,चौवन,पचपन,छप्पन,सत्तावन,अट्ठावन,उनसठ,साठ,इकसठ,बासठ,तिरसठ,चौंसठ,पैंसठ,छियासठ,सड़सठ,अड़सठ,उनहत्तर,सत्तर,इकहत्तर,बहत्तर,तिहत्तर,चौहत्तर,पचहत्तर,छिहत्तर,सतहत्तर,अठहत्तर,उन्यासी,अस्सी,इक्यासी,बयासी,तिरासी,चौरासी,पचासी,छियासी,सत्तासी,अट्ठासी,नवासी,नब्बे,इक्यानवे,बानवे,तिरानवे,चौरानवे,पचानवे,छियानवे,सत्तानवे,अट्ठानवे,निन्यानवे'.split(',')
function wordsHi(n) {
  if (n === 0) return 'शून्य'
  const parts = []
  const cr = Math.floor(n / 1e7); n %= 1e7
  const lk = Math.floor(n / 1e5); n %= 1e5
  const th = Math.floor(n / 1e3); n %= 1e3
  const h = Math.floor(n / 100); n %= 100
  if (cr) parts.push(hi[cr] + ' करोड़')
  if (lk) parts.push(hi[lk] + ' लाख')
  if (th) parts.push(hi[th] + ' हज़ार')
  if (h) parts.push(hi[h] + ' सौ')
  if (n) parts.push(hi[n])
  return parts.join(' ')
}
export function amountInWords(amount) {
  const r = Math.floor(amount), p = Math.round((amount - r) * 100)
  return {
    en: 'Rupees ' + wordsEn(r) + (p ? ' and ' + two(p) + ' Paise' : '') + ' Only',
    hi: wordsHi(r) + ' रुपये' + (p ? ' ' + hi[p] + ' पैसे' : '') + ' मात्र',
  }
}

export function downloadFile(name, content, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function toCSV(rows) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
}
export const exportCSV = (name, rows) => downloadFile(name + '.csv', toCSV(rows))

// GST calculation. items: [{qty, price, discount (₹ on line), gst_rate}]
export function calcBill(items, billDiscount = 0, inclusive = false) {
  const nets = items.map((i) => Math.max(0, i.qty * i.price - (i.discount || 0)))
  const sumNet = nets.reduce((a, b) => a + b, 0)
  const bd = Math.min(billDiscount || 0, sumNet)
  let subtotal = 0, gst = 0, lineDiscSum = 0
  const lines = items.map((i, idx) => {
    const share = sumNet ? (nets[idx] / sumNet) * bd : 0
    const net = nets[idx] - share
    const r = Number(i.gst_rate) || 0
    const taxable = inclusive ? net / (1 + r / 100) : net
    const tax = inclusive ? net - taxable : (net * r) / 100
    subtotal += taxable; gst += tax; lineDiscSum += (i.discount || 0) + share
    return { ...i, taxable: round2(taxable), tax: round2(tax), total: round2(taxable + tax) }
  })
  const raw = subtotal + gst
  const grand = Math.round(raw)
  return { lines, subtotal: round2(subtotal), discount_total: round2(lineDiscSum), gst_total: round2(gst), cgst: round2(gst / 2), sgst: round2(gst / 2), roundoff: round2(grand - raw), grand_total: grand }
}
export const round2 = (n) => Math.round(n * 100) / 100
