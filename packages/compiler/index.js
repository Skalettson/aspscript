/**
 * AspScript Compiler
 * Компилирует .aspc файлы в оптимизированный JavaScript
 * Version: 1.3.0 "Advanced Compiler"
 */

import * as acorn from 'acorn'
import * as jsx from 'acorn-jsx'
import { generate as astringGenerate } from 'astring'
import * as csstree from 'css-tree'
import { compileDirectives, transformExpression } from './directives.js'
import {
  parseProps,
  generatePropsValidation,
  generatePropsCode,
  parseEmits,
  generateEventsCode,
  parseSlots,
  generateSlotsCode,
  compileSlotsUsage
} from './components.js'
import { validateDirectiveBlocks } from './errors.js'

// Настройка JSX парсера  
const Parser = acorn.Parser.extend(jsx.default ? jsx.default() : jsx())

/**
 * Парсит JavaScript с JSX
 * @param {string} code - код для парсинга
 * @returns {Object} AST
 */
function parseJavaScript(code) {
  return Parser.parse(code, {
    ecmaVersion: 2022,
    sourceType: 'module'
  })
}

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

  // AspScript поддерживает два формата:
  // 1. Формат с разделителями: --- script --- (между двумя ---), template (HTML), <style>...</style>
  // 2. Формат с тегами: <script>...</script>, <template>...</template>, <style>...</style>

  // Проверяем формат с разделителями ---
  const delimiterRegex = /^---\s*$([\s\S]*?)^---\s*$/m
  const delimiterMatch = source.match(delimiterRegex)
  
  if (delimiterMatch) {
    // Формат с --- разделителями
    sections.script = delimiterMatch[1].trim()
    
    // Находим конец script секции
    const scriptEndIndex = delimiterMatch.index + delimiterMatch[0].length
    let restContent = source.substring(scriptEndIndex).trim()
    
    // Извлекаем <style> секцию (если есть)
    const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/
    const styleMatch = restContent.match(styleRegex)
    
    if (styleMatch) {
      sections.style = styleMatch[0] // Сохраняем весь тег с атрибутами
      
      // Всё между концом script и началом style - это template
      const styleStartIndex = restContent.indexOf('<style')
      sections.template = restContent.substring(0, styleStartIndex).trim()
    } else {
      // Нет style секции - всё остальное template
      sections.template = restContent
    }
  } else {
    // Традиционный формат с тегами
    
    // Извлекаем <script> секцию
    const scriptRegex = /<script>([\s\S]*?)<\/script>/
    const scriptMatch = source.match(scriptRegex)
    if (scriptMatch) {
      sections.script = scriptMatch[1].trim()
    }

    // Извлекаем <template> секцию
    const templateRegex = /<template>([\s\S]*?)<\/template>/
    const templateMatch = source.match(templateRegex)
    if (templateMatch) {
      sections.template = templateMatch[1].trim()
    }

    // Извлекаем <style> секцию
    const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/
    const styleMatch = source.match(styleRegex)
    if (styleMatch) {
      sections.style = styleMatch[0] // Сохраняем весь тег с атрибутами
    }
  }

  return sections
}

/**
 * Компилирует script секцию
 * @param {string} script - JavaScript код
 * @returns {Object} скомпилированный код с метаданными
 */
function compileScript(script) {
  if (!script.trim()) return { code: '', states: [], computed: [], effects: [] }

  const states = []
  const computed = []
  const effects = []
  const functions = []
  let transformed = script

  // 1. Находим и обрабатываем $state переменные
  const stateRegex = /let\s+(\w+)\s*=\s*\$state\s*\(([^)]*)\)/g
  let match
  while ((match = stateRegex.exec(script)) !== null) {
    const varName = match[1]
    const initialValue = match[2]
    states.push({ name: varName, initial: initialValue })
  }

  // Заменяем $state на правильный Proxy код
  transformed = transformed.replace(
    /let\s+(\w+)\s*=\s*\$state\s*\(([^)]*)\)/g,
    (match, varName, initial) => {
      return `const _state_${varName} = $state(${initial})`
    }
  )

  // 2. Находим вычисляемые значения ($: name = expression)
  const computedRegex = /^\s*\$:\s+(\w+)\s*=\s*(.+)$/gm
  while ((match = computedRegex.exec(script)) !== null) {
    const varName = match[1]
    const expression = match[2]
    computed.push({ name: varName, expression })
  }

  // Заменяем вычисляемые значения на $computed
  transformed = transformed.replace(
    /^\s*\$:\s+(\w+)\s*=\s*(.+)$/gm,
    (match, varName, expr) => {
      return `const _computed_${varName} = $computed(() => ${expr})`
    }
  )

  // 3. Находим эффекты ($: { code })
  const effectBlockRegex = /^\s*\$:\s*effect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*\)/gm
  while ((match = effectBlockRegex.exec(script)) !== null) {
    effects.push({ code: match[1].trim() })
  }

  // Заменяем эффекты
  transformed = transformed.replace(
    /^\s*\$:\s*effect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*\)/gm,
    (match, code) => {
      return `  $effect(() => {${code}})`
    }
  )

  // 4. Находим функции
  const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g
  while ((match = functionRegex.exec(script)) !== null) {
    functions.push(match[1])
  }

  // 5. Заменяем все обращения к state/computed переменным на .value
  // Сначала заменяем в computed выражениях (они используют state)
  states.forEach(({ name }) => {
    // Заменяем в правой части присваиваний и выражениях
    const regex = new RegExp(`\\b${name}\\b`, 'g')
    transformed = transformed.replace(regex, `_state_${name}.value`)
  })
  
  computed.forEach(({ name }) => {
    const regex = new RegExp(`\\b${name}\\b`, 'g')
    transformed = transformed.replace(regex, `_computed_${name}.value`)
  })

  return {
    code: transformed,
    states,
    computed,
    effects,
    functions
  }
}

// Упрощенные трансформации перенесены в compileScript

/**
 * Компилирует template секцию
 * @param {string} template - HTML шаблон
 * @param {Object} metadata - метаданные из script
 * @returns {string} функция рендеринга
 */
function compileTemplate(template, metadata = {}) {
  if (!template.trim()) {
    return `function render() {
      const div = document.createElement('div')
      div.textContent = 'Empty component'
      return div
    }`
  }

  const html = template.replace(/<\/?template>/g, '').trim()
  let processed = html

  // НОВОЕ: Обработка директив (#if, #for, #each) через отдельный модуль
  processed = compileDirectives(processed, metadata)

  // Обработка {interpolation} - теперь пропускаем директивы
  processed = processed.replace(
    /\{([^#/:}][^}]*)\}/g,  // Не трогаем {#if}, {:else}, {/if} и т.д.
    (match, expr) => {
      let transformed = transformExpression(expr, metadata)
      return `\${${transformed}}`
    }
  )

  // Обработка @click и других событий
  processed = processed.replace(
    /@(\w+)\s*=\s*["']([^"']+)["']/g,
    'data-event-$1="$2"'
  )

  // Обработка #bind
  processed = processed.replace(
    /#bind\s*=\s*["']([^"']+)["']/g,
    (match, varName) => {
      let transformed = varName.trim()
      
      // Заменяем на state переменную
      if (metadata.states) {
        metadata.states.forEach(({ name }) => {
          if (transformed === name) {
            transformed = `_state_${name}`
          }
        })
      }
      
      return `data-bind="${transformed}"`
    }
  )

  // Обработка :class
  processed = processed.replace(
    /:class\s*=\s*["']([^"']+)["']/g,
    (match, expr) => {
      const transformed = transformExpression(expr, metadata)
      return `data-class="${transformed}"`
    }
  )

  // Обработка :style
  processed = processed.replace(
    /:style\s*=\s*["']([^"']+)["']/g,
    (match, expr) => {
      const transformed = transformExpression(expr, metadata)
      return `data-style="${transformed}"`
    }
  )

  // Генерируем функцию рендеринга
  return `function render() {
    const container = document.createElement('div')
    container.innerHTML = \`${processed}\`
    
    // Привязываем обработчики событий
    const elements = container.querySelectorAll('[data-event-click]')
    elements.forEach(el => {
      const handler = el.getAttribute('data-event-click')
      el.addEventListener('click', () => {
        eval(handler)
      })
      el.removeAttribute('data-event-click')
    })
    
    // Привязываем #bind директивы
    const bindElements = container.querySelectorAll('[data-bind]')
    bindElements.forEach(el => {
      const varName = el.getAttribute('data-bind')
      if (el.tagName === 'INPUT') {
        el.value = eval(varName + '.value')
        el.addEventListener('input', (e) => {
          const value = el.type === 'number' || el.type === 'range' ? Number(e.target.value) : e.target.value
          eval(varName + '.value = value')
        })
      }
      el.removeAttribute('data-bind')
    })
    
    return container.firstElementChild || container
  }`
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

  // Извлекаем CSS код
  let css = style
  let lang = 'css'
  
  // Проверяем, есть ли атрибут lang
  const langMatch = style.match(/<style[^>]*lang\s*=\s*["'](\w+)["']/)
  if (langMatch) {
    lang = langMatch[1]
  }
  
  // Убираем теги <style>
  css = css.replace(/<style[^>]*>/, '').replace(/<\/style>/, '').trim()

  if (!css) return ''

  // Если SCSS - преобразуем в CSS (упрощенная версия)
  if (lang === 'scss') {
    css = compileSCSS(css)
  }

  // Добавляем scoping
  const scopeClass = `aspscript-${componentName.toLowerCase()}`
  const scopedCss = addScopeToCSS(css, scopeClass)

  return scopedCss
}

/**
 * Упрощенная компиляция SCSS в CSS
 */
function compileSCSS(scss) {
  let css = scss
  
  // Убираем комментарии
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')
  css = css.replace(/\/\/.*/g, '')
  
  // Обрабатываем переменные $variable
  const variables = {}
  css = css.replace(/\$(\w+):\s*([^;]+);/g, (match, name, value) => {
    variables[name] = value.trim()
    return ''
  })
  
  // Заменяем использование переменных
  Object.entries(variables).forEach(([name, value]) => {
    const regex = new RegExp(`\\$${name}\\b`, 'g')
    css = css.replace(regex, value)
  })
  
  // Обрабатываем вложенность (упрощенная версия)
  css = processNesting(css)
  
  return css.trim()
}

/**
 * Обрабатывает вложенность SCSS
 */
function processNesting(css) {
  // Это упрощенная версия - полная реализация требует парсера
  // Пока просто разворачиваем & селекторы
  css = css.replace(/&/g, '')
  return css
}

/**
 * Добавляет scope к CSS правилам
 */
function addScopeToCSS(css, scopeClass) {
  const lines = css.split('\n')
  const result = []
  let currentSelector = ''
  let inAtRule = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Медиа-запросы и другие @ правила
    if (trimmed.startsWith('@')) {
      result.push(line)
      inAtRule = trimmed.includes('{')
      continue
    }
    
    // Закрывающая скобка @ правила
    if (inAtRule && trimmed === '}') {
      result.push(line)
      inAtRule = false
      continue
    }
    
    // Селектор
    if (trimmed.includes('{') && !trimmed.startsWith('@')) {
      const selector = trimmed.substring(0, trimmed.indexOf('{')).trim()
      const rest = trimmed.substring(trimmed.indexOf('{'))
      
      // Добавляем scope class к селектору
      let scopedSelector = selector
      if (!selector.includes(scopeClass)) {
        // Разделяем множественные селекторы
        const selectors = selector.split(',').map(s => s.trim())
        scopedSelector = selectors.map(s => {
          // Не добавляем scope к :root, html, body, *
          if (s === ':root' || s === 'html' || s === 'body' || s === '*') {
            return s
          }
          return `.${scopeClass} ${s}`
        }).join(', ')
      }
      
      result.push(`${scopedSelector} ${rest}`)
    } else {
      result.push(line)
    }
  }
  
  return result.join('\n')
}

/**
 * Основная функция компиляции
 * @param {string} source - содержимое .aspc файла
 * @param {object} options - опции компиляции
 * @returns {string} скомпилированный JavaScript
 */
export function compile(source, options = {}) {
  const componentName = options.componentName || 'Component'
  const { ssr = false, hmr = false, file = 'unknown.aspc' } = options

  try {
    // Разделяем на секции
    const sections = parseSections(source)

    // Валидируем директивы (проверяем закрытие блоков)
    if (sections.template) {
      validateDirectiveBlocks(sections.template, file)
    }

    // Парсим props, events, slots из script
    const props = parseProps(sections.script)
    const emits = parseEmits(sections.script)
    const slots = parseSlots(sections.template)

    // Компилируем script с метаданными
    const scriptResult = compileScript(sections.script)
    
    // Компилируем template с учетом слотов
    let templateWithSlots = sections.template
    if (Object.keys(slots.named).length > 0 || slots.default) {
      templateWithSlots = compileSlotsUsage(templateWithSlots, slots)
    }
    
    const renderFunction = compileTemplate(templateWithSlots, scriptResult)
    const scopedStyle = compileStyle(sections.style, componentName)
    const scopeClass = `aspscript-${componentName.toLowerCase()}`

    // Генерируем код для props, events, slots
    const propsCode = generatePropsCode(props)
    const propsValidation = generatePropsValidation(props)
    const eventsCode = generateEventsCode(emits)
    const slotsCode = generateSlotsCode(slots)

    // Генерируем финальный код компонента
    const code = `
// AspScript Component: ${componentName}
// Generated by AspScript Compiler v1.3.0 "Advanced Compiler"
import { $state, $computed, $effect, $global, onMount, onDestroy } from '@aspscript/core'

export default function ${componentName}(props = {}) {
  // Props initialization
  const componentProps = props || {}
  ${propsCode}
  ${propsValidation}

  // Events system
  ${eventsCode}

  // Slots system
  ${slotsCode}

  // Component logic
  ${scriptResult.code}

  // Render function
  ${renderFunction}

  // Styles
  const styles = \`${scopedStyle}\`
  const scopeClass = '${scopeClass}'

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

  // Return component interface
  return {
    render,
    styles,
    name: '${componentName}',
    scopeClass,
    props: componentProps,
    ${emits.length > 0 ? 'emit, on,' : ''}
    ${Object.keys(slots.named).length > 0 || slots.default ? 'slots: ' + JSON.stringify(Object.keys(slots.named)) + ',' : ''}
  }
}

${hmr ? `
// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && newModule.default) {
      console.log('🔄 [HMR] ${componentName} updated')
    }
  })
}
` : ''}
`

    return code
  } catch (error) {
    // Если это наша ошибка компилятора, форматируем и выбрасываем
    if (error.name === 'CompilerError') {
      console.error(error.format())
    }
    throw error
  }
}

export default { compile }

