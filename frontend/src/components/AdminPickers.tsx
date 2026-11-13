// Searchable pickers for the admin filters: type to search users or groups on the server.
import { Select } from "antd"
import { useCallback, useEffect, useRef, useState } from "react"
import { apiService } from "../services/api"

type Option = { value: string; label: string }

type Props = {
  value: string | undefined
  onChange: (id: string | undefined) => void
  placeholder: string
  load: (text: string) => Promise<Option[]>
  width?: number
}

function RemoteSelect({ value, onChange, placeholder, load, width = 220 }: Props) {
  const [options, setOptions] = useState<Option[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const search = useCallback(
    (text: string) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => load(text).then(setOptions).catch(() => setOptions([])), 300)
    },
    [load],
  )

  useEffect(() => {
    load("").then(setOptions).catch(() => setOptions([]))
  }, [load])

  return (
    <Select
      allowClear
      showSearch={{ filterOption: false, onSearch: search }}
      placeholder={placeholder}
      value={value}
      options={options}
      onChange={(id) => onChange(id)}
      style={{ width }}
      aria-label={placeholder}
    />
  )
}

const loadUsers = async (text: string) =>
  (await apiService.getAdminUsers(0, 20, { q: text || undefined })).items.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))

const loadGroups = async (text: string) =>
  (await apiService.getAdminGroups(0, 20, { q: text || undefined })).items.map((g) => ({ value: g.id, label: g.name }))

export const UserPicker = (props: Omit<Props, "load">) => <RemoteSelect {...props} load={loadUsers} />

export const GroupPicker = (props: Omit<Props, "load">) => <RemoteSelect {...props} load={loadGroups} />
