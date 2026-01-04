/**
 * AspScript Hot Reload System
 * Горячая перезагрузка компонентов в dev режиме
 */

/**
 * Регистрирует компонент для hot reload
 * @param {Function} component - AspScript компонент
 * @param {string} moduleId - ID модуля
 */
export function registerForHotReload(component, moduleId) {
  if (!isBrowser() || !module.hot) return

  // Сохраняем оригинальный компонент
  const originalComponent = component

  // Регистрируем для hot reload
  module.hot.accept()

  // Когда модуль обновляется
  module.hot.dispose(() => {
    // Очищаем старые компоненты
    cleanupComponentInstances(moduleId)
  })

  // Сохраняем в глобальном реестре
  if (!window._aspscript_components) {
    window._aspscript_components = new Map()
  }

  window._aspscript_components.set(moduleId, {
    component: originalComponent,
    instances: new Set()
  })
}

/**
 * Создает hot-reload обертку для компонента
 * @param {Function} component - оригинальный компонент
 * @param {string} moduleId - ID модуля
 * @returns {Function} обертка с hot reload
 */
export function createHotReloadWrapper(component, moduleId) {
  if (!isBrowser() || !module.hot) {
    return component
  }

  // Регистрируем компонент
  registerForHotReload(component, moduleId)

  return function HotReloadComponent(...args) {
    const currentComponent = getCurrentComponent(moduleId) || component
    const instance = currentComponent(...args)

    // Регистрируем экземпляр для cleanup
    registerInstance(moduleId, instance)

    return instance
  }
}

/**
 * Получает текущую версию компонента
 * @param {string} moduleId - ID модуля
 * @returns {Function} текущий компонент
 */
function getCurrentComponent(moduleId) {
  if (!window._aspscript_components) return null
  return window._aspscript_components.get(moduleId)?.component
}

/**
 * Регистрирует экземпляр компонента
 * @param {string} moduleId - ID модуля
 * @param {Object} instance - экземпляр компонента
 */
function registerInstance(moduleId, instance) {
  if (!window._aspscript_components) return

  const componentData = window._aspscript_components.get(moduleId)
  if (componentData) {
    componentData.instances.add(instance)
  }
}

/**
 * Очищает экземпляры компонента
 * @param {string} moduleId - ID модуля
 */
function cleanupComponentInstances(moduleId) {
  if (!window._aspscript_components) return

  const componentData = window._aspscript_components.get(moduleId)
  if (!componentData) return

  // Вызываем cleanup для каждого экземпляра
  for (const instance of componentData.instances) {
    if (instance.cleanup) {
      instance.cleanup()
    }
  }

  componentData.instances.clear()
}

/**
 * Проверяет поддержку hot reload
 * @returns {boolean} true если поддерживается
 */
export function isHotReloadSupported() {
  return isBrowser() && module && module.hot
}

/**
 * Включает hot reload для всего приложения
 */
export function enableHotReload() {
  if (!isHotReloadSupported()) return

  console.log('🔥 AspScript Hot Reload enabled')

  // Слушаем изменения в компонентах
  module.hot.addStatusHandler((status) => {
    if (status === 'apply') {
      console.log('🔄 Hot reload applied')
      // Можно добавить дополнительную логику обновления UI
    }
  })
}

/**
 * Импортирует модуль с hot reload поддержкой
 * @param {string} modulePath - путь к модулю
 * @returns {Promise} промис с модулем
 */
export async function importWithHotReload(modulePath) {
  if (!isHotReloadSupported()) {
    return import(modulePath)
  }

  try {
    const module = await import(modulePath)

    // Регистрируем для hot reload
    if (module.hot) {
      module.hot.accept()
    }

    return module
  } catch (error) {
    console.error('Hot reload import error:', error)
    throw error
  }
}

// Импорт для совместимости
import { isBrowser } from './ssr.js'
