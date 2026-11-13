// Signup form with live feedback (password strength, matching passwords); a new account is logged in right away.
import { CheckCircleFilled } from "@ant-design/icons"
import { Button, Form, Input, Typography } from "antd"
import { useState } from "react"
import { Link, Navigate } from "react-router"
import { AuthCard } from "../../components/AuthCard"
import { PasswordStrength } from "../../components/PasswordStrength"
import { useAuth } from "../../context/AuthContext"
import type { SignupInput } from "../../types/auth"
import { emailRules, nameRules, newPasswordRules } from "../../utils/authForm"

type SignupValues = SignupInput & { confirm: string }

export function SignupPage() {
  const { user, signup } = useAuth()
  const [form] = Form.useForm<SignupValues>()
  const password = Form.useWatch("password", form) ?? ""
  const confirm = Form.useWatch("confirm", form) ?? ""
  const [error, setError] = useState("")
  const [failures, setFailures] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleFinish = async ({ confirm: _confirm, ...values }: SignupValues) => {
    setError("")
    setSubmitting(true)
    try {
      await signup(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setFailures((n) => n + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const validateOn = ["onBlur", "onChange"]

  return (
    <AuthCard
      title="Sign up"
      subtitle="Create an account to keep your own tasks and join groups."
      error={error}
      errorKey={failures}
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item label="Name" name="name" rules={nameRules} validateTrigger={validateOn} validateFirst hasFeedback>
          <Input size="large" autoComplete="name" autoFocus />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={emailRules} validateTrigger={validateOn} validateFirst hasFeedback>
          <Input size="large" autoComplete="email" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={newPasswordRules} extra={<PasswordStrength password={password} />}>
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Confirm password"
          name="confirm"
          dependencies={["password"]}
          extra={
            confirm !== "" && confirm === password ? (
              <Typography.Text type="success">
                <CheckCircleFilled /> Passwords match
              </Typography.Text>
            ) : undefined
          }
          rules={[
            { required: true, message: "Confirm your password" },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("Passwords do not match")),
            }),
          ]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          Create account
        </Button>
      </Form>
    </AuthCard>
  )
}
