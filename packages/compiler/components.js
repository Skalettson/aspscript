/**
 * AspScript Compiler - Components Handler
 * Обработка компонентов: props, events, lifecycle, slots
 */

/**
 * Парсит определение props из script секции
 * @param {string} script - код script
 * @returns {Object} props definition
 */
export function parseProps(script) {
  const props = {}
  
  // Парсим export const props = { ... }
  const propsRegex = /export\s+const\s+props\s*=\s*\{([^}]+)\}/
  const match = script.match(propsRegex)
  
  if (match) {
    const propsContent = match[1]
    
    // Парсим каждый prop
    const propRegex = /(\w+):\s*\{([^}]+)\}/g
    let propMatch
    
    while ((propMatch = propRegex.exec(propsContent)) !== null) {
      const propName = propMatch[1].trim()
      const propConfig = propMatch[2]
      
      props[propName] = parsePropConfig(propConfig)
    }
  }
  
  return props
}

/**
 * Парсит конфигурацию отдельного prop
 * @param {string} config - конфигурация prop
 * @returns {Object} parsed config
 */
function parsePropConfig(config) {
  const result = {
    type: 'Any',
    required: false,
    default: undefined
  }
  
  // Парсим type
  const typeMatch = config.match(/type:\s*(\w+)/)
  if (typeMatch) {
    result.type = typeMatch[1]
  }
  
  // Парсим required
  const requiredMatch = config.match(/required:\s*(true|false)/)
  if (requiredMatch) {
    result.required = requiredMatch[1] === 'true'
  }
  
  // Парсим default
  const defaultMatch = config.match(/default:\s*(.+?)(?:,|$)/)
  if (defaultMatch) {
    result.default = defaultMatch[1].trim()
  }
  
  return result
}

/**
 * Генерирует код валидации props
 * @param {Object} props - props definition
 * @returns {string} validation code
 */
export function generatePropsValidation(props) {
  if (Object.keys(props).length === 0) {
    return ''
  }
  
  let code = `
  // Props validation
  function validateProps(props) {
    const errors = []
    
`
  
  Object.entries(props).forEach(([name, config]) => {
    // Required validation
    if (config.required) {
      code += `    if (props.${name} === undefined) {
      errors.push('Prop "${name}" is required but was not provided')
    }
    
`
    }
    
    // Type validation
    if (config.type && config.type !== 'Any') {
      code += `    if (props.${name} !== undefined) {
      const expectedType = '${config.type.toLowerCase()}'
      const actualType = typeof props.${name}
      
      if (expectedType === 'array' && !Array.isArray(props.${name})) {
        errors.push('Prop "${name}" expected type Array but got ' + actualType)
      } else if (expectedType !== 'array' && expectedType !== actualType) {
        errors.push('Prop "${name}" expected type ${config.type} but got ' + actualType)
      }
    }
    
`
    }
  })
  
  code += `    if (errors.length > 0) {
      console.warn('[AspScript] Props validation failed:', errors.join(', '))
    }
    
    return errors.length === 0
  }
  
  validateProps(componentProps)
`
  
  return code
}

/**
 * Генерирует код для работы с props
 * @param {Object} props - props definition
 * @returns {string} props initialization code
 */
export function generatePropsCode(props) {
  if (Object.keys(props).length === 0) {
    return ''
  }
  
  let code = `
  // Initialize props with defaults
  const propsWithDefaults = {
`
  
  Object.entries(props).forEach(([name, config]) => {
    if (config.default !== undefined) {
      code += `    ${name}: componentProps.${name} !== undefined ? componentProps.${name} : ${config.default},
`
    } else {
      code += `    ${name}: componentProps.${name},
`
    }
  })
  
  code += `  }
  
  // Make props reactive
  Object.assign(componentProps, propsWithDefaults)
`
  
  return code
}

/**
 * Парсит определение событий (emits)
 * @param {string} script - код script
 * @returns {Array} список событий
 */
export function parseEmits(script) {
  const emits = []
  
  // Парсим export const emits = ['event1', 'event2']
  const emitsRegex = /export\s+const\s+emits\s*=\s*\[([^\]]+)\]/
  const match = script.match(emitsRegex)
  
  if (match) {
    const emitsContent = match[1]
    const eventRegex = /['"]([^'"]+)['"]/g
    let eventMatch
    
    while ((eventMatch = eventRegex.exec(emitsContent)) !== null) {
      emits.push(eventMatch[1])
    }
  }
  
  return emits
}

/**
 * Генерирует код для системы событий
 * @param {Array} emits - список событий
 * @returns {string} events code
 */
export function generateEventsCode(emits) {
  if (emits.length === 0) {
    return ''
  }
  
  let code = `
  // Event emitter
  const eventListeners = {}
  
  function emit(eventName, ...args) {
    if (!eventListeners[eventName]) return
    
    eventListeners[eventName].forEach(listener => {
      listener(...args)
    })
  }
  
  function on(eventName, listener) {
    if (!eventListeners[eventName]) {
      eventListeners[eventName] = []
    }
    eventListeners[eventName].push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = eventListeners[eventName].indexOf(listener)
      if (index > -1) {
        eventListeners[eventName].splice(index, 1)
      }
    }
  }
  
  // Validate emitted events (development mode)
  if (process.env.NODE_ENV !== 'production') {
    const allowedEvents = [${emits.map(e => `'${e}'`).join(', ')}]
    const originalEmit = emit
    
    emit = function(eventName, ...args) {
      if (!allowedEvents.includes(eventName)) {
        console.warn(\`[AspScript] Event "\${eventName}" is not in emits list: [\${allowedEvents.join(', ')}]\`)
      }
      return originalEmit(eventName, ...args)
    }
  }
`
  
  return code
}

/**
 * Парсит и обрабатывает слоты в template
 * @param {string} template - HTML шаблон
 * @returns {Object} slots info
 */
export function parseSlots(template) {
  const slots = {
    default: null,
    named: {}
  }
  
  // Парсим <slot> теги
  const slotRegex = /<slot(?:\s+name\s*=\s*["']([^"']+)["'])?(?:\s+:(\w+)\s*=\s*["']([^"']+)["'])*>([\s\S]*?)<\/slot>/g
  let match
  
  while ((match = slotRegex.exec(template)) !== null) {
    const name = match[1] || 'default'
    const fallbackContent = match[4] || ''
    
    // Парсим scoped slots (props передаваемые в слот)
    const slotProps = {}
    const propsRegex = /:(\w+)\s*=\s*["']([^"']+)["']/g
    let propMatch
    
    while ((propMatch = propsRegex.exec(match[0])) !== null) {
      slotProps[propMatch[1]] = propMatch[2]
    }
    
    if (name === 'default') {
      slots.default = {
        fallback: fallbackContent,
        props: slotProps
      }
    } else {
      slots.named[name] = {
        fallback: fallbackContent,
        props: slotProps
      }
    }
  }
  
  return slots
}

/**
 * Генерирует код для обработки слотов
 * @param {Object} slots - slots info
 * @returns {string} slots code
 */
export function generateSlotsCode(slots) {
  if (!slots.default && Object.keys(slots.named).length === 0) {
    return ''
  }
  
  let code = `
  // Slots handling
  const slotsContent = componentProps.slots || {}
  
  function renderSlot(name = 'default', props = {}, fallback = '') {
    if (slotsContent[name]) {
      // Render provided slot content
      if (typeof slotsContent[name] === 'function') {
        return slotsContent[name](props)
      }
      return slotsContent[name]
    }
    
    // Render fallback content
    return fallback
  }
`
  
  return code
}

/**
 * Компилирует использование слотов в template
 * @param {string} template - HTML шаблон
 * @param {Object} slots - slots info
 * @returns {string} обработанный template
 */
export function compileSlotsUsage(template, slots) {
  let processed = template
  
  // Заменяем <slot> на вызовы renderSlot
  processed = processed.replace(
    /<slot(?:\s+name\s*=\s*["']([^"']+)["'])?(?:\s+:(\w+)\s*=\s*["']([^"']+)["'])*>([\s\S]*?)<\/slot>/g,
    (match, name, propKey, propValue, fallback) => {
      const slotName = name || 'default'
      const slotProps = {}
      
      // Собираем все props для scoped slot
      const propsRegex = /:(\w+)\s*=\s*["']([^"']+)["']/g
      let propMatch
      
      while ((propMatch = propsRegex.exec(match)) !== null) {
        slotProps[propMatch[1]] = propMatch[2]
      }
      
      const propsStr = Object.keys(slotProps).length > 0 
        ? `{ ${Object.entries(slotProps).map(([k, v]) => `${k}: ${v}`).join(', ')} }`
        : '{}'
      
      return `\${renderSlot('${slotName}', ${propsStr}, \`${fallback}\`)}`
    }
  )
  
  return processed
}

export default {
  parseProps,
  generatePropsValidation,
  generatePropsCode,
  parseEmits,
  generateEventsCode,
  parseSlots,
  generateSlotsCode,
  compileSlotsUsage
}

