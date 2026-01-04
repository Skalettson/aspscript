/**
 * AspScript Incremental Compilation
 * Инкрементальная компиляция для быстрой пересборки
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { compile } from './index.js'
import path from 'path'

// Кэш компиляции
const compilationCache = new Map()
const hashCache = new Map()

/**
 * Инкрементальный компилятор
 */
export class IncrementalCompiler {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || '.aspscript-cache'
    this.enabled = options.enabled !== false
    this.verbose = options.verbose || false
    
    // Создаем директорию кэша
    if (this.enabled && !existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  /**
   * Компилирует файл с использованием кэша
   * @param {string} filePath - путь к файлу
   * @param {Object} options - опции компиляции
   * @returns {string} скомпилированный код
   */
  compile(filePath, options = {}) {
    if (!this.enabled) {
      return this.compileFile(filePath, options)
    }

    // Вычисляем хэш файла
    const fileHash = this.getFileHash(filePath)
    const cacheKey = `${filePath}:${fileHash}`

    // Проверяем кэш в памяти
    if (compilationCache.has(cacheKey)) {
      if (this.verbose) {
        console.log(`✓ Cache hit (memory): ${filePath}`)
      }
      return compilationCache.get(cacheKey)
    }

    // Проверяем кэш на диске
    const diskCachePath = this.getDiskCachePath(cacheKey)
    if (existsSync(diskCachePath)) {
      if (this.verbose) {
        console.log(`✓ Cache hit (disk): ${filePath}`)
      }
      const cached = readFileSync(diskCachePath, 'utf-8')
      compilationCache.set(cacheKey, cached)
      return cached
    }

    // Компилируем файл
    if (this.verbose) {
      console.log(`⚙ Compiling: ${filePath}`)
    }
    const compiled = this.compileFile(filePath, options)

    // Сохраняем в кэш
    compilationCache.set(cacheKey, compiled)
    writeFileSync(diskCachePath, compiled, 'utf-8')

    return compiled
  }

  /**
   * Компилирует файл без кэша
   */
  compileFile(filePath, options) {
    const source = readFileSync(filePath, 'utf-8')
    const componentName = path.basename(filePath, '.aspc')
    return compile(source, { componentName, ...options })
  }

  /**
   * Вычисляет хэш файла
   */
  getFileHash(filePath) {
    if (hashCache.has(filePath)) {
      return hashCache.get(filePath)
    }

    const content = readFileSync(filePath, 'utf-8')
    const hash = createHash('md5').update(content).digest('hex')
    hashCache.set(filePath, hash)
    return hash
  }

  /**
   * Получает путь к кэшу на диске
   */
  getDiskCachePath(cacheKey) {
    const hash = createHash('md5').update(cacheKey).digest('hex')
    return path.join(this.cacheDir, `${hash}.js`)
  }

  /**
   * Очищает кэш
   */
  clearCache() {
    compilationCache.clear()
    hashCache.clear()
    if (this.verbose) {
      console.log('✓ Cache cleared')
    }
  }

  /**
   * Инвалидирует кэш для файла
   */
  invalidate(filePath) {
    // Удаляем из кэша памяти
    for (const key of compilationCache.keys()) {
      if (key.startsWith(filePath + ':')) {
        compilationCache.delete(key)
      }
    }
    
    // Удаляем хэш
    hashCache.delete(filePath)
    
    if (this.verbose) {
      console.log(`✓ Cache invalidated: ${filePath}`)
    }
  }

  /**
   * Получает статистику кэша
   */
  getStats() {
    return {
      memoryCache: {
        size: compilationCache.size,
        keys: Array.from(compilationCache.keys())
      },
      hashCache: {
        size: hashCache.size
      }
    }
  }
}

/**
 * Создает инкрементальный компилятор
 */
export function createIncrementalCompiler(options) {
  return new IncrementalCompiler(options)
}

export default {
  IncrementalCompiler,
  createIncrementalCompiler
}
