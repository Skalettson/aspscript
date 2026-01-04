/**
 * AspScript Incremental Compilation System
 * Система инкрементальной компиляции для ускорения разработки
 */

const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

/**
 * Incremental Compiler Class
 * Основной класс для инкрементальной компиляции
 */
class IncrementalCompiler {
  constructor(options = {}) {
    this.options = {
      cacheDir: options.cacheDir || '.aspscript/cache',
      watchMode: options.watchMode || false,
      verbose: options.verbose || false,
      ...options
    }

    this.fileCache = new Map()
    this.dependencyGraph = new Map()
    this.compilationStats = {
      totalFiles: 0,
      cachedFiles: 0,
      compiledFiles: 0,
      startTime: 0,
      endTime: 0
    }

    this.initialized = false
  }

  /**
   * Инициализирует компилятор
   */
  async initialize() {
    if (this.initialized) return

    try {
      // Создаем директорию кеша
      await this.ensureCacheDirectory()

      // Загружаем существующий кеш
      await this.loadCache()

      this.initialized = true

      if (this.options.verbose) {
        console.log('✅ Incremental compiler initialized')
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize incremental compiler:', error.message)
      // Продолжаем без кеша
    }
  }

  /**
   * Компилирует файл с использованием кеширования
   * @param {string} filePath - путь к файлу
   * @param {string} source - исходный код
   * @param {Object} options - опции компиляции
   * @returns {Object} результат компиляции
   */
  async compile(filePath, source, options = {}) {
    await this.initialize()

    const startTime = Date.now()
    this.compilationStats.startTime = startTime

    try {
      // Вычисляем хеш файла
      const hash = this.getFileHash(source)

      // Проверяем, нужно ли перекомпилировать
      if (this.needsRebuild(filePath, hash)) {
        if (this.options.verbose) {
          console.log(`🔄 Compiling ${path.relative(process.cwd(), filePath)}`)
        }

        // Компилируем файл
        const result = await this.doCompile(source, filePath, options)

        // Обновляем кеш
        await this.updateCache(filePath, hash, result)

        // Обновляем зависимости
        this.updateDependencies(filePath, result.dependencies)

        this.compilationStats.compiledFiles++

        const compileTime = Date.now() - startTime
        if (this.options.verbose) {
          console.log(`✨ Compiled in ${compileTime}ms`)
        }

        return result
      } else {
        if (this.options.verbose) {
          console.log(`📋 Using cached ${path.relative(process.cwd(), filePath)}`)
        }

        this.compilationStats.cachedFiles++
        return this.getCachedResult(filePath)
      }
    } catch (error) {
      console.error(`❌ Compilation failed for ${filePath}:`, error.message)

      // В случае ошибки инвалидируем кеш для этого файла
      await this.invalidateCache(filePath)

      throw error
    } finally {
      this.compilationStats.totalFiles++
      this.compilationStats.endTime = Date.now()
    }
  }

  /**
   * Проверяет, нужно ли перекомпилировать файл
   * @param {string} filePath - путь к файлу
   * @param {string} hash - хеш файла
   * @returns {boolean} true если нужно перекомпилировать
   */
  needsRebuild(filePath, hash) {
    const cached = this.fileCache.get(filePath)

    if (!cached) {
      return true // Нет в кеше
    }

    if (cached.hash !== hash) {
      return true // Файл изменился
    }

    // Проверяем зависимости
    if (cached.dependencies) {
      for (const dep of cached.dependencies) {
        try {
          const depStats = fs.statSync(dep)
          if (depStats.mtime > cached.timestamp) {
            return true // Зависимость новее
          }
        } catch (error) {
          // Файл зависимости не найден
          return true
        }
      }
    }

    return false // Можно использовать кеш
  }

  /**
   * Выполняет компиляцию файла
   * @param {string} source - исходный код
   * @param {string} filePath - путь к файлу
   * @param {Object} options - опции компиляции
   * @returns {Object} результат компиляции
   */
  async doCompile(source, filePath, options) {
    const ext = path.extname(filePath)

    // Анализируем зависимости
    const dependencies = await this.analyzeDependencies(source, filePath)

    // Компилируем в зависимости от типа файла
    let compiled
    if (ext === '.aspc') {
      compiled = await this.compileAspc(source, filePath, options)
    } else if (ext === '.ts' || ext === '.tsx') {
      compiled = await this.compileTypeScript(source, filePath, options)
    } else if (ext === '.js' || ext === '.jsx') {
      compiled = await this.compileJavaScript(source, filePath, options)
    } else {
      compiled = source // Для других файлов просто копируем
    }

    return {
      compiled,
      dependencies,
      sourceMap: options.sourceMap ? this.generateSourceMap(source, compiled, filePath) : null,
      metadata: {
        filePath,
        compiledAt: Date.now(),
        compilerVersion: '1.1.0'
      }
    }
  }

  /**
   * Компилирует AspScript (.aspc) файл
   * @param {string} source - исходный код
   * @param {string} filePath - путь к файлу
   * @param {Object} options - опции компиляции
   * @returns {string} скомпилированный код
   */
  async compileAspc(source, filePath, options) {
    // Разбираем AspScript синтаксис
    const sections = this.parseAspcSections(source)

    // Компилируем каждый раздел
    const compiledScript = await this.compileScriptSection(sections.script, filePath)
    const compiledTemplate = this.compileTemplateSection(sections.template)
    const compiledStyle = sections.style ? this.compileStyleSection(sections.style) : ''

    // Собираем финальный модуль
    const moduleCode = this.generateModuleCode({
      script: compiledScript,
      template: compiledTemplate,
      style: compiledStyle,
      filePath,
      options
    })

    return moduleCode
  }

  /**
   * Компилирует TypeScript файл
   * @param {string} source - исходный код
   * @param {string} filePath - путь к файлу
   * @param {Object} options - опции компиляции
   * @returns {string} скомпилированный код
   */
  async compileTypeScript(source, filePath, options) {
    // Используем встроенный TypeScript трансформер из core
    const { typescriptLoader } = await import('@aspscript/core')
    return typescriptLoader(source, filePath)
  }

  /**
   * Компилирует JavaScript файл
   * @param {string} source - исходный код
   * @param {string} filePath - путь к файлу
   * @param {Object} options - опции компиляции
   * @returns {string} скомпилированный код
   */
  async compileJavaScript(source, filePath, options) {
    // Для JavaScript файлов выполняем базовую обработку
    // В будущем здесь может быть транспиляция или оптимизация
    return source
  }

  /**
   * Анализирует зависимости файла
   * @param {string} source - исходный код
   * @param {string} filePath - путь к файлу
   * @returns {Array} массив зависимостей
   */
  async analyzeDependencies(source, filePath) {
    const dependencies = []
    const dir = path.dirname(filePath)

    // Ищем import/export statements
    const importRegex = /(?:import|export)\s+.*?\s+from\s+['"]([^'"]+)['"]/g
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

    let match
    while ((match = importRegex.exec(source)) !== null) {
      const importPath = match[1]
      const resolvedPath = this.resolveImportPath(importPath, dir)
      if (resolvedPath) {
        dependencies.push(resolvedPath)
      }
    }

    while ((match = requireRegex.exec(source)) !== null) {
      const requirePath = match[1]
      const resolvedPath = this.resolveImportPath(requirePath, dir)
      if (resolvedPath) {
        dependencies.push(resolvedPath)
      }
    }

    return [...new Set(dependencies)] // Убираем дубликаты
  }

  /**
   * Разрешает путь импорта
   * @param {string} importPath - путь импорта
   * @param {string} dir - директория файла
   * @returns {string|null} разрешенный путь или null
   */
  resolveImportPath(importPath, dir) {
    try {
      // Пропускаем внешние модули (node_modules)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null
      }

      // Разрешаем относительный путь
      const resolvedPath = path.resolve(dir, importPath)

      // Проверяем различные расширения
      const extensions = ['.js', '.ts', '.tsx', '.aspc', '.json']
      for (const ext of extensions) {
        const fullPath = resolvedPath + ext
        if (fs.access(fullPath).then(() => true).catch(() => false)) {
          return fullPath
        }
      }

      // Проверяем как есть
      if (fs.access(resolvedPath).then(() => true).catch(() => false)) {
        return resolvedPath
      }

      // Проверяем index файлы в директориях
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, 'index' + ext)
        if (fs.access(indexPath).then(() => true).catch(() => false)) {
          return indexPath
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Обновляет кеш для файла
   * @param {string} filePath - путь к файлу
   * @param {string} hash - хеш файла
   * @param {Object} result - результат компиляции
   */
  async updateCache(filePath, hash, result) {
    const cacheEntry = {
      hash,
      timestamp: Date.now(),
      result,
      dependencies: result.dependencies || []
    }

    this.fileCache.set(filePath, cacheEntry)

    // Сохраняем в файл
    await this.saveCacheEntry(filePath, cacheEntry)
  }

  /**
   * Получает кешированный результат
   * @param {string} filePath - путь к файлу
   * @returns {Object} кешированный результат
   */
  getCachedResult(filePath) {
    const cached = this.fileCache.get(filePath)
    return cached ? cached.result : null
  }

  /**
   * Инвалидирует кеш для файла
   * @param {string} filePath - путь к файлу
   */
  async invalidateCache(filePath) {
    this.fileCache.delete(filePath)

    const cacheFilePath = this.getCacheFilePath(filePath)
    try {
      await fs.unlink(cacheFilePath)
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    // Инвалидируем файлы, которые зависят от этого файла
    const dependents = this.findDependents(filePath)
    for (const dependent of dependents) {
      await this.invalidateCache(dependent)
    }
  }

  /**
   * Находит файлы, которые зависят от данного файла
   * @param {string} filePath - путь к файлу
   * @returns {Array} массив зависимых файлов
   */
  findDependents(filePath) {
    const dependents = []

    for (const [dependentPath, cacheEntry] of this.fileCache) {
      if (cacheEntry.dependencies && cacheEntry.dependencies.includes(filePath)) {
        dependents.push(dependentPath)
      }
    }

    return dependents
  }

  /**
   * Обновляет граф зависимостей
   * @param {string} filePath - путь к файлу
   * @param {Array} dependencies - зависимости файла
   */
  updateDependencies(filePath, dependencies) {
    this.dependencyGraph.set(filePath, dependencies || [])

    // Обновляем обратные зависимости
    for (const dep of dependencies) {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, [])
      }
    }
  }

  /**
   * Вычисляет хеш файла
   * @param {string} source - содержимое файла
   * @returns {string} хеш
   */
  getFileHash(source) {
    return crypto.createHash('md5').update(source).digest('hex')
  }

  /**
   * Получает статистику компиляции
   * @returns {Object} статистика
   */
  getStats() {
    const totalTime = this.compilationStats.endTime - this.compilationStats.startTime
    const cacheHitRate = this.compilationStats.totalFiles > 0
      ? (this.compilationStats.cachedFiles / this.compilationStats.totalFiles) * 100
      : 0

    return {
      ...this.compilationStats,
      totalTime,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheSize: this.fileCache.size
    }
  }

  /**
   * Очищает весь кеш
   */
  async clearCache() {
    this.fileCache.clear()
    this.dependencyGraph.clear()

    try {
      await fs.rm(this.options.cacheDir, { recursive: true, force: true })
      await this.ensureCacheDirectory()
    } catch (error) {
      console.warn('Failed to clear cache:', error.message)
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Гарантирует существование директории кеша
   */
  async ensureCacheDirectory() {
    try {
      await fs.mkdir(this.options.cacheDir, { recursive: true })
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }
  }

  /**
   * Загружает кеш из файлов
   */
  async loadCache() {
    try {
      const files = await fs.readdir(this.options.cacheDir)
      const cacheFiles = files.filter(f => f.endsWith('.cache'))

      for (const cacheFile of cacheFiles) {
        try {
          const cachePath = path.join(this.options.cacheDir, cacheFile)
          const data = await fs.readFile(cachePath, 'utf8')
          const entry = JSON.parse(data)

          // Проверяем актуальность записи
          if (entry.result && entry.result.metadata) {
            this.fileCache.set(entry.filePath, entry)
          }
        } catch (error) {
          // Игнорируем поврежденные файлы кеша
        }
      }
    } catch (error) {
      // Игнорируем ошибки загрузки кеша
    }
  }

  /**
   * Сохраняет запись кеша в файл
   * @param {string} filePath - путь к файлу
   * @param {Object} entry - запись кеша
   */
  async saveCacheEntry(filePath, entry) {
    try {
      const cacheFilePath = this.getCacheFilePath(filePath)
      const data = JSON.stringify({
        filePath,
        ...entry
      }, null, 2)

      await fs.writeFile(cacheFilePath, data)
    } catch (error) {
      // Игнорируем ошибки сохранения кеша
    }
  }

  /**
   * Получает путь к файлу кеша
   * @param {string} filePath - путь к файлу
   * @returns {string} путь к файлу кеша
   */
  getCacheFilePath(filePath) {
    const hash = crypto.createHash('md5').update(filePath).digest('hex')
    return path.join(this.options.cacheDir, `${hash}.cache`)
  }

  /**
   * Разбирает секции AspScript файла
   * @param {string} source - исходный код
   * @returns {Object} секции файла
   */
  parseAspcSections(source) {
    const sections = {
      script: '',
      template: '',
      style: ''
    }

    // Простой парсер секций (в продакшене будет более сложный)
    const scriptMatch = source.match(/---([\s\S]*?)---/)
    if (scriptMatch) {
      sections.script = scriptMatch[1].trim()
    }

    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/)
    if (templateMatch) {
      sections.template = templateMatch[1].trim()
    }

    const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/)
    if (styleMatch) {
      sections.style = styleMatch[1].trim()
    }

    return sections
  }

  /**
   * Компилирует секцию script
   * @param {string} script - секция script
   * @param {string} filePath - путь к файлу
   * @returns {string} скомпилированный script
   */
  async compileScriptSection(script, filePath) {
    // Преобразуем AspScript синтаксис в JavaScript
    let compiled = script

    // Преобразуем $state
    compiled = compiled.replace(/let\s+(\w+)\s*=\s*\$state\s*\(([^)]*)\)/g,
      'const $1 = $state($2)')

    // Преобразуем $computed
    compiled = compiled.replace(/let\s+(\w+)\s*=\s*\$computed\s*\(\s*\(\)\s*=>\s*([^)]*)\)/g,
      'const $1 = $computed(() => $2)')

    // Преобразуем $effect
    compiled = compiled.replace(/\$effect\s*\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*\)/g,
      '$effect(() => { $1 })')

    // Преобразуем $:
    compiled = compiled.replace(/\$:\s*([^;]+);/g, '$effect(() => $1)')

    return compiled
  }

  /**
   * Компилирует секцию template
   * @param {string} template - секция template
   * @returns {string} скомпилированный template
   */
  compileTemplateSection(template) {
    // Простая компиляция template в JavaScript
    // В продакшене здесь будет полноценный компилятор шаблонов
    return `\`${template}\``
  }

  /**
   * Компилирует секцию style
   * @param {string} style - секция style
   * @returns {string} скомпилированный style
   */
  compileStyleSection(style) {
    // Обработка SCSS если нужно
    return style
  }

  /**
   * Генерирует финальный код модуля
   * @param {Object} options - опции генерации
   * @returns {string} код модуля
   */
  generateModuleCode({ script, template, style, filePath, options }) {
    const componentName = path.basename(filePath, path.extname(filePath))

    return `
import { $state, $computed, $effect, onMount, onDestroy, isBrowser } from '@aspscript/core'

export default function ${componentName}Component(props = {}) {
  ${script}

  const render = () => ${template}

  ${style ? `const styles = \`${style}\`` : ''}

  return {
    render,
    ${style ? 'styles,' : ''}
    // Метаданные для HMR и отладки
    __file: '${filePath}',
    __name: '${componentName}'
  }
}

${componentName}Component.__file = '${filePath}'
${componentName}Component.__name = '${componentName}'
`
  }

  /**
   * Генерирует source map
   * @param {string} source - исходный код
   * @param {string} compiled - скомпилированный код
   * @param {string} filePath - путь к файлу
   * @returns {Object} source map
   */
  generateSourceMap(source, compiled, filePath) {
    // Упрощенная генерация source map
    // В продакшене здесь будет полноценная генерация
    return {
      version: 3,
      file: path.basename(filePath),
      sources: [filePath],
      sourcesContent: [source],
      mappings: '',
      names: []
    }
  }
}

// Экспортируем класс
module.exports = IncrementalCompiler

// Экспортируем фабричную функцию для удобства
module.exports.createCompiler = (options) => new IncrementalCompiler(options)
