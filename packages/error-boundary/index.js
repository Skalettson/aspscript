/**
 * AspScript Universal Error Boundaries
 * Кросс-платформенная система обработки ошибок
 */

const { isBrowser, isSSR } = require('@aspscript/core')

/**
 * Глобальный обработчик ошибок
 */
class ErrorHandler {
  constructor() {
    this.listeners = new Set()
    this.errors = []
    this.maxErrors = 100
  }

  /**
   * Регистрирует слушателя ошибок
   * @param {Function} listener - функция обработчик
   */
  onError(listener) {
    this.listeners.add(listener)
  }

  /**
   * Удаляет слушателя ошибок
   * @param {Function} listener - функция обработчик
   */
  offError(listener) {
    this.listeners.delete(listener)
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
      userAgent: isBrowser() ? navigator.userAgent : 'SSR',
      url: isBrowser() ? window.location.href : context.url,
      stack: error.stack,
      componentStack: context.componentStack
    }

    // Сохраняем ошибку в истории
    this.errors.unshift(errorInfo)
    if (this.errors.length > this.maxErrors) {
      this.errors.pop()
    }

    // Уведомляем слушателей
    this.listeners.forEach(listener => {
      try {
        listener(errorInfo)
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError)
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

    if (typeof navigator !== 'undefined') {
      if (navigator.product === 'ReactNative') return 'react-native'
      if (window.electronAPI) return 'electron'
    }

    return 'web'
  }

  /**
   * Получает историю ошибок
   * @param {number} limit - максимальное количество ошибок
   * @returns {Array} массив ошибок
   */
  getErrorHistory(limit = 10) {
    return this.errors.slice(0, limit)
  }

  /**
   * Очищает историю ошибок
   */
  clearErrorHistory() {
    this.errors = []
  }
}

// Глобальный экземпляр обработчика ошибок
const globalErrorHandler = new ErrorHandler()

/**
 * Универсальный Error Boundary компонент
 * @param {Object} options - опции error boundary
 * @returns {Function} HOC компонент
 */
function ErrorBoundary(options = {}) {
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
          retryCount: (currentError?.retryCount || 0) + 1,
          componentStack: getComponentStack(Component),
          canRetry: (currentError?.retryCount || 0) < maxRetries
        }

        // Сохраняем состояние ошибки
        errorState.set(componentKey, errorInfo)

        // Обрабатываем ошибку глобально
        globalErrorHandler.handleError(error, {
          component: Component.name || 'Unknown',
          props,
          errorBoundary: true
        })

        // Вызываем локальный обработчик
        if (onError) {
          try {
            onError(errorInfo)
          } catch (handlerError) {
            console.error('Error in onError handler:', handlerError)
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
function AsyncErrorBoundary(options = {}) {
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
            setTimeout(() => reject(new Error('Async operation timeout')), timeout)
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
 * Error Boundary для сетевых запросов
 * @param {Object} options - опции для сетевых ошибок
 * @returns {Function} HOC компонент
 */
function NetworkErrorBoundary(options = {}) {
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
 * Проверяет, является ли ошибка сетевой
 * @param {Error} error - объект ошибки
 * @returns {boolean} true если сетевая ошибка
 */
function isNetworkError(error) {
  return error.name === 'NetworkError' ||
         error.message.includes('fetch') ||
         error.message.includes('network') ||
         error.message.includes('connection') ||
         error.code === 'NETWORK_ERROR' ||
         error.code === 'TIMEOUT'
}

/**
 * Рендерит fallback для обычных ошибок
 * @param {Object} errorInfo - информация об ошибке
 * @param {Function} FallbackComponent - компонент fallback
 * @param {Object} props - пропсы
 * @param {string} componentKey - ключ компонента
 * @returns {Object} fallback компонент
 */
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

/**
 * Рендерит fallback для асинхронных ошибок
 * @param {Object} errorInfo - информация об ошибке
 * @param {Object} props - пропсы
 * @returns {Object} fallback компонент
 */
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

/**
 * Рендерит fallback для сетевых ошибок
 * @param {Object} errorInfo - информация об ошибке
 * @param {Object} props - пропсы
 * @returns {Object} fallback компонент
 */
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

/**
 * Получает стек компонентов для отладки
 * @param {Function} Component - компонент
 * @returns {string} стек компонентов
 */
function getComponentStack(Component) {
  // В продакшене здесь будет логика для получения стека компонентов
  return Component.name || 'Unknown Component'
}

/**
 * Performance monitoring для error boundaries
 * @param {Object} options - опции мониторинга
 * @returns {Function} HOC с мониторингом
 */
function withPerformanceMonitoring(options = {}) {
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
          console.log(`Component ${Component.name || 'Unknown'} rendered in ${renderTime.toFixed(2)}ms`)
        }

        return instance

      } catch (error) {
        const errorTime = performance.now() - startTime

        // Отслеживаем ошибки
        if (trackErrors && Math.random() < sampleRate) {
          console.error(`Component ${Component.name || 'Unknown'} failed after ${errorTime.toFixed(2)}ms:`, error)
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
function withMemoryLeakDetection(options = {}) {
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
        componentInstances.set(instance, {
          created: Date.now(),
          props: { ...props },
          memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0
        })

        // Периодическая проверка
        setInterval(() => {
          const currentMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
          const instanceData = componentInstances.get(instance)

          if (instanceData && currentMemory - instanceData.memoryUsage > threshold) {
            console.warn(`Possible memory leak detected in component ${Component.name || 'Unknown'}`)

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

module.exports = {
  ErrorBoundary,
  AsyncErrorBoundary,
  NetworkErrorBoundary,
  withPerformanceMonitoring,
  withMemoryLeakDetection,
  globalErrorHandler,
  ErrorHandler
}
