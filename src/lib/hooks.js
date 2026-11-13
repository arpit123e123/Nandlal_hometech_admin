import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDB } from './api'
import { useToast } from '../components/ui/Toast'

// Re-run query whenever the demo DB changes (stand-in for server refetch).
export function useApi(key, fn, deps = []) {
  const session = useDB((s) => s.session)
  const rev = useDB((s) => s.activity_logs.length + s.notifications.length + s.products.length + s.bills.length)
  return useQuery({ queryKey: [key, session, rev, ...deps], queryFn: async () => fn(), retry: false, staleTime: 0, networkMode: 'always' })
}
export function useAct(fn, okMsg) {
  const qc = useQueryClient(); const toast = useToast()
  return useMutation({
    mutationFn: async (a) => fn(...(Array.isArray(a) ? a : [a])),
    onSuccess: (r) => { qc.invalidateQueries(); if (okMsg) toast(okMsg, 'ok'); return r },
    onError: (e) => toast(e.message || 'Error', 'err'),
    networkMode: 'always',
  })
}
