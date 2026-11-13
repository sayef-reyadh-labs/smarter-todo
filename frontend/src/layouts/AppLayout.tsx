// Page frame: sticky header with navigation, account menu and theme switch, the current page through <Outlet />, and a footer.
import { CheckSquareOutlined, LogoutOutlined, MoonOutlined, SunOutlined, UserOutlined } from "@ant-design/icons"
import { Avatar, Button, Dropdown, Layout, Menu, theme } from "antd"
import { Link, Outlet, useLocation, useNavigate } from "react-router"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

// Wider pages (the admin tables) get more room than forms and lists.
const widthFor = (pathname: string) => (pathname === "/admin" ? 1200 : 880)

const activeKey = (pathname: string) => {
  if (pathname.startsWith("/tasks")) return "/"
  if (pathname.startsWith("/groups")) return "/groups"
  return pathname
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { darkMode, toggleDark } = useTheme()
  const { user, loading, logout } = useAuth()
  const { token } = theme.useToken()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  // While the session is being restored, show no links instead of flashing the guest ones.
  const items = loading
    ? []
    : user
      ? [
        { key: "/", label: <Link to="/">Home</Link> },
        { key: "/groups", label: <Link to="/groups">Groups</Link> },
        ...(user.role === "admin" ? [{ key: "/admin", label: <Link to="/admin">Admin</Link> }] : []),
        { key: "/about", label: <Link to="/about">About</Link> },
      ]
    : [
        { key: "/login", label: <Link to="/login">Log in</Link> },
        { key: "/signup", label: <Link to="/signup">Sign up</Link> },
        { key: "/about", label: <Link to="/about">About</Link> },
      ]

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Layout.Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 24px",
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Link to="/" className="brand" style={{ color: token.colorText }}>
          <CheckSquareOutlined style={{ color: token.colorPrimary }} /> Smarter Todo
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[activeKey(pathname)]}
          items={items}
          style={{ flex: 1, minWidth: 0, borderBottom: "none", background: "transparent" }}
        />
        <Button
          type="text"
          shape="circle"
          icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleDark}
          aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
        />
        {user && (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                { key: "profile", label: "Profile", icon: <UserOutlined />, onClick: () => navigate("/profile") },
                { type: "divider" },
                { key: "logout", label: "Log out", icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
              ],
            }}
          >
            <Button type="text" aria-label="Account menu">
              <Avatar size="small" style={{ background: token.colorPrimary }}>
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
              <span className="hide-on-mobile">{user.name}</span>
            </Button>
          </Dropdown>
        )}
      </Layout.Header>
      <Layout.Content id="main" style={{ maxWidth: widthFor(pathname), width: "100%", margin: "0 auto", padding: "32px 16px 48px" }}>
        <Outlet />
      </Layout.Content>
      <Layout.Footer style={{ textAlign: "center", color: token.colorTextSecondary }}>Smarter Todo · built by SayefReyadh</Layout.Footer>
    </Layout>
  )
}
