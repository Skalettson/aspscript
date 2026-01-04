/**
 * AspScript Theme Engine v1.2.0
 * Design System и Theme Management
 * Современный JavaScript 2026 стандарты
 */

// ============================================================================
// DESIGN TOKENS
// ============================================================================

/**
 * Design tokens configuration
 */
export const defaultTheme = {
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
    success: '#48bb78',
    warning: '#ed8936',
    error: '#f56565',
    info: '#4299e1',
    text: {
      primary: '#1a202c',
      secondary: '#718096',
      tertiary: '#a0aec0'
    },
    bg: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#edf2f7'
    },
    border: {
      default: '#e2e8f0',
      light: '#f1f5f9'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1.25rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.375rem',
      '2xl': '1.75rem',
      '3xl': '2.25rem',
      '4xl': '3rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 25px rgba(0, 0, 0, 0.15)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.2)'
  },
  transitions: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    base: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.5s cubic-bezier(0.4, 0, 0.2, 1)'
  }
}

/**
 * Dark theme
 */
export const darkTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    text: {
      primary: '#f7fafc',
      secondary: '#cbd5e0',
      tertiary: '#a0aec0'
    },
    bg: {
      primary: '#1a202c',
      secondary: '#2d3748',
      tertiary: '#4a5568'
    },
    border: {
      default: '#4a5568',
      light: '#2d3748'
    }
  }
}

// ============================================================================
// THEME PROVIDER
// ============================================================================

/**
 * Theme Provider - управляет темой приложения
 */
export class ThemeProvider {
  #currentTheme = defaultTheme
  #listeners = new Set()
  #mode = 'light'

  constructor(initialTheme = defaultTheme) {
    this.#currentTheme = initialTheme
    this.applyTheme(initialTheme)
  }

  /**
   * Устанавливает тему
   */
  setTheme(theme) {
    this.#currentTheme = { ...defaultTheme, ...theme }
    this.applyTheme(this.#currentTheme)
    this.#notifyListeners()
  }

  /**
   * Устанавливает режим (light/dark)
   */
  setMode(mode) {
    this.#mode = mode
    const theme = mode === 'dark' ? darkTheme : defaultTheme
    this.setTheme(theme)
  }

  /**
   * Переключает режим
   */
  toggleMode() {
    this.setMode(this.#mode === 'light' ? 'dark' : 'light')
  }

  /**
   * Получает текущую тему
   */
  getTheme() {
    return { ...this.#currentTheme }
  }

  /**
   * Получает текущий режим
   */
  getMode() {
    return this.#mode
  }

  /**
   * Применяет тему через CSS переменные
   */
  applyTheme(theme) {
    if (typeof globalThis.document === 'undefined') return

    const root = document.documentElement
    const mode = this.#mode

    // Применяем цвета
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue)
        })
      } else {
        root.style.setProperty(`--color-${key}`, value)
      }
    })

    // Применяем spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })

    // Применяем typography
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })

    // Устанавливаем data-theme атрибут
    root.setAttribute('data-theme', mode)
  }

  /**
   * Подписывается на изменения темы
   */
  subscribe(listener) {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /**
   * Уведомляет слушателей
   */
  #notifyListeners() {
    this.#listeners.forEach(listener => {
      try {
        listener(this.#currentTheme, this.#mode)
      } catch (error) {
        console.error('Theme listener error:', error)
      }
    })
  }
}

// Глобальный провайдер темы
let globalThemeProvider = null

/**
 * Создает или получает глобальный ThemeProvider
 */
export function createThemeProvider(initialTheme) {
  if (!globalThemeProvider) {
    globalThemeProvider = new ThemeProvider(initialTheme)
  }
  return globalThemeProvider
}

/**
 * Получает глобальный ThemeProvider
 */
export function getThemeProvider() {
  if (!globalThemeProvider) {
    globalThemeProvider = new ThemeProvider()
  }
  return globalThemeProvider
}

/**
 * Хук для использования темы в компонентах
 */
export function useTheme() {
  const provider = getThemeProvider()
  return {
    theme: provider.getTheme(),
    mode: provider.getMode(),
    setTheme: (theme) => provider.setTheme(theme),
    setMode: (mode) => provider.setMode(mode),
    toggleMode: () => provider.toggleMode()
  }
}

// ============================================================================
// CSS VARIABLES GENERATION
// ============================================================================

/**
 * Генерирует CSS переменные из темы
 */
export function generateCSSVariables(theme) {
  const variables = []

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([subKey, subValue]) => {
        variables.push(`--color-${key}-${subKey}: ${subValue};`)
      })
    } else {
      variables.push(`--color-${key}: ${value};`)
    }
  })

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    variables.push(`--spacing-${key}: ${value};`)
  })

  // Typography
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    variables.push(`--font-size-${key}: ${value};`)
  })

  return `:root {\n  ${variables.join('\n  ')}\n}`
}

/**
 * Генерирует полный CSS с темой
 */
export function generateThemeCSS(theme, selector = ':root') {
  return `<style>
${selector} {
  ${generateCSSVariables(theme).split('\n').slice(1).join('\n  ')}
}
</style>`
}

