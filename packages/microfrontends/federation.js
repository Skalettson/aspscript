/**
 * AspScript Module Federation
 * Федерация модулей для микрофронтендов
 */

const { $state, $computed, $effect, lazy, ChunkManager } = require('@aspscript/core')

/**
 * Федерация модулей
 */
class ModuleFederation {
  constructor(options = {}) {
    this.name = options.name || 'host'
    this.remotes = new Map()
    this.shared = new Map()
    this.containers = new Map()
    this.loading = new Map()

    // Настройки
    this.config = {
      sharedScope: options.sharedScope || 'default',
      eager: options.eager || false,
      ...options
    }

    // Глобальный реестр контейнеров
    if (!global.__aspscript_federation) {
      global.__aspscript_federation = {
        containers: new Map(),
        shared: new Map()
      }
    }

    this.globalRegistry = global.__aspscript_federation
  }

  /**
   * Регистрирует remote модуль
   * @param {string} name - имя remote модуля
   * @param {string} url - URL до remote entry
   * @param {Object} options - опции remote
   */
  registerRemote(name, url, options = {}) {
    this.remotes.set(name, {
      name,
      url,
      loaded: false,
      container: null,
      options: {
        shareScope: this.config.sharedScope,
        ...options
      }
    })
  }

  /**
   * Регистрирует shared модуль
   * @param {string} name - имя модуля
   * @param {any} module - модуль для шаринга
   * @param {string} version - версия модуля
   */
  registerShared(name, module, version = '1.0.0') {
    const sharedModule = {
      name,
      module,
      version,
      loaded: true,
      consumers: new Set()
    }

    this.shared.set(name, sharedModule)
    this.globalRegistry.shared.set(name, sharedModule)
  }

  /**
   * Загружает remote модуль
   * @param {string} name - имя remote модуля
   * @returns {Promise<Object>} загруженный контейнер
   */
  async loadRemote(name) {
    const remote = this.remotes.get(name)
    if (!remote) {
      throw new Error(`Remote module "${name}" not registered`)
    }

    if (remote.loaded && remote.container) {
      return remote.container
    }

    // Проверяем глобальный реестр
    if (this.globalRegistry.containers.has(name)) {
      remote.container = this.globalRegistry.containers.get(name)
      remote.loaded = true
      return remote.container
    }

    // Загружаем remote entry
    if (this.loading.has(name)) {
      return this.loading.get(name)
    }

    const loadPromise = this._loadRemoteEntry(remote)
    this.loading.set(name, loadPromise)

    try {
      remote.container = await loadPromise
      remote.loaded = true

      // Регистрируем в глобальном реестре
      this.globalRegistry.containers.set(name, remote.container)

      return remote.container
    } finally {
      this.loading.delete(name)
    }
  }

  /**
   * Загружает remote entry скрипт
   * @param {Object} remote - remote конфигурация
   * @returns {Promise<Object>} контейнер
   */
  async _loadRemoteEntry(remote) {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        // Server-side rendering fallback
        resolve({})
        return
      }

      const script = document.createElement('script')
      script.src = remote.url
      script.async = true

      script.onload = () => {
        // Получаем контейнер из глобального скоупа
        const container = window[remote.name]
        if (!container) {
          reject(new Error(`Container "${remote.name}" not found after loading ${remote.url}`))
          return
        }

        // Инициализируем контейнер
        if (container.init) {
          container.init({
            ...this._getSharedModules(),
            shareScope: remote.options.shareScope
          })
        }

        resolve(container)
      }

      script.onerror = () => {
        reject(new Error(`Failed to load remote entry: ${remote.url}`))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Получает shared модули для инициализации
   * @returns {Object} shared модули
   */
  _getSharedModules() {
    const shared = {}

    for (const [name, module] of this.shared) {
      shared[name] = {
        get: () => Promise.resolve(() => module.module),
        loaded: true,
        version: module.version
      }
    }

    return shared
  }

  /**
   * Получает модуль из remote контейнера
   * @param {string} remoteName - имя remote
   * @param {string} moduleName - имя модуля
   * @returns {Promise<any>} модуль
   */
  async getModule(remoteName, moduleName) {
    const container = await this.loadRemote(remoteName)

    if (!container.get) {
      throw new Error(`Container "${remoteName}" does not have get method`)
    }

    const factory = await container.get(moduleName)
    const module = factory()

    return module
  }

  /**
   * Создает federated компонент
   * @param {string} remoteName - имя remote
   * @param {string} componentName - имя компонента
   * @param {Object} options - опции
   * @returns {Function} federated компонент
   */
  createFederatedComponent(remoteName, componentName, options = {}) {
    const {
      loading: LoadingComponent,
      error: ErrorComponent,
      fallback
    } = options

    return lazy(
      () => this.getModule(remoteName, componentName),
      {
        loading: LoadingComponent,
        error: ErrorComponent,
        timeout: options.timeout || 10000
      }
    )
  }
}

/**
 * Создает module federation instance
 * @param {Object} options - опции federation
 * @returns {ModuleFederation} instance
 */
function createModuleFederation(options = {}) {
  return new ModuleFederation(options)
}

/**
 * Глобальный federation manager
 */
class FederationManager {
  constructor() {
    this.federations = new Map()
    this.activeFederation = null
  }

  /**
   * Регистрирует federation
   * @param {string} name - имя federation
   * @param {ModuleFederation} federation - federation instance
   */
  register(name, federation) {
    this.federations.set(name, federation)
  }

  /**
   * Активирует federation
   * @param {string} name - имя federation
   */
  activate(name) {
    this.activeFederation = this.federations.get(name)
    if (!this.activeFederation) {
      throw new Error(`Federation "${name}" not found`)
    }
  }

  /**
   * Получает активную federation
   * @returns {ModuleFederation} активная federation
   */
  getActive() {
    return this.activeFederation
  }

  /**
   * Загружает remote модуль из активной federation
   * @param {string} remoteName - имя remote
   * @param {string} moduleName - имя модуля
   * @returns {Promise<any>} модуль
   */
  async loadRemoteModule(remoteName, moduleName) {
    if (!this.activeFederation) {
      throw new Error('No active federation')
    }

    return this.activeFederation.getModule(remoteName, moduleName)
  }

  /**
   * Создает federated компонент из активной federation
   * @param {string} remoteName - имя remote
   * @param {string} componentName - имя компонента
   * @param {Object} options - опции
   * @returns {Function} компонент
   */
  createFederatedComponent(remoteName, componentName, options = {}) {
    if (!this.activeFederation) {
      throw new Error('No active federation')
    }

    return this.activeFederation.createFederatedComponent(remoteName, componentName, options)
  }
}

// Глобальный federation manager
const globalFederationManager = new FederationManager()

module.exports = {
  ModuleFederation,
  FederationManager,
  createModuleFederation,
  globalFederationManager
}
