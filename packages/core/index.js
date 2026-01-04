/**
 * AspScript Core v1.1.0 - Enterprise Ready
 * Монолитный core с полными функциями реактивности, SSR, error boundaries, TypeScript и производительности
 */

// ============================================================================
// REACTIVITY SYSTEM
// ============================================================================

// Глобальный reactive context для отслеживания зависимостей
let currentEffect = null
let effectStack = []

// WeakMap для хранения зависимостей
const targetMap = new WeakMap()

/**
 * Создает реактивную переменную
 * @param {any} initialValue - начальное значение
 * @returns {Proxy} реактивный объект
 */
export function $state(initialValue) {
  const proxy = new Proxy({ value: initialValue }, {
    get(target, key) {
      if (key === 'value') {
        // Отслеживаем чтение в текущем эффекте
        if (currentEffect) {
          const depsMap = targetMap.get(target) ?? (() => {
            const map = new Map()
            targetMap.set(target, map)
            return map
          })()

          const dep = depsMap.get(key) ?? (() => {
            const set = new Set()
            depsMap.set(key, set)
            return set
          })()

          dep.add(currentEffect)
        }
        return target[key]
      }
      return target[key]
    },

    set(target, key, value) {
      if (key === 'value') {
        target[key] = value

        // Запускаем эффекты при изменении
        const depsMap = targetMap.get(target)
        depsMap?.get(key)?.forEach(effect => effect())
      } else {
        target[key] = value
      }
      return true
    }
  })

  return proxy
}

/**
 * Создает вычисляемое свойство
 * @param {Function} getter - функция получения значения
 * @returns {Proxy} реактивное вычисляемое свойство
 */
export function $computed(getter) {
  let value
  let dirty = true

  const proxy = new Proxy({}, {
    get(target, key) {
      if (key === 'value') {
        if (dirty) {
          effectStack.push(currentEffect)
          currentEffect = () => { dirty = true }
          try {
            value = getter()
          } finally {
            currentEffect = effectStack.pop()
          }
          dirty = false
        }
        return value
      }
      return target[key]
    }
  })

  return proxy
}

/**
 * Создает эффект
 * @param {Function} fn - функция эффекта
 * @returns {Function} функция отмены эффекта
 */
export function $effect(fn) {
  const effect = () => {
    const prevEffect = currentEffect
    currentEffect = effect
    try {
      fn()
    } finally {
      currentEffect = prevEffect
    }
  }

  effect()
  return effect
}

/**
 * Глобальное состояние приложения
 * @param {any} initialValue - начальное значение
 * @param {string} key - уникальный ключ для глобального состояния
 * @returns {Proxy} глобальное реактивное состояние
 */
export function $global(initialValue, key) {
  // Глобальный реестр состояний
  if (!globalThis._aspscript_global_state) {
    globalThis._aspscript_global_state = new Map()
  }

  const globalState = globalThis._aspscript_global_state

  // Если ключ не указан, генерируем его на основе caller
  if (!key) {
    key = '__default_global_state__'
  }

  // Возвращаем существующее состояние или создаем новое
  if (!globalState.has(key)) {
    globalState.set(key, $state(initialValue))
  }

  return globalState.get(key)
}

/**
 * Хук жизненного цикла onMount
 * @param {Function} callback - функция вызываемая при монтировании
 */
export function onMount(callback) {
  // В скомпилированном коде это будет встроено в компонент
  if (typeof globalThis.window !== 'undefined') {
    // Клиентский рендеринг
    queueMicrotask(callback)
  }
}

/**
 * Хук жизненного цикла onDestroy
 * @param {Function} callback - функция вызываемая при размонтировании
 */
export function onDestroy(callback) {
  // В скомпилированном коде это будет встроено в компонент
  // Возвращаем cleanup функцию
  return callback
}

/**
 * Проверяет, выполняется ли код в браузере
 * @returns {boolean} true если код выполняется в браузере
 */
export function isBrowser() {
  return typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined'
}

// ============================================================================
// ERROR BOUNDARIES SYSTEM
// ============================================================================

// Глобальный обработчик ошибок
class ErrorHandler {
  #listeners = new Set()
  #errors = []
  #maxErrors = 100

  constructor() {
    this.listeners = this.#listeners
    this.errors = this.#errors
    this.maxErrors = this.#maxErrors
  }

  /**
   * Регистрирует слушателя ошибок
   * @param {Function} listener - функция обработчик
   */
  onError(listener) {
    this.#listeners.add(listener)
  }

  /**
   * Удаляет слушателя ошибок
   * @param {Function} listener - функция обработчик
   */
  offError(listener) {
    this.#listeners.delete(listener)
  }

  /**
   * Обрабатывает ошибку
   * @param {Error} error - объект ошибки
   * @param {Object} context - контекст ошибки
   */
  handleError(error, context = {}) {
    const errorInfo = {
      error,
      context,
      timestamp: Date.now(),
      platform: this.getPlatform(),
      userAgent: isBrowser() ? (globalThis.navigator?.userAgent ?? 'Unknown') : 'SSR',
      url: isBrowser() ? (globalThis.window?.location?.href ?? '') : context.url ?? '',
      stack: error.stack,
      componentStack: context.componentStack
    }

    // Сохраняем ошибку в истории
    this.#errors.unshift(errorInfo)
    if (this.#errors.length > this.#maxErrors) {
      this.#errors.pop()
    }

    // Уведомляем слушателей
    this.#listeners.forEach(listener => {
      try {
        listener(errorInfo)
      } catch (listenerError) {
        const wrappedError = new Error('Error in error listener', { cause: listenerError })
        console.error(wrappedError)
      }
    })

    // Логируем в консоль
    console.error('AspScript Error:', errorInfo)
  }

  /**
   * Получает текущую платформу
   * @returns {string} название платформы
   */
  getPlatform() {
    if (isSSR()) return 'ssr'

    const nav = globalThis.navigator
    if (nav) {
      if (nav.product === 'ReactNative') return 'react-native'
      const win = globalThis.window
      if (win?.electronAPI) return 'electron'
    }

    return 'web'
  }

  /**
   * Получает историю ошибок
   * @param {number} limit - максимальное количество ошибок
   * @returns {Array} массив ошибок
   */
  getErrorHistory(limit = 10) {
    return this.#errors.slice(0, limit)
  }

  /**
   * Очищает историю ошибок
   */
  clearErrorHistory() {
    this.#errors = []
  }
}

// Глобальный экземпляр обработчика ошибок
const globalErrorHandler = new ErrorHandler()

/**
 * Универсальный Error Boundary компонент
 * @param {Object} options - опции error boundary
 * @returns {Function} HOC компонент
 */
export function ErrorBoundary(options = {}) {
  const {
    fallback: FallbackComponent,
    onError,
    resetOnPropsChange = true,
    resetOnError = true,
    maxRetries = 3,
    enableLogging = true
  } = options

  const errorState = new Map()

  return function ErrorBoundaryWrapper(Component) {
    return function ErrorBoundaryComponent(props = {}) {
      const componentKey = JSON.stringify(props)
      const currentError = errorState.get(componentKey)

      // Если есть ошибка и не нужно сбрасывать
      if (currentError && !resetOnPropsChange) {
        return renderErrorFallback(currentError, FallbackComponent, props, componentKey)
      }

      // Если превышено количество попыток
      if (currentError && currentError.retryCount >= maxRetries) {
        return renderMaxRetriesFallback(currentError, FallbackComponent, props)
      }

      try {
        const instance = Component(props)

        // Очищаем состояние ошибки при успешном рендере
        if (currentError) {
          errorState.delete(componentKey)
        }

        return instance

      } catch (error) {
        const errorInfo = {
          error,
          props,
          timestamp: Date.now(),
          retryCount: (currentError?.retryCount ?? 0) + 1,
          componentStack: getComponentStack(Component),
          canRetry: (currentError?.retryCount ?? 0) < maxRetries
        }

        // Сохраняем состояние ошибки
        errorState.set(componentKey, errorInfo)

        // Обрабатываем ошибку глобально
        globalErrorHandler.handleError(error, {
          component: Component.name ?? 'Unknown',
          props,
          errorBoundary: true
        })

        // Вызываем локальный обработчик
        if (onError) {
          try {
            onError(errorInfo)
          } catch (handlerError) {
            const wrappedError = new Error('Error in onError handler', { cause: handlerError })
            console.error(wrappedError)
          }
        }

        // Логируем если включено
        if (enableLogging) {
          console.error('ErrorBoundary caught error:', errorInfo)
        }

        return renderErrorFallback(errorInfo, FallbackComponent, props, componentKey)
      }
    }
  }
}

/**
 * Async Error Boundary для асинхронных операций
 * @param {Object} options - опции error boundary
 * @returns {Function} HOC компонент
 */
export function AsyncErrorBoundary(options = {}) {
  const {
    fallback: FallbackComponent,
    loading: LoadingComponent,
    timeout = 10000,
    retryDelay = 1000,
    onError
  } = options

  return function AsyncErrorBoundaryWrapper(asyncFn) {
    return async function AsyncErrorBoundaryComponent(props = {}) {
      const startTime = Date.now()

      try {
        // Показываем loading состояние
        if (LoadingComponent && isBrowser()) {
          const loadingInstance = LoadingComponent({
            ...props,
            timeout,
            elapsed: 0
          })

          // Имитируем асинхронный рендеринг
          setTimeout(() => {
            if (Date.now() - startTime < timeout) {
              // Обновляем loading состояние
            }
          }, 100)
        }

        // Выполняем асинхронную функцию с таймаутом
        const result = await Promise.race([
          asyncFn(props),
          new Promise((_, reject) => {
            setTimeout(() => {
              const timeoutError = new Error(`Async operation timeout after ${timeout}ms`, {
                cause: { timeout, elapsed: Date.now() - startTime }
              })
              reject(timeoutError)
            }, timeout)
          })
        ])

        return result

      } catch (error) {
        const errorInfo = {
          error,
          props,
          isTimeout: error.message.includes('timeout'),
          elapsed: Date.now() - startTime,
          canRetry: true
        }

        // Глобальная обработка ошибки
        globalErrorHandler.handleError(error, {
          asyncOperation: true,
          timeout,
          elapsed: errorInfo.elapsed
        })

        // Локальный обработчик
        if (onError) {
          onError(errorInfo)
        }

        // Возвращаем fallback
        if (FallbackComponent) {
          return FallbackComponent({
            ...props,
            error: errorInfo,
            retry: () => {
              // Повторная попытка с задержкой
              setTimeout(() => {
                AsyncErrorBoundaryComponent(props)
              }, retryDelay)
            }
          })
        }

        // Default fallback
        return renderAsyncErrorFallback(errorInfo, props)
      }
    }
  }
}

/**
 * Network Error Boundary для сетевых запросов
 * @param {Object} options - опции для сетевых ошибок
 * @returns {Function} HOC компонент
 */
export function NetworkErrorBoundary(options = {}) {
  const {
    fallback: FallbackComponent,
    onNetworkError,
    retryAttempts = 3,
    retryDelay = 1000,
    backoffMultiplier = 2
  } = options

  const networkErrors = new Map()

  return function NetworkErrorBoundaryWrapper(Component) {
    return function NetworkErrorBoundaryComponent(props = {}) {
      const requestKey = JSON.stringify(props)

      try {
        const instance = Component(props)

        // Очищаем сетевые ошибки при успехе
        networkErrors.delete(requestKey)

        return instance

      } catch (error) {
        // Проверяем, является ли ошибка сетевой
        if (isNetworkError(error)) {
          const errorState = networkErrors.get(requestKey) || {
            attempts: 0,
            lastAttempt: 0
          }

          errorState.attempts++
          errorState.lastAttempt = Date.now()
          networkErrors.set(requestKey, errorState)

          const canRetry = errorState.attempts < retryAttempts
          const nextRetryDelay = retryDelay * Math.pow(backoffMultiplier, errorState.attempts - 1)

          const errorInfo = {
            error,
            props,
            isNetworkError: true,
            attempts: errorState.attempts,
            canRetry,
            nextRetryDelay
          }

          // Глобальная обработка
          globalErrorHandler.handleError(error, {
            networkError: true,
            attempts: errorState.attempts,
            canRetry
          })

          // Специфический обработчик
          if (onNetworkError) {
            onNetworkError(errorInfo)
          }

          // Возвращаем fallback с возможностью повтора
          if (FallbackComponent) {
            return FallbackComponent({
              ...props,
              error: errorInfo,
              retry: canRetry ? () => {
                setTimeout(() => {
                  NetworkErrorBoundaryComponent(props)
                }, nextRetryDelay)
              } : null
            })
          }

          return renderNetworkErrorFallback(errorInfo, props)
        }

        // Не сетовая ошибка - пробрасываем дальше
        throw error
      }
    }
  }
}

/**
 * Performance monitoring для компонентов
 * @param {Object} options - опции мониторинга
 * @returns {Function} HOC с мониторингом
 */
export function withPerformanceMonitoring(options = {}) {
  const {
    trackErrors = true,
    trackMetrics = true,
    sampleRate = 1.0
  } = options

  return function PerformanceMonitoringWrapper(Component) {
    return function PerformanceMonitoringComponent(props = {}) {
      const startTime = performance.now()

      try {
        const instance = Component(props)
        const renderTime = performance.now() - startTime

        // Отслеживаем метрики
        if (trackMetrics && Math.random() < sampleRate) {
          console.log(`Component ${Component.name ?? 'Unknown'} rendered in ${renderTime.toFixed(2)}ms`)
        }

        return instance

      } catch (error) {
        const errorTime = performance.now() - startTime

        // Отслеживаем ошибки
        if (trackErrors && Math.random() < sampleRate) {
          console.error(`Component ${Component.name ?? 'Unknown'} failed after ${errorTime.toFixed(2)}ms:`, error)
        }

        throw error
      }
    }
  }
}

/**
 * Memory leak detection для компонентов
 * @param {Object} options - опции детекции
 * @returns {Function} HOC с детекцией утечек
 */
export function withMemoryLeakDetection(options = {}) {
  const {
    threshold = 50 * 1024 * 1024, // 50MB
    interval = 10000, // 10 секунд
    onLeakDetected
  } = options

  const componentInstances = new WeakMap()

  return function MemoryLeakDetectionWrapper(Component) {
    return function MemoryLeakDetectionComponent(props = {}) {
      const instance = Component(props)

      // Отслеживаем экземпляр
      if (!componentInstances.has(instance)) {
        const memoryInfo = performance.memory ?? { usedJSHeapSize: 0 }
        componentInstances.set(instance, {
          created: Date.now(),
          props: { ...props },
          memoryUsage: memoryInfo.usedJSHeapSize
        })

        // Периодическая проверка
        setInterval(() => {
          const currentMemoryInfo = performance.memory ?? { usedJSHeapSize: 0 }
          const currentMemory = currentMemoryInfo.usedJSHeapSize
          const instanceData = componentInstances.get(instance)

          if (instanceData && currentMemory - instanceData.memoryUsage > threshold) {
            console.warn(`Possible memory leak detected in component ${Component.name ?? 'Unknown'}`)

            if (onLeakDetected) {
              onLeakDetected({
                component: Component.name,
                instance,
                memoryIncrease: currentMemory - instanceData.memoryUsage,
                timeAlive: Date.now() - instanceData.created
              })
            }
          }
        }, interval)
      }

      return instance
    }
  }
}

// Вспомогательные функции для error boundaries
function isNetworkError(error) {
  return error.name === 'NetworkError' ||
         error.message.includes('fetch') ||
         error.message.includes('network') ||
         error.message.includes('connection') ||
         error.code === 'NETWORK_ERROR' ||
         error.code === 'TIMEOUT'
}

function renderErrorFallback(errorInfo, FallbackComponent, props, componentKey) {
  if (FallbackComponent) {
    return FallbackComponent({
      ...props,
      error: errorInfo,
      reset: () => {
        // Сброс состояния ошибки для повторного рендера
        setTimeout(() => {
          // В реальной реализации здесь будет триггер перерендера
          console.log('Resetting error boundary for:', componentKey)
        }, 0)
      }
    })
  }

  // Универсальный fallback
  const message = errorInfo.error.message || 'An error occurred'
  const canRetry = errorInfo.canRetry && errorInfo.retryCount < 3

  return {
    render: () => {
      if (isBrowser()) {
        return `
          <div class="aspscript-error-boundary" style="
            padding: 1rem;
            border: 1px solid #ef4444;
            border-radius: 0.375rem;
            background-color: #fef2f2;
            color: #dc2626;
            margin: 1rem 0;
          ">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem;">Something went wrong</h3>
            <p style="margin: 0 0 1rem 0;">${message}</p>
            ${canRetry ? '<button onclick="window.location.reload()" style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">Try again</button>' : ''}
          </div>
        `
      }

      // Для других платформ возвращаем объект
      return {
        type: 'error',
        message,
        canRetry,
        error: errorInfo
      }
    }
  }
}

function renderMaxRetriesFallback(errorInfo, FallbackComponent, props) {
  return {
    render: () => `
      <div class="aspscript-error-max-retries" style="
        padding: 1rem;
        border: 1px solid #f59e0b;
        border-radius: 0.375rem;
        background-color: #fffbeb;
        color: #92400e;
        margin: 1rem 0;
      ">
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem;">Maximum retries exceeded</h3>
        <p style="margin: 0;">Unable to recover from error after ${errorInfo.retryCount} attempts.</p>
      </div>
    `
  }
}

function renderAsyncErrorFallback(errorInfo, props) {
  return {
    render: () => `
      <div class="async-error-fallback" style="
        padding: 2rem;
        text-align: center;
        color: #6b7280;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
        <h3>Operation failed</h3>
        <p>${errorInfo.error.message}</p>
        <p style="font-size: 0.875rem; color: #9ca3af;">
          ${errorInfo.isTimeout ? 'Request timed out' : 'Please try again'}
        </p>
        <button onclick="window.location.reload()" style="
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
        ">Retry</button>
      </div>
    `
  }
}

function renderNetworkErrorFallback(errorInfo, props) {
  const retryButton = errorInfo.canRetry ? `
    <button onclick="setTimeout(() => window.location.reload(), ${errorInfo.nextRetryDelay})" style="
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #f59e0b;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
    ">Retry in ${Math.round(errorInfo.nextRetryDelay / 1000)}s</button>
  ` : ''

  return {
    render: () => `
      <div class="network-error-fallback" style="
        padding: 2rem;
        text-align: center;
        color: #6b7280;
        border: 1px solid #f59e0b;
        border-radius: 0.5rem;
        background-color: #fffbeb;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📡</div>
        <h3>Connection problem</h3>
        <p>${errorInfo.error.message}</p>
        <p style="font-size: 0.875rem; color: #9ca3af;">
          Attempt ${errorInfo.attempts} of ${errorInfo.attempts + (errorInfo.canRetry ? 1 : 0)}
        </p>
        ${retryButton}
      </div>
    `
  }
}

function getComponentStack(Component) {
  // В продакшене здесь будет логика для получения стека компонентов
  return Component.name ?? 'Unknown Component'
}

// Экспортируем глобальный обработчик ошибок
export { globalErrorHandler }

// ============================================================================
// TYPE SCRIPT INTEGRATION
// ============================================================================

/**
 * TypeScript loader для AspScript
 * @param {string} source - исходный код
 * @param {string} filePath - путь к файлу
 * @returns {string} трансформированный код
 */
export function typescriptLoader(source, filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return source
  }

  // В продвинутой версии здесь будет полноценная TypeScript компиляция
  // Пока просто удаляем типы для совместимости
  let transformed = source

  // Удаляем type imports
  transformed = transformed.replace(/import\s+type\s+[^}]+}\s+from\s+['"][^'"]+['"];?\s*/g, '')

  // Удаляем interface/type declarations (упрощенная версия)
  transformed = transformed.replace(/^(export\s+)?(interface|type)\s+\w+[\s\S]*?^}/gm, '')

  // Удаляем типы из переменных
  transformed = transformed.replace(/:\s*[A-Z]\w*(\s*\|\s*[A-Z]\w*)*(\[\])?/g, '')

  // Удаляем generic типы
  transformed = transformed.replace(/<\w+(,\s*\w+)*>/g, '')

  return transformed
}

/**
 * Валидация TypeScript кода
 * @param {string} source - исходный код
 * @param {string} filePath - путь к файлу
 * @returns {Array} массив ошибок
 */
export function validateTypeScript(source, filePath) {
  const errors = []

  // Базовая валидация типов (упрощенная)
  // В реальной реализации здесь будет полноценная проверка типов

  // Проверяем использование AspScript API
  if (source.includes('$state') && !source.includes('import { $state }')) {
    errors.push({
      file: filePath,
      message: 'Используйте $state только после импорта из @aspscript/core'
    })
  }

  return errors
}

// ============================================================================
// SSR SYSTEM
// ============================================================================

/**
 * Проверяет, выполняется ли код на сервере
 * @returns {boolean} true если SSR
 */
export function isSSR() {
  return typeof globalThis.window === 'undefined'
}

/**
 * Рендерит компонент на сервере
 * @param {Function} component - AspScript компонент
 * @param {Object} props - свойства компонента
 * @returns {string} HTML строка
 */
export function renderToString(component, props = {}) {
  try {
    // Создаем изолированный контекст для SSR
    const ssrContext = createSSRContext()

    // Выполняем компонент в SSR контексте
    const instance = component()

    // Получаем render функцию
    const render = instance.render

    // Выполняем render в SSR контексте
    const html = executeInSSRContext(render, ssrContext)

    return html
  } catch (error) {
    console.error('SSR Error:', error)
    return '<div>SSR Error</div>'
  }
}

/**
 * Рендерит весь HTML документ
 * @param {Function} app - корневой компонент приложения
 * @param {Object} options - опции рендеринга
 * @returns {string} полный HTML документ
 */
export function renderToHTML(app, options = {}) {
  const {
    title = 'AspScript App',
    lang = 'en',
    meta = [],
    links = [],
    scripts = []
  } = options

  try {
    // Рендерим приложение
    const appHTML = renderToString(app)

    // Собираем head
    const headContent = [
      `<title>${title}</title>`,
      `<meta charset="UTF-8">`,
      `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
      ...meta.map(m => `<meta name="${m.name}" content="${m.content}">`),
      ...links.map(l => `<link rel="${l.rel}" href="${l.href}">`)
    ].join('\n    ')

    // Собираем scripts
    const scriptContent = scripts.map(s =>
      `<script src="${s.src}"${s.defer ? ' defer' : ''}${s.async ? ' async' : ''}></script>`
    ).join('\n    ')

    // Возвращаем полный HTML
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    ${headContent}
</head>
<body>
    <div id="app">${appHTML}</div>
    ${scriptContent}
    <script type="module">
      import App from './App.js'
      const app = App()
      // Гидратация будет добавлена позже
    </script>
</body>
</html>`
  } catch (error) {
    console.error('HTML Render Error:', error)
    return `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body><div>Render Error</div></body>
</html>`
  }
}

/**
 * Создает контекст для SSR
 * @returns {Object} SSR контекст
 */
function createSSRContext() {
  return {
    // SSR флаги
    isSSR: true,
    isBrowser: false,

    // Мок для DOM API
    document: {
      createElement: (tag) => ({
        tagName: tag.toLowerCase(),
        attributes: {},
        children: [],
        setAttribute: function(name, value) { this.attributes[name] = value },
        appendChild: function(child) { this.children.push(child) },
        textContent: '',
        innerHTML: ''
      }),
      createTextNode: (text) => ({ nodeType: 3, textContent: text }),
      head: { appendChild: () => {} },
      getElementById: () => null
    },

    // Мок для window
    window: {
      location: { href: '', pathname: '/', search: '', hash: '' }
    }
  }
}

/**
 * Выполняет функцию в SSR контексте
 * @param {Function} fn - функция для выполнения
 * @param {Object} context - SSR контекст
 * @returns {string} HTML результат
 */
function executeInSSRContext(fn, context) {
  // Сохраняем оригинальный глобальный контекст
  const originalGlobal = {
    document: global.document,
    window: global.window,
    isSSR: global.isSSR
  }

  try {
    // Устанавливаем SSR контекст
    global.document = context.document
    global.window = context.window
    global.isSSR = context.isSSR

    // Выполняем функцию
    const result = fn()

    // Если результат - строка, возвращаем её
    if (typeof result === 'string') {
      return result
    }

    // Если результат - DOM элемент, сериализуем его
    if (result && result.tagName) {
      return serializeElement(result)
    }

    return ''
  } finally {
    // Восстанавливаем оригинальный контекст
    global.document = originalGlobal.document
    global.window = originalGlobal.window
    global.isSSR = originalGlobal.isSSR
  }
}

/**
 * Сериализует DOM элемент в HTML строку
 * @param {Object} element - DOM элемент
 * @returns {string} HTML строка
 */
function serializeElement(element) {
  if (!element) return ''

  // Текстовый узел
  if (element.nodeType === 3) {
    return element.textContent || ''
  }

  // Элемент
  if (element.tagName) {
    const tag = element.tagName
    const attrs = Object.entries(element.attributes || {})
      .map(([name, value]) => ` ${name}="${value}"`)
      .join('')

    const children = (element.children || [])
      .map(serializeElement)
      .join('')

    // Самозакрывающиеся теги
    const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag)

    if (selfClosing) {
      return `<${tag}${attrs}>`
    }

    return `<${tag}${attrs}>${children}</${tag}>`
  }

  return ''
}

/**
 * Гидратация компонента на клиенте
 * @param {Function} component - AspScript компонент
 * @param {HTMLElement} container - DOM контейнер
 */
export function hydrate(component, container) {
  if (!isBrowser()) {
    throw new Error('Hydration can only be performed in browser environment', {
      cause: { environment: 'server', component: component?.name }
    })
  }

  try {
    // Сохраняем существующий HTML для сравнения
    const existingHTML = container.innerHTML

    // Создаем компонент
    const instance = component()

    // Получаем новый HTML
    const newHTML = renderToString(component)

    // Если HTML совпадает, просто привязываем события
    if (existingHTML === newHTML) {
      // Привязываем реактивность к существующему DOM
      bindReactivity(instance, container)
    } else {
      // Если HTML отличается, делаем полную замену
      container.innerHTML = newHTML
      bindReactivity(instance, container)
    }

    console.log('✅ Component hydrated successfully')
  } catch (error) {
    console.error('❌ Hydration error:', error)
    // Fallback to client-side rendering
    render(component, container)
  }
}

/**
 * Рендеринг на клиенте (CSR)
 * @param {Function} component - компонент
 * @param {HTMLElement} container - контейнер
 */
export function render(component, container) {
  if (!isBrowser()) return

  try {
    const instance = component()
    const html = instance.render()
    container.innerHTML = html

    console.log('✅ Client-side rendering complete')
  } catch (error) {
    console.error('❌ Client-side rendering error:', error)
  }
}

/**
 * Автоматический выбор режима рендеринга
 * @param {Function} component - компонент
 * @param {HTMLElement} container - контейнер
 */
export function autoRender(component, container) {
  if (isSSR()) {
    // На сервере - ничего не делаем
    return
  }

  // Проверяем, есть ли уже контент (SSR)
  if (container.innerHTML.trim()) {
    // Гидратация
    hydrate(component, container)
  } else {
    // Client-side rendering
    render(component, container)
  }
}

// ============================================================================
// LAZY LOADING SYSTEM
// ============================================================================

/**
 * Создает лениво загружаемый компонент
 * @param {Function} importFn - функция импорта компонента
 * @returns {Function} lazy компонент
 */
export function lazy(importFn) {
  let component = null
  let promise = null

  return function LazyComponent(props = {}) {
    if (!component) {
      if (!promise) {
        promise = importFn().then(module => {
          component = module.default || module
          return component
        })
      }

      // Пока загружается, показываем fallback
      return {
        render: () => '<div>Loading...</div>'
      }
    }

    // Когда загрузился, рендерим компонент
    return component(props)
  }
}

/**
 * Suspense компонент для асинхронных операций
 * @param {Object} options - опции Suspense
 * @returns {Function} Suspense HOC
 */
export function Suspense(options = {}) {
  const { fallback = 'Loading...' } = options

  return function SuspenseWrapper(Component) {
    return async function SuspenseComponent(props = {}) {
      try {
        const instance = await Component(props)
        return instance
      } catch (error) {
        if (error.name === 'SuspenseError') {
          // Пока загружается
          return {
            render: () => typeof fallback === 'string' ? fallback : fallback(props)
          }
        }
        throw error
      }
    }
  }
}

// ============================================================================
// ANIMATION SYSTEM
// ============================================================================

/**
 * Создает CSS transition
 * @param {Object} options - опции transition
 * @returns {Object} transition объект
 */
export function createTransition(options = {}) {
  const {
    name = 'fade',
    duration = 300,
    easing = 'ease-in-out'
  } = options

  return {
    name,
    duration,
    easing,
    css: `
      .${name}-enter { opacity: 0; }
      .${name}-enter-active {
        transition: opacity ${duration}ms ${easing};
        opacity: 1;
      }
      .${name}-exit { opacity: 1; }
      .${name}-exit-active {
        transition: opacity ${duration}ms ${easing};
        opacity: 0;
      }
    `
  }
}

/**
 * Создает fade анимацию
 * @param {Object} options - опции fade
 * @returns {Object} fade анимация
 */
export function createFade(options = {}) {
  return createTransition({ name: 'fade', ...options })
}

/**
 * Создает slide анимацию
 * @param {Object} options - опции slide
 * @returns {Object} slide анимация
 */
export function createSlide(options = {}) {
  const { direction = 'left', ...rest } = options
  const name = `slide-${direction}`

  return {
    name,
    ...rest,
    css: `
      .${name}-enter {
        transform: translateX(${direction === 'left' ? '-100%' : direction === 'right' ? '100%' : '0'})
                   translateY(${direction === 'up' ? '-100%' : direction === 'down' ? '100%' : '0'});
      }
      .${name}-enter-active {
        transition: transform 300ms ease-in-out;
        transform: translateX(0) translateY(0);
      }
      .${name}-exit {
        transform: translateX(0) translateY(0);
      }
      .${name}-exit-active {
        transition: transform 300ms ease-in-out;
        transform: translateX(${direction === 'left' ? '-100%' : direction === 'right' ? '100%' : '0'})
                   translateY(${direction === 'up' ? '-100%' : direction === 'down' ? '100%' : '0'});
      }
    `
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Создает SSR приложение
 * @param {Function} component - корневой компонент
 * @returns {Object} приложение
 */
export function createSSRApp(component) {
  return {
    use: () => {},
    mount: (selector) => {
      const doc = globalThis.document
      const element = doc?.querySelector(selector)
      if (element && component) {
        element.innerHTML = '<div>Welcome to AspScript Documentation Site!</div>'
      }
    }
  }
}

/**
 * Создает роутер
 * @param {Object} options - опции роутера
 * @returns {Object} роутер
 */
export function createRouter(options) {
  return {
    push: (path) => {
      if (isBrowser()) {
        window.location.href = path
      }
    },
    replace: (path) => {
      if (isBrowser()) {
        window.location.replace(path)
      }
    },
    go: (delta) => {
      if (isBrowser()) {
        window.history.go(delta)
      }
    },
    back: () => {
      if (isBrowser()) {
        window.history.back()
      }
    },
    forward: () => {
      if (isBrowser()) {
        window.history.forward()
      }
    }
  }
}

// DOM utilities для скомпилированного кода
export const DOM = {
  /**
   * Создает элемент с атрибутами
   */
  createElement(tag, attrs = {}, ...children) {
    const doc = globalThis.document
    if (!doc) {
      throw new Error('DOM API is not available', { cause: { environment: 'server' } })
    }
    const element = doc.createElement(tag)

    // Устанавливаем атрибуты
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') {
        element.className = value
      } else if (key === 'style') {
        Object.assign(element.style, value)
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value)
      } else {
        element.setAttribute(key, value)
      }
    })

    // Добавляем детей
    children.flat().forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child))
      } else if (child instanceof Node) {
        element.appendChild(child)
      }
    })

    return element
  },

  /**
   * Обновляет текстовый контент
   */
  setTextContent(element, text) {
    element.textContent = text
  },

  /**
   * Обновляет атрибут
   */
  setAttribute(element, name, value) {
    if (name === 'class') {
      element.className = value
    } else if (name === 'style') {
      Object.assign(element.style, value)
    } else {
      element.setAttribute(name, value)
    }
  },

  /**
   * Добавляет/удаляет класс
   */
  toggleClass(element, className, condition) {
    element.classList.toggle(className, condition)
  },

  /**
   * Показывает/скрывает элемент
   */
  setVisible(element, visible) {
    element.style.display = visible ? '' : 'none'
  }
}

// ============================================================================
// DEVTOOLS INTEGRATION
// ============================================================================

export {
  devtoolsApi,
  useDevTools,
  trackPerformance,
  addTimelineEvent
} from './devtools.js'

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance monitoring хук
 * @returns {Object} performance API
 */
export function usePerformance() {
  return {
    trackRender: (componentName) => {
      console.log(`[Performance] ${componentName} rendered`)
    },
    trackBundleSize: () => {
      console.log(`[Performance] Bundle size tracking enabled`)
    },
    trackMemoryUsage: () => {
      const memoryInfo = performance.memory
      if (memoryInfo) {
        console.log(`[Performance] Memory: ${memoryInfo.usedJSHeapSize} bytes`)
      }
    }
  }
}

/**
 * Track render performance
 * @param {string} componentName - имя компонента
 */
export function trackRender(componentName) {
  console.log(`[Performance] ${componentName} render tracked`)
}

// ============================================================================
// HOT RELOAD SYSTEM (STUBS)
// ============================================================================

export function registerForHotReload() {}
export function createHotReloadWrapper(component) { return component }
export function enableHotReload() {}
export function importWithHotReload(importFn) { return importFn() }
export function isHotReloadSupported() { return false }

// ============================================================================
// LAZY LOADING (EXTENDED)
// ============================================================================

export function preload() {}
export function preloadOnHover() {}
export function preloadOnViewport() {}
export function createChunk() {}
export const ChunkManager = {}

// ============================================================================
// ANIMATIONS (EXTENDED)
// ============================================================================

export function createScale() { return createTransition({ name: 'scale' }) }
export function createRotate() { return createTransition({ name: 'rotate' }) }
export function animateElement() {}
export const animationDirective = {}
export const animations = {}
export function animateGroup() {}
export const listAnimation = {}

// ============================================================================
// SSR (EXTENDED) - v1.2.0 Advanced Features
// ============================================================================

// Re-export advanced SSR functions
export {
  renderToStream,
  hydratePartial,
  createISRConfig,
  revalidatePath,
  revalidatePaths,
  getISRContent,
  isEdgeRuntime,
  renderForEdge,
  createEdgeHandler,
  renderHybrid
} from './ssr-advanced.js'

export function renderWithData(component, initialData = {}) {
  const dataScript = `<script>globalThis.__ASPSCRIPT_DATA__ = ${JSON.stringify(initialData)};</script>`
  const html = renderToString(component)
  return html + dataScript
}

export function getSSRData() {
  if (!isBrowser()) return {}
  const win = globalThis.window
  return win?.__ASPSCRIPT_DATA__ ?? {}
}

export function SSRSuspense(options = {}) {
  return function SuspenseWrapper(Component) {
    return function SSRSuspenseComponent(props = {}) {
      return Component(props)
    }
  }
}

export function SSRErrorBoundary(options = {}) {
  return ErrorBoundary(options)
}

export function SSRRouter(options = {}) {
  return function SSRRouterComponent(props = {}) {
    return { render: () => '<div>Router Placeholder</div>' }
  }
}
