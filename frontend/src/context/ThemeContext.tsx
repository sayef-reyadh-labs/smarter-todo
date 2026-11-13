// Shares dark mode with any component through useContext; the choice is kept in localStorage.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type ThemeContextValue = {
  darkMode: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "theme"

// A saved choice wins; otherwise follow the operating system.
const initialDarkMode = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) return saved === "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(initialDarkMode)
  const toggleDark = () => setDarkMode((prev) => !prev)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, darkMode ? "dark" : "light")
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light"
  }, [darkMode])

  return <ThemeContext.Provider value={{ darkMode, toggleDark }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
