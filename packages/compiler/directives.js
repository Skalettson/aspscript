/**
 * AspScript Compiler - Directives Handler
 * Обработка директив: #if, #for, #each, и других
 */

/**
 * Парсит и компилирует условные директивы (#if, #else if, #else)
 * @param {string} template - HTML шаблон
 * @param {Object} metadata - метаданные (states, computed)
 * @returns {string} обработанный шаблон
 */
export function compileConditionalDirectives(template, metadata = {}) {
  let processed = template
  
  // Обрабатываем блочные условные директивы: {#if}...{:else if}...{:else}...{/if}
  const ifBlockRegex = /\{#if\s+([^}]+)\}([\s\S]*?)(?:\{:else\s+if\s+([^}]+)\}([\s\S]*?))*(?:\{:else\}([\s\S]*?))?\{\/if\}/g
  
  processed = processed.replace(ifBlockRegex, (match, condition, ifContent, ...rest) => {
    // Извлекаем все else if блоки
    const elseIfBlocks = []
    let elseContent = ''
    
    // Парсим сложную структуру с множественными else if
    const fullMatch = match
    const parts = parseIfElseStructure(fullMatch)
    
    // Трансформируем условие (заменяем переменные на .value)
    const transformedCondition = transformExpression(parts.if.condition, metadata)
    
    // Генерируем тернарный оператор или if-else цепочку
    let result = generateConditionalCode(parts, metadata)
    
    return result
  })
  
  // Также обрабатываем inline условия в атрибутах: <div #if="condition">
  processed = processed.replace(
    /<([^>]+)\s+#if\s*=\s*["']([^"']+)["']([^>]*)>/g,
    (match, tag, condition, rest) => {
      const transformed = transformExpression(condition, metadata)
      return `\${${transformed} ? \`<${tag}${rest}>\` : ''}`
    }
  )
  
  return processed
}

/**
 * Парсит структуру if-else if-else
 * @param {string} block - полный блок с условиями
 * @returns {Object} структурированные данные
 */
function parseIfElseStructure(block) {
  const result = {
    if: { condition: '', content: '' },
    elseIf: [],
    else: null
  }
  
  // Парсим основное условие if
  const ifMatch = block.match(/\{#if\s+([^}]+)\}([\s\S]*?)(?=\{:else|\{\/if\})/)
  if (ifMatch) {
    result.if.condition = ifMatch[1].trim()
    result.if.content = ifMatch[2]
  }
  
  // Парсим все else if блоки
  const elseIfRegex = /\{:else\s+if\s+([^}]+)\}([\s\S]*?)(?=\{:else|\{\/if\})/g
  let elseIfMatch
  while ((elseIfMatch = elseIfRegex.exec(block)) !== null) {
    result.elseIf.push({
      condition: elseIfMatch[1].trim(),
      content: elseIfMatch[2]
    })
  }
  
  // Парсим else блок
  const elseMatch = block.match(/\{:else\}([\s\S]*?)\{\/if\}/)
  if (elseMatch) {
    result.else = elseMatch[1]
  }
  
  return result
}

/**
 * Генерирует код для условного рендеринга
 * @param {Object} parts - структура условий
 * @param {Object} metadata - метаданные
 * @returns {string} JavaScript код
 */
function generateConditionalCode(parts, metadata) {
  let code = ''
  
  // Основное условие
  const ifCondition = transformExpression(parts.if.condition, metadata)
  const ifContent = parts.if.content.trim()
  
  code = `\${${ifCondition} ? \`${ifContent}\``
  
  // Добавляем else if блоки
  if (parts.elseIf.length > 0) {
    parts.elseIf.forEach(elseIf => {
      const condition = transformExpression(elseIf.condition, metadata)
      const content = elseIf.content.trim()
      code += ` : ${condition} ? \`${content}\``
    })
  }
  
  // Добавляем else блок
  if (parts.else) {
    const elseContent = parts.else.trim()
    code += ` : \`${elseContent}\``
  } else {
    code += ` : ''`
  }
  
  code += '}'
  
  return code
}

/**
 * Парсит и компилирует директивы циклов (#for, #each)
 * @param {string} template - HTML шаблон
 * @param {Object} metadata - метаданные
 * @returns {string} обработанный шаблон
 */
export function compileLoopDirectives(template, metadata = {}) {
  let processed = template
  
  // Обрабатываем блочные циклы: {#for item in items}...{/for}
  const forBlockRegex = /\{#for\s+(?:\(?\s*(\w+)(?:\s*,\s*(\w+))?\s*\)?\s+in\s+(\w+))\s*(?::key\s*=\s*["']([^"']+)["'])?\s*\}([\s\S]*?)\{\/for\}/g
  
  processed = processed.replace(forBlockRegex, (match, item, index, array, key, content) => {
    const itemName = item.trim()
    const indexName = index ? index.trim() : '__index'
    const arrayName = array.trim()
    
    // Трансформируем имя массива (добавляем .value если это state)
    const transformedArray = transformExpression(arrayName, metadata)
    
    // Обрабатываем содержимое цикла
    let loopContent = content.trim()
    
    // Заменяем переменную итератора в содержимом
    loopContent = loopContent.replace(new RegExp(`\\{${itemName}\\.([^}]+)\\}`, 'g'), `\${${itemName}.$1}`)
    loopContent = loopContent.replace(new RegExp(`\\{${itemName}\\}`, 'g'), `\${${itemName}}`)
    
    // Заменяем индекс
    if (index) {
      loopContent = loopContent.replace(new RegExp(`\\{${indexName}\\}`, 'g'), `\${${indexName}}`)
    }
    
    // Генерируем код map
    let code = `\${${transformedArray}.map((${itemName}, ${indexName}) => \`${loopContent}\`)`
    
    // Добавляем key для оптимизации (если указан)
    if (key) {
      code += `.map((html, i) => \`<div data-key="\${${transformedArray}[i].${key}}">\${html}</div>\`)`
    }
    
    code += `.join('')}`
    
    return code
  })
  
  // Обрабатываем #each (алиас для #for)
  const eachBlockRegex = /\{#each\s+(\w+)\s+as\s+(?:\(?\s*(\w+)(?:\s*,\s*(\w+))?\s*\)?)?\s*(?::key\s*=\s*["']([^"']+)["'])?\s*\}([\s\S]*?)\{\/each\}/g
  
  processed = processed.replace(eachBlockRegex, (match, array, item, index, key, content) => {
    const itemName = item.trim()
    const indexName = index ? index.trim() : '__index'
    const arrayName = array.trim()
    
    const transformedArray = transformExpression(arrayName, metadata)
    
    let loopContent = content.trim()
    loopContent = loopContent.replace(new RegExp(`\\{${itemName}\\.([^}]+)\\}`, 'g'), `\${${itemName}.$1}`)
    loopContent = loopContent.replace(new RegExp(`\\{${itemName}\\}`, 'g'), `\${${itemName}}`)
    
    if (index) {
      loopContent = loopContent.replace(new RegExp(`\\{${indexName}\\}`, 'g'), `\${${indexName}}`)
    }
    
    let code = `\${${transformedArray}.map((${itemName}, ${indexName}) => \`${loopContent}\`).join('')}`
    
    return code
  })
  
  // Также обрабатываем inline циклы в атрибутах (упрощенная версия)
  processed = processed.replace(
    /#for\s*=\s*["']([^"']+)["']/g,
    'data-for="$1"'
  )
  
  return processed
}

/**
 * Трансформирует выражение (заменяет переменные на .value)
 * @param {string} expression - выражение
 * @param {Object} metadata - метаданные с states и computed
 * @returns {string} трансформированное выражение
 */
export function transformExpression(expression, metadata = {}) {
  let transformed = expression.trim()
  
  // Заменяем state переменные на .value
  if (metadata.states) {
    metadata.states.forEach(({ name }) => {
      const regex = new RegExp(`\\b${name}\\b`, 'g')
      transformed = transformed.replace(regex, `_state_${name}.value`)
    })
  }
  
  // Заменяем computed переменные на .value
  if (metadata.computed) {
    metadata.computed.forEach(({ name }) => {
      const regex = new RegExp(`\\b${name}\\b`, 'g')
      transformed = transformed.replace(regex, `_computed_${name}.value`)
    })
  }
  
  return transformed
}

/**
 * Компилирует все директивы в шаблоне
 * @param {string} template - HTML шаблон
 * @param {Object} metadata - метаданные
 * @returns {string} обработанный шаблон
 */
export function compileDirectives(template, metadata = {}) {
  let processed = template
  
  // Сначала обрабатываем условия (они могут содержать циклы)
  processed = compileConditionalDirectives(processed, metadata)
  
  // Затем обрабатываем циклы
  processed = compileLoopDirectives(processed, metadata)
  
  return processed
}

export default {
  compileConditionalDirectives,
  compileLoopDirectives,
  compileDirectives,
  transformExpression
}

