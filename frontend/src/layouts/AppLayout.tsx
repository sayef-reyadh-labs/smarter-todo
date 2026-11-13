// Page frame: header with navigation, the user menu and the dark-mode switch, then the current page through <Outlet />.
import { Button, Layout, Menu, Switch, Typography } from "antd"
import { Link, Outlet, useLocation, useNavigate } from "react-router"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { darkMode, toggleDark } = useTheme()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  const items = user
    ? [
        { key: "/", label: <Link to="/">Home</Link> },
        { key: "/profile", label: <Link to="/profile">Profile</Link> },
        { key: "/about", label: <Link to="/about">About</Link> },
      ]
    : [
        { key: "/login", label: <Link to="/login">Log in</Link> },
        { key: "/signup", label: <Link to="/signup">Sign up</Link> },
        { key: "/about", label: <Link to="/about">About</Link> },
      ]

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Typography.Text strong style={{ fontSize: 18, color: "white" }}>
          Smarter Todo
        </Typography.Text>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[pathname.startsWith("/tasks") ? "/" : pathname]}
          style={{ flex: 1, minWidth: 0 }}
          items={items}
        />
        {user && (
          <>
            <Typography.Text style={{ color: "white" }}>{user.name}</Typography.Text>
            <Button size="small" onClick={handleLogout}>
              Log out
            </Button>
          </>
        )}
        <Switch checked={darkMode} onChange={toggleDark} checkedChildren="Dark" unCheckedChildren="Light" />
      </Layout.Header>
      <Layout.Content style={{ maxWidth: 720, width: "100%", margin: "0 auto", padding: "32px 16px" }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
