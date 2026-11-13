// Guards the admin page: logged-in users who are not admins are sent back to the home page.
import { Navigate, Outlet } from "react-router"
import { useAuth } from "../context/AuthContext"

export function AdminRoute() {
  const { user } = useAuth()
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/" replace />
}
