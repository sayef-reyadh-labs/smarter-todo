// Text box that waits until the user stops typing before it reports the text.
import { SearchOutlined } from "@ant-design/icons"
import { Input } from "antd"
import { useEffect, useState } from "react"

type Props = {
  placeholder: string
  onSearch: (text: string | undefined) => void
  width?: number
}

export function SearchInput({ placeholder, onSearch, width = 220 }: Props) {
  const [text, setText] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => onSearch(text.trim() || undefined), 350)
    return () => clearTimeout(timer)
    // onSearch changes on every render of the parent; only the text should restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      style={{ width }}
      aria-label={placeholder}
    />
  )
}
