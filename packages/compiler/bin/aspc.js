#!/usr/bin/env node

/**
 * AspScript CLI
 * Командная строка для компиляции .aspc файлов
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { compile } from '../index.js'
import { analyzeBundle } from '../bundle-analyzer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const args = process.argv.slice(2)
const command = args[0]

if (!command) {
  showHelp()
  process.exit(1)
}

switch (command) {
  case 'build':
    buildProject()
    break
  case 'compile':
    compileFile(args[1], args[2])
    break
  case 'dev':
    console.log('🚀 Dev server is not implemented in aspc')
    console.log('Use: aspscript dev (from @aspscript/cli)')
    process.exit(1)
    break
  case 'analyze':
    analyzeBundleCmd(args[1], args[2])
    break
  case 'init':
    initProject()
    break
  case 'version':
  case '--version':
  case '-v':
    console.log('aspc v1.2.0')
    break
  case 'help':
  case '--help':
  case '-h':
  default:
    showHelp()
    break
}

/**
 * Анализирует бандл
 */
function analyzeBundleCmd(bundlePath, outputFormat) {
  if (!bundlePath) {
    console.error('❌ Укажите путь к бандлу для анализа')
    console.log('Пример: aspc analyze dist/bundle.js')
    process.exit(1)
  }

  if (!existsSync(bundlePath)) {
    console.error(`❌ Файл не найден: ${bundlePath}`)
    process.exit(1)
  }

  try {
    const format = outputFormat || 'console'
    const outputPath = format === 'html' ? 'bundle-analysis.html' :
                      format === 'json' ? 'bundle-analysis.json' : null

    analyzeBundle(bundlePath, {
      outputPath,
      format,
      openBrowser: format === 'html'
    })

  } catch (error) {
    console.error('❌ Ошибка анализа бандла:', error.message)
    process.exit(1)
  }
}

/**
 * Показывает справку
 */
function showHelp() {
  console.log(`
AspScript Compiler CLI v1.2.0

Использование:
  aspc <command> [options]

Команды:
  build [dir]              Собрать проект в директории (по умолчанию ./src)
  compile <input> [output] Скомпилировать один .aspc файл
  analyze <bundle> [format] Анализировать размер бандла (format: console, json, html)
  init [name]              Инициализировать новый AspScript проект
  version, -v, --version   Показать версию
  help, -h, --help         Показать справку

Примеры:
  aspc build
  aspc build ./components
  aspc compile App.aspc
  aspc compile Component.aspc dist/Component.js
  aspc analyze dist/bundle.js
  aspc analyze dist/bundle.js html
  aspc init my-app

Для dev сервера используйте @aspscript/cli:
  npm install -g @aspscript/cli
  aspscript dev
`)
}

/**
 * Собирает весь проект
 */
function buildProject() {
  const sourceDir = args[1] || './src'
  const outputDir = args[2] || './dist'

  console.log(`🛠️  Сборка AspScript проекта из ${sourceDir} в ${outputDir}`)

  try {
    // Создаем выходную директорию
    ensureDir(outputDir)

    // Находим все .aspc файлы
    const aspcFiles = findAspcFiles(sourceDir)

    if (aspcFiles.length === 0) {
      console.log('⚠️  .aspc файлы не найдены')
      return
    }

    console.log(`📄 Найдено ${aspcFiles.length} файлов для компиляции\n`)

    // Компилируем каждый файл
    let successCount = 0
    for (const file of aspcFiles) {
      try {
        const relativePath = path.relative(sourceDir, file)
        const outputPath = path.join(outputDir, relativePath.replace('.aspc', '.js'))

        console.log(`  ⚙️  ${relativePath}`)
        compileFile(file, outputPath)
        successCount++
      } catch (error) {
        console.error(`  ❌ Ошибка: ${error.message}`)
      }
    }

    console.log(`\n✅ Сборка завершена! Скомпилировано ${successCount}/${aspcFiles.length} компонентов`)
  } catch (error) {
    console.error('❌ Ошибка сборки:', error.message)
    process.exit(1)
  }
}

/**
 * Компилирует один файл
 */
function compileFile(inputPath, outputPath) {
  if (!inputPath) {
    console.error('❌ Укажите входной .aspc файл')
    process.exit(1)
  }

  if (!inputPath.endsWith('.aspc')) {
    console.error('❌ Файл должен иметь расширение .aspc')
    process.exit(1)
  }

  if (!existsSync(inputPath)) {
    console.error(`❌ Файл не найден: ${inputPath}`)
    process.exit(1)
  }

  try {
    // Читаем исходный файл
    const source = readFileSync(inputPath, 'utf-8')

    // Определяем имя компонента
    const componentName = path.basename(inputPath, '.aspc')

    // Компилируем
    const compiled = compile(source, { componentName })

    // Определяем выходной путь
    const finalOutputPath = outputPath || inputPath.replace('.aspc', '.js')

    // Создаем директорию если нужно
    const outputDir = path.dirname(finalOutputPath)
    ensureDir(outputDir)

    // Записываем результат
    writeFileSync(finalOutputPath, compiled, 'utf-8')

    if (!outputPath) {
      console.log(`✅ ${inputPath} → ${finalOutputPath}`)
    }
  } catch (error) {
    console.error(`❌ Ошибка компиляции ${inputPath}:`, error.message)
    process.exit(1)
  }
}

/**
 * Инициализирует новый проект
 */
function initProject() {
  const projectName = args[1] || 'aspscript-app'

  console.log(`🚀 Инициализация нового AspScript проекта: ${projectName}`)

  try {
    // Создаем структуру проекта
    ensureDir(projectName)
    ensureDir(path.join(projectName, 'src'))
    ensureDir(path.join(projectName, 'public'))

    // Создаем базовые файлы
    writeFileSync(
      path.join(projectName, 'package.json'),
      generatePackageJson(projectName)
    )
    writeFileSync(
      path.join(projectName, 'src', 'App.aspc'),
      generateAppComponent()
    )
    writeFileSync(
      path.join(projectName, 'index.html'),
      generateIndexHtml()
    )

    console.log(`✅ Проект ${projectName} создан!`)
    console.log(`📁 Структура:`)
    console.log(`   ${projectName}/`)
    console.log(`   ├── src/`)
    console.log(`   │   └── App.aspc`)
    console.log(`   ├── public/`)
    console.log(`   ├── index.html`)
    console.log(`   └── package.json`)
    console.log()
    console.log(`🚀 Для запуска:`)
    console.log(`   cd ${projectName}`)
    console.log(`   npm install`)
    console.log(`   npm run build`)
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message)
    process.exit(1)
  }
}

/**
 * Вспомогательные функции
 */

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

function findAspcFiles(dir) {
  const files = []

  function scan(directory) {
    if (!existsSync(directory)) return
    
    const items = readdirSync(directory)

    for (const item of items) {
      const fullPath = path.join(directory, item)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && item !== 'node_modules' && item !== 'dist') {
        scan(fullPath)
      } else if (item.endsWith('.aspc')) {
        files.push(fullPath)
      }
    }
  }

  scan(dir)
  return files
}

function generatePackageJson(projectName) {
  return JSON.stringify({
    name: projectName,
    version: '0.1.0',
    description: 'AspScript application',
    type: 'module',
    scripts: {
      build: 'aspc build src',
      dev: 'vite',
      preview: 'vite preview'
    },
    dependencies: {
      '@aspscript/core': '^1.2.0'
    },
    devDependencies: {
      '@aspscript/compiler': '^1.2.0',
      '@aspscript/vite-plugin': '^1.2.0',
      vite: '^5.0.0'
    }
  }, null, 2) + '\n'
}

function generateAppComponent() {
  return `---
// AspScript компонент - меньше кода, больше дела!

let count = $state(0)
let message = $state('Привет, AspScript!')

$: doubled = count * 2

$: effect(() => {
  console.log('Счетчик изменился:', count)
})
---

<div class="app">
  <h1>{message}</h1>
  <p>Счетчик: {count}</p>
  <p>Удвоенное значение: {doubled}</p>

  <div class="buttons">
    <button @click="count--">-</button>
    <button @click="count++">+</button>
  </div>

  <button @click="message = 'AspScript потрясающий!'">
    Изменить сообщение
  </button>
</div>

<style>
.app {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 2px solid #667eea;
  border-radius: 12px;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.1);
}

h1 {
  color: #667eea;
  margin-bottom: 1.5rem;
}

p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1.5rem 0;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

button:active {
  transform: translateY(0);
}
</style>
`
}

function generateIndexHtml() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AspScript App</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import App from './dist/App.js'
    import { render } from '@aspscript/core'
    
    const container = document.getElementById('app')
    render(App, container)
  </script>
</body>
</html>
`
}
