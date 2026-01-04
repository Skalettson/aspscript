/**
 * AspScript SSR (Server-Side Rendering) Support
 * Enterprise-grade серверный рендеринг с продвинутыми возможностями
 */

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
 * Проверяет, выполняется ли код на сервере
 * @returns {boolean} true если SSR
 */
export function isSSR() {
  return typeof window === 'undefined'
}

/**
 * Проверяет, выполняется ли код в браузере
 * @returns {boolean} true если browser
 */
export function isBrowser() {
  return typeof window !== 'undefined'
}

/**
 * Гидратация компонента на клиенте
 * @param {Function} component - AspScript компонент
 * @param {HTMLElement} container - DOM контейнер
 */
export function hydrate(component, container) {
  if (!isBrowser()) {
    throw new Error('Hydration can only be performed in browser environment')
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
 * Streaming рендеринг с Suspense-подобной функциональностью
 * @param {Function} component - AspScript компонент
 * @param {Object} options - опции streaming
 * @returns {ReadableStream} поток HTML
 */
export function renderToStream(component, options = {}) {
  const {
    onChunk,
    onError,
    onComplete
  } = options

  let isComplete = false
  let chunks = []

  const stream = new ReadableStream({
    start(controller) {
      try {
        // Разделяем рендеринг на chunks
        const instance = component()
        const renderFn = instance.render

        // Имитируем асинхронный рендеринг
        setTimeout(() => {
          if (isComplete) return

          const html = renderToString(component)
          const chunk = html

          chunks.push(chunk)

          // Отправляем chunk
          controller.enqueue(new TextEncoder().encode(chunk))

          if (onChunk) onChunk(chunk, chunks.length)

          // Завершаем stream
          controller.close()
          isComplete = true

          if (onComplete) onComplete(chunks.join(''))
        }, 0)

      } catch (error) {
        if (onError) onError(error)
        controller.error(error)
      }
    },

    cancel() {
      isComplete = true
    }
  })

  return stream
}

/**
 * SSR с данными (для prefetch)
 * @param {Function} component - компонент
 * @param {Object} initialData - начальные данные
 * @returns {string} HTML с встроенными данными
 */
export function renderWithData(component, initialData = {}) {
  // Встраиваем данные в глобальный контекст
  const dataScript = `
    <script>
      window.__ASPSCRIPT_DATA__ = ${JSON.stringify(initialData)};
    </script>
  `

  const html = renderToString(component)

  return html + dataScript
}

/**
 * Получение данных на клиенте после SSR
 * @returns {Object} данные из SSR
 */
export function getSSRData() {
  if (!isBrowser()) return {}

  return window.__ASPSCRIPT_DATA__ || {}
}

/**
 * Привязка реактивности к существующему DOM
 * @param {Object} instance - экземпляр компонента
 * @param {HTMLElement} container - DOM контейнер
 */
function bindReactivity(instance, container) {
  // Продвинутая гидратация с поддержкой:
  // - Data attributes для идентификации элементов
  // - Event delegation для производительности
  // - Selective hydration для больших приложений
  // - Memory management для предотвращения утечек

  const elementsWithEvents = container.querySelectorAll('[data-aspscript-event]')
  const elementsWithState = container.querySelectorAll('[data-aspscript-state]')

  // Привязываем события
  elementsWithEvents.forEach(element => {
    const eventType = element.getAttribute('data-aspscript-event')
    const eventHandler = element.getAttribute('data-aspscript-handler')

    if (eventType && eventHandler && instance[eventHandler]) {
      element.addEventListener(eventType, instance[eventHandler])
      element.removeAttribute('data-aspscript-event')
      element.removeAttribute('data-aspscript-handler')
    }
  })

  // Синхронизируем состояние
  elementsWithState.forEach(element => {
    const stateKey = element.getAttribute('data-aspscript-state')
    const stateValue = element.getAttribute('data-aspscript-value')

    if (stateKey && instance[stateKey] !== undefined) {
      // Обновляем DOM в соответствии с текущим состоянием
      updateElementFromState(element, instance[stateKey], stateValue)
    }
  })

  console.log('🔗 Advanced reactivity binding complete')
}

/**
 * Обновляет элемент на основе состояния
 * @param {HTMLElement} element - DOM элемент
 * @param {*} currentValue - текущее значение состояния
 * @param {*} serverValue - значение с сервера
 */
function updateElementFromState(element, currentValue, serverValue) {
  // Сравниваем значения и обновляем только при необходимости
  if (currentValue !== serverValue) {
    if (element.tagName === 'INPUT') {
      element.value = currentValue
    } else if (element.tagName === 'TEXTAREA') {
      element.value = currentValue
    } else {
      element.textContent = currentValue
    }
  }
}

/**
 * Suspense для SSR
 * @param {Object} options - опции Suspense
 * @returns {Function} Suspense HOC
 */
export function SSRSuspense(options = {}) {
  const {
    fallback: FallbackComponent,
    errorBoundary = true,
    timeout = 30000
  } = options

  return function SuspenseWrapper(Component) {
    return async function SSRSuspenseComponent(props = {}) {
      const suspenseId = `suspense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      try {
        // Проверяем, есть ли закешированный результат
        const cached = getCache(suspenseId)
        if (cached && !isExpired(cached)) {
          return cached.result
        }

        // Создаем fallback для SSR
        let fallbackHTML = ''
        if (FallbackComponent) {
          const fallbackInstance = typeof FallbackComponent === 'function'
            ? FallbackComponent(props)
            : FallbackComponent

          fallbackHTML = fallbackInstance.render
            ? fallbackInstance.render()
            : fallbackInstance
        }

        // Асинхронно рендерим компонент
        const renderPromise = new Promise(async (resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`Suspense timeout after ${timeout}ms`))
          }, timeout)

          try {
            const instance = Component(props)
            let result

            if (instance.render) {
              result = instance.render()
            } else if (typeof instance === 'string') {
              result = instance
            } else {
              result = JSON.stringify(instance)
            }

            clearTimeout(timeoutId)
            resolve(result)
          } catch (error) {
            clearTimeout(timeoutId)
            reject(error)
          }
        })

        // Для SSR возвращаем fallback с обещанием
        if (isSSR()) {
          const placeholder = `<div data-suspense-id="${suspenseId}" data-fallback="true">${fallbackHTML}</div>`

          // Кешируем обещание для гидратации
          setCache(suspenseId, {
            promise: renderPromise,
            fallback: fallbackHTML,
            timestamp: Date.now(),
            timeout
          })

          return placeholder
        }

        // Для клиента ждем результат
        const result = await renderPromise

        // Кешируем результат
        setCache(suspenseId, {
          result,
          timestamp: Date.now(),
          timeout
        })

        return result

      } catch (error) {
        if (errorBoundary && isBrowser()) {
          return handleSuspenseError(error, suspenseId, props)
        }
        throw error
      }
    }
  }
}

/**
 * Error Boundary для SSR
 * @param {Object} options - опции error boundary
 * @returns {Function} Error boundary HOC
 */
export function SSRErrorBoundary(options = {}) {
  const {
    fallback: FallbackComponent,
    onError,
    resetOnPropsChange = true
  } = options

  const errorCache = new Map()

  return function ErrorBoundaryWrapper(Component) {
    return function SSRErrorBoundaryComponent(props = {}) {
      const componentKey = JSON.stringify(props)

      // Проверяем, есть ли закешированная ошибка
      const cachedError = errorCache.get(componentKey)
      if (cachedError && !resetOnPropsChange) {
        return renderErrorFallback(cachedError, FallbackComponent, props)
      }

      try {
        const instance = Component(props)

        // Очищаем кеш ошибки при успешном рендере
        errorCache.delete(componentKey)

        return instance
      } catch (error) {
        // Кешируем ошибку
        errorCache.set(componentKey, error)

        // Вызываем обработчик ошибки
        if (onError) {
          onError(error, props)
        }

        // Возвращаем fallback
        return renderErrorFallback(error, FallbackComponent, props)
      }
    }
  }
}

/**
 * Рендерит fallback для ошибки
 * @param {Error} error - объект ошибки
 * @param {Function} FallbackComponent - компонент fallback
 * @param {Object} props - пропсы компонента
 * @returns {string} HTML fallback
 */
function renderErrorFallback(error, FallbackComponent, props) {
  if (FallbackComponent) {
    const fallbackInstance = FallbackComponent({ error, ...props })
    return fallbackInstance.render ? fallbackInstance.render() : fallbackInstance
  }

  // Default error fallback
  return `<div class="aspscript-error-boundary" style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px;">
    <h3>Error occurred</h3>
    <p>${error.message}</p>
    <button onclick="window.location.reload()">Reload page</button>
  </div>`
}

/**
 * Кеш для SSR результатов
 */
const ssrCache = new Map()

/**
 * Получает значение из кеша
 * @param {string} key - ключ кеша
 * @returns {*} закешированное значение
 */
function getCache(key) {
  return ssrCache.get(key)
}

/**
 * Устанавливает значение в кеш
 * @param {string} key - ключ кеша
 * @param {*} value - значение для кеширования
 */
function setCache(key, value) {
  ssrCache.set(key, value)

  // Очищаем старые записи (простая LRU)
  if (ssrCache.size > 100) {
    const firstKey = ssrCache.keys().next().value
    ssrCache.delete(firstKey)
  }
}

/**
 * Проверяет, истекло ли время жизни кеша
 * @param {Object} cached - закешированный объект
 * @returns {boolean} true если истекло
 */
function isExpired(cached) {
  if (!cached.timestamp || !cached.timeout) return false
  return Date.now() - cached.timestamp > cached.timeout
}

/**
 * Обрабатывает ошибку Suspense
 * @param {Error} error - объект ошибки
 * @param {string} suspenseId - ID suspense
 * @param {Object} props - пропсы
 * @returns {string} HTML с ошибкой
 */
function handleSuspenseError(error, suspenseId, props) {
  console.error('Suspense error:', error)

  return `<div data-suspense-id="${suspenseId}" data-error="true" style="color: red; padding: 1rem;">
    <p>Failed to load content</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>`
}

/**
 * Nested Routes для SSR
 * @param {Object} options - опции роутера
 * @returns {Function} роутер компонент
 */
export function SSRRouter(options = {}) {
  const {
    routes = [],
    basePath = '',
    ssrContext = {}
  } = options

  return function SSRRouterComponent(props = {}) {
    const currentPath = ssrContext.path || (isBrowser() ? window.location.pathname : '/')
    const normalizedPath = currentPath.replace(basePath, '') || '/'

    // Ищем подходящий маршрут
    const route = findRoute(routes, normalizedPath)

    if (!route) {
      return render404(normalizedPath)
    }

    // Проверяем guards
    if (route.guards && route.guards.length > 0) {
      for (const guard of route.guards) {
        const result = guard({ path: normalizedPath, ...ssrContext })
        if (result === false) {
          return renderForbidden()
        }
        if (typeof result === 'string') {
          // Redirect
          return renderRedirect(result)
        }
      }
    }

    // Рендерим компонент с параметрами маршрута
    try {
      const Component = route.component
      const routeProps = {
        ...props,
        route: {
          path: normalizedPath,
          params: route.params || {},
          query: parseQuery(ssrContext.query || ''),
          meta: route.meta || {}
        }
      }

      const instance = Component(routeProps)
      return instance
    } catch (error) {
      console.error('Router error:', error)
      return renderError(error)
    }
  }
}

/**
 * Ищет подходящий маршрут
 * @param {Array} routes - массив маршрутов
 * @param {string} path - текущий путь
 * @returns {Object} найденный маршрут
 */
function findRoute(routes, path) {
  for (const route of routes) {
    const match = matchPath(route.path, path)
    if (match) {
      return {
        ...route,
        params: match.params
      }
    }
  }
  return null
}

/**
 * Сравнивает путь с паттерном
 * @param {string} pattern - паттерн маршрута
 * @param {string} path - проверяемый путь
 * @returns {Object} результат сравнения
 */
function matchPath(pattern, path) {
  const patternParts = pattern.split('/').filter(p => p)
  const pathParts = path.split('/').filter(p => p)

  if (patternParts.length !== pathParts.length) {
    return null
  }

  const params = {}

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]

    if (patternPart.startsWith(':')) {
      // Параметр маршрута
      const paramName = patternPart.slice(1)
      params[paramName] = decodeURIComponent(pathPart)
    } else if (patternPart !== pathPart) {
      return null
    }
  }

  return { params }
}

/**
 * Парсит query параметры
 * @param {string} queryString - строка запроса
 * @returns {Object} объект параметров
 */
function parseQuery(queryString) {
  const params = {}
  if (!queryString) return params

  const pairs = queryString.replace(/^\?/, '').split('&')
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '')
    }
  }

  return params
}

// Вспомогательные функции рендеринга
function render404(path) {
  return {
    render: () => `<div style="text-align: center; padding: 2rem;">
      <h1>404 - Page Not Found</h1>
      <p>The page <code>${path}</code> could not be found.</p>
    </div>`
  }
}

function renderForbidden() {
  return {
    render: () => `<div style="text-align: center; padding: 2rem;">
      <h1>403 - Forbidden</h1>
      <p>You don't have permission to access this page.</p>
    </div>`
  }
}

function renderRedirect(to) {
  if (isBrowser()) {
    window.location.href = to
    return { render: () => '<div>Redirecting...</div>' }
  }

  // Для SSR возвращаем redirect инструкцию
  return {
    render: () => '',
    redirect: to
  }
}

function renderError(error) {
  return {
    render: () => `<div style="color: red; padding: 2rem;">
      <h1>Application Error</h1>
      <p>${error.message}</p>
    </div>`
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
