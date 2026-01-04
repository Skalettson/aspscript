#!/usr/bin/env node

/**
 * AspScript CLI
 * Командная строка для компиляции .aspc файлов
 */

const fs = require('fs')
const path = require('path')
const { compile } = require('../index.js')

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
  case 'init':
    initProject()
    break
  default:
    console.error(`Неизвестная команда: ${command}`)
    showHelp()
    process.exit(1)
}

/**
 * Показывает справку
 */
function showHelp() {
  console.log(`
AspScript CLI v0.1.0

Использование:
  aspc <command> [options]

Команды:
  build [dir]          Собрать проект в директории (по умолчанию ./src)
  compile <input> [output]  Скомпилировать один .aspc файл
  init                 Инициализировать новый AspScript проект

Примеры:
  aspc build
  aspc build ./components
  aspc compile App.aspc
  aspc compile Component.aspc dist/Component.js
  aspc init
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

    // Компилируем каждый файл
    for (const file of aspcFiles) {
      const relativePath = file.replace(sourceDir, '').replace(/^\//, '')
      const outputPath = path.join(outputDir, relativePath.replace('.aspc', '.js'))

      console.log(`📄 Компиляция ${file} -> ${outputPath}`)
      compileFile(file, outputPath)
    }

    console.log(`✅ Сборка завершена! Скомпилировано ${aspcFiles.length} компонентов`)
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

  try {
    // Читаем исходный файл
    const source = fs.readFileSync(inputPath, 'utf-8')

    // Определяем имя компонента
    const componentName = path.basename(inputPath, '.aspc')

    // Компилируем
    const compiled = compile(source, { componentName })

    // Определяем выходной путь
    const finalOutputPath = outputPath || inputPath.replace('.aspc', '.js')

    // Создаем директорию если нужно
    ensureDir(finalOutputPath.replace(/[^/]+$/, ''))

    // Записываем результат
    fs.writeFileSync(finalOutputPath, compiled, 'utf-8')

    console.log(`✅ ${inputPath} -> ${finalOutputPath}`)
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
    ensureDir(`${projectName}/src`)
    ensureDir(`${projectName}/public`)

    // Создаем базовые файлы
    fs.writeFileSync(`${projectName}/package.json`, generatePackageJson(projectName))
    fs.writeFileSync(`${projectName}/src/App.aspc`, generateAppComponent())
    fs.writeFileSync(`${projectName}/src/index.html`, generateIndexHtml())
    fs.writeFileSync(`${projectName}/src/main.js`, generateMainJs())

    console.log(`✅ Проект ${projectName} создан!`)
    console.log(`📁 Структура:`)
    console.log(`   ${projectName}/`)
    console.log(`   ├── src/`)
    console.log(`   │   ├── App.aspc`)
    console.log(`   │   ├── index.html`)
    console.log(`   │   └── main.js`)
    console.log(`   └── public/`)
    console.log()
    console.log(`🚀 Для запуска:`)
    console.log(`   cd ${projectName}`)
    console.log(`   npm install`)
    console.log(`   npm run dev`)
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message)
    process.exit(1)
  }
}

/**
 * Вспомогательные функции
 */

function ensureDir(dirPath) {
  const fs = require('fs')
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function findAspcFiles(dir) {
  const fs = require('fs')
  const files = []

  function scan(directory) {
    const items = fs.readdirSync(directory)

    for (const item of items) {
      const fullPath = path.join(directory, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        scan(fullPath)
      } else if (item.endsWith('.aspc')) {
        files.push(fullPath)
      }
    }
  }

  if (fs.existsSync(dir)) {
    scan(dir)
  }

  return files
}

function generatePackageJson(projectName) {
  return `{
  "name": "${projectName}",
  "version": "0.1.0",
  "description": "AspScript application",
  "scripts": {
    "build": "aspc build",
    "dev": "aspc build && serve dist",
    "compile": "aspc compile"
  },
  "devDependencies": {
    "@aspscript/compiler": "^0.1.0",
    "serve": "^14.0.0"
  }
}
`
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
  border: 2px solid #007acc;
  border-radius: 8px;
  text-align: center;
  font-family: Arial, sans-serif;
}

.buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1rem 0;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #007acc;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
}

button:hover {
  background: #0056a3;
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
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.js"></script>
</body>
</html>
`
}

function generateMainJs() {
  return `// AspScript приложение
import App from './App.js'

// Монтируем приложение
const app = App()
const appElement = app.render()

document.getElementById('app').appendChild(appElement)
`
}
