/**
 * AspScript Component Testing Utilities
 * Утилиты для тестирования компонентов
 */

const { JSDOM } = require('jsdom')

/**
 * Создает тестовую среду для компонентов
 * @param {string} html - HTML разметка
 * @param {Object} options - опции
 * @returns {Object} тестовая среда
 */
function createTestEnvironment(html = '', options = {}) {
  const {
    url = 'http://localhost:3000',
    userAgent = 'AspScript-Test/1.0'
  } = options

  // Создаем JSDOM окружение
  const dom = new JSDOM(html, {
    url,
    userAgent,
    pretendToBeVisual: true,
    resources: 'usable'
  })

  // Глобальные объекты для тестов
  global.window = dom.window
  global.document = dom.window.document
  global.navigator = dom.window.navigator
  global.HTMLElement = dom.window.HTMLElement

  // Мок для requestAnimationFrame
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16)
  global.cancelAnimationFrame = (id) => clearTimeout(id)

  // Мок для performance
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => []
  }

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    cleanup: () => {
      dom.window.close()
      delete global.window
      delete global.document
      delete global.navigator
      delete global.HTMLElement
      delete global.requestAnimationFrame
      delete global.cancelAnimationFrame
      delete global.performance
    }
  }
}

/**
 * Рендерит компонент для тестирования
 * @param {Function} component - компонент AspScript
 * @param {Object} props - пропсы
 * @param {Object} options - опции рендеринга
 * @returns {Object} результат рендеринга
 */
function renderComponent(component, props = {}, options = {}) {
  const {
    container: customContainer,
    hydrate = false
  } = options

  // Создаем контейнер
  const container = customContainer || document.createElement('div')

  try {
    // Создаем экземпляр компонента
    const instance = component(props)

    if (!instance || !instance.render) {
      throw new Error('Component must return an object with render method')
    }

    // Получаем HTML
    const html = instance.render()

    if (typeof html === 'string') {
      // Устанавливаем HTML
      container.innerHTML = html

      if (hydrate) {
        // Имитируем гидратацию (в реальности здесь была бы логика)
        container.setAttribute('data-hydrated', 'true')
      }
    } else if (html && html.type) {
      // React Native стиль (для кросс-платформенных тестов)
      container._nativeTree = html
    }

    return {
      container,
      instance,
      html,
      // Утилиты для поиска элементов
      findByText: (text) => findByText(container, text),
      findByTestId: (testId) => findByTestId(container, testId),
      findByClass: (className) => findByClass(container, className),
      // События
      fireEvent: (element, eventName, eventData = {}) => fireEvent(element, eventName, eventData),
      // Очистка
      unmount: () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container)
        }
      }
    }

  } catch (error) {
    throw new Error(`Failed to render component: ${error.message}`)
  }
}

/**
 * Находит элемент по тексту
 * @param {Element} container - контейнер
 * @param {string} text - текст для поиска
 * @returns {Element} найденный элемент
 */
function findByText(container, text) {
  const elements = container.querySelectorAll('*')
  for (const element of elements) {
    if (element.textContent && element.textContent.includes(text)) {
      return element
    }
  }
  return null
}

/**
 * Находит элемент по test-id
 * @param {Element} container - контейнер
 * @param {string} testId - test id
 * @returns {Element} найденный элемент
 */
function findByTestId(container, testId) {
  return container.querySelector(`[data-testid="${testId}"]`)
}

/**
 * Находит элемент по классу
 * @param {Element} container - контейнер
 * @param {string} className - имя класса
 * @returns {Element} найденный элемент
 */
function findByClass(container, className) {
  return container.querySelector(`.${className}`)
}

/**
 * Имитирует событие на элементе
 * @param {Element} element - элемент
 * @param {string} eventName - имя события
 * @param {Object} eventData - данные события
 */
function fireEvent(element, eventName, eventData = {}) {
  if (!element) return

  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail: eventData
  })

  element.dispatchEvent(event)
}

/**
 * Ожидает изменения в компоненте
 * @param {Function} callback - функция проверки
 * @param {Object} options - опции ожидания
 * @returns {Promise} промис разрешения
 */
function waitFor(callback, options = {}) {
  const {
    timeout = 1000,
    interval = 50
  } = options

  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const check = () => {
      try {
        const result = callback()
        if (result) {
          resolve(result)
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('waitFor timeout'))
          return
        }

        setTimeout(check, interval)
      } catch (error) {
        reject(error)
      }
    }

    check()
  })
}

/**
 * Создает мок для реактивных переменных
 * @param {any} initialValue - начальное значение
 * @returns {Object} мок реактивной переменной
 */
function mockReactive(initialValue) {
  let value = initialValue
  const subscribers = new Set()

  return {
    get value() {
      return value
    },
    set value(newValue) {
      value = newValue
      subscribers.forEach(callback => callback(newValue))
    },

    subscribe(callback) {
      subscribers.add(callback)
      return () => subscribers.delete(callback)
    },

    getSubscribersCount() {
      return subscribers.size
    }
  }
}

/**
 * Создает мок для эффектов
 * @returns {Object} мок эффекта
 */
function mockEffect() {
  const calls = []

  const effect = (callback) => {
    calls.push(callback)
    // Имитируем немедленный вызов
    callback()
    return () => {} // cleanup function
  }

  effect.getCalls = () => calls
  effect.getCallCount = () => calls.length

  return effect
}

/**
 * Тестовый рендерер для snapshot тестирования
 * @param {Function} component - компонент
 * @param {Object} props - пропсы
 * @returns {string} нормализованный HTML
 */
function createSnapshotRenderer(component, props = {}) {
  return () => {
    const result = renderComponent(component, props)
    const html = result.container.innerHTML

    // Нормализация HTML для snapshot
    return normalizeHTML(html)
  }
}

/**
 * Нормализует HTML для snapshot тестирования
 * @param {string} html - HTML строка
 * @returns {string} нормализованный HTML
 */
function normalizeHTML(html) {
  return html
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы
    .replace(/>\s+</g, '><') // Удаляем пробелы между тегами
    .trim()
}

/**
 * Групповые тестовые утилиты
 */
const testUtils = {
  // Установка/очистка тестовой среды
  setupTestEnvironment: (html = '') => createTestEnvironment(html),
  cleanupTestEnvironment: (env) => env.cleanup(),

  // Рендеринг компонентов
  render: renderComponent,

  // Поиск элементов
  findByText,
  findByTestId,
  findByClass,

  // События
  fireEvent,

  // Асинхронные утилиты
  waitFor,

  // Моки
  mockReactive,
  mockEffect,

  // Snapshot
  createSnapshotRenderer,
  normalizeHTML
}

module.exports = testUtils
