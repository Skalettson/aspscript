/**
 * AspScript Microfrontends Orchestrator
 * Оркестратор микрофронтендов
 */

const { $state, $computed, $effect } = require('@aspscript/core')
const { globalFederationManager } = require('./federation')

/**
 * Оркестратор микрофронтендов
 */
class MicrofrontendsOrchestrator {
  constructor(options = {}) {
    this.apps = new Map()
    this.routes = new Map()
    this.activeApps = new Set()
    this.lifecycleHooks = {
      beforeLoad: [],
      afterLoad: [],
      beforeUnload: [],
      afterUnload: []
    }

    this.config = {
      concurrentLoading: options.concurrentLoading || 3,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      ...options
    }

    // Состояние оркестратора
    this.state = $state({
      loading: new Map(),
      loaded: new Set(),
      failed: new Set(),
      active: new Set()
    })
  }

  /**
   * Регистрирует микрофронтенд приложение
   * @param {Object} appConfig - конфигурация приложения
   */
  registerApp(appConfig) {
    const {
      name,
      entry,
      routes = [],
      dependencies = [],
      metadata = {}
    } = appConfig

    if (this.apps.has(name)) {
      throw new Error(`App "${name}" already registered`)
    }

    const app = {
      name,
      entry,
      routes,
      dependencies,
      metadata,
      status: 'registered',
      instance: null,
      error: null
    }

    this.apps.set(name, app)

    // Регистрируем маршруты
    routes.forEach(route => {
      this.routes.set(route.path, {
        ...route,
        app: name
      })
    })

    console.log(`✅ Registered microfrontend app: ${name}`)
  }

  /**
   * Загружает приложение
   * @param {string} appName - имя приложения
   * @returns {Promise<Object>} загруженное приложение
   */
  async loadApp(appName) {
    const app = this.apps.get(appName)
    if (!app) {
      throw new Error(`App "${appName}" not registered`)
    }

    if (app.status === 'loaded') {
      return app.instance
    }

    if (app.status === 'loading') {
      // Ждем загрузки
      return new Promise((resolve, reject) => {
        const checkStatus = () => {
          if (app.status === 'loaded') {
            resolve(app.instance)
          } else if (app.status === 'failed') {
            reject(app.error)
          } else {
            setTimeout(checkStatus, 100)
          }
        }
        checkStatus()
      })
    }

    app.status = 'loading'
    this.state.loading.set(appName, true)

    try {
      // Выполняем pre-load хуки
      await this._executeHooks('beforeLoad', app)

      // Загружаем зависимости
      await this._loadDependencies(app.dependencies)

      // Загружаем само приложение
      const instance = await this._loadAppEntry(app.entry, appName)

      app.instance = instance
      app.status = 'loaded'
      this.state.loaded.add(appName)
      this.state.loading.delete(appName)

      // Выполняем post-load хуки
      await this._executeHooks('afterLoad', app)

      // Инициализируем приложение если есть метод init
      if (instance.init) {
        await instance.init(this._getAppContext(app))
      }

      console.log(`🚀 Loaded microfrontend app: ${appName}`)
      return instance

    } catch (error) {
      app.status = 'failed'
      app.error = error
      this.state.failed.add(appName)
      this.state.loading.delete(appName)

      console.error(`❌ Failed to load microfrontend app: ${appName}`, error)
      throw error
    }
  }

  /**
   * Выгружает приложение
   * @param {string} appName - имя приложения
   */
  async unloadApp(appName) {
    const app = this.apps.get(appName)
    if (!app || app.status !== 'loaded') {
      return
    }

    try {
      // Выполняем pre-unload хуки
      await this._executeHooks('beforeUnload', app)

      // Вызываем destroy метод если есть
      if (app.instance && app.instance.destroy) {
        await app.instance.destroy()
      }

      app.instance = null
      app.status = 'registered'
      this.state.loaded.delete(appName)
      this.state.active.delete(appName)

      // Выполняем post-unload хуки
      await this._executeHooks('afterUnload', app)

      console.log(`🗑️ Unloaded microfrontend app: ${appName}`)

    } catch (error) {
      console.error(`❌ Error unloading app ${appName}:`, error)
    }
  }

  /**
   * Активирует приложение для маршрута
   * @param {string} path - путь маршрута
   * @returns {Promise<Object>} активное приложение
   */
  async activateAppForRoute(path) {
    const route = this._findRoute(path)
    if (!route) {
      throw new Error(`No route found for path: ${path}`)
    }

    const appName = route.app
    const app = await this.loadApp(appName)

    // Активируем приложение
    this.state.active.add(appName)
    this.activeApps.add(appName)

    return {
      app,
      route,
      params: this._extractParams(path, route.path)
    }
  }

  /**
   * Деактивирует приложение
   * @param {string} appName - имя приложения
   */
  deactivateApp(appName) {
    this.state.active.delete(appName)
    this.activeApps.delete(appName)
  }

  /**
   * Получает состояние всех приложений
   * @returns {Object} состояние
   */
  getAppsState() {
    return {
      registered: Array.from(this.apps.keys()),
      loading: Array.from(this.state.loading.keys()),
      loaded: Array.from(this.state.loaded),
      failed: Array.from(this.state.failed),
      active: Array.from(this.state.active)
    }
  }

  /**
   * Добавляет lifecycle хук
   * @param {string} hookName - имя хука
   * @param {Function} hookFn - функция хука
   */
  addLifecycleHook(hookName, hookFn) {
    if (!this.lifecycleHooks[hookName]) {
      throw new Error(`Unknown lifecycle hook: ${hookName}`)
    }

    this.lifecycleHooks[hookName].push(hookFn)
  }

  /**
   * Создает navigation guard
   * @param {Function} guardFn - функция guard
   * @returns {Function} guard middleware
   */
  createNavigationGuard(guardFn) {
    return async (to, from) => {
      try {
        const result = await guardFn(to, from)

        if (result === false) {
          return false // Блокируем навигацию
        }

        if (typeof result === 'string') {
          // Редирект
          return { redirect: result }
        }

        return true
      } catch (error) {
        console.error('Navigation guard error:', error)
        return false
      }
    }
  }

  /**
   * Выполняет lifecycle хуки
   * @param {string} hookName - имя хука
   * @param {Object} app - приложение
   */
  async _executeHooks(hookName, app) {
    const hooks = this.lifecycleHooks[hookName]

    for (const hook of hooks) {
      try {
        await hook(app)
      } catch (error) {
        console.error(`Error in ${hookName} hook for app ${app.name}:`, error)
      }
    }
  }

  /**
   * Загружает зависимости приложения
   * @param {Array} dependencies - зависимости
   */
  async _loadDependencies(dependencies) {
    const loadPromises = dependencies.map(dep => {
      if (typeof dep === 'string') {
        // Загружаем remote модуль
        return globalFederationManager.loadRemoteModule(dep, './index')
      } else if (dep.name && dep.url) {
        // Регистрируем и загружаем remote
        globalFederationManager.registerRemote(dep.name, dep.url)
        return globalFederationManager.loadRemoteModule(dep.name, './index')
      }
    })

    await Promise.all(loadPromises)
  }

  /**
   * Загружает entry точку приложения
   * @param {string} entry - entry точка
   * @param {string} appName - имя приложения
   * @returns {Promise<Object>} загруженное приложение
   */
  async _loadAppEntry(entry, appName) {
    if (entry.startsWith('http')) {
      // Загружаем remote entry
      return globalFederationManager.loadRemoteModule(appName, './app')
    } else {
      // Импортируем локальный модуль
      const module = await import(entry)
      return module.default || module
    }
  }

  /**
   * Получает контекст для приложения
   * @param {Object} app - приложение
   * @returns {Object} контекст
   */
  _getAppContext(app) {
    return {
      name: app.name,
      routes: app.routes,
      orchestrator: this,
      shared: {
        // Shared services and utilities
        federation: globalFederationManager
      }
    }
  }

  /**
   * Ищет маршрут по пути
   * @param {string} path - путь
   * @returns {Object} маршрут
   */
  _findRoute(path) {
    // Прямое совпадение
    if (this.routes.has(path)) {
      return this.routes.get(path)
    }

    // Параметризованные маршруты
    for (const [routePath, route] of this.routes) {
      if (this._matchRoute(path, routePath)) {
        return route
      }
    }

    return null
  }

  /**
   * Проверяет совпадение маршрута
   * @param {string} path - путь
   * @param {string} routePath - паттерн маршрута
   * @returns {boolean} совпадает ли
   */
  _matchRoute(path, routePath) {
    const pathParts = path.split('/').filter(p => p)
    const routeParts = routePath.split('/').filter(p => p)

    if (pathParts.length !== routeParts.length) {
      return false
    }

    return routeParts.every((part, index) => {
      return part.startsWith(':') || part === pathParts[index]
    })
  }

  /**
   * Извлекает параметры из пути
   * @param {string} path - путь
   * @param {string} routePath - паттерн маршрута
   * @returns {Object} параметры
   */
  _extractParams(path, routePath) {
    const params = {}
    const pathParts = path.split('/').filter(p => p)
    const routeParts = routePath.split('/').filter(p => p)

    routeParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1)
        params[paramName] = decodeURIComponent(pathParts[index])
      }
    })

    return params
  }
}

/**
 * Создает оркестратор микрофронтендов
 * @param {Object} options - опции оркестратора
 * @returns {MicrofrontendsOrchestrator} оркестратор
 */
function createOrchestrator(options = {}) {
  return new MicrofrontendsOrchestrator(options)
}

/**
 * Глобальный оркестратор
 */
const globalOrchestrator = new MicrofrontendsOrchestrator()

module.exports = {
  MicrofrontendsOrchestrator,
  createOrchestrator,
  globalOrchestrator
}
