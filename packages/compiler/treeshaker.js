/**
 * AspScript Tree Shaker
 * Удаление неиспользуемого кода
 */

/**
 * Tree Shaker для AspScript
 */
export class TreeShaker {
  constructor(options = {}) {
    this.aggressive = options.aggressive || false
    this.verbose = options.verbose || false
  }

  /**
   * Удаляет неиспользуемый код
   * @param {string} code - исходный код
   * @param {Object} options - опции
   * @returns {string} оптимизированный код
   */
  shake(code, options = {}) {
    let optimized = code

    // Удаляем неиспользуемые импорты
    optimized = this.removeUnusedImports(optimized)

    // Удаляем неиспользуемые функции
    if (this.aggressive) {
      optimized = this.removeUnusedFunctions(optimized)
    }

    // Удаляем комментарии
    if (options.removeComments !== false) {
      optimized = this.removeComments(optimized)
    }

    // Удаляем пустые строки
    if (options.removeEmptyLines !== false) {
      optimized = this.removeEmptyLines(optimized)
    }

    // Минификация пробелов
    if (options.minify) {
      optimized = this.minifyWhitespace(optimized)
    }

    if (this.verbose) {
      const originalSize = Buffer.byteLength(code, 'utf-8')
      const optimizedSize = Buffer.byteLength(optimized, 'utf-8')
      const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(2)
      console.log(`Tree shaking: ${originalSize} → ${optimizedSize} bytes (${reduction}% reduction)`)
    }

    return optimized
  }

  /**
   * Удаляет неиспользуемые импорты
   */
  removeUnusedImports(code) {
    const lines = code.split('\n')
    const imports = []
    const usedIdentifiers = new Set()

    // Собираем все импорты
    lines.forEach((line, index) => {
      const importMatch = line.match(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/)
      if (importMatch) {
        const namedImports = importMatch[1]
        const defaultImport = importMatch[2]
        
        if (namedImports) {
          const names = namedImports.split(',').map(n => n.trim())
          imports.push({ line: index, names, type: 'named' })
        } else if (defaultImport) {
          imports.push({ line: index, names: [defaultImport], type: 'default' })
        }
      }
    })

    // Находим используемые идентификаторы
    const codeWithoutImports = lines
      .filter((_, i) => !imports.some(imp => imp.line === i))
      .join('\n')

    imports.forEach(imp => {
      imp.names.forEach(name => {
        const regex = new RegExp(`\\b${name}\\b`, 'g')
        if (regex.test(codeWithoutImports)) {
          usedIdentifiers.add(name)
        }
      })
    })

    // Удаляем неиспользуемые импорты
    return lines
      .filter((line, index) => {
        const importData = imports.find(imp => imp.line === index)
        if (!importData) return true

        // Проверяем, используется ли хотя бы один импорт
        return importData.names.some(name => usedIdentifiers.has(name))
      })
      .join('\n')
  }

  /**
   * Удаляет неиспользуемые функции
   */
  removeUnusedFunctions(code) {
    // Простая реализация - в продакшене нужен полноценный AST анализ
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*{/g
    const functions = []
    let match

    while ((match = functionRegex.exec(code)) !== null) {
      functions.push(match[1])
    }

    // Проверяем использование каждой функции
    const usedFunctions = functions.filter(fn => {
      const regex = new RegExp(`\\b${fn}\\s*\\(`, 'g')
      const matches = code.match(regex) || []
      // Функция используется, если вызывается хотя бы 2 раза (объявление + вызов)
      return matches.length > 1
    })

    // Удаляем неиспользуемые функции
    let optimized = code
    functions.forEach(fn => {
      if (!usedFunctions.includes(fn)) {
        const fnRegex = new RegExp(`function\\s+${fn}\\s*\\([^)]*\\)\\s*{[^}]*}`, 'g')
        optimized = optimized.replace(fnRegex, '')
      }
    })

    return optimized
  }

  /**
   * Удаляет комментарии
   */
  removeComments(code) {
    // Удаляем однострочные комментарии
    let optimized = code.replace(/\/\/.*/g, '')
    
    // Удаляем многострочные комментарии
    optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '')
    
    return optimized
  }

  /**
   * Удаляет пустые строки
   */
  removeEmptyLines(code) {
    return code
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n')
  }

  /**
   * Минифицирует пробелы
   */
  minifyWhitespace(code) {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}();,:])\s*/g, '$1')
      .trim()
  }

  /**
   * Анализирует зависимости
   */
  analyzeDependencies(code) {
    const imports = []
    const exports = []

    // Анализируем импорты
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g
    let match

    while ((match = importRegex.exec(code)) !== null) {
      imports.push({
        module: match[3],
        imports: match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]]
      })
    }

    // Анализируем экспорты
    const exportRegex = /export\s+(?:default\s+)?(?:function|const|let|var|class)\s+(\w+)/g
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1])
    }

    return { imports, exports }
  }
}

/**
 * Создает tree shaker
 */
export function createTreeShaker(options) {
  return new TreeShaker(options)
}

/**
 * Быстрая функция для tree shaking
 */
export function shake(code, options = {}) {
  const shaker = new TreeShaker(options)
  return shaker.shake(code, options)
}

export default {
  TreeShaker,
  createTreeShaker,
  shake
}
