// Button that downloads a CSV from the API and reports a failure.
import { DownloadOutlined } from "@ant-design/icons"
import { App as AntApp, Button } from "antd"
import { useState } from "react"

type Props = {
  onExport: () => Promise<void>
  label?: string
}

export function ExportButton({ onExport, label = "Export CSV" }: Props) {
  const { message } = AntApp.useApp()
  const [busy, setBusy] = useState(false)

  const click = async () => {
    setBusy(true)
    try {
      await onExport()
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Export failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button icon={<DownloadOutlined />} loading={busy} onClick={click}>
      {label}
    </Button>
  )
}
