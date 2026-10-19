'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const isInitialized = useRef(false)

  useEffect(() => {
    let isMounted = true

    queueMicrotask(() => {
      if (!isMounted) return

      const storedTheme = window.localStorage.getItem('sop-theme')
      const initialTheme = storedTheme === 'dark' ? 'dark' : 'light'
      document.documentElement.dataset.theme = initialTheme
      window.localStorage.setItem('sop-theme', initialTheme)
      setTheme(initialTheme)
      isInitialized.current = true
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isInitialized.current) return

    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('sop-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
