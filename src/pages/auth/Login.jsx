import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import { login, resetDemo, createFirstOwner, useDB } from '../../lib/api'
import { IS_DEMO } from '../../lib/config'
import { useToast } from '../../components/ui/Toast'
import { Field } from '../../components/ui'

const schema = z.object({ email: z.string().email('Sahi email daalein'), password: z.string().min(4, 'Password chhota hai') })
const DEMO = [['OWNER', 'owner@demo.nhu', 'owner123'], ['MANAGER', 'manager@demo.nhu', 'manager123'], ['STAFF', 'staff@demo.nhu', 'staff123'], ['TECHNICIAN', 'tech@demo.nhu', 'tech123']]

export default function Login({ mode }) {
  const nav = useNavigate(); const toast = useToast()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(mode ? z.object({ email: z.string().email('Sahi email daalein'), password: z.string().optional() }) : schema) })
  const noUsers = useDB((st) => st.users.length === 0)
  const submit = (d) => {
    if (!IS_DEMO && noUsers) { try { createFirstOwner('Owner', d.email, d.password); login(d.email, d.password); return nav('/') } catch (e) { return toast(e.message, 'err') } }
    if (mode) return toast('DEMO: email nahi bheji jaati. Production mein reset link email/SMS se aayega.', 'ok')
    try { const u = login(d.email, d.password); nav(u.role === 'TECHNICIAN' ? '/repairs' : '/') } catch (e) { toast(e.message, 'err') }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-2"><img src="/logo.svg" alt="Nandlal Hometech" className="h-12 w-12 rounded-xl" /><div><p className="font-serif text-xl">NANDLAL HOMETECH & UTILITY</p><p className="text-xs text-ink2">Admin Dashboard · Basti, UP</p></div></div>
        <form onSubmit={handleSubmit(submit)} className="card space-y-3">
          <p className="rounded-lg bg-brass/15 p-2 text-xs text-brass-hover">{IS_DEMO ? 'DEMO build. Data sirf is browser mein hai. Yeh production security nahi hai.' : noUsers ? 'Pehli baar setup: jo email/password daaloge wahi OWNER ban jayega (abhi sirf is browser mein, real server auth baaki).' : 'Data abhi sirf is browser mein hai. Real server login backend ke baad.'}</p>
          <Field label="Email" error={errors.email}><input className="input" {...register('email')} autoComplete="username" /></Field>
          {mode !== 'forgot' && <Field label={mode === 'reset' ? 'Naya password' : 'Password'} error={errors.password}><input type="password" className="input" {...register('password')} autoComplete="current-password" /></Field>}
          <button className="btn btn-primary w-full">{mode === 'forgot' ? 'Reset link bhejein' : mode === 'reset' ? 'Password badlein' : 'Login'}</button>
          <div className="flex justify-between text-xs">{mode ? <Link to="/login" className="text-brass-hover">Login par wapas</Link> : <Link to="/forgot-password" className="text-brass-hover">Password bhool gaye?</Link>}</div>
        </form>
        {!mode && IS_DEMO && (
          <div className="card mt-4">
            <p className="mb-2 text-xs font-medium text-ink2">Demo logins (tap to fill)</p>
            <div className="grid grid-cols-2 gap-2">{DEMO.map(([r, e, p]) => <button key={r} type="button" className="btn btn-ghost !justify-start text-xs" onClick={() => { setValue('email', e); setValue('password', p) }}>{r}</button>)}</div>
            <button className="mt-3 text-xs text-danger underline" onClick={() => { if (confirm('Demo data reset karein?')) { resetDemo(); toast('Demo data reset ho gaya') } }}>Reset demo data</button>
          </div>
        )}
      </div>
    </div>
  )
}
