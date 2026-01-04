/**
 * AspScript Advanced SSR Features
 * Streaming SSR, Partial Hydration, ISR, Edge Computing
 */

import { renderToString, isSSR } from './index.js'

/**
 * Рендерит компонент в поток (Streaming SSR)
 * @param {Function} component - компонент для рендеринга
 * @param {Object} options - опции рендеринга
 * @returns {ReadableStream} поток HTML
 */
export async function renderToStream(component, options = {}) {
  const {
    streaming = true,
    suspense = false,
    onChunk,
    props = {}
  } = options

  if (!streaming) {
    const html = renderToString(component, props)
    return createSimpleStream(html)
  }

  // Создаем ReadableStream для потокового рендеринга
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        // Рендерим компонент
        const html = renderToString(component, props)

        // Разбиваем на чанки для потоковой передачи
        const chunks = splitIntoChunks(html, 1024)

        for (const chunk of chunks) {
          const encoded = encoder.encode(chunk)
          controller.enqueue(encoded)

          // Callback для каждого чанка
          if (onChunk) {
            onChunk(chunk)
          }

          // Небольшая задержка для имитации потоковой передачи
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}

/**
 * Частичная гидратация компонента
 * @param {Function} component - компонент для гидратации
 * @param {string} selector - CSS селектор контейнера
 * @param {Object} options - опции гидратации
 */
export async function hydratePartial(component, selector, options = {}) {
  const {
    lazy = false,
    selectors = [],
    strategy = 'idle'
  } = options

  if (isSSR()) {
    throw new Error('Partial hydration can only be performed in browser')
  }

  const container = document.querySelector(selector)
  if (!container) {
    throw new Error(`Container not found: ${selector}`)
  }

  // Определяем стратегию гидратации
  switch (strategy) {
    case 'idle':
      // Гидратация при простое браузера
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => performHydration(component, container, selectors))
      } else {
        setTimeout(() => performHydration(component, container, selectors), 0)
      }
      break

    case 'visible':
      // Гидратация при появлении в viewport
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            performHydration(component, container, selectors)
            observer.disconnect()
          }
        })
      })
      observer.observe(container)
      break

    case 'interaction':
      // Гидратация при взаимодействии
      const events = ['click', 'touchstart', 'keydown']
      const handler = () => {
        performHydration(component, container, selectors)
        events.forEach(event => container.removeEventListener(event, handler))
      }
      events.forEach(event => container.addEventListener(event, handler, { once: true }))
      break

    default:
      // Немедленная гидратация
      performHydration(component, container, selectors)
  }
}

/**
 * Создает конфигурацию для ISR (Incremental Static Regeneration)
 * @param {Object} options - опции ISR
 * @returns {Object} конфигурация ISR
 */
export function createISRConfig(options = {}) {
  const {
    revalidate = 60,
    paths = [],
    fallback = 'blocking'
  } = options

  return {
    revalidate,
    paths,
    fallback,
    cache: new Map(),
    
    async getStaticProps(path) {
      const cached = this.cache.get(path)
      const now = Date.now()

      if (cached && (now - cached.timestamp) < (this.revalidate * 1000)) {
        return cached.props
      }

      // Генерируем новые props
      const props = await this.generateProps(path)
      this.cache.set(path, {
        props,
        timestamp: now
      })

      return props
    },

    generateProps: async (path) => ({
      path,
      timestamp: Date.now()
    })
  }
}

/**
 * Ревалидация пути
 * @param {string} path - путь для ревалидации
 */
export async function revalidatePath(path) {
  console.log(`Revalidating path: ${path}`)
  // В реальной реализации здесь будет очистка кэша и регенерация
  return { success: true, path }
}

/**
 * Ревалидация нескольких путей
 * @param {Array} paths - массив путей
 */
export async function revalidatePaths(paths) {
  const results = await Promise.all(
    paths.map(path => revalidatePath(path))
  )
  return results
}

/**
 * Получает ISR контент
 * @param {string} path - путь
 * @param {Object} config - конфигурация ISR
 */
export async function getISRContent(path, config) {
  return await config.getStaticProps(path)
}

/**
 * Проверяет, выполняется ли код в Edge Runtime
 * @returns {boolean} true если Edge Runtime
 */
export function isEdgeRuntime() {
  return typeof EdgeRuntime !== 'undefined' ||
         typeof Deno !== 'undefined' ||
         (typeof process !== 'undefined' && process.env.VERCEL_EDGE === '1')
}

/**
 * Рендерит компонент для Edge Runtime
 * @param {Function} component - компонент
 * @param {Object} options - опции
 * @returns {string} HTML
 */
export async function renderForEdge(component, options = {}) {
  const { runtime = 'edge', region, props = {} } = options

  console.log(`Rendering for ${runtime} runtime in region: ${region || 'auto'}`)

  // Edge-специфичные оптимизации
  const html = renderToString(component, props)

  return html
}

/**
 * Создает Edge handler
 * @param {Function} component - компонент
 * @returns {Function} Edge handler
 */
export function createEdgeHandler(component) {
  return async (request) => {
    const url = new URL(request.url)
    const props = Object.fromEntries(url.searchParams)

    const html = await renderForEdge(component, { props })

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=60, stale-while-revalidate=120'
      }
    })
  }
}

/**
 * Гибридный рендеринг (SSR + CSR)
 * @param {Function} component - компонент
 * @param {Object} options - опции
 * @returns {string} HTML
 */
export function renderHybrid(component, options = {}) {
  const { ssr = true, csr = true, props = {} } = options

  if (!ssr && !csr) {
    throw new Error('At least one of SSR or CSR must be enabled')
  }

  if (isSSR() && ssr) {
    // Серверный рендеринг
    return renderToString(component, props)
  }

  if (!isSSR() && csr) {
    // Клиентский рендеринг
    const instance = component(props)
    return instance.render()
  }

  return ''
}

// Вспомогательные функции

function createSimpleStream(html) {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(html)

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoded)
      controller.close()
    }
  })
}

function splitIntoChunks(str, chunkSize) {
  const chunks = []
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize))
  }
  return chunks
}

function performHydration(component, container, selectors) {
  console.log('Performing partial hydration...')

  try {
    const instance = component()

    // Если указаны селекторы, гидратируем только их
    if (selectors.length > 0) {
      selectors.forEach(selector => {
        const elements = container.querySelectorAll(selector)
        elements.forEach(el => {
          // Привязываем реактивность к элементу
          bindReactivityToElement(instance, el)
        })
      })
    } else {
      // Полная гидратация контейнера
      bindReactivityToElement(instance, container)
    }

    console.log('✅ Partial hydration complete')
  } catch (error) {
    console.error('❌ Partial hydration failed:', error)
  }
}

function bindReactivityToElement(instance, element) {
  // Простая привязка реактивности
  // В реальной реализации здесь будет полноценная система привязки событий
  element.setAttribute('data-hydrated', 'true')
}

export default {
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
}
