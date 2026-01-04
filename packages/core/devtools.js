/**
 * AspScript DevTools Integration
 * Интеграция с браузерными DevTools для отладки
 */

import { isBrowser } from './index.js'

// Глобальное состояние DevTools
const devtoolsState = {
  enabled: false,
  components: new Map(),
  timeline: [],
  performance: new Map(),
  reactivity: new Map()
}

/**
 * DevTools API
 */
export const devtoolsApi = {
  /**
   * Включает DevTools
   */
  enable() {
    devtoolsState.enabled = true
    if (isBrowser()) {
      window.__ASPSCRIPT_DEVTOOLS__ = devtoolsApi
      console.log('🔧 AspScript DevTools enabled')
    }
  },

  /**
   * Отключает DevTools
   */
  disable() {
    devtoolsState.enabled = false
    console.log('🔧 AspScript DevTools disabled')
  },

  /**
   * Проверяет, включены ли DevTools
   */
  isEnabled() {
    return devtoolsState.enabled
  },

  /**
   * Регистрирует компонент
   */
  registerComponent(name, instance) {
    if (!devtoolsState.enabled) return

    devtoolsState.components.set(name, {
      instance,
      mountedAt: Date.now(),
      renders: 0,
      lastRenderTime: 0
    })

    this.addTimelineEvent({
      type: 'component-mounted',
      component: name,
      timestamp: Date.now()
    })
  },

  /**
   * Отменяет регистрацию компонента
   */
  unregisterComponent(name) {
    if (!devtoolsState.enabled) return

    devtoolsState.components.delete(name)

    this.addTimelineEvent({
      type: 'component-unmounted',
      component: name,
      timestamp: Date.now()
    })
  },

  /**
   * Получает все зарегистрированные компоненты
   */
  getComponents() {
    return Array.from(devtoolsState.components.entries()).map(([name, data]) => ({
      name,
      ...data
    }))
  },

  /**
   * Добавляет событие в timeline
   */
  addTimelineEvent(event) {
    if (!devtoolsState.enabled) return

    devtoolsState.timeline.push({
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    })

    // Ограничиваем размер timeline
    if (devtoolsState.timeline.length > 1000) {
      devtoolsState.timeline.shift()
    }
  },

  /**
   * Получает timeline события
   */
  getTimeline(filter = {}) {
    const { type, component, limit = 100 } = filter

    let events = devtoolsState.timeline

    if (type) {
      events = events.filter(e => e.type === type)
    }

    if (component) {
      events = events.filter(e => e.component === component)
    }

    return events.slice(-limit)
  },

  /**
   * Очищает timeline
   */
  clearTimeline() {
    devtoolsState.timeline = []
  },

  /**
   * Отслеживает производительность
   */
  trackPerformance(name, duration, metadata = {}) {
    if (!devtoolsState.enabled) return

    if (!devtoolsState.performance.has(name)) {
      devtoolsState.performance.set(name, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        samples: []
      })
    }

    const perf = devtoolsState.performance.get(name)
    perf.count++
    perf.totalDuration += duration
    perf.avgDuration = perf.totalDuration / perf.count
    perf.minDuration = Math.min(perf.minDuration, duration)
    perf.maxDuration = Math.max(perf.maxDuration, duration)
    perf.samples.push({
      duration,
      timestamp: Date.now(),
      metadata
    })

    // Ограничиваем количество сэмплов
    if (perf.samples.length > 100) {
      perf.samples.shift()
    }

    this.addTimelineEvent({
      type: 'performance',
      name,
      duration,
      timestamp: Date.now()
    })
  },

  /**
   * Получает метрики производительности
   */
  getPerformanceMetrics(name) {
    if (name) {
      return devtoolsState.performance.get(name)
    }
    return Object.fromEntries(devtoolsState.performance)
  },

  /**
   * Отслеживает реактивные изменения
   */
  trackReactivity(name, oldValue, newValue) {
    if (!devtoolsState.enabled) return

    if (!devtoolsState.reactivity.has(name)) {
      devtoolsState.reactivity.set(name, {
        changes: 0,
        history: []
      })
    }

    const reactive = devtoolsState.reactivity.get(name)
    reactive.changes++
    reactive.history.push({
      oldValue,
      newValue,
      timestamp: Date.now()
    })

    // Ограничиваем историю
    if (reactive.history.length > 50) {
      reactive.history.shift()
    }

    this.addTimelineEvent({
      type: 'reactivity',
      name,
      oldValue,
      newValue,
      timestamp: Date.now()
    })
  },

  /**
   * Получает историю реактивности
   */
  getReactivityHistory(name) {
    if (name) {
      return devtoolsState.reactivity.get(name)
    }
    return Object.fromEntries(devtoolsState.reactivity)
  },

  /**
   * Экспортирует данные DevTools
   */
  export() {
    return {
      components: this.getComponents(),
      timeline: this.getTimeline({ limit: 1000 }),
      performance: this.getPerformanceMetrics(),
      reactivity: this.getReactivityHistory(),
      exportedAt: Date.now()
    }
  },

  /**
   * Импортирует данные DevTools
   */
  import(data) {
    if (data.timeline) {
      devtoolsState.timeline = data.timeline
    }
    if (data.performance) {
      devtoolsState.performance = new Map(Object.entries(data.performance))
    }
    if (data.reactivity) {
      devtoolsState.reactivity = new Map(Object.entries(data.reactivity))
    }
  }
}

/**
 * Хук для использования DevTools
 */
export function useDevTools() {
  return devtoolsApi
}

/**
 * Отслеживает производительность функции
 */
export function trackPerformance(name, fn) {
  return async function(...args) {
    const start = performance.now()
    try {
      const result = await fn(...args)
      const duration = performance.now() - start
      devtoolsApi.trackPerformance(name, duration, { args })
      return result
    } catch (error) {
      const duration = performance.now() - start
      devtoolsApi.trackPerformance(name, duration, { args, error: error.message })
      throw error
    }
  }
}

/**
 * Добавляет событие в timeline
 */
export function addTimelineEvent(event) {
  devtoolsApi.addTimelineEvent(event)
}

/**
 * Декоратор для отслеживания компонента
 */
export function withDevTools(Component) {
  return function DevToolsWrapper(props) {
    const componentName = Component.name || 'Anonymous'

    // Регистрируем компонент
    devtoolsApi.registerComponent(componentName, Component)

    // Отслеживаем рендер
    const start = performance.now()
    const instance = Component(props)
    const duration = performance.now() - start

    // Обновляем статистику
    const componentData = devtoolsState.components.get(componentName)
    if (componentData) {
      componentData.renders++
      componentData.lastRenderTime = duration
    }

    devtoolsApi.trackPerformance(`${componentName}.render`, duration, { props })

    return instance
  }
}

// Автоматически включаем DevTools в dev режиме
if (isBrowser() && (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost')) {
  devtoolsApi.enable()
}

export default {
  devtoolsApi,
  useDevTools,
  trackPerformance,
  addTimelineEvent,
  withDevTools
}
