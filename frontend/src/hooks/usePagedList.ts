// One page of a list whose page and filters live in the page address, so a filtered view can be bookmarked and the back button works.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import type { Page } from "../types/page"

type Fetcher<T, F> = (offset: number, limit: number, filters: F) => Promise<Page<T>>

type Options<F> = {
  prefix: string // keeps the parameters of different lists apart, e.g. "t_status"
  keys: readonly (keyof F & string)[]
  pageSize?: number
  poll?: { ms: number; enabled: boolean } // refetch quietly (no spinner) while enabled
}

export function usePagedList<T, F extends object>(fetcher: Fetcher<T, F>, { prefix, keys, pageSize = 10, poll }: Options<F>) {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<Page<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const latest = useRef(0)

  // Only this list's own parameters decide when to reload, not the rest of the address.
  const signature = [`${prefix}_page`, ...keys.map((k) => `${prefix}_${k}`)].map((name) => params.get(name) ?? "").join("\u0001")
  const page = Math.max(1, Number(params.get(`${prefix}_page`)) || 1)
  const filters = useMemo(() => {
    const found: Record<string, string> = {}
    for (const key of keys) {
      const value = params.get(`${prefix}_${key}`)
      if (value) found[key] = value
    }
    return found as F
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const load = useCallback(
    async (p: number, f: F, silent = false) => {
      const id = ++latest.current
      if (!silent) setLoading(true)
      try {
        const result = await fetcher((p - 1) * pageSize, pageSize, f)
        if (id !== latest.current) return
        setData(result)
        setError("")
      } catch (err) {
        if (id === latest.current && !silent) setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        if (id === latest.current) setLoading(false)
      }
    },
    [fetcher, pageSize],
  )

  useEffect(() => {
    load(page, filters)
  }, [load, page, filters])

  const pollMs = poll?.ms
  const polling = poll?.enabled ?? false
  useEffect(() => {
    if (!pollMs || !polling) return
    const timer = setInterval(() => {
      if (!document.hidden) load(page, filters, true)
    }, pollMs)
    return () => clearInterval(timer)
  }, [load, page, filters, pollMs, polling])

  const write = (change: (next: URLSearchParams) => void) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        change(next)
        return next
      },
      { replace: true },
    )

  // Changing a filter goes back to the first page.
  const changeFilters = (patch: Partial<F>) =>
    write((next) => {
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(`${prefix}_${key}`, String(value))
        else next.delete(`${prefix}_${key}`)
      }
      next.delete(`${prefix}_page`)
    })

  const setPage = (p: number) =>
    write((next) => {
      if (p > 1) next.set(`${prefix}_page`, String(p))
      else next.delete(`${prefix}_page`)
    })

  const reload = () => load(page, filters)

  return { data, page, setPage, filters, changeFilters, loading, error, reload, pageSize }
}
