/**
 * AspScript GraphQL Client
 * Легковесный GraphQL клиент для AspScript
 */

const { $state, $computed } = require('@aspscript/core')
const gql = require('graphql-tag')

/**
 * GraphQL клиент
 */
class GraphQLClient {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/graphql'
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    this.cache = options.cache !== false
    this.cacheStore = new Map()
    this.interceptors = {
      request: [],
      response: []
    }

    // Добавляем перехватчики
    if (options.onRequest) this.interceptors.request.push(options.onRequest)
    if (options.onResponse) this.interceptors.response.push(options.onResponse)
  }

  /**
   * Выполняет GraphQL запрос
   * @param {string} query - GraphQL запрос
   * @param {Object} variables - переменные запроса
   * @param {Object} options - опции запроса
   * @returns {Promise<Object>} результат запроса
   */
  async request(query, variables = {}, options = {}) {
    const {
      cache: useCache = this.cache,
      cacheKey,
      headers: requestHeaders = {}
    } = options

    // Генерируем ключ кеша
    const key = cacheKey || this.generateCacheKey(query, variables)

    // Проверяем кеш
    if (useCache && this.cacheStore.has(key)) {
      const cached = this.cacheStore.get(key)
      if (!this.isExpired(cached)) {
        return cached.data
      }
    }

    // Создаем тело запроса
    const body = {
      query: typeof query === 'string' ? query : query.loc?.source.body || query,
      variables
    }

    // Применяем перехватчики запроса
    let processedBody = body
    for (const interceptor of this.interceptors.request) {
      processedBody = await interceptor(processedBody)
    }

    try {
      // Выполняем запрос
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { ...this.headers, ...requestHeaders },
        body: JSON.stringify(processedBody)
      })

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      // Проверяем на ошибки GraphQL
      if (result.errors) {
        throw new GraphQLError(result.errors, result.data)
      }

      // Применяем перехватчики ответа
      let processedResult = result
      for (const interceptor of this.interceptors.response) {
        processedResult = await interceptor(processedResult)
      }

      // Кешируем результат
      if (useCache) {
        this.cacheStore.set(key, {
          data: processedResult.data,
          timestamp: Date.now(),
          ttl: options.ttl || 5 * 60 * 1000 // 5 минут по умолчанию
        })
      }

      return processedResult.data

    } catch (error) {
      // Применяем перехватчики ошибок
      for (const interceptor of this.interceptors.response) {
        if (interceptor.error) {
          await interceptor.error(error)
        }
      }
      throw error
    }
  }

  /**
   * Выполняет запрос (алиас для request)
   * @param {string} query - GraphQL запрос
   * @param {Object} variables - переменные
   * @returns {Promise<Object>} результат
   */
  async query(query, variables = {}) {
    return this.request(query, variables)
  }

  /**
   * Выполняет мутацию
   * @param {string} mutation - GraphQL мутация
   * @param {Object} variables - переменные
   * @returns {Promise<Object>} результат
   */
  async mutate(mutation, variables = {}) {
    return this.request(mutation, variables, { cache: false })
  }

  /**
   * Выполняет подписку (WebSocket/SSE)
   * @param {string} subscription - GraphQL подписка
   * @param {Object} variables - переменные
   * @param {Function} callback - callback для обновлений
   * @returns {Function} функция отмены подписки
   */
  subscribe(subscription, variables = {}, callback) {
    // В базовой реализации используем polling
    // В продакшене здесь будет WebSocket/SSE
    const poll = async () => {
      try {
        const result = await this.request(subscription, variables, { cache: false })
        callback(result)
      } catch (error) {
        console.error('Subscription error:', error)
      }
    }

    // Запускаем polling
    const interval = setInterval(poll, 5000) // каждые 5 секунд

    // Немедленно выполняем первый запрос
    poll()

    // Возвращаем функцию отмены
    return () => clearInterval(interval)
  }

  /**
   * Добавляет перехватчик запросов
   * @param {Function} interceptor - функция перехватчик
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor)
  }

  /**
   * Добавляет перехватчик ответов
   * @param {Function} interceptor - функция перехватчик
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor)
  }

  /**
   * Генерирует ключ кеша
   * @param {string} query - запрос
   * @param {Object} variables - переменные
   * @returns {string} ключ кеша
   */
  generateCacheKey(query, variables) {
    const queryStr = typeof query === 'string' ? query : query.loc?.source.body || String(query)
    const varsStr = JSON.stringify(variables)
    return `${queryStr}:${varsStr}`
  }

  /**
   * Проверяет, истек ли кеш
   * @param {Object} cached - кешированный объект
   * @returns {boolean} true если истек
   */
  isExpired(cached) {
    return Date.now() - cached.timestamp > cached.ttl
  }

  /**
   * Очищает кеш
   * @param {string} key - ключ для очистки (опционально)
   */
  clearCache(key) {
    if (key) {
      this.cacheStore.delete(key)
    } else {
      this.cacheStore.clear()
    }
  }

  /**
   * Получает статистику кеша
   * @returns {Object} статистика
   */
  getCacheStats() {
    return {
      size: this.cacheStore.size,
      entries: Array.from(this.cacheStore.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        ttl: value.ttl,
        expired: this.isExpired(value)
      }))
    }
  }
}

/**
 * Ошибка GraphQL
 */
class GraphQLError extends Error {
  constructor(errors, data) {
    super('GraphQL Error')
    this.errors = errors
    this.data = data
    this.name = 'GraphQLError'
  }
}

/**
 * Глобальный клиент GraphQL
 */
let globalClient = null

/**
 * Создает GraphQL клиент
 * @param {Object} options - опции клиента
 * @returns {GraphQLClient} клиент
 */
function createClient(options) {
  return new GraphQLClient(options)
}

/**
 * Устанавливает глобальный клиент
 * @param {GraphQLClient} client - клиент
 */
function setGlobalClient(client) {
  globalClient = client
}

/**
 * Получает глобальный клиент
 * @returns {GraphQLClient} глобальный клиент
 */
function getGlobalClient() {
  if (!globalClient) {
    throw new Error('Global GraphQL client not set. Call setGlobalClient() first.')
  }
  return globalClient
}

module.exports = {
  GraphQLClient,
  GraphQLError,
  createClient,
  setGlobalClient,
  getGlobalClient,
  gql
}
