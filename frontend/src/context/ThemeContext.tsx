// Shares dark mode with any component through useContext, so it is not passed down as props.
import { createContext, useContext, useState, type ReactNode } from "react"

type ThemeContextValue = {
  darkMode: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const toggleDark = () => setDarkMode((prev) => !prev)

  return <ThemeContext.Provider value={{ darkMode, toggleDark }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
