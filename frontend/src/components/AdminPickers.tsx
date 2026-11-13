// Searchable pickers for the admin filters: type to search users or groups on the server.
import { Select } from "antd"
import { useCallback, useEffect, useRef, useState } from "react"
import { apiService } from "../services/api"

type Option = { value: string; label: string }

type Props = {
  value: string | undefined
  onChange: (id: string | undefined) => void
  placeholder: string
  width?: number
}

type RemoteProps = Props & {
  load: (text: string) => Promise<Option[]>
  resolve: (id: string) => Promise<Option>
}

function RemoteSelect({ value, onChange, placeholder, load, resolve, width = 220 }: RemoteProps) {
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

  // A value from the page address may not be among the first results: look up its name.
  useEffect(() => {
    if (!value || options.some((o) => o.value === value)) return
    resolve(value)
      .then((option) => setOptions((prev) => (prev.some((o) => o.value === option.value) ? prev : [option, ...prev])))
      .catch(() => undefined)
  }, [value, options, resolve])

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

const resolveUser = async (id: string) => {
  const { user } = await apiService.getAdminUser(id)
  return { value: user.id, label: `${user.name} (${user.email})` }
}

const loadGroups = async (text: string) =>
  (await apiService.getAdminGroups(0, 20, { q: text || undefined })).items.map((g) => ({ value: g.id, label: g.name }))

const resolveGroup = async (id: string) => {
  const group = await apiService.getAdminGroup(id)
  return { value: group.id, label: group.name }
}

export const UserPicker = (props: Props) => <RemoteSelect {...props} load={loadUsers} resolve={resolveUser} />

export const GroupPicker = (props: Props) => <RemoteSelect {...props} load={loadGroups} resolve={resolveGroup} />
