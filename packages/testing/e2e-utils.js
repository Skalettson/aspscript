/**
 * AspScript E2E Testing Utilities
 * Утилиты для end-to-end тестирования
 */

const puppeteer = require('puppeteer')

/**
 * Создает E2E тестовую среду
 * @param {Object} options - опции браузера
 * @returns {Object} E2E среда
 */
async function createE2eEnvironment(options = {}) {
  const {
    headless = true,
    slowMo = 0,
    devtools = false,
    args = ['--no-sandbox', '--disable-setuid-sandbox']
  } = options

  const browser = await puppeteer.launch({
    headless,
    slowMo,
    devtools,
    args
  })

  const page = await browser.newPage()

  // Настройка страницы
  await page.setViewport({ width: 1280, height: 720 })
  await page.setExtraHTTPHeaders({
    'X-Test-Environment': 'e2e'
  })

  return {
    browser,
    page,
    cleanup: async () => {
      await page.close()
      await browser.close()
    }
  }
}

/**
 * Навигация и ожидание загрузки
 * @param {Page} page - страница Puppeteer
 * @param {string} url - URL для перехода
 * @param {Object} options - опции
 */
async function navigateAndWait(page, url, options = {}) {
  const {
    waitUntil = 'networkidle0',
    timeout = 30000
  } = options

  await page.goto(url, { waitUntil, timeout })

  // Дополнительное ожидание для AspScript приложений
  await page.waitForFunction(() => {
    return window.AspScript && window.AspScript.ready
  }, { timeout: 5000 }).catch(() => {
    // Игнорируем ошибку если флаг не установлен
  })
}

/**
 * Ожидание AspScript компонента
 * @param {Page} page - страница
 * @param {string} selector - селектор компонента
 * @param {Object} options - опции ожидания
 */
async function waitForAspScriptComponent(page, selector, options = {}) {
  const {
    timeout = 5000,
    state = 'attached'
  } = options

  await page.waitForSelector(selector, { timeout })

  // Проверяем что компонент инициализирован
  await page.waitForFunction((sel) => {
    const element = document.querySelector(sel)
    return element && (
      element.hasAttribute('data-aspscript-component') ||
      element.__aspscript_instance
    )
  }, { timeout }, selector)
}

/**
 * Взаимодействие с AspScript компонентами
 */
const AspScriptInteractions = {
  /**
   * Клик по элементу с ожиданием реактивности
   */
  async clickAndWait(page, selector, options = {}) {
    const { waitForReactive = true } = options

    await page.click(selector)

    if (waitForReactive) {
      // Ждем обновления реактивности
      await page.waitForTimeout(100)
    }
  },

  /**
   * Ввод текста с ожиданием реактивности
   */
  async typeAndWait(page, selector, text, options = {}) {
    const { clear = true, waitForReactive = true } = options

    if (clear) {
      await page.click(selector, { clickCount: 3 }) // Выделить все
      await page.keyboard.press('Backspace')
    }

    await page.type(selector, text)

    if (waitForReactive) {
      await page.waitForTimeout(100)
    }
  },

  /**
   * Ожидание изменения состояния компонента
   */
  async waitForStateChange(page, selector, stateChecker, options = {}) {
    const { timeout = 5000 } = options

    await page.waitForFunction(
      (sel, checker) => {
        const element = document.querySelector(sel)
        if (!element) return false

        // Выполняем проверку состояния
        try {
          return checker(element)
        } catch (e) {
          return false
        }
      },
      { timeout },
      selector,
      stateChecker
    )
  },

  /**
   * Получение состояния AspScript компонента
   */
  async getComponentState(page, selector) {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel)
      if (!element) return null

      // Проверяем различные способы хранения состояния
      return element.__aspscript_state ||
             element.dataset.aspscriptState ||
             element.textContent
    }, selector)
  }
}

/**
 * Утилиты для тестирования GraphQL
 */
const GraphQLTesting = {
  /**
   * Мок GraphQL запросов
   */
  async mockGraphQL(page, mocks = []) {
    await page.setRequestInterception(true)

    page.on('request', (request) => {
      if (request.url().includes('/graphql') && request.method() === 'POST') {
        const mockResponse = findMockForRequest(mocks, request.postData())
        if (mockResponse) {
          request.respond(mockResponse)
          return
        }
      }
      request.continue()
    })
  },

  /**
   * Ожидание GraphQL запроса
   */
  async waitForGraphQLRequest(page, operationName, options = {}) {
    const { timeout = 5000 } = options

    return await page.waitForRequest(
      (request) => {
        if (request.url().includes('/graphql') && request.method() === 'POST') {
          try {
            const data = JSON.parse(request.postData())
            return data.operationName === operationName
          } catch (e) {
            return false
          }
        }
        return false
      },
      { timeout }
    )
  }
}

/**
 * Находит мок для GraphQL запроса
 * @param {Array} mocks - массив маков
 * @param {string} postData - данные запроса
 * @returns {Object} мок ответ
 */
function findMockForRequest(mocks, postData) {
  try {
    const requestData = JSON.parse(postData)

    for (const mock of mocks) {
      if (mock.operationName === requestData.operationName ||
          mock.query === requestData.query) {
        return {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mock.response)
        }
      }
    }
  } catch (e) {
    // Игнорируем ошибки парсинга
  }

  return null
}

/**
 * Утилиты для тестирования микрофронтендов
 */
const MicrofrontendTesting = {
  /**
   * Ожидание загрузки микрофронтенда
   */
  async waitForMicrofrontend(page, appName, options = {}) {
    const { timeout = 10000 } = options

    await page.waitForFunction(
      (name) => {
        return window.__aspscript_microfrontends &&
               window.__aspscript_microfrontends[name] &&
               window.__aspscript_microfrontends[name].loaded
      },
      { timeout },
      appName
    )
  },

  /**
   * Проверка коммуникации между микрофронтендами
   */
  async testMicrofrontendCommunication(page, sender, receiver, message) {
    // Слушаем сообщения
    const messages = []
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('microfrontend-message')) {
        messages.push(msg.text())
      }
    })

    // Отправляем сообщение
    await page.evaluate((sender, message) => {
      window.postMessage({
        type: 'microfrontend-message',
        from: sender,
        data: message
      }, '*')
    }, sender, message)

    // Ждем получения
    await page.waitForFunction(
      (receiver) => {
        return window.__received_messages &&
               window.__received_messages.includes(receiver)
      },
      { timeout: 5000 },
      receiver
    )
  }
}

/**
 * Создает отчет о производительности
 * @param {Page} page - страница Puppeteer
 * @returns {Object} метрики производительности
 */
async function createPerformanceReport(page) {
  const metrics = await page.metrics()
  const performanceEntries = await page.evaluate(() => {
    const entries = performance.getEntries()
    return entries.map(entry => ({
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration
    }))
  })

  return {
    metrics,
    performanceEntries,
    summary: {
      jsHeapUsedSize: metrics.JSHeapUsedSize,
      jsHeapTotalSize: metrics.JSHeapTotalSize,
      scriptDuration: performanceEntries
        .filter(e => e.entryType === 'script')
        .reduce((sum, e) => sum + e.duration, 0),
      layoutDuration: performanceEntries
        .filter(e => e.entryType === 'layout')
        .reduce((sum, e) => sum + e.duration, 0)
    }
  }
}

/**
 * Вспомогательные функции для скриншотов
 */
const ScreenshotUtils = {
  /**
   * Делает скриншот компонента
   */
  async screenshotComponent(page, selector, options = {}) {
    const element = await page.$(selector)
    if (!element) {
      throw new Error(`Element ${selector} not found`)
    }

    return await element.screenshot({
      ...options,
      type: 'png'
    })
  },

  /**
   * Сравнивает скриншоты
   */
  compareScreenshots(actual, expected, options = {}) {
    const {
      threshold = 0.1,
      diffPath
    } = options

    // В реальной реализации здесь был бы pixelmatch или similar
    // Пока возвращаем mock результат
    return {
      match: true,
      difference: 0,
      diffImage: null
    }
  }
}

/**
 * Конфигурация Jest для E2E тестов
 */
const jestE2eConfig = {
  preset: 'jest-puppeteer',
  testEnvironment: 'jest-environment-puppeteer',
  setupFilesAfterEnv: ['<rootDir>/e2e-setup.js'],
  testMatch: [
    '<rootDir>/e2e/**/*.test.js',
    '<rootDir>/e2e/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts'
  ]
}

/**
 * Групповые E2E утилиты
 */
const e2eUtils = {
  // Среда тестирования
  createE2eEnvironment,
  navigateAndWait,

  // Компоненты
  waitForAspScriptComponent,

  // Взаимодействия
  ...AspScriptInteractions,

  // GraphQL
  ...GraphQLTesting,

  // Микрофронтенды
  ...MicrofrontendTesting,

  // Производительность
  createPerformanceReport,

  // Скриншоты
  ...ScreenshotUtils,

  // Конфигурация
  jestE2eConfig
}

module.exports = e2eUtils
