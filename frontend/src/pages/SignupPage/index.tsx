// Signup form; a new account is logged in right away.
import { Alert, Button, Form, Input, Typography } from "antd"
import { useState } from "react"
import { Link, Navigate } from "react-router"
import { useAuth } from "../../context/AuthContext"
import type { SignupInput } from "../../types/auth"
import { emailRules, nameRules, newPasswordRules } from "../../utils/authForm"

type SignupValues = SignupInput & { confirm: string }

export function SignupPage() {
  const { user, signup } = useAuth()
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleFinish = async ({ confirm: _confirm, ...values }: SignupValues) => {
    setError("")
    setSubmitting(true)
    try {
      await signup(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Typography.Title level={2}>Sign up</Typography.Title>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={handleFinish}>
        <Form.Item label="Name" name="name" rules={nameRules}>
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={emailRules}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={newPasswordRules}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Confirm password"
          name="confirm"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Confirm your password" },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("Passwords do not match")),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Create account
        </Button>
      </Form>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </Typography.Paragraph>
    </>
  )
}
