// Loads one page of a list and reloads it when the page or a filter changes; a newer request wins over an older one.
import { useCallback, useEffect, useRef, useState } from "react"
import type { Page } from "../types/page"

type Fetcher<T, F> = (offset: number, limit: number, filters: F) => Promise<Page<T>>

export function usePagedList<T, F>(fetcher: Fetcher<T, F>, initialFilters: F, pageSize = 10) {
  const [data, setData] = useState<Page<T> | null>(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<F>(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const latest = useRef(0)

  const load = useCallback(
    async (p: number, f: F) => {
      const id = ++latest.current
      setLoading(true)
      try {
        const result = await fetcher((p - 1) * pageSize, pageSize, f)
        if (id !== latest.current) return
        setData(result)
        setError("")
      } catch (err) {
        if (id === latest.current) setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        if (id === latest.current) setLoading(false)
      }
    },
    [fetcher, pageSize],
  )

  useEffect(() => {
    load(page, filters)
  }, [load, page, filters])

  // Changing a filter goes back to the first page.
  const changeFilters = (patch: Partial<F>) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const reload = () => load(page, filters)

  return { data, page, setPage, filters, changeFilters, loading, error, reload, pageSize }
}
