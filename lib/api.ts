'use client'
import { useCallback, useEffect, useState } from 'react'
export async function call<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init)
  if (r.status === 401) throw Object.assign(new Error('Please sign in'), { auth: true })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Request failed')
  return j
}
export const post = (u: string, b: any, m = 'POST') => call(u, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState<any>(null), [loading, setLoading] = useState(!!url)
  const reload = useCallback(() => { if (!url) return; setLoading(true); call<T>(url).then(d => { setData(d); setError(null) }).catch(setError).finally(() => setLoading(false)) }, [url])
  useEffect(reload, [reload])
  return { data, error, loading, reload }
}
