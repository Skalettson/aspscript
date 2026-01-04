/**
 * AspScript I18n Core
 * Основная система интернационализации
 */

const { $state, $computed, $effect } = require('@aspscript/core')

/**
 * I18n менеджер
 */
class I18nManager {
  constructor(options = {}) {
    // Настройки
    this.config = {
      locale: options.locale || 'en',
      fallbackLocale: options.fallbackLocale || 'en',
      messages: options.messages || {},
      pluralizationRules: options.pluralizationRules || {},
      datetimeFormats: options.datetimeFormats || {},
      numberFormats: options.numberFormats || {},
      rtl: options.rtl || false,
      ...options
    }

    // Реактивное состояние
    this.currentLocale = $state(this.config.locale)
    this.messages = $state({ ...this.config.messages })
    this.loading = $state(false)
    this.loadedLocales = $state(new Set([this.config.locale]))

    // Вычисляемые свойства
    this.isRTL = $computed(() => this._isRTLLocale(this.currentLocale.value))
    this.availableLocales = $computed(() => Object.keys(this.messages.value))

    // Эффект для установки RTL атрибута
    $effect(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = this.isRTL.value ? 'rtl' : 'ltr'
        document.documentElement.lang = this.currentLocale.value
      }
    })
  }

  /**
   * Устанавливает текущую локаль
   * @param {string} locale - код локали
   * @param {boolean} loadIfMissing - загружать если отсутствует
   */
  async setLocale(locale, loadIfMissing = true) {
    if (this.currentLocale.value === locale) return

    if (!this.messages.value[locale] && loadIfMissing) {
      await this.loadLocale(locale)
    }

    if (this.messages.value[locale] || locale === this.config.fallbackLocale) {
      this.currentLocale.value = locale
      return true
    }

    return false
  }

  /**
   * Загружает переводы для локали
   * @param {string} locale - код локали
   * @param {Object} messages - переводы (опционально)
   */
  async loadLocale(locale, messages = null) {
    if (this.loadedLocales.value.has(locale)) return

    this.loading.value = true

    try {
      let localeMessages

      if (messages) {
        // Используем переданные сообщения
        localeMessages = messages
      } else {
        // Загружаем сообщения
        localeMessages = await this._loadLocaleMessages(locale)
      }

      // Мерджим с существующими
      this.messages.value = {
        ...this.messages.value,
        [locale]: {
          ...this.messages.value[locale],
          ...localeMessages
        }
      }

      this.loadedLocales.value.add(locale)

    } finally {
      this.loading.value = false
    }
  }

  /**
   * Переводит ключ
   * @param {string} key - ключ перевода
   * @param {Object} params - параметры интерполяции
   * @param {string} locale - локаль (опционально)
   * @returns {string} переведенная строка
   */
  t(key, params = {}, locale = null) {
    const targetLocale = locale || this.currentLocale.value
    const messages = this.messages.value

    // Получаем значение по ключу
    const value = this._getNestedValue(messages[targetLocale] || messages[this.config.fallbackLocale] || {}, key)

    if (!value) {
      console.warn(`Translation key "${key}" not found for locale "${targetLocale}"`)
      return key
    }

    // Интерполяция параметров
    let translated = this._interpolate(value, params)

    // Плюрализация
    if (params.count !== undefined) {
      translated = this._pluralize(translated, params.count, targetLocale)
    }

    return translated
  }

  /**
   * Переводит дату
   * @param {Date} date - дата
   * @param {string} formatKey - ключ формата
   * @param {string} locale - локаль
   * @returns {string} отформатированная дата
   */
  d(date, formatKey = 'short', locale = null) {
    const targetLocale = locale || this.currentLocale.value
    const format = this._getDateTimeFormat(targetLocale, formatKey)

    return new Intl.DateTimeFormat(targetLocale, format).format(date)
  }

  /**
   * Переводит число
   * @param {number} number - число
   * @param {string} formatKey - ключ формата
   * @param {string} locale - локаль
   * @returns {string} отформатированное число
   */
  n(number, formatKey = 'decimal', locale = null) {
    const targetLocale = locale || this.currentLocale.value
    const format = this._getNumberFormat(targetLocale, formatKey)

    return new Intl.NumberFormat(targetLocale, format).format(number)
  }

  /**
   * Проверяет существование перевода
   * @param {string} key - ключ перевода
   * @param {string} locale - локаль
   * @returns {boolean} существует ли перевод
   */
  has(key, locale = null) {
    const targetLocale = locale || this.currentLocale.value
    const messages = this.messages.value[targetLocale] || this.messages.value[this.config.fallbackLocale]
    return this._getNestedValue(messages, key) !== undefined
  }

  /**
   * Получает текущую локаль
   * @returns {string} код локали
   */
  get locale() {
    return this.currentLocale.value
  }

  /**
   * Получает состояние загрузки
   * @returns {boolean} загружается ли
   */
  get isLoading() {
    return this.loading.value
  }

  /**
   * Загружает сообщения для локали
   * @param {string} locale - код локали
   * @returns {Promise<Object>} сообщения
   */
  async _loadLocaleMessages(locale) {
    // В реальной реализации здесь будет загрузка с сервера или из файлов
    // Пока возвращаем пустой объект
    return {}
  }

  /**
   * Получает вложенное значение по пути
   * @param {Object} obj - объект
   * @param {string} path - путь (разделенный точками)
   * @returns {*} значение
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Интерполирует параметры в строку
   * @param {string} text - текст с плейсхолдерами
   * @param {Object} params - параметры
   * @returns {string} интерполированный текст
   */
  _interpolate(text, params) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match
    })
  }

  /**
   * Плюрализация текста
   * @param {string} text - текст с вариантами
   * @param {number} count - количество
   * @param {string} locale - локаль
   * @returns {string} плюрализованный текст
   */
  _pluralize(text, count, locale) {
    // Проверяем, содержит ли текст варианты плюрализации
    if (!text.includes('|')) return text

    const forms = text.split('|').map(s => s.trim())
    const rule = this.pluralizationRules[locale] || this._defaultPluralRule

    const index = Math.min(rule(count), forms.length - 1)
    return forms[index]
  }

  /**
   * Правило плюрализации по умолчанию
   * @param {number} n - число
   * @returns {number} индекс формы
   */
  _defaultPluralRule(n) {
    return n === 1 ? 0 : 1
  }

  /**
   * Получает формат даты/времени
   * @param {string} locale - локаль
   * @param {string} formatKey - ключ формата
   * @returns {Object} формат
   */
  _getDateTimeFormat(locale, formatKey) {
    const formats = this.config.datetimeFormats[locale] || this.config.datetimeFormats[this.config.fallbackLocale] || {}

    return formats[formatKey] || {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  }

  /**
   * Получает формат числа
   * @param {string} locale - локаль
   * @param {string} formatKey - ключ формата
   * @returns {Object} формат
   */
  _getNumberFormat(locale, formatKey) {
    const formats = this.config.numberFormats[locale] || this.config.numberFormats[this.config.fallbackLocale] || {}

    return formats[formatKey] || {}
  }

  /**
   * Проверяет, является ли локаль RTL
   * @param {string} locale - код локали
   * @returns {boolean} является ли RTL
   */
  _isRTLLocale(locale) {
    const rtlLocales = ['ar', 'he', 'fa', 'ur', 'yi']
    return rtlLocales.some(rtl => locale.startsWith(rtl))
  }

  /**
   * Получает правила плюрализации для локали
   * @returns {Object} правила плюрализации
   */
  get pluralizationRules() {
    return {
      'ru': (n) => {
        if (n % 10 === 1 && n % 100 !== 11) return 0 // 1, 21, 31...
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 1 // 2-4, 22-24...
        return 2 // 0, 5-9, 11-19...
      },
      'en': (n) => n === 1 ? 0 : 1,
      'fr': (n) => n > 1 ? 1 : 0,
      // Добавьте другие локали по необходимости
      ...this.config.pluralizationRules
    }
  }
}

/**
 * Создает I18n менеджер
 * @param {Object} options - опции
 * @returns {I18nManager} менеджер
 */
function createI18n(options = {}) {
  return new I18nManager(options)
}

/**
 * Глобальный I18n менеджер
 */
const globalI18n = new I18nManager()

module.exports = {
  I18nManager,
  createI18n,
  globalI18n
}
