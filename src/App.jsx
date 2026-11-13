import { Routes, Route, Navigate } from 'react-router-dom'
import { useDB, me } from './lib/api'
import { can } from './lib/rbac'
import Layout from './components/layout/Layout'
import { Denied } from './components/ui'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import { Products, ProductForm, ProductView } from './pages/products/Products'
import { Categories } from './pages/categories/Categories'
import { Inventory, Movements, LowStock, Purchases, PurchaseNew, Suppliers, SupplierDetail } from './pages/inventory/Inventory'
import { BillList, POS, BillView, Udhaar } from './pages/billing/Billing'
import { RepairList, RepairNew, RepairDetail } from './pages/repairs/Repairs'
import { Customers, CustomerForm, CustomerDetail } from './pages/customers/Customers'
import Reports from './pages/reports/Reports'
import { SettingsPage } from './pages/settings/Settings'
import Activity from './pages/activity/Activity'

function Guard({ perm, children }) {
  const user = useDB((s) => s.users.find((u) => u.id === s.session))
  if (!user) return <Navigate to="/login" replace />
  if (perm && ![].concat(perm).some((p) => can(user.role, p))) return <Denied />
  return children
}
const G = (perm, el) => <Guard perm={perm}>{el}</Guard>

export default function App() {
  const user = useDB((s) => s.users.find((u) => u.id === s.session))
  const home = user && !can(user.role, 'dashboard') ? <Navigate to="/repairs" replace /> : G('dashboard', <Dashboard />)
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<Login mode="forgot" />} />
      <Route path="/reset-password" element={<Login mode="reset" />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={home} />
        <Route path="products" element={G('products.view', <Products />)} />
        <Route path="products/new" element={G('products.write', <ProductForm />)} />
        <Route path="products/:id" element={G('products.view', <ProductView />)} />
        <Route path="products/:id/edit" element={G('products.write', <ProductForm />)} />
        <Route path="categories" element={G('products.view', <Categories />)} />
        <Route path="categories/new" element={G('categories.write', <Categories open="new" />)} />
        <Route path="categories/:id/edit" element={G('categories.write', <Categories open="edit" />)} />
        <Route path="inventory" element={G('inventory.view', <Inventory />)} />
        <Route path="inventory/movements" element={G('inventory.view', <Movements />)} />
        <Route path="inventory/low-stock" element={G('inventory.view', <LowStock />)} />
        <Route path="inventory/purchases" element={G('suppliers.view', <Purchases />)} />
        <Route path="inventory/purchases/new" element={G('purchases.write', <PurchaseNew />)} />
        <Route path="inventory/suppliers" element={G('suppliers.view', <Suppliers />)} />
        <Route path="inventory/suppliers/:id" element={G('suppliers.view', <SupplierDetail />)} />
        <Route path="billing" element={G('billing.view', <BillList />)} />
        <Route path="billing/new" element={G('billing.create', <POS />)} />
        <Route path="billing/udhaar" element={G('udhaar.view', <Udhaar />)} />
        <Route path="billing/:id" element={G('billing.view', <BillView />)} />
        <Route path="repairs" element={G(['repairs.all', 'repairs.assigned'], <RepairList />)} />
        <Route path="repairs/kanban" element={G(['repairs.all', 'repairs.assigned'], <RepairList kanban />)} />
        <Route path="repairs/new" element={G('repairs.create', <RepairNew />)} />
        <Route path="repairs/:id" element={G(['repairs.all', 'repairs.assigned'], <RepairDetail />)} />
        <Route path="customers" element={G('customers.view', <Customers />)} />
        <Route path="customers/new" element={G('customers.write', <CustomerForm />)} />
        <Route path="customers/:id" element={G('customers.view', <CustomerDetail />)} />
        <Route path="reports" element={G('reports.view', <Reports tab="sales" />)} />
        {['sales', 'inventory', 'customers', 'repairs', 'gst'].map((t) => <Route key={t} path={'reports/' + t} element={G('reports.view', <Reports tab={t} />)} />)}
        <Route path="settings" element={G('settings', <SettingsPage tab="business" />)} />
        {['business', 'billing', 'notifications', 'users', 'branches', 'backup'].map((t) => <Route key={t} path={'settings/' + t} element={G('settings', <SettingsPage tab={t} />)} />)}
        <Route path="activity" element={G(['activity.all', 'activity.branch', 'activity.own'], <Activity />)} />
        <Route path="*" element={<Denied what="Yeh page nahi mila (404). Ya woh" />} />
      </Route>
    </Routes>
  )
}
