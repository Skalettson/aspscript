/**
 * AspScript DevTools Integration v1.1.0
 * Интеграция с браузерными DevTools для отладки AspScript приложений
 */

import { isBrowser } from './reactivity.js'

// Глобальный объект DevTools API
const devtoolsApi = {
  // Component tree inspection
  getComponentTree: () => getComponentTree(),

  // Reactive state inspection
  getReactiveState: (componentId) => getReactiveState(componentId),

  // Performance metrics
  getPerformanceMetrics: () => getPerformanceMetrics(),

  // Hot reload trigger
  triggerHotReload: (filePath) => triggerHotReload(filePath),

  // Source map utilities
  getSourceMap: (filePath) => getSourceMap(filePath),

  // Error tracking
  getErrors: () => getErrors(),

  // Network monitoring
  getNetworkRequests: () => getNetworkRequests(),

  // Memory usage
  getMemoryUsage: () => getMemoryUsage(),

  // Timeline recording
  startRecording: () => startRecording(),
  stopRecording: () => stopRecording(),
  getTimeline: () => getTimeline()
}

// Регистрируем глобальный объект в браузере
if (isBrowser() && typeof window !== 'undefined') {
  window.__ASPSCRIPT_DEVTOOLS__ = devtoolsApi

  // Добавляем слушатель для сообщений из DevTools
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ASPSCRIPT_DEVTOOLS') {
      handleDevToolsMessage(event.data)
    }
  })

  // Отправляем сообщение о готовности
  window.postMessage({
    type: 'ASPSCRIPT_DEVTOOLS_READY',
    payload: {
      version: '1.1.0',
      features: Object.keys(devtoolsApi)
    }
  }, '*')
}

/**
 * Получает дерево компонентов
 * @returns {Object} дерево компонентов
 */
function getComponentTree() {
  if (!isBrowser()) return null

  const walkDOM = (element, depth = 0) => {
    const componentData = getComponentData(element)

    const node = {
      id: generateId(),
      tagName: element.tagName?.toLowerCase(),
      className: element.className,
      component: componentData,
      children: [],
      depth
    }

    // Рекурсивно обходим дочерние элементы
    for (const child of element.children) {
      if (child.tagName && depth < 10) { // Ограничение глубины
        node.children.push(walkDOM(child, depth + 1))
      }
    }

    return node
  }

  const root = document.getElementById('app')
  return root ? walkDOM(root) : null
}

/**
 * Получает данные компонента из DOM элемента
 * @param {HTMLElement} element - DOM элемент
 * @returns {Object|null} данные компонента
 */
function getComponentData(element) {
  // Ищем данные компонента в атрибутах или dataset
  const componentId = element.getAttribute('data-aspscript-component')
  const componentName = element.getAttribute('data-aspscript-name')

  if (componentId && componentName) {
    return {
      id: componentId,
      name: componentName,
      file: element.getAttribute('data-aspscript-file'),
      props: parseProps(element.getAttribute('data-aspscript-props')),
      state: parseState(element.getAttribute('data-aspscript-state'))
    }
  }

  return null
}

/**
 * Парсит пропсы компонента
 * @param {string} propsString - строка с пропсами
 * @returns {Object} распарсенные пропсы
 */
function parseProps(propsString) {
  if (!propsString) return {}

  try {
    return JSON.parse(propsString)
  } catch (error) {
    return { error: 'Failed to parse props' }
  }
}

/**
 * Парсит состояние компонента
 * @param {string} stateString - строка с состоянием
 * @returns {Object} распарсенное состояние
 */
function parseState(stateString) {
  if (!stateString) return {}

  try {
    return JSON.parse(stateString)
  } catch (error) {
    return { error: 'Failed to parse state' }
  }
}

/**
 * Получает реактивное состояние компонента
 * @param {string} componentId - ID компонента
 * @returns {Object} состояние компонента
 */
function getReactiveState(componentId) {
  if (!isBrowser()) return null

  // Ищем элемент компонента
  const element = document.querySelector(`[data-aspscript-component="${componentId}"]`)
  if (!element) return null

  // Получаем состояние из элемента
  const stateString = element.getAttribute('data-aspscript-reactive-state')
  if (!stateString) return null

  try {
    return JSON.parse(stateString)
  } catch (error) {
    return { error: 'Failed to parse reactive state' }
  }
}

/**
 * Получает метрики производительности
 * @returns {Object} метрики производительности
 */
function getPerformanceMetrics() {
  if (!isBrowser() || !performance) return null

  const navigation = performance.getEntriesByType('navigation')[0]
  const paint = performance.getEntriesByType('paint')
  const resources = performance.getEntriesByType('resource')

  return {
    timing: {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
    },
    resources: resources.map(r => ({
      name: r.name,
      type: r.initiatorType,
      size: r.transferSize,
      duration: r.duration
    })),
    memory: performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null
  }
}

/**
 * Триггерит горячую перезагрузку
 * @param {string} filePath - путь к файлу
 */
function triggerHotReload(filePath) {
  if (!isBrowser()) return

  // Отправляем сообщение о необходимости HMR
  window.postMessage({
    type: 'ASPSCRIPT_HMR',
    payload: { filePath }
  }, '*')
}

/**
 * Получает source map для файла
 * @param {string} filePath - путь к файлу
 * @returns {Object|null} source map
 */
function getSourceMap(filePath) {
  if (!isBrowser()) return null

  // Ищем source map в document.head
  const sourceMapLink = document.querySelector(`link[rel="sourcemap"][href*="${filePath}"]`)
  if (!sourceMapLink) return null

  const sourceMapUrl = sourceMapLink.href

  // В реальной реализации здесь был бы fetch source map
  // Пока возвращаем placeholder
  return {
    version: 3,
    file: filePath,
    sources: [filePath],
    mappings: '',
    names: []
  }
}

/**
 * Получает ошибки приложения
 * @returns {Array} массив ошибок
 */
function getErrors() {
  // В реальной реализации здесь собираются ошибки из error boundary
  return []
}

/**
 * Получает сетевые запросы
 * @returns {Array} массив запросов
 */
function getNetworkRequests() {
  if (!isBrowser() || !performance) return []

  const resources = performance.getEntriesByType('resource')
  return resources.map(r => ({
    url: r.name,
    method: 'GET', // Performance API не дает метод
    status: 200,   // Performance API не дает статус
    size: r.transferSize,
    duration: r.duration,
    type: r.initiatorType
  }))
}

/**
 * Получает использование памяти
 * @returns {Object} данные о памяти
 */
function getMemoryUsage() {
  if (!isBrowser() || !performance.memory) return null

  return {
    used: performance.memory.usedJSHeapSize,
    total: performance.memory.totalJSHeapSize,
    limit: performance.memory.jsHeapSizeLimit,
    usedPercent: (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize * 100).toFixed(1)
  }
}

/**
 * Начинает запись таймлайна
 */
function startRecording() {
  if (!isBrowser()) return

  // Очищаем предыдущие записи
  timelineEvents = []

  // Начинаем запись
  isRecording = true
  recordingStart = performance.now()

  console.log('🎬 Started timeline recording')
}

/**
 * Останавливает запись таймлайна
 */
function stopRecording() {
  if (!isBrowser()) return

  isRecording = false
  console.log('🎬 Stopped timeline recording')
}

/**
 * Получает таймлайн событий
 * @returns {Array} массив событий таймлайна
 */
function getTimeline() {
  return timelineEvents || []
}

// Переменные для таймлайна
let isRecording = false
let recordingStart = 0
let timelineEvents = []

/**
 * Добавляет событие в таймлайн
 * @param {Object} event - событие
 */
function addTimelineEvent(event) {
  if (!isRecording) return

  timelineEvents.push({
    ...event,
    timestamp: performance.now() - recordingStart
  })
}

// Экспортируем функции для использования в приложении
export {
  devtoolsApi,
  addTimelineEvent,
  getComponentTree,
  getReactiveState,
  getPerformanceMetrics
}

// ============================================================================
// DEVTOOLS MESSAGE HANDLING
// ============================================================================

/**
 * Обрабатывает сообщения от DevTools
 * @param {Object} message - сообщение
 */
function handleDevToolsMessage(message) {
  const { action, payload } = message

  switch (action) {
    case 'INSPECT_COMPONENT':
      const componentData = getReactiveState(payload.componentId)
      sendToDevTools('COMPONENT_DATA', componentData)
      break

    case 'GET_METRICS':
      const metrics = getPerformanceMetrics()
      sendToDevTools('METRICS_DATA', metrics)
      break

    case 'TRIGGER_HMR':
      triggerHotReload(payload.filePath)
      break

    case 'START_RECORDING':
      startRecording()
      break

    case 'STOP_RECORDING':
      stopRecording()
      const timeline = getTimeline()
      sendToDevTools('TIMELINE_DATA', timeline)
      break

    default:
      console.warn('Unknown DevTools action:', action)
  }
}

/**
 * Отправляет сообщение в DevTools
 * @param {string} type - тип сообщения
 * @param {*} payload - данные
 */
function sendToDevTools(type, payload) {
  if (isBrowser()) {
    window.postMessage({
      type: 'ASPSCRIPT_DEVTOOLS_RESPONSE',
      payload: { type, payload }
    }, '*')
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Генерирует уникальный ID
 * @returns {string} уникальный ID
 */
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// ============================================================================
// COMPONENT HOOKS FOR DEVTOOLS
// ============================================================================

/**
 * Хук для отслеживания жизненного цикла компонента в DevTools
 * @param {string} componentName - имя компонента
 * @param {Object} props - пропсы компонента
 * @param {Object} state - состояние компонента
 * @returns {Object} DevTools хуки
 */
export function useDevTools(componentName, props = {}, state = {}) {
  const componentId = generateId()

  // Отправляем данные в DevTools
  if (isBrowser()) {
    addTimelineEvent({
      type: 'COMPONENT_MOUNT',
      component: componentName,
      id: componentId,
      props,
      state
    })
  }

  return {
    componentId,

    // Хук для обновления состояния в DevTools
    updateState: (newState) => {
      if (isBrowser()) {
        addTimelineEvent({
          type: 'COMPONENT_UPDATE',
          component: componentName,
          id: componentId,
          state: newState
        })
      }
    },

    // Хук для размонтирования
    unmount: () => {
      if (isBrowser()) {
        addTimelineEvent({
          type: 'COMPONENT_UNMOUNT',
          component: componentName,
          id: componentId
        })
      }
    }
  }
}

/**
 * Performance tracking hook для DevTools
 * @param {string} operationName - имя операции
 * @returns {Function} функция остановки таймера
 */
export function trackPerformance(operationName) {
  if (!isBrowser()) return () => {}

  const startTime = performance.now()

  addTimelineEvent({
    type: 'PERFORMANCE_START',
    operation: operationName
  })

  return () => {
    const duration = performance.now() - startTime

    addTimelineEvent({
      type: 'PERFORMANCE_END',
      operation: operationName,
      duration
    })

    console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`)
  }
}
