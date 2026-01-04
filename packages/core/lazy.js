/**
 * AspScript Lazy Loading & Code Splitting
 * Ленивая загрузка компонентов и code splitting
 */

/**
 * Создает лениво загружаемый компонент
 * @param {Function} loader - функция загрузки компонента
 * @param {Object} options - опции загрузки
 * @returns {Function} ленивый компонент
 */
export function lazy(loader, options = {}) {
  const {
    loading: LoadingComponent,
    error: ErrorComponent,
    delay = 200,
    timeout = 10000
  } = options

  return function LazyComponent(props = {}) {
    // Состояние загрузки
    const loading = $state(true)
    const error = $state(null)
    const component = $state(null)
    const timedOut = $state(false)

    // Таймер для delay
    let delayTimer = null
    let timeoutTimer = null

    // Начинаем загрузку при монтировании
    onMount(async () => {
      try {
        // Устанавливаем таймер delay
        if (delay > 0) {
          delayTimer = setTimeout(() => {
            loading.value = true
          }, delay)
        } else {
          loading.value = true
        }

        // Устанавливаем таймер timeout
        if (timeout > 0) {
          timeoutTimer = setTimeout(() => {
            timedOut.value = true
            loading.value = false
            error.value = new Error('Loading timeout')
          }, timeout)
        }

        // Загружаем компонент
        const loadedComponent = await loader()

        // Очищаем таймеры
        if (delayTimer) clearTimeout(delayTimer)
        if (timeoutTimer) clearTimeout(timeoutTimer)

        // Устанавливаем компонент
        component.value = loadedComponent.default || loadedComponent
        loading.value = false

      } catch (err) {
        // Очищаем таймеры
        if (delayTimer) clearTimeout(delayTimer)
        if (timeoutTimer) clearTimeout(timeoutTimer)

        loading.value = false
        error.value = err
      }
    })

    // Очистка при размонтировании
    onDestroy(() => {
      if (delayTimer) clearTimeout(delayTimer)
      if (timeoutTimer) clearTimeout(timeoutTimer)
    })

    // Рендеринг
    return {
      render: () => {
        // Ошибка загрузки
        if (error.value && ErrorComponent) {
          return ErrorComponent({ error: error.value, retry: () => {
            error.value = null
            loading.value = true
            // Повторная загрузка
            onMount(async () => {
              try {
                component.value = await loader()
                loading.value = false
              } catch (err) {
                error.value = err
                loading.value = false
              }
            })
          }}).render()
        }

        // Показываем loading компонент
        if (loading.value && LoadingComponent) {
          return LoadingComponent(props).render()
        }

        // Показываем загруженный компонент
        if (component.value) {
          return component.value(props).render()
        }

        // Ничего не показываем
        return ''
      }
    }
  }
}

/**
 * Создает Suspense-подобную границу для асинхронных компонентов
 * @param {Object} options - опции Suspense
 * @returns {Function} Suspense HOC
 */
export function Suspense(options = {}) {
  const {
    fallback: FallbackComponent,
    error: ErrorComponent
  } = options

  return function SuspenseWrapper(Component) {
    return function SuspenseComponent(props = {}) {
      const isPending = $state(false)
      const error = $state(null)
      const result = $state(null)

      // Имитация асинхронного рендеринга
      $: effect(async () => {
        try {
          isPending.value = true
          error.value = null

          // Имитируем асинхронную операцию
          await new Promise(resolve => setTimeout(resolve, 0))

          const component = Component(props)
          result.value = component

        } catch (err) {
          error.value = err
        } finally {
          isPending.value = false
        }
      })

      return {
        render: () => {
          if (error.value && ErrorComponent) {
            return ErrorComponent({ error: error.value }).render()
          }

          if (isPending.value && FallbackComponent) {
            return FallbackComponent(props).render()
          }

          if (result.value) {
            return result.value.render()
          }

          return ''
        }
      }
    }
  }
}

/**
 * Предзагрузка компонентов
 * @param {Function} loader - функция загрузки компонента
 * @returns {Promise} промис загрузки
 */
export function preload(loader) {
  return loader()
}

/**
 * Предзагрузка при наведении
 * @param {HTMLElement} element - элемент для отслеживания
 * @param {Function} loader - функция загрузки
 */
export function preloadOnHover(element, loader) {
  if (!isBrowser()) return

  let preloadTimer = null

  const handleMouseEnter = () => {
    preloadTimer = setTimeout(() => {
      preload(loader)
    }, 100) // Небольшая задержка
  }

  const handleMouseLeave = () => {
    if (preloadTimer) {
      clearTimeout(preloadTimer)
      preloadTimer = null
    }
  }

  element.addEventListener('mouseenter', handleMouseEnter)
  element.addEventListener('mouseleave', handleMouseLeave)

  // Очистка
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter)
    element.removeEventListener('mouseleave', handleMouseLeave)
    if (preloadTimer) clearTimeout(preloadTimer)
  }
}

/**
 * Предзагрузка при попадании в viewport
 * @param {HTMLElement} element - элемент для отслеживания
 * @param {Function} loader - функция загрузки
 * @param {Object} options - опции IntersectionObserver
 */
export function preloadOnViewport(element, loader, options = {}) {
  if (!isBrowser() || !window.IntersectionObserver) return

  const {
    rootMargin = '50px',
    threshold = 0
  } = options

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        preload(loader)
        observer.disconnect()
      }
    })
  }, { rootMargin, threshold })

  observer.observe(element)

  // Очистка
  return () => observer.disconnect()
}

/**
 * Создает chunk для code splitting
 * @param {string} name - имя чанка
 * @param {Function} factory - фабрика компонентов
 * @returns {Object} chunk объект
 */
export function createChunk(name, factory) {
  return {
    name,
    factory,
    loaded: false,
    loading: false,
    result: null,

    load() {
      if (this.loaded) return Promise.resolve(this.result)
      if (this.loading) return this.loadingPromise

      this.loading = true
      this.loadingPromise = factory().then(result => {
        this.result = result
        this.loaded = true
        this.loading = false
        return result
      }).catch(error => {
        this.loading = false
        throw error
      })

      return this.loadingPromise
    }
  }
}

/**
 * Управление chunks
 */
export const ChunkManager = {
  chunks: new Map(),

  register(name, chunk) {
    this.chunks.set(name, chunk)
  },

  async load(name) {
    const chunk = this.chunks.get(name)
    if (!chunk) {
      throw new Error(`Chunk "${name}" not found`)
    }
    return chunk.load()
  },

  preload(name) {
    const chunk = this.chunks.get(name)
    if (chunk) {
      chunk.load()
    }
  },

  getStats() {
    const stats = {}
    for (const [name, chunk] of this.chunks) {
      stats[name] = {
        loaded: chunk.loaded,
        loading: chunk.loading
      }
    }
    return stats
  }
}

// Импорт для совместимости
import { $state, $computed, $effect, onMount, onDestroy, isBrowser } from './reactivity.js'
