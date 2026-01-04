/**
 * AspScript to WebAssembly Transpiler
 * Транспилятор AspScript кода в AssemblyScript для компиляции в WebAssembly
 */

const acorn = require('acorn')
const astring = require('astring')

/**
 * Транспилирует AspScript код в AssemblyScript
 * @param {string} source - AspScript код
 * @param {Object} options - опции трансляции
 * @returns {string} AssemblyScript код
 */
function transpileToAssemblyScript(source, options = {}) {
  const {
    componentName = 'Component',
    memorySize = 1024 * 1024, // 1MB
    features = {}
  } = options

  try {
    // Парсим исходный код
    const ast = acorn.parse(source, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowImportExportEverywhere: true
    })

    // Трансформируем AST для AssemblyScript
    const transformedAST = transformForAssemblyScript(ast, features)

    // Генерируем AssemblyScript код
    let asCode = astring.generate(transformedAST)

    // Добавляем AssemblyScript специфичный код
    asCode = addAssemblyScriptBoilerplate(asCode, {
      componentName,
      memorySize,
      features
    })

    return asCode

  } catch (error) {
    console.error('WASM transpilation error:', error)
    throw error
  }
}

/**
 * Трансформирует AST для совместимости с AssemblyScript
 * @param {Object} ast - абстрактное синтаксическое дерево
 * @param {Object} features - включенные фичи
 * @returns {Object} трансформированный AST
 */
function transformForAssemblyScript(ast, features) {
  // Проходим по всем узлам AST
  traverseAST(ast, node => {
    // Трансформируем реактивные переменные
    if (node.type === 'VariableDeclaration') {
      node.declarations.forEach(decl => {
        if (decl.init && isReactiveCall(decl.init)) {
          // Заменяем реактивные переменные на простые
          decl.init = decl.init.arguments[0] // Берем начальное значение
        }
      })
    }

    // Удаляем эффекты (пока не поддерживаем в WASM)
    if (node.type === 'ExpressionStatement' &&
        node.expression.type === 'CallExpression' &&
        node.expression.callee.name === '$effect') {
      // Заменяем на пустой statement
      node.type = 'EmptyStatement'
    }

    // Трансформируем строковые литералы для совместимости
    if (node.type === 'Literal' && typeof node.value === 'string') {
      // AssemblyScript требует явного указания типа для строк
      node.raw = `"${node.value}"`
    }
  })

  return ast
}

/**
 * Проверяет, является ли вызов реактивной функцией
 * @param {Object} node - узел AST
 * @returns {boolean} true если реактивный вызов
 */
function isReactiveCall(node) {
  return node.type === 'CallExpression' &&
         node.callee.type === 'Identifier' &&
         ['$state', '$computed', '$global'].includes(node.callee.name)
}

/**
 * Добавляет AssemblyScript boilerplate код
 * @param {string} code - трансформированный код
 * @param {Object} options - опции
 * @returns {string} финальный AssemblyScript код
 */
function addAssemblyScriptBoilerplate(code, options) {
  const { componentName, memorySize, features } = options

  // Импорты AssemblyScript
  const imports = `
// AssemblyScript imports
import { console } from "as-console"

// Memory management
export const memory: Memory = new Memory(${memorySize})

// Global state
let __wasm_heap: Map<string, any> = new Map()
`

  // Экспортируемые функции
  const exports = `
// Exported functions for JavaScript interop
export function ${componentName}_render(): string {
  // Render logic here
  return "Hello from WASM!"
}

export function ${componentName}_update(prop: string, value: any): void {
  // Update logic here
  __wasm_heap.set(prop, value)
}

export function ${componentName}_getState(prop: string): any {
  return __wasm_heap.get(prop)
}

// Memory management functions
export function allocate(size: usize): usize {
  return memory.allocate(size)
}

export function free(ptr: usize): void {
  memory.free(ptr)
}
`

  // Финальный код
  return `${imports}

// Original transpiled code
${code}

${exports}`
}

/**
 * Компилирует AssemblyScript в WebAssembly
 * @param {string} asCode - AssemblyScript код
 * @param {Object} options - опции компиляции
 * @returns {Promise<Uint8Array>} WebAssembly бинарный код
 */
async function compileToWASM(asCode, options = {}) {
  const {
    optimize = true,
    sourceMap = false
  } = options

  // В реальной реализации здесь будет вызов asc (AssemblyScript compiler)
  // Пока возвращаем mock
  console.log('🎯 Compiling AssemblyScript to WebAssembly...')

  // Имитация компиляции
  await new Promise(resolve => setTimeout(resolve, 100))

  // Mock WASM binary (просто заглушка)
  const mockWasm = new Uint8Array([
    0x00, 0x61, 0x73, 0x6D, // WASM magic
    0x01, 0x00, 0x00, 0x00  // WASM version
  ])

  return mockWasm
}

/**
 * Создает WebAssembly экземпляр из AspScript компонента
 * @param {string} source - AspScript исходный код
 * @param {Object} options - опции
 * @returns {Promise<WebAssembly.Instance>} WASM экземпляр
 */
async function createWASMInstance(source, options = {}) {
  // Транспилируем в AssemblyScript
  const asCode = transpileToAssemblyScript(source, options)

  // Компилируем в WASM
  const wasmBinary = await compileToWASM(asCode, options)

  // Создаем WASM модуль
  const wasmModule = await WebAssembly.compile(wasmBinary)

  // Создаем экземпляр
  const instance = await WebAssembly.instantiate(wasmModule, {
    // Импорты для WASM
    env: {
      memory: new WebAssembly.Memory({ initial: 1 }),
      console_log: (ptr) => console.log('WASM:', ptr)
    }
  })

  return instance
}

/**
 * Рекурсивный обход AST
 * @param {Object} node - узел AST
 * @param {Function} visitor - функция посетителя
 */
function traverseAST(node, visitor) {
  if (!node || typeof node !== 'object') return

  visitor(node)

  for (const key in node) {
    if (node.hasOwnProperty(key)) {
      const child = node[key]
      if (Array.isArray(child)) {
        child.forEach(item => traverseAST(item, visitor))
      } else if (child && typeof child === 'object') {
        traverseAST(child, visitor)
      }
    }
  }
}

module.exports = {
  transpileToAssemblyScript,
  compileToWASM,
  createWASMInstance
}
