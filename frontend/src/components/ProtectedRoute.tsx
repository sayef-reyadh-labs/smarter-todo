// Guards the pages inside it: a guest is sent to /login and comes back after logging in.
import { Spin } from "antd"
import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "../context/AuthContext"

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spin size="large" style={{ display: "block", margin: "64px auto" }} />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
