import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('glamp-theme')
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('fast-theme')
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('fast-theme')
      })
    })
    localStorage.setItem('glamp-theme', theme)
  }, [theme])

  function toggle() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
