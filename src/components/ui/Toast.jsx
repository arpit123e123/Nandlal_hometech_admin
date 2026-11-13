import { createContext, useContext, useState, useCallback } from 'react'
const Ctx = createContext(() => {})
export const useToast = () => useContext(Ctx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random()
    setItems((x) => [...x, { id, msg, kind }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 flex-col gap-2 no-print">
        {items.map((i) => (
          <div key={i.id} className={`rounded-lg px-4 py-2 text-sm text-white shadow-lg ${i.kind === 'err' ? 'bg-danger' : 'bg-ok'}`}>{i.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
