/**
 * AspScript TypeScript Integration
 * Интеграция TypeScript с AspScript
 */

const fs = require('fs')
const path = require('path')

/**
 * Проверяет TypeScript файл
 * @param {string} filePath - путь к файлу
 * @returns {boolean} true если это .ts или .tsx файл
 */
function isTypeScriptFile(filePath) {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
}

/**
 * Создает tsconfig.json для AspScript проекта
 * @param {string} projectRoot - корень проекта
 */
function createTSConfig(projectRoot = './') {
  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "node",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "preserve",
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"],
        "@aspscript/*": ["packages/*/src"]
      },
      types: ["@aspscript/typescript"]
    },
    include: [
      "src/**/*",
      "packages/**/*.ts",
      "packages/**/*.tsx"
    ],
    exclude: [
      "node_modules",
      "dist",
      "**/*.aspc"
    ]
  }

  const configPath = path.join(projectRoot, 'tsconfig.json')
  fs.writeFileSync(configPath, JSON.stringify(tsconfig, null, 2))
  console.log('✅ Created tsconfig.json')
}

/**
 * TypeScript loader для AspScript
 * @param {string} source - исходный код
 * @param {string} filePath - путь к файлу
 * @returns {string} трансформированный код
 */
function typescriptLoader(source, filePath) {
  if (!isTypeScriptFile(filePath)) {
    return source
  }

  // В продвинутой версии здесь будет полноценная TypeScript компиляция
  // Пока просто удаляем типы для совместимости
  let transformed = source

  // Удаляем type imports
  transformed = transformed.replace(/import\s+type\s+[^}]+}\s+from\s+['"][^'"]+['"];?\s*/g, '')

  // Удаляем interface/type declarations (упрощенная версия)
  transformed = transformed.replace(/^(export\s+)?(interface|type)\s+\w+[\s\S]*?^}/gm, '')

  // Удаляем типы из переменных
  transformed = transformed.replace(/:\s*[A-Z]\w*(\s*\|\s*[A-Z]\w*)*(\[\])?/g, '')

  // Удаляем generic типы
  transformed = transformed.replace(/<\w+(,\s*\w+)*>/g, '')

  return transformed
}

/**
 * Валидация TypeScript кода
 * @param {string} source - исходный код
 * @param {string} filePath - путь к файлу
 * @returns {Array} массив ошибок
 */
function validateTypeScript(source, filePath) {
  const errors = []

  // Базовая валидация типов (упрощенная)
  // В реальной реализации здесь будет полноценная проверка типов

  // Проверяем использование AspScript API
  if (source.includes('$state') && !source.includes('import { $state }')) {
    errors.push({
      file: filePath,
      message: 'Используйте $state только после импорта из @aspscript/core'
    })
  }

  return errors
}

module.exports = {
  isTypeScriptFile,
  createTSConfig,
  typescriptLoader,
  validateTypeScript
}
