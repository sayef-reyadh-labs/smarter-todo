// A paginated list from the API: one page of items plus the total count.
export type Page<T> = {
  items: T[]
  total: number
  offset: number
  limit: number
}
