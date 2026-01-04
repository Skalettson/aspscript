/**
 * AspScript Vite Plugin
 * Интеграция AspScript с Vite
 */

import { compile } from '@aspscript/compiler'
import { readFileSync } from 'fs'
import path from 'path'

/**
 * Создает Vite плагин для AspScript
 * @param {Object} options - опции плагина
 * @returns {Object} Vite плагин
 */
function aspscriptPlugin(options = {}) {
  const {
    include = /\.aspc$/,
    exclude,
    root = process.cwd(),
    ssr = false
  } = options

  let server
  let config

  return {
    name: 'aspscript',

    config(config, env) {
      // Сохраняем конфиг для использования в других хуках
      this.config = config

      return {
        // Добавляем .aspc в расширения
        resolve: {
          extensions: ['.aspc', '.js', '.ts', '.jsx', '.tsx', '.json']
        },

        // Оптимизации для AspScript
        esbuild: {
          include: /\.aspc$/
        },

        // CSS конфигурация
        css: {
          modules: {
            localsConvention: 'camelCase'
          }
        },

        // SSR конфигурация
        ...(env.ssrBuild && {
          build: {
            rollupOptions: {
              output: {
                format: 'es'
              }
            }
          }
        })
      }
    },

    configureServer(serverInstance) {
      server = serverInstance

      // Hot reload middleware
      server.middlewares.use('/__aspscript_hmr', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        // SSE implementation for hot reload
      })
    },

    load(id) {
      // Проверяем, что файл имеет расширение .aspc
      if (!include.test(id) || (exclude && exclude.test(id))) {
        return null
      }

      // Читаем .aspc файл
      const code = readFileSync(id, 'utf-8')

      // Получаем имя компонента из пути
      const componentName = path.basename(id, '.aspc')

      // Компилируем AspScript в JavaScript
      const compiled = compile(code, {
        componentName,
        ssr,
        hmr: !ssr && server
      })

      return {
        code: compiled,
        map: null // В будущем можно добавить source maps
      }
    },

    transform(code, id) {
      // Дополнительная обработка для HMR
      if (id.endsWith('.aspc') && server && !ssr) {
        return addHmrSupport(code, id)
      }

      return code
    },

    handleHotUpdate({ file, server }) {
      // Обработка hot reload для .aspc файлов
      if (file.endsWith('.aspc')) {
        const module = server.moduleGraph.getModuleById(file)
        if (module) {
          server.reloadModule(module)
        }
      }
    }
  }
}

/**
 * Добавляет HMR поддержку к скомпилированному коду
 * @param {string} code - скомпилированный код
 * @param {string} filePath - путь к файлу
 * @returns {string} код с HMR поддержкой
 */
function addHmrSupport(code, filePath) {
  const componentName = path.basename(filePath, '.aspc')

  return `
// HMR support for ${componentName}
${code}

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && newModule.default) {
      // Обновляем компонент
      console.log('🔄 Hot reloaded:', '${componentName}')
    }
  })
}
`
}

/**
 * Создает конфигурацию Vite для AspScript проекта
 * @param {Object} options - опции конфигурации
 * @returns {Object} Vite конфигурация
 */
function createViteConfig(options = {}) {
  const {
    plugins = [],
    ssr = false,
    ...viteOptions
  } = options

  return {
    plugins: [
      aspscriptPlugin({ ssr }),
      ...plugins
    ],

    // AspScript специфичные настройки
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
        '@aspscript/ui': path.resolve(__dirname, '../ui')
      }
    },

    build: {
      rollupOptions: {
        external: ssr ? [] : ['@aspscript/core'],
        output: {
          globals: {
            '@aspscript/core': 'AspScript'
          }
        }
      }
    },

    // Server настройки
    server: {
      hmr: !ssr
    },

    ...viteOptions
  }
}

export default aspscriptPlugin
export { aspscriptPlugin, createViteConfig }
