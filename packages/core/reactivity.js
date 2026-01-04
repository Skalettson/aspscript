/**
 * AspScript Core Reactivity System
 * Компилируемая реактивность без рантайма
 */

// Глобальный reactive context для отслеживания зависимостей
let currentEffect = null
let effectStack = []

// WeakMap для хранения зависимостей
const targetMap = new WeakMap()

/**
 * Создает реактивную переменную
 * @param {any} initialValue - начальное значение
 * @returns {Proxy} реактивный объект
 */
export function $state(initialValue) {
  const proxy = new Proxy({ value: initialValue }, {
    get(target, key) {
      if (key === 'value') {
        // Отслеживаем чтение в текущем эффекте
        if (currentEffect) {
          let depsMap = targetMap.get(target)
          if (!depsMap) {
            depsMap = new Map()
            targetMap.set(target, depsMap)
          }

          let dep = depsMap.get(key)
          if (!dep) {
            dep = new Set()
            depsMap.set(key, dep)
          }

          dep.add(currentEffect)
        }
        return target[key]
      }
      return target[key]
    },

    set(target, key, value) {
      if (key === 'value') {
        target[key] = value

        // Запускаем эффекты при изменении
        const depsMap = targetMap.get(target)
        if (depsMap) {
          const dep = depsMap.get(key)
          if (dep) {
            dep.forEach(effect => effect())
          }
        }
      } else {
        target[key] = value
      }
      return true
    }
  })

  return proxy
}

/**
 * Создает вычисляемое свойство
 * @param {Function} getter - функция получения значения
 * @returns {Proxy} реактивное вычисляемое свойство
 */
export function $computed(getter) {
  let value
  let dirty = true

  const proxy = new Proxy({}, {
    get(target, key) {
      if (key === 'value') {
        if (dirty) {
          effectStack.push(currentEffect)
          currentEffect = () => { dirty = true }
          try {
            value = getter()
          } finally {
            currentEffect = effectStack.pop()
          }
          dirty = false
        }
        return value
      }
      return target[key]
    }
  })

  return proxy
}

/**
 * Создает эффект
 * @param {Function} fn - функция эффекта
 * @returns {Function} функция отмены эффекта
 */
export function $effect(fn) {
  const effect = () => {
    const prevEffect = currentEffect
    currentEffect = effect
    try {
      fn()
    } finally {
      currentEffect = prevEffect
    }
  }

  effect()
  return effect
}

/**
 * Глобальное состояние приложения
 * @param {any} initialValue - начальное значение
 * @param {string} key - уникальный ключ для глобального состояния
 * @returns {Proxy} глобальное реактивное состояние
 */
export function $global(initialValue, key) {
  // Глобальный реестр состояний
  if (!globalThis._aspscript_global_state) {
    globalThis._aspscript_global_state = new Map()
  }

  const globalState = globalThis._aspscript_global_state

  // Если ключ не указан, генерируем его на основе caller
  if (!key) {
    key = '__default_global_state__'
  }

  // Возвращаем существующее состояние или создаем новое
  if (!globalState.has(key)) {
    globalState.set(key, $state(initialValue))
  }

  return globalState.get(key)
}

/**
 * Хук жизненного цикла onMount
 * @param {Function} callback - функция вызываемая при монтировании
 */
export function onMount(callback) {
  // В скомпилированном коде это будет встроено в компонент
  if (typeof window !== 'undefined') {
    // Клиентский рендеринг
    queueMicrotask(callback)
  }
}

/**
 * Хук жизненного цикла onDestroy
 * @param {Function} callback - функция вызываемая при размонтировании
 */
export function onDestroy(callback) {
  // В скомпилированном коде это будет встроено в компонент
  // Возвращаем cleanup функцию
  return callback
}

/**
 * Проверяет, выполняется ли код в браузере
 * @returns {boolean} true если код выполняется в браузере
 */
export function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}
