/**
 * AspScript Compiler
 * Компилирует .aspc файлы в оптимизированный JavaScript
 */

const acorn = require('acorn')
const jsx = require('acorn-jsx')
const astring = require('astring')
const csstree = require('css-tree')

// Настройка JSX парсера
const parseJSX = jsx()

const parseJSX = jsx()

/**
 * Разделяет .aspc файл на секции
 * @param {string} source - содержимое .aspc файла
 * @returns {object} объект с секциями
 */
function parseSections(source) {
  const sections = {
    script: '',
    template: '',
    style: ''
  }

  // Разделяем по маркерам ---
  const parts = source.split(/^---$/gm)

  let currentSection = 'script'
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Определяем тип секции по первому тегу
    if (trimmed.startsWith('<template>')) {
      currentSection = 'template'
      sections.template = trimmed
    } else if (trimmed.startsWith('<style>')) {
      currentSection = 'style'
      sections.style = trimmed
    } else if (!sections.script) {
      sections.script = trimmed
    }
  }

  return sections
}

/**
 * Компилирует script секцию
 * @param {string} script - JavaScript код
 * @returns {string} скомпилированный код
 */
function compileScript(script) {
  if (!script.trim()) return ''

  // Простая трансформация реактивных выражений
  // В продакшене здесь будет полноценный AST парсинг
  let transformed = script

  // Преобразуем $state(initial) в реактивные переменные
  transformed = transformed.replace(
    /let\s+(\w+)\s*=\s*\$state\s*\(([^)]*)\)/g,
    'let $state_$1 = { value: $2 }\nlet $1 = $state_$1.value'
  )

  // Преобразуем $: выражения в эффекты
  transformed = transformed.replace(
    /^\s*\$:\s*(.+)$/gm,
    'effect(() => { $1 })'
  )

  return transformed
}

// Упрощенные трансформации перенесены в compileScript

/**
 * Компилирует template секцию
 * @param {string} template - HTML шаблон
 * @returns {string} функция рендеринга
 */
function compileTemplate(template) {
  if (!template.trim()) return '() => null'

  const html = template.replace(/<\/?template>/g, '').trim()

  // Преобразуем директивы в JavaScript код
  let processed = html

  // Обработка #if директивы
  processed = processed.replace(
    /#if\s*=\s*"([^"]+)"/g,
    'v-if="$1"'
  )

  // Обработка #for директивы
  processed = processed.replace(
    /#for\s*=\s*"([^"]+)"/g,
    'v-for="$1"'
  )

  // Обработка :class директивы
  processed = processed.replace(
    /:class\s*=\s*"([^"]+)"/g,
    'v-bind:class="$1"'
  )

  // Обработка @event директив
  processed = processed.replace(
    /@(\w+)\s*=\s*"([^"]+)"/g,
    'v-on:$1="$2"'
  )

  // Обработка #bind директивы
  processed = processed.replace(
    /#bind\s*=\s*"([^"]+)"/g,
    'v-model="$1"'
  )

  // Интерполяция выражений
  processed = processed.replace(
    /\{([^}]+)\}/g,
    '${$1}'
  )

  return `() => \`${processed}\``
}

// Упрощенные вспомогательные функции удалены

/**
 * Компилирует CSS с scoping
 * @param {string} style - CSS код
 * @param {string} componentName - имя компонента для scoping
 * @returns {string} scoped CSS
 */
function compileStyle(style, componentName) {
  if (!style.trim()) return ''

  const css = style.replace(/<\/?style>/g, '').trim()

  // Простое добавление scoping - добавляем класс компонента ко всем правилам
  const scopedCss = css.replace(/([^{]+)\{/g, (match, selector) => {
    const trimmedSelector = selector.trim()
    if (trimmedSelector.startsWith('@') || trimmedSelector.startsWith(':')) {
      // Не модифицируем медиа-запросы и псевдо-селекторы
      return match
    }
    return `.${componentName} ${trimmedSelector} {`
  })

  return scopedCss
}

/**
 * Основная функция компиляции
 * @param {string} source - содержимое .aspc файла
 * @param {object} options - опции компиляции
 * @returns {string} скомпилированный JavaScript
 */
function compile(source, options = {}) {
  const componentName = options.componentName || 'Component'

  // Разделяем на секции
  const sections = parseSections(source)

  // Компилируем каждую секцию
  const compiledScript = compileScript(sections.script)
  const renderFunction = compileTemplate(sections.template)
  const scopedStyle = compileStyle(sections.style, componentName)

  // Генерируем финальный код компонента
  return `
// AspScript Component: ${componentName}
const { $state, $computed, $effect, $global, onMount, onDestroy, DOM } = require('@aspscript/core')

function ${componentName}() {
  ${compiledScript}

  // Render function
  const render = ${renderFunction}

  // Styles
  const styles = \`${scopedStyle}\`

  // Component lifecycle
  onMount(() => {
    // Inject styles
    if (typeof document !== 'undefined' && !document.getElementById('${componentName}-style')) {
      const styleElement = document.createElement('style')
      styleElement.id = '${componentName}-style'
      styleElement.textContent = styles
      document.head.appendChild(styleElement)
    }
  })

  return {
    render,
    styles
  }
}

module.exports = ${componentName}
`
}

module.exports = { compile }
