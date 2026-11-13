// Live feedback while choosing a password: a strength bar and a checklist of what is still missing. Only advice; the server enforces just the length.
import { CheckCircleFilled, MinusCircleOutlined } from "@ant-design/icons"
import { Flex, Progress, Typography, theme } from "antd"

const RULES = [
  { label: "8 or more characters", test: (p: string) => p.length >= 8 },
  { label: "Upper and lower case letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const LEVELS = ["Too weak", "Weak", "Fair", "Good", "Strong"]

export function PasswordStrength({ password }: { password: string }) {
  const { token } = theme.useToken()
  const passed = RULES.map((rule) => rule.test(password))
  const score = passed.filter(Boolean).length
  const colors = [token.colorError, token.colorError, token.colorWarning, token.colorSuccess, token.colorSuccess]

  return (
    <div aria-live="polite" style={{ marginTop: 4 }}>
      <Flex align="center" gap={12}>
        <Progress percent={password ? score * 25 : 0} steps={4} size={[34, 6]} showInfo={false} strokeColor={colors[score]} style={{ margin: 0 }} aria-label="Password strength" />
        <Typography.Text type="secondary" style={{ fontSize: 13, minWidth: 64 }}>
          {password ? LEVELS[score] : ""}
        </Typography.Text>
      </Flex>
      <Flex wrap gap="2px 16px" style={{ marginTop: 6 }}>
        {RULES.map((rule, i) => (
          <Typography.Text key={rule.label} type={passed[i] ? "success" : "secondary"} style={{ fontSize: 13 }}>
            {passed[i] ? <CheckCircleFilled /> : <MinusCircleOutlined />} {rule.label}
          </Typography.Text>
        ))}
      </Flex>
    </div>
  )
}
