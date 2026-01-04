/**
 * AspScript I18n
 * Полная система интернационализации
 */

const { I18nManager, createI18n, globalI18n } = require('./core')
const {
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
} = require('./hooks')

module.exports = {
  // Core
  I18nManager,
  createI18n,
  globalI18n,

  // Hooks
  useI18n,
  useScopedI18n,
  useLazyI18n,

  // Directives
  tDirective,
  translateDirective,
  dateDirective,
  numberDirective,

  // Plugins & HOCs
  createI18nPlugin,
  withI18n,
  i18nMixin
}
