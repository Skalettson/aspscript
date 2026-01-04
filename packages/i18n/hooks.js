/**
 * AspScript I18n Hooks & Directives
 * Хуки и директивы для интернационализации
 */

const { $state, $computed, $effect } = require('@aspscript/core')
const { globalI18n } = require('./core')

/**
 * Хук для использования i18n
 * @param {Object} options - опции
 * @returns {Object} i18n объект
 */
function useI18n(options = {}) {
  const {
    locale: initialLocale,
    messages: initialMessages
  } = options

  // Локальный менеджер или глобальный
  const i18n = options.manager || globalI18n

  // Инициализация если переданы опции
  if (initialLocale) {
    i18n.setLocale(initialLocale)
  }

  if (initialMessages) {
    Object.entries(initialMessages).forEach(([locale, messages]) => {
      i18n.loadLocale(locale, messages)
    })
  }

  // Реактивные свойства
  const locale = $computed(() => i18n.locale)
  const isLoading = $computed(() => i18n.isLoading)
  const isRTL = $computed(() => i18n.isRTL.value)
  const availableLocales = $computed(() => i18n.availableLocales.value)

  return {
    // Основные методы
    t: (key, params) => i18n.t(key, params),
    d: (date, format) => i18n.d(date, format),
    n: (number, format) => i18n.n(number, format),
    has: (key) => i18n.has(key),

    // Управление локалью
    setLocale: (locale) => i18n.setLocale(locale),
    loadLocale: (locale, messages) => i18n.loadLocale(locale, messages),

    // Реактивные свойства
    locale,
    isLoading,
    isRTL,
    availableLocales,

    // Ссылка на менеджер
    manager: i18n
  }
}

/**
 * Хук для перевода с областью видимости
 * @param {string} scope - область видимости
 * @param {Object} options - опции
 * @returns {Object} scoped i18n объект
 */
function useScopedI18n(scope, options = {}) {
  const i18n = useI18n(options)

  return {
    ...i18n,
    t: (key, params) => i18n.t(`${scope}.${key}`, params),
    has: (key) => i18n.has(`${scope}.${key}`)
  }
}

/**
 * Хук для ленивой загрузки переводов
 * @param {Function} loader - функция загрузки переводов
 * @param {Object} options - опции
 * @returns {Object} lazy i18n объект
 */
function useLazyI18n(loader, options = {}) {
  const i18n = useI18n(options)
  const loadedLocales = $state(new Set())

  const loadLocale = async (locale) => {
    if (loadedLocales.value.has(locale)) return

    try {
      const messages = await loader(locale)
      await i18n.loadLocale(locale, messages)
      loadedLocales.value.add(locale)
    } catch (error) {
      console.error(`Failed to load locale ${locale}:`, error)
      throw error
    }
  }

  return {
    ...i18n,
    loadLocale,
    isLocaleLoaded: (locale) => loadedLocales.value.has(locale)
  }
}

/**
 * Директива для перевода текста
 * @param {Object} i18n - i18n объект
 * @returns {Function} директива
 */
function tDirective(i18n) {
  return (element, binding) => {
    const { value: key, modifiers } = binding

    if (!key) return

    // Обновляем текст при изменении локали
    $effect(() => {
      const translated = i18n.t(key)
      element.textContent = translated

      // Добавляем атрибуты для RTL если нужно
      if (i18n.isRTL.value) {
        element.setAttribute('dir', 'rtl')
      } else {
        element.removeAttribute('dir')
      }
    })
  }
}

/**
 * Директива для перевода HTML атрибутов
 * @param {Object} i18n - i18n объект
 * @returns {Function} директива
 */
function translateDirective(i18n) {
  return (element, binding) => {
    const { value: translations, arg: attribute } = binding

    if (!translations || !attribute) return

    $effect(() => {
      Object.entries(translations).forEach(([attr, key]) => {
        const translated = i18n.t(key)
        element.setAttribute(attr, translated)
      })
    })
  }
}

/**
 * Директива для форматирования дат
 * @param {Object} i18n - i18n объект
 * @returns {Function} директива
 */
function dateDirective(i18n) {
  return (element, binding) => {
    const { value: date, arg: format = 'short' } = binding

    if (!date) return

    $effect(() => {
      const formatted = i18n.d(new Date(date), format)
      element.textContent = formatted
    })
  }
}

/**
 * Директива для форматирования чисел
 * @param {Object} i18n - i18n объект
 * @returns {Function} директива
 */
function numberDirective(i18n) {
  return (element, binding) => {
    const { value: number, arg: format = 'decimal' } = binding

    if (typeof number !== 'number') return

    $effect(() => {
      const formatted = i18n.n(number, format)
      element.textContent = formatted
    })
  }
}

/**
 * Создает плагин для интеграции i18n в приложения
 * @param {Object} options - опции плагина
 * @returns {Object} плагин
 */
function createI18nPlugin(options = {}) {
  const i18n = options.manager || globalI18n

  return {
    install(app) {
      // Добавляем i18n в глобальный скоуп
      app.i18n = i18n

      // Добавляем директивы
      if (app.directive) {
        app.directive('t', tDirective(i18n))
        app.directive('translate', translateDirective(i18n))
        app.directive('date', dateDirective(i18n))
        app.directive('number', numberDirective(i18n))
      }

      // Добавляем глобальные свойства
      if (app.provide) {
        app.provide('$t', i18n.t.bind(i18n))
        app.provide('$d', i18n.d.bind(i18n))
        app.provide('$n', i18n.n.bind(i18n))
        app.provide('$i18n', i18n)
      }
    }
  }
}

/**
 * Компонент высшего порядка для i18n
 * @param {Function} Component - компонент
 * @param {Object} options - опции
 * @returns {Function} обертка компонента
 */
function withI18n(Component, options = {}) {
  return function I18nWrapper(props = {}) {
    const i18n = useI18n(options)

    return Component({
      ...props,
      $t: i18n.t,
      $d: i18n.d,
      $n: i18n.n,
      $i18n: i18n
    })
  }
}

/**
 * Миксин для компонентов с i18n
 * @param {Object} options - опции миксина
 * @returns {Object} миксин
 */
function i18nMixin(options = {}) {
  const i18n = useI18n(options)

  return {
    computed: {
      $t() { return i18n.t.bind(i18n) },
      $d() { return i18n.d.bind(i18n) },
      $n() { return i18n.n.bind(i18n) },
      $i18n() { return i18n }
    }
  }
}

module.exports = {
  useI18n,
  useScopedI18n,
  useLazyI18n,
  tDirective,
  translateDirective,
  dateDirective,
  numberDirective,
  createI18nPlugin,
  withI18n,
  i18nMixin
}
