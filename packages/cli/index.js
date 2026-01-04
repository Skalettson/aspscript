#!/usr/bin/env node

/**
 * AspScript CLI v1.2.0 - Enterprise Ready
 * Полноценная командная строка для разработки AspScript приложений
 */

import { promises as fs } from 'fs'
import path from 'path'
import { execSync, spawn } from 'child_process'
import readline from 'readline'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class AspScriptCLI {
  constructor() {
    this.version = '1.1.0'
    this.config = this.loadConfig()
    this.rl = null
  }

  /**
   * Основная точка входа CLI
   */
  async run() {
    const args = process.argv.slice(2)
    const command = args[0]

    if (!command) {
      this.showHelp()
      return
    }

    try {
      switch (command) {
        case 'create':
          await this.createProject(args.slice(1))
          break
        case 'dev':
          await this.startDevServer(args.slice(1))
          break
        case 'build':
          await this.buildProject(args.slice(1))
          break
        case 'generate':
        case 'g':
          await this.generateCode(args.slice(1))
          break
        case 'lint':
          await this.lintCode(args.slice(1))
          break
        case 'format':
          await this.formatCode(args.slice(1))
          break
        case 'type-check':
          await this.typeCheck(args.slice(1))
          break
        case 'analyze':
          await this.analyzeBundle(args.slice(1))
          break
        case 'migrate':
          await this.migrateProject(args.slice(1))
          break
        case 'audit':
          await this.auditSecurity(args.slice(1))
          break
        case 'config':
          await this.manageConfig(args.slice(1))
          break
        case 'version':
        case '--version':
        case '-v':
          console.log(`AspScript CLI v${this.version}`)
          break
        case 'help':
        case '--help':
        case '-h':
        default:
          this.showHelp()
          break
      }
    } catch (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }
  }

  /**
   * Создает новый проект AspScript
   * @param {Array} args - аргументы команды
   */
  async createProject(args) {
    console.log('🚀 Creating new AspScript project...\n')

    // Интерактивный режим
    if (args.length === 0) {
      const answers = await this.promptProjectDetails()
      await this.generateProject(answers)
    } else {
      // Прямое создание с аргументами
      const projectName = args[0]
      const template = args[1] || 'basic'
      await this.generateProject({ projectName, template })
    }
  }

  /**
   * Запускает интерактивный промпт для создания проекта
   * @returns {Object} ответы пользователя
   */
  async promptProjectDetails() {
    const answers = {}

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      const ask = (question, defaultValue = '') => {
        return new Promise((resolveQuestion) => {
          const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `
          this.rl.question(prompt, (answer) => {
            resolveQuestion(answer || defaultValue)
          })
        })
      }

      const runPrompts = async () => {
        console.log('? Project name: ', { end: '' })
        answers.projectName = await ask('Project name', 'my-aspscript-app')

        console.log('? Template: (Use arrow keys)')
        console.log('❯ Basic')
        console.log('  Advanced')
        console.log('  Enterprise')
        answers.template = await this.selectFromList(['basic', 'advanced', 'enterprise'])

        console.log('? Features: (Press <space> to select)')
        const features = [
          { name: 'SCSS support', value: 'scss', checked: true },
          { name: 'TypeScript', value: 'typescript', checked: false },
          { name: 'Testing', value: 'testing', checked: true },
          { name: 'PWA', value: 'pwa', checked: false },
          { name: 'GraphQL', value: 'graphql', checked: false },
          { name: 'i18n', value: 'i18n', checked: false }
        ]

        answers.features = await this.multiSelect(features)

        console.log('? Package manager: (Use arrow keys)')
        console.log('❯ npm')
        console.log('  yarn')
        console.log('  pnpm')
        answers.packageManager = await this.selectFromList(['npm', 'yarn', 'pnpm'])

        this.rl.close()
        resolve(answers)
      }

      runPrompts()
    })
  }

  /**
   * Генерирует структуру проекта
   * @param {Object} options - опции проекта
   */
  async generateProject(options) {
    const { projectName, template, features = [], packageManager = 'npm' } = options

    console.log(`📁 Creating project: ${projectName}`)
    console.log(`🎨 Template: ${template}`)
    console.log(`📦 Package manager: ${packageManager}`)
    console.log(`🔧 Features: ${features.join(', ') || 'none'}`)
    console.log()

    // Создаем директорию проекта
    await fs.mkdir(projectName, { recursive: true })
    process.chdir(projectName)

    // Генерируем package.json
    const packageJson = this.generatePackageJson(projectName, features)
    await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2))

    // Генерируем файлы проекта на основе шаблона
    await this.generateProjectFiles(template, features)

    // Устанавливаем зависимости
    console.log('📦 Installing dependencies...')
    try {
      execSync(`${packageManager} install`, { stdio: 'inherit' })
    } catch (error) {
      console.warn('⚠️ Failed to install dependencies automatically')
      console.log(`Please run: cd ${projectName} && ${packageManager} install`)
    }

    // Финальные инструкции
    console.log('\n✅ Project created successfully!')
    console.log('\n🚀 To start development:')
    console.log(`   cd ${projectName}`)
    console.log(`   ${packageManager} run dev`)
    console.log('\n📚 Documentation: https://aspscript.dev')
    console.log('💬 Community: https://discord.gg/aspscript')
  }

  /**
   * Запускает dev сервер
   * @param {Array} args - аргументы команды
   */
  async startDevServer(args) {
    const port = this.extractFlag(args, '--port', '-p') || 3000
    const host = this.extractFlag(args, '--host', '-h') || 'localhost'
    const open = args.includes('--open') || args.includes('-o')

    console.log(`🚀 Starting AspScript dev server...`)
    console.log(`📍 http://${host}:${port}`)
    console.log()

    // Запускаем Vite dev server
    const vite = spawn('npx', ['vite', '--port', port.toString(), '--host', host], {
      stdio: 'inherit',
      shell: true
    })

    vite.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ Dev server exited with code ${code}`)
      }
    })

    // Открываем браузер если нужно
    if (open) {
      setTimeout(() => {
        const start = os.platform() === 'darwin' ? 'open' :
                     os.platform() === 'win32' ? 'start' : 'xdg-open'
        spawn(start, [`http://${host}:${port}`], { stdio: 'ignore' })
      }, 2000)
    }

    // Обработка сигналов завершения
    process.on('SIGINT', () => {
      vite.kill()
      process.exit(0)
    })
  }

  /**
   * Собирает проект для production
   * @param {Array} args - аргументы команды
   */
  async buildProject(args) {
    const analyze = args.includes('--analyze')
    const sourcemap = args.includes('--sourcemap')
    const production = !args.includes('--development')

    console.log('🔨 Building AspScript project...')

    try {
      // Запускаем Vite build
      const buildArgs = ['vite', 'build']
      if (analyze) buildArgs.push('--analyze')
      if (sourcemap) buildArgs.push('--sourcemap')
      if (!production) buildArgs.push('--mode', 'development')

      execSync(`npx ${buildArgs.join(' ')}`, { stdio: 'inherit' })

      console.log('✅ Build completed successfully!')

      if (analyze) {
        console.log('📊 Bundle analysis saved to dist/stats.html')
      }

    } catch (error) {
      console.error('❌ Build failed:', error.message)
      process.exit(1)
    }
  }

  /**
   * Генерирует код (компоненты, страницы, etc.)
   * @param {Array} args - аргументы команды
   */
  async generateCode(args) {
    const type = args[0]
    const name = args[1]

    if (!type || !name) {
      console.log('Usage: aspscript generate <type> <name>')
      console.log('Types: component, page, store, service, hook')
      return
    }

    console.log(`🔧 Generating ${type}: ${name}`)

    try {
      switch (type) {
        case 'component':
          await this.generateComponent(name, args.slice(2))
          break
        case 'page':
          await this.generatePage(name, args.slice(2))
          break
        case 'store':
          await this.generateStore(name, args.slice(2))
          break
        case 'service':
          await this.generateService(name, args.slice(2))
          break
        case 'hook':
          await this.generateHook(name, args.slice(2))
          break
        default:
          console.error(`❌ Unknown type: ${type}`)
          break
      }

      console.log(`✅ Generated ${type}: ${name}`)
    } catch (error) {
      console.error(`❌ Failed to generate ${type}:`, error.message)
    }
  }

  /**
   * Анализирует бандл
   * @param {Array} args - аргументы команды
   */
  async analyzeBundle(args) {
    console.log('📊 Analyzing bundle...')

    try {
      // Запускаем build с анализом
      execSync('npx vite build --analyze', { stdio: 'inherit' })

      // Читаем и парсим статистику
      const statsPath = path.join('dist', 'stats.json')
      const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'))

      console.log('\n📦 Bundle Analysis Results:')
      console.log(`📁 Total size: ${(stats.totalSize / 1024).toFixed(1)} KB`)
      console.log(`📊 Gzipped: ${(stats.gzippedSize / 1024).toFixed(1)} KB`)
      console.log(`🗂️ Chunks: ${stats.chunks.length}`)
      console.log(`📋 Tree-shaken: ${((1 - stats.unusedSize / stats.totalSize) * 100).toFixed(1)}%`)

      // Рекомендации по оптимизации
      console.log('\n💡 Optimization suggestions:')
      if (stats.unusedSize > stats.totalSize * 0.1) {
        console.log('  - Consider removing unused dependencies')
      }
      if (stats.chunks.length > 10) {
        console.log('  - Consider code splitting for better loading')
      }
      if (stats.gzippedSize > 500 * 1024) {
        console.log('  - Bundle size is large, consider lazy loading')
      }

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message)
    }
  }

  /**
   * Показывает справку
   */
  showHelp() {
    console.log(`
🚀 AspScript CLI v${this.version} - Enterprise Ready

USAGE:
  aspscript <command> [options]

COMMANDS:
  create [name] [template]    Create a new AspScript project
  dev [options]              Start development server
  build [options]            Build project for production
  generate <type> <name>     Generate code (component, page, store, etc.)
  lint [options]             Lint code
  format [options]           Format code
  type-check                 Type check TypeScript files
  analyze                    Analyze bundle size and dependencies
  migrate <from> <to>        Migrate project between versions
  audit <type>               Audit security or performance
  config <action> [key]      Manage configuration

EXAMPLES:
  aspscript create my-app
  aspscript dev --port 3001 --open
  aspscript build --analyze --sourcemap
  aspscript generate component Button
  aspscript analyze

OPTIONS:
  -h, --help     Show this help message
  -v, --version  Show version number

For more information, visit: https://aspscript.dev/cli
`)
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Загружает конфигурацию проекта
   * @returns {Object} конфигурация
   */
  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'aspscript.config.js')
      return require(configPath)
    } catch (error) {
      return {}
    }
  }

  /**
   * Извлекает флаг из аргументов
   * @param {Array} args - аргументы
   * @param {string} longFlag - длинный флаг
   * @param {string} shortFlag - короткий флаг
   * @returns {string|null} значение флага
   */
  extractFlag(args, longFlag, shortFlag) {
    const longIndex = args.indexOf(longFlag)
    const shortIndex = args.indexOf(shortFlag)

    if (longIndex !== -1 && longIndex + 1 < args.length) {
      return args[longIndex + 1]
    }

    if (shortIndex !== -1 && shortIndex + 1 < args.length) {
      return args[shortIndex + 1]
    }

    return null
  }

  /**
   * Генерирует package.json для проекта
   * @param {string} projectName - имя проекта
   * @param {Array} features - выбранные фичи
   * @returns {Object} package.json
   */
  generatePackageJson(projectName, features) {
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      description: `AspScript project: ${projectName}`,
      scripts: {
        dev: 'aspscript dev',
        build: 'aspscript build',
        preview: 'vite preview',
        lint: 'aspscript lint',
        format: 'aspscript format',
        'type-check': 'aspscript type-check'
      },
      dependencies: {
        '@aspscript/core': '^1.1.0'
      },
      devDependencies: {
        '@aspscript/vite-plugin': '^1.1.0',
        'vite': '^4.0.0'
      }
    }

    // Добавляем зависимости для фич
    if (features.includes('scss')) {
      packageJson.devDependencies['sass'] = '^1.60.0'
    }

    if (features.includes('typescript')) {
      packageJson.devDependencies['typescript'] = '^5.0.0'
      packageJson.devDependencies['@types/node'] = '^18.0.0'
    }

    if (features.includes('testing')) {
      packageJson.devDependencies['@aspscript/testing'] = '^1.1.0'
      packageJson.devDependencies['jsdom'] = '^20.0.0'
    }

    if (features.includes('pwa')) {
      packageJson.devDependencies['vite-plugin-pwa'] = '^0.14.0'
    }

    if (features.includes('graphql')) {
      packageJson.dependencies['@aspscript/graphql'] = '^1.1.0'
    }

    if (features.includes('i18n')) {
      packageJson.dependencies['@aspscript/i18n'] = '^1.1.0'
    }

    return packageJson
  }

  /**
   * Генерирует файлы проекта
   * @param {string} template - шаблон проекта
   * @param {Array} features - выбранные фичи
   */
  async generateProjectFiles(template, features) {
    // Создаем базовую структуру
    await fs.mkdir('src', { recursive: true })
    await fs.mkdir('public', { recursive: true })

    // vite.config.js
    const viteConfig = this.generateViteConfig(features)
    await fs.writeFile('vite.config.js', viteConfig)

    // index.html
    const indexHtml = this.generateIndexHtml()
    await fs.writeFile('index.html', indexHtml)

    // src/main.js
    const mainJs = this.generateMainJs(features)
    await fs.writeFile('src/main.js', mainJs)

    // src/App.aspc
    const appAspc = this.generateAppComponent(template, features)
    await fs.writeFile('src/App.aspc', appAspc)

    // README.md
    const readme = this.generateReadme(template, features)
    await fs.writeFile('README.md', readme)

    // Конфигурационные файлы
    if (features.includes('typescript')) {
      const tsconfig = this.generateTSConfig()
      await fs.writeFile('tsconfig.json', tsconfig)
    }
  }

  /**
   * Генерирует компонент
   * @param {string} name - имя компонента
   * @param {Array} options - опции
   */
  async generateComponent(name, options) {
    const componentName = this.pascalCase(name)
    const fileName = `${name}.aspc`
    const filePath = path.join('src/components', fileName)

    await fs.mkdir('src/components', { recursive: true })

    const componentCode = `---
let count = $state(0)

function increment() {
  count++
}
---

<div class="component">
  <h3>${componentName} Component</h3>
  <p>Count: {count}</p>
  <button @click="increment">Increment</button>
</div>

<style>
.component {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  text-align: center;
}

button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

button:hover {
  background: #2563eb;
}
</style>`

    await fs.writeFile(filePath, componentCode)
  }

  /**
   * Преобразует строку в PascalCase
   * @param {string} str - строка
   * @returns {string} PascalCase строка
   */
  pascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  }

  // ============================================================================
  // TEMPLATE GENERATION METHODS
  // ============================================================================

  generateViteConfig(features) {
    let config = `import { defineConfig } from 'vite'
import { aspscriptPlugin } from '@aspscript/vite-plugin'

export default defineConfig({
  plugins: [aspscriptPlugin({`

    if (features.includes('scss')) {
      config += '\n    scss: true,'
    }

    if (features.includes('typescript')) {
      config += '\n    typescript: true,'
    }

    config += '\n    incremental: true\n  })],'

    if (features.includes('pwa')) {
      config += `
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    }
  },`
    }

    config += `
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})`

    return config
  }

  generateIndexHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AspScript App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`
  }

  generateMainJs(features) {
    let code = `import { createSSRApp } from '@aspscript/core'
import App from './App.aspc'

const app = createSSRApp(App)
app.mount('#app')`

    if (features.includes('pwa')) {
      code += `

// PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}`
    }

    return code
  }

  generateAppComponent(template, features) {
    let component = `---
let message = $state('Hello, AspScript!')
---

<div class="app">
  <header>
    <h1>{message}</h1>
  </header>

  <main>
    <p>Welcome to your new AspScript application!</p>`

    if (template === 'advanced' || template === 'enterprise') {
      component += `
    <div class="features">
      <h2>Features</h2>
      <ul>
        <li>✅ Reactive state management</li>
        <li>✅ Component-based architecture</li>
        <li>✅ Fast compilation</li>`

      if (features.includes('typescript')) {
        component += `\n        <li>✅ TypeScript support</li>`
      }

      if (features.includes('scss')) {
        component += `\n        <li>✅ SCSS styling</li>`
      }

      if (features.includes('testing')) {
        component += `\n        <li>✅ Testing utilities</li>`
      }

      component += `
      </ul>
    </div>`
    }

    component += `
  </main>
</div>

<style>
.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

h1 {
  color: #3b82f6;
  font-size: 2.5rem;
}

main {
  text-align: center;
}

.features {
  margin-top: 2rem;
  text-align: left;
}

.features ul {
  list-style: none;
  padding: 0;
}

.features li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
}
</style>`

    return component
  }

  generateReadme(template, features) {
    return `# AspScript App

This is a new AspScript project created with the AspScript CLI.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## Features

${features.map(f => `- ${f}`).join('\n')}

## Project Structure

\`\`\`
src/
├── App.aspc          # Main application component
├── main.js           # Application entry point
└── components/       # Reusable components
\`\`\`

## Documentation

- [AspScript Documentation](https://aspscript.dev)
- [CLI Reference](https://aspscript.dev/cli)

## Community

- [Discord](https://discord.gg/aspscript)
- [GitHub](https://github.com/aspscript/aspscript)
`
  }

  generateTSConfig() {
    return JSON.stringify({
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
          "@/*": ["src/*"]
        }
      },
      include: [
        "src/**/*",
        "packages/**/*.ts",
        "packages/**/*.tsx"
      ],
      exclude: [
        "node_modules",
        "dist"
      ]
    }, null, 2)
  }

  // Заглушки для интерактивных методов (упрощенные версии)
  async selectFromList(options) {
    return options[0] // Возвращаем первый вариант по умолчанию
  }

  async multiSelect(options) {
    return options.filter(o => o.checked).map(o => o.value)
  }
}

// Запуск CLI если файл запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new AspScriptCLI()
  cli.run().catch(console.error)
}

export default AspScriptCLI
