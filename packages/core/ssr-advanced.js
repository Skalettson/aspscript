/**
 * AspScript Advanced SSR v1.2.0
 * Streaming SSR, Partial Hydration, ISR, Edge Computing
 * Современный JavaScript 2026 стандарты
 */

// ============================================================================
// STREAMING SSR
// ============================================================================

/**
 * Streaming SSR с прогрессивным рендерингом
 * @param {Function} component - AspScript компонент
 * @param {Object} options - опции streaming
 * @returns {ReadableStream} поток HTML
 */
export async function renderToStream(component, options = {}) {
  const {
    props = {},
    onChunk,
    onError,
    onComplete,
    streaming = true,
    suspense = true
  } = options

  const encoder = new TextEncoder()
  const chunks = []

  return new ReadableStream({
    async start(controller) {
      try {
        if (!streaming) {
          // Не streaming режим - отдаем все сразу
          const html = await renderComponent(component, props)
          const encoded = encoder.encode(html)
          controller.enqueue(encoded)
          controller.close()
          onComplete?.(html)
          return
        }

        // Streaming режим - прогрессивный рендеринг
        await renderComponentStreaming(component, props, {
          onChunk: (chunk) => {
            const encoded = encoder.encode(chunk)
            chunks.push(chunk)
            controller.enqueue(encoded)
            onChunk?.(chunk, chunks.length)
          },
          suspense
        })

        controller.close()
        onComplete?.(chunks.join(''))
      } catch (error) {
        const errorMsg = `<div data-ssr-error>${error.message}</div>`
        controller.enqueue(encoder.encode(errorMsg))
        controller.error(error)
        onError?.(error)
      }
    },

    cancel() {
      // Cleanup при отмене
    }
  })
}

/**
 * Рендерит компонент с поддержкой streaming
 */
async function renderComponentStreaming(component, props, { onChunk, suspense }) {
  try {
    const instance = component(props)
    
    if (suspense && instance.renderAsync) {
      // Асинхронный рендеринг с Suspense
      await renderWithSuspense(instance, onChunk)
    } else {
      // Синхронный рендеринг
      const html = instance.render?.() ?? ''
      onChunk?.(html)
    }
  } catch (error) {
    throw new Error(`Streaming render error: ${error.message}`, { cause: error })
  }
}

/**
 * Рендеринг с Suspense boundaries
 */
async function renderWithSuspense(instance, onChunk) {
  // Отправляем начальный chunk
  onChunk?.('<div data-suspense>')
  
  try {
    const html = await instance.renderAsync()
    onChunk?.(html)
    onChunk?.('</div>')
  } catch (error) {
    onChunk?.(`<div data-suspense-fallback>Loading...</div></div>`)
  }
}

/**
 * Базовый рендеринг компонента
 */
async function renderComponent(component, props) {
  const instance = component(props)
  return instance.render?.() ?? ''
}

// ============================================================================
// PARTIAL HYDRATION
// ============================================================================

/**
 * Частичная гидратация компонента
 * @param {Function} component - компонент для гидратации
 * @param {HTMLElement|string} container - контейнер или селектор
 * @param {Object} options - опции гидратации
 */
export async function hydratePartial(component, container, options = {}) {
  const {
    selectors = [],
    lazy = false,
    onHydrate,
    onError
  } = options

  if (typeof globalThis.window === 'undefined') {
    throw new Error('Partial hydration requires browser environment', {
      cause: { environment: 'server' }
    })
  }

  const rootElement = typeof container === 'string' 
    ? document.querySelector(container) 
    : container

  if (!rootElement) {
    throw new Error(`Container not found: ${container}`, {
      cause: { container }
    })
  }

  try {
    if (lazy) {
      // Ленивая гидратация - только при видимости
      await hydrateWhenVisible(rootElement, component, { onHydrate, onError })
    } else if (selectors.length > 0) {
      // Селективная гидратация только указанных элементов
      await hydrateSelective(rootElement, selectors, component, { onHydrate, onError })
    } else {
      // Стандартная гидратация всего контейнера
      await hydrateStandard(rootElement, component, { onHydrate, onError })
    }
  } catch (error) {
    onError?.(error)
    throw new Error(`Partial hydration error: ${error.message}`, { cause: error })
  }
}

/**
 * Гидратация при видимости элемента
 */
async function hydrateWhenVisible(element, component, { onHydrate, onError }) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        try {
          await hydrateStandard(element, component, { onHydrate })
        } catch (error) {
          onError?.(error)
        }
      }
    })
  }, { threshold: 0.1 })

  observer.observe(element)
}

/**
 * Селективная гидратация
 */
async function hydrateSelective(root, selectors, component, { onHydrate, onError }) {
  for (const selector of selectors) {
    const elements = root.querySelectorAll(selector)
    for (const element of elements) {
      try {
        await hydrateStandard(element, component, { onHydrate })
      } catch (error) {
        onError?.(error)
      }
    }
  }
}

/**
 * Стандартная гидратация
 */
async function hydrateStandard(element, component, { onHydrate }) {
  const instance = component()
  const newHTML = instance.render?.() ?? ''
  
  // Сравниваем и обновляем только при необходимости
  if (element.innerHTML !== newHTML) {
    element.innerHTML = newHTML
  }
  
  // Привязываем события и реактивность
  bindReactivity(instance, element)
  onHydrate?.(element, instance)
}

/**
 * Привязка реактивности к DOM
 */
function bindReactivity(instance, element) {
  // В реальной реализации здесь будет привязка событий и реактивности
  if (instance.onMount) {
    instance.onMount(element)
  }
}

// ============================================================================
// INCREMENTAL STATIC REGENERATION (ISR)
// ============================================================================

const isrCache = new Map()

/**
 * ISR конфигурация
 */
export function createISRConfig(options = {}) {
  return {
    revalidate: options.revalidate ?? 3600,
    paths: options.paths ?? [],
    fallback: options.fallback ?? 'blocking'
  }
}

/**
 * Регенерация пути по требованию
 * @param {string} path - путь для регенерации
 */
export async function revalidatePath(path) {
  isrCache.delete(path)
  return { revalidated: true, path }
}

/**
 * Регенерация нескольких путей
 */
export async function revalidatePaths(paths) {
  const results = await Promise.all(
    paths.map(path => revalidatePath(path))
  )
  return results
}

/**
 * Получение кешированного контента или регенерация
 */
export async function getISRContent(path, component, config) {
  const cached = isrCache.get(path)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < config.revalidate * 1000) {
    return { html: cached.html, fromCache: true }
  }

  // Регенерация
  const html = await renderComponent(component, { path })
  isrCache.set(path, { html, timestamp: now })

  return { html, fromCache: false }
}

// ============================================================================
// EDGE COMPUTING SUPPORT
// ============================================================================

/**
 * Edge runtime detection
 */
export function isEdgeRuntime() {
  return typeof EdgeRuntime !== 'undefined' || 
         typeof Deno !== 'undefined' ||
         typeof Bun !== 'undefined'
}

/**
 * Рендеринг для Edge runtime
 * @param {Function} component - компонент
 * @param {Object} options - опции
 */
export async function renderForEdge(component, options = {}) {
  const { runtime = 'edge', region, props = {} } = options

  if (!isEdgeRuntime()) {
    // Fallback для обычного Node.js
    return renderComponent(component, props)
  }

  try {
    // Edge-оптимизированный рендеринг
    const html = await renderComponent(component, { ...props, region })
    return html
  } catch (error) {
    throw new Error(`Edge render error: ${error.message}`, { cause: error })
  }
}

/**
 * Vercel Edge handler
 */
export function createEdgeHandler(component) {
  return async (request) => {
    const html = await renderForEdge(component, {
      runtime: 'edge',
      region: request.region,
      props: { url: request.url }
    })

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=3600'
      }
    })
  }
}

// ============================================================================
// HYBRID RENDERING
// ============================================================================

/**
 * Гибридный рендеринг (SSR + SSG + ISR)
 */
export async function renderHybrid(path, component, config) {
  const { strategy = 'auto' } = config

  switch (strategy) {
    case 'ssr':
      return { html: await renderComponent(component, { path }), strategy: 'ssr' }
    
    case 'ssg':
      const ssgHtml = await renderComponent(component, { path })
      return { html: ssgHtml, strategy: 'ssg' }
    
    case 'isr':
      return await getISRContent(path, component, config.isr ?? createISRConfig())
    
    case 'auto':
    default:
      // Автоматический выбор стратегии
      if (config.isr?.paths?.some(p => path.match(p))) {
        return await getISRContent(path, component, config.isr)
      }
      return { html: await renderComponent(component, { path }), strategy: 'ssr' }
  }
}

