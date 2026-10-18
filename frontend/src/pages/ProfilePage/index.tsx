// Profile page: change your name, or change your password (which logs you out everywhere).
import { App as AntApp, Button, Divider, Form, Input, Typography } from "antd"
import { useState } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "../../context/AuthContext"
import { apiService } from "../../services/api"
import { nameRules, newPasswordRules } from "../../utils/authForm"

type PasswordValues = { current_password: string; new_password: string; confirm: string }

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function ProfilePage() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [savingName, setSavingName] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  if (!user) return null

  const saveName = async ({ name }: { name: string }) => {
    setSavingName(true)
    try {
      setUser(await apiService.updateMe(name.trim()))
      message.success("Name updated")
    } catch (err) {
      message.error(messageOf(err))
    } finally {
      setSavingName(false)
    }
  }

  const changePassword = async ({ current_password, new_password }: PasswordValues) => {
    setSavingPassword(true)
    try {
      await apiService.changePassword({ current_password, new_password })
      // The server revoked every session, so log in again with the new password.
      await logout()
      message.success("Password changed. Please log in again.")
      navigate("/login", { replace: true })
    } catch (err) {
      message.error(messageOf(err))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <Typography.Title level={2}>Profile</Typography.Title>
      <Form layout="vertical" initialValues={{ email: user.email, name: user.name }} onFinish={saveName}>
        <Form.Item label="Email" name="email">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Name" name="name" rules={nameRules}>
          <Input autoComplete="name" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={savingName}>
          Save name
        </Button>
      </Form>

      <Divider />

      <Typography.Title level={4}>Change password</Typography.Title>
      <Form layout="vertical" onFinish={changePassword}>
        <Form.Item label="Current password" name="current_password" rules={[{ required: true, message: "Enter your current password" }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item label="New password" name="new_password" rules={newPasswordRules}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Confirm new password"
          name="confirm"
          dependencies={["new_password"]}
          rules={[
            { required: true, message: "Confirm your new password" },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue("new_password") === value ? Promise.resolve() : Promise.reject(new Error("Passwords do not match")),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={savingPassword}>
          Change password
        </Button>
      </Form>
    </>
  )
}
