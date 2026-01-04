/**
 * AspScript Compiler - Error Handler
 * Красивая обработка и отображение ошибок компиляции
 */

/**
 * Типы ошибок компилятора
 */
export const ErrorTypes = {
  SYNTAX_ERROR: 'SyntaxError',
  TEMPLATE_ERROR: 'TemplateError',
  DIRECTIVE_ERROR: 'DirectiveError',
  COMPONENT_ERROR: 'ComponentError',
  STYLE_ERROR: 'StyleError',
  VALIDATION_ERROR: 'ValidationError'
}

/**
 * Коды ошибок
 */
export const ErrorCodes = {
  // Синтаксические ошибки (1000-1999)
  INVALID_SYNTAX: 1000,
  UNCLOSED_TAG: 1001,
  UNCLOSED_DIRECTIVE: 1002,
  INVALID_EXPRESSION: 1003,
  
  // Ошибки директив (2000-2999)
  INVALID_IF_CONDITION: 2000,
  MISSING_ENDIF: 2001,
  INVALID_FOR_SYNTAX: 2002,
  MISSING_ENDFOR: 2003,
  INVALID_BIND_TARGET: 2004,
  
  // Ошибки компонентов (3000-3999)
  INVALID_PROPS: 3000,
  MISSING_REQUIRED_PROP: 3001,
  INVALID_PROP_TYPE: 3002,
  INVALID_EVENT: 3003,
  INVALID_SLOT: 3004,
  
  // Ошибки стилей (4000-4999)
  INVALID_CSS: 4000,
  INVALID_SCSS: 4001
}

/**
 * Класс ошибки компилятора
 */
export class CompilerError extends Error {
  constructor(type, code, message, file, line, column, context) {
    super(message)
    this.name = 'CompilerError'
    this.type = type
    this.code = code
    this.file = file
    this.line = line
    this.column = column
    this.context = context
  }
  
  /**
   * Форматирует ошибку для вывода
   * @returns {string} отформатированное сообщение
   */
  format() {
    let output = `\n`
    output += `${this.getColoredType()}: ${this.message}\n`
    output += `  ${this.getColoredLocation()}\n`
    
    if (this.context) {
      output += `\n${this.formatContext()}\n`
    }
    
    const suggestion = this.getSuggestion()
    if (suggestion) {
      output += `\n  ${this.colorize('💡 help:', 'cyan')} ${suggestion}\n`
    }
    
    const note = this.getNote()
    if (note) {
      output += `  ${this.colorize('📝 note:', 'blue')} ${note}\n`
    }
    
    return output
  }
  
  /**
   * Получает цветной тип ошибки
   */
  getColoredType() {
    const typeStr = `${this.type} [E${this.code}]`
    return this.colorize(typeStr, 'red', true)
  }
  
  /**
   * Получает цветное местоположение
   */
  getColoredLocation() {
    return this.colorize(`--> ${this.file}:${this.line}:${this.column}`, 'gray')
  }
  
  /**
   * Форматирует контекст ошибки
   */
  formatContext() {
    if (!this.context || !this.context.source) {
      return ''
    }
    
    const lines = this.context.source.split('\n')
    const errorLine = this.line - 1
    const startLine = Math.max(0, errorLine - 2)
    const endLine = Math.min(lines.length, errorLine + 3)
    
    let output = ''
    
    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1
      const line = lines[i]
      const isErrorLine = i === errorLine
      
      // Номер строки
      const lineNumStr = String(lineNum).padStart(4, ' ')
      output += `  ${this.colorize(lineNumStr, 'blue')} | `
      
      if (isErrorLine) {
        // Подсветка строки с ошибкой
        output += this.colorize(line, 'white')
        output += `\n       | `
        
        // Указатель на место ошибки
        const pointer = ' '.repeat(this.column - 1) + '^'.repeat(this.context.length || 1)
        output += this.colorize(pointer, 'red', true)
        
        if (this.context.highlight) {
          output += ` ${this.colorize(this.context.highlight, 'red')}`
        }
      } else {
        output += line
      }
      
      output += `\n`
    }
    
    return output
  }
  
  /**
   * Получает предложение по исправлению
   */
  getSuggestion() {
    switch (this.code) {
      case ErrorCodes.MISSING_ENDIF:
        return 'Add {/if} to close the conditional block'
      
      case ErrorCodes.MISSING_ENDFOR:
        return 'Add {/for} to close the loop'
      
      case ErrorCodes.INVALID_FOR_SYNTAX:
        return 'Valid syntax: {#for item in items}...{/for} or {#each items as item}...{/each}'
      
      case ErrorCodes.INVALID_IF_CONDITION:
        return 'Condition must be a valid JavaScript expression'
      
      case ErrorCodes.MISSING_REQUIRED_PROP:
        return `Pass the required prop: <Component ${this.context.propName}="value" />`
      
      case ErrorCodes.INVALID_PROP_TYPE:
        return `Expected type ${this.context.expectedType}, received ${this.context.actualType}`
      
      default:
        return null
    }
  }
  
  /**
   * Получает дополнительную заметку
   */
  getNote() {
    switch (this.code) {
      case ErrorCodes.INVALID_FOR_SYNTAX:
        return 'You can also use index: {#for (item, index) in items}...{/for}'
      
      case ErrorCodes.INVALID_IF_CONDITION:
        return 'You can use reactive variables directly: {#if isActive}...{/if}'
      
      default:
        return null
    }
  }
  
  /**
   * Добавляет цвет к тексту (для терминала)
   */
  colorize(text, color, bold = false) {
    // Если не в терминале, возвращаем без цвета
    if (typeof process === 'undefined' || !process.stdout?.isTTY) {
      return text
    }
    
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    }
    
    const reset = '\x1b[0m'
    const boldCode = bold ? '\x1b[1m' : ''
    
    return `${boldCode}${colors[color] || ''}${text}${reset}`
  }
}

/**
 * Создает ошибку синтаксиса
 */
export function createSyntaxError(message, file, line, column, context) {
  return new CompilerError(
    ErrorTypes.SYNTAX_ERROR,
    ErrorCodes.INVALID_SYNTAX,
    message,
    file,
    line,
    column,
    context
  )
}

/**
 * Создает ошибку директивы
 */
export function createDirectiveError(code, message, file, line, column, context) {
  return new CompilerError(
    ErrorTypes.DIRECTIVE_ERROR,
    code,
    message,
    file,
    line,
    column,
    context
  )
}

/**
 * Создает ошибку компонента
 */
export function createComponentError(code, message, file, line, column, context) {
  return new CompilerError(
    ErrorTypes.COMPONENT_ERROR,
    code,
    message,
    file,
    line,
    column,
    context
  )
}

/**
 * Находит позицию (line, column) для индекса в строке
 * @param {string} source - исходный код
 * @param {number} index - индекс символа
 * @returns {Object} {line, column}
 */
export function getPosition(source, index) {
  const lines = source.substring(0, index).split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

/**
 * Извлекает контекст вокруг ошибки
 * @param {string} source - исходный код
 * @param {number} line - номер строки
 * @param {number} column - номер колонки
 * @param {number} length - длина подсветки
 * @returns {Object} context info
 */
export function getErrorContext(source, line, column, length = 1) {
  return {
    source,
    length,
    highlight: null
  }
}

/**
 * Валидирует закрытие директивных блоков
 * @param {string} template - HTML шаблон
 * @param {string} file - имя файла
 * @throws {CompilerError} если блоки не закрыты
 */
export function validateDirectiveBlocks(template, file = 'unknown.aspc') {
  const stack = []
  
  // Проверяем {#if}...{/if}
  const ifRegex = /\{#if\s+[^}]+\}/g
  const endIfRegex = /\{\/if\}/g
  
  let match
  while ((match = ifRegex.exec(template)) !== null) {
    const pos = getPosition(template, match.index)
    stack.push({ type: 'if', pos, text: match[0] })
  }
  
  while ((match = endIfRegex.exec(template)) !== null) {
    if (stack.length === 0 || stack[stack.length - 1].type !== 'if') {
      const pos = getPosition(template, match.index)
      throw createDirectiveError(
        ErrorCodes.MISSING_ENDIF,
        'Unexpected {/if} without matching {#if}',
        file,
        pos.line,
        pos.column,
        getErrorContext(template, pos.line, pos.column)
      )
    }
    stack.pop()
  }
  
  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1]
    throw createDirectiveError(
      ErrorCodes.MISSING_ENDIF,
      `Unclosed {#if} directive`,
      file,
      unclosed.pos.line,
      unclosed.pos.column,
      getErrorContext(template, unclosed.pos.line, unclosed.pos.column)
    )
  }
  
  // Проверяем {#for}...{/for}
  const forRegex = /\{#for\s+[^}]+\}/g
  const endForRegex = /\{\/for\}/g
  
  stack.length = 0
  
  while ((match = forRegex.exec(template)) !== null) {
    const pos = getPosition(template, match.index)
    stack.push({ type: 'for', pos, text: match[0] })
  }
  
  while ((match = endForRegex.exec(template)) !== null) {
    if (stack.length === 0 || stack[stack.length - 1].type !== 'for') {
      const pos = getPosition(template, match.index)
      throw createDirectiveError(
        ErrorCodes.MISSING_ENDFOR,
        'Unexpected {/for} without matching {#for}',
        file,
        pos.line,
        pos.column,
        getErrorContext(template, pos.line, pos.column)
      )
    }
    stack.pop()
  }
  
  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1]
    throw createDirectiveError(
      ErrorCodes.MISSING_ENDFOR,
      `Unclosed {#for} directive`,
      file,
      unclosed.pos.line,
      unclosed.pos.column,
      getErrorContext(template, unclosed.pos.line, unclosed.pos.column)
    )
  }
}

export default {
  ErrorTypes,
  ErrorCodes,
  CompilerError,
  createSyntaxError,
  createDirectiveError,
  createComponentError,
  getPosition,
  getErrorContext,
  validateDirectiveBlocks
}

