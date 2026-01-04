/**
 * Tests for Component Features
 * Тесты: props, events, lifecycle, slots
 */

import { compile } from '../index.js'
import { parseProps, parseEmits, parseSlots } from '../components.js'

describe('Component Props', () => {
  test('compiles component with simple props', () => {
    const source = `
---
export const props = {
  title: { type: String, required: true },
  count: { type: Number, default: 0 }
}

let message = $state('Hello')
---
<template>
  <div>
    <h1>{title}</h1>
    <p>Count: {count}</p>
  </div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('Props validation')
    expect(result).toContain('title')
    expect(result).toContain('count')
    expect(result).toContain('required')
    expect(result).toContain('default: 0')
  })

  test('parses props definition correctly', () => {
    const script = `
export const props = {
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
  items: { type: Array, default: () => [] }
}
`
    const props = parseProps(script)
    
    expect(props.title).toEqual({
      type: 'String',
      required: true,
      default: undefined
    })
    
    expect(props.count).toEqual({
      type: 'Number',
      required: false,
      default: '0'
    })
    
    expect(props.items.type).toBe('Array')
  })

  test('generates props validation code', () => {
    const source = `
---
export const props = {
  name: { type: String, required: true },
  age: { type: Number }
}
---
<template>
  <div>{name}</div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('validateProps')
    expect(result).toContain('required but was not provided')
    expect(result).toContain('expected type')
  })

  test('applies default values to props', () => {
    const source = `
---
export const props = {
  count: { type: Number, default: 10 },
  items: { type: Array, default: () => [] }
}
---
<template>
  <div>Count: {count}</div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('propsWithDefaults')
    expect(result).toContain('default: 10')
    expect(result).toContain('default: () => []')
  })
})

describe('Component Events', () => {
  test('compiles component with events', () => {
    const source = `
---
export const emits = ['click', 'update:value']

let count = $state(0)

function handleClick() {
  emit('click', count)
}
---
<template>
  <button @click="handleClick">
    Click me
  </button>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('Event emitter')
    expect(result).toContain('emit')
    expect(result).toContain('on')
    expect(result).toContain('click')
    expect(result).toContain('update:value')
  })

  test('parses emits definition correctly', () => {
    const script = `
export const emits = ['click', 'change', 'update:value']
`
    const emits = parseEmits(script)
    
    expect(emits).toContain('click')
    expect(emits).toContain('change')
    expect(emits).toContain('update:value')
    expect(emits.length).toBe(3)
  })

  test('validates emitted events in development', () => {
    const source = `
---
export const emits = ['submit']

function handleClick() {
  emit('submit', { data: 'test' })
}
---
<template>
  <button @click="handleClick">Submit</button>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('process.env.NODE_ENV')
    expect(result).toContain('not in emits list')
    expect(result).toContain('allowedEvents')
  })

  test('creates event listener system', () => {
    const source = `
---
export const emits = ['update']
---
<template>
  <div>Component</div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('eventListeners')
    expect(result).toContain('function emit')
    expect(result).toContain('function on')
    expect(result).toContain('unsubscribe')
  })
})

describe('Component Slots', () => {
  test('compiles component with default slot', () => {
    const source = `
---
---
<template>
  <div class="card">
    <slot>Default content</slot>
  </div>
</template>
`
    const result = compile(source, { componentName: 'Card' })
    
    expect(result).toContain('Slots handling')
    expect(result).toContain('renderSlot')
    expect(result).toContain('Default content')
  })

  test('compiles component with named slots', () => {
    const source = `
---
---
<template>
  <div class="card">
    <div class="header">
      <slot name="header">Default header</slot>
    </div>
    <div class="body">
      <slot>Default body</slot>
    </div>
    <div class="footer">
      <slot name="footer">Default footer</slot>
    </div>
  </div>
</template>
`
    const result = compile(source, { componentName: 'Card' })
    
    expect(result).toContain('renderSlot')
    expect(result).toContain('header')
    expect(result).toContain('footer')
    expect(result).toContain('Default header')
    expect(result).toContain('Default footer')
  })

  test('compiles component with scoped slots', () => {
    const source = `
---
let userData = $state({ name: 'John', age: 30 })
---
<template>
  <div>
    <slot name="user" :data="userData">
      <p>Default user info</p>
    </slot>
  </div>
</template>
`
    const result = compile(source, { componentName: 'UserCard' })
    
    expect(result).toContain('renderSlot')
    expect(result).toContain('data:')
    expect(result).toContain('userData')
  })

  test('parses slots correctly', () => {
    const template = `
<div class="card">
  <slot name="header">Default header</slot>
  <slot>Default content</slot>
  <slot name="footer" :data="footerData">Footer</slot>
</div>
`
    const slots = parseSlots(template)
    
    expect(slots.default).toBeDefined()
    expect(slots.default.fallback).toContain('Default content')
    
    expect(slots.named.header).toBeDefined()
    expect(slots.named.header.fallback).toContain('Default header')
    
    expect(slots.named.footer).toBeDefined()
    expect(slots.named.footer.props.data).toBe('footerData')
  })

  test('renders fallback content when slot not provided', () => {
    const source = `
---
---
<template>
  <div>
    <slot name="custom">
      <p>This is fallback content</p>
    </slot>
  </div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('fallback')
    expect(result).toContain('This is fallback content')
  })
})

describe('Component Integration', () => {
  test('compiles full component with all features', () => {
    const source = `
---
export const props = {
  title: { type: String, required: true },
  initialCount: { type: Number, default: 0 }
}

export const emits = ['increment', 'decrement']

let count = $state(initialCount)

function increment() {
  count += 1
  emit('increment', count)
}

function decrement() {
  count -= 1
  emit('decrement', count)
}
---
<template>
  <div class="counter">
    <slot name="header">
      <h2>{title}</h2>
    </slot>
    
    <div class="count">{count}</div>
    
    <div class="controls">
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
    
    <slot name="footer" :count="count">
      <p>Count: {count}</p>
    </slot>
  </div>
</template>

<style>
.counter {
  padding: 20px;
  border: 1px solid #ccc;
}
</style>
`
    const result = compile(source, { componentName: 'Counter' })
    
    // Проверяем props
    expect(result).toContain('Props validation')
    expect(result).toContain('title')
    expect(result).toContain('initialCount')
    
    // Проверяем события
    expect(result).toContain('Event emitter')
    expect(result).toContain('increment')
    expect(result).toContain('decrement')
    
    // Проверяем слоты
    expect(result).toContain('Slots handling')
    expect(result).toContain('renderSlot')
    expect(result).toContain('header')
    expect(result).toContain('footer')
    
    // Проверяем реактивность
    expect(result).toContain('_state_count')
    expect(result).toContain('$state')
    
    // Проверяем стили
    expect(result).toContain('.counter')
    expect(result).toContain('aspscript-counter')
  })

  test('compiles component with lifecycle hooks', () => {
    const source = `
---
export function onMount() {
  console.log('Component mounted')
}

export function onDestroy() {
  console.log('Component destroyed')
}

let data = $state('test')
---
<template>
  <div>{data}</div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('onMount')
    expect(result).toContain('onDestroy')
  })
})

describe('Component Props Validation', () => {
  test('validates required props', () => {
    const source = `
---
export const props = {
  name: { type: String, required: true }
}
---
<template>
  <div>{name}</div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('required but was not provided')
    expect(result).toContain('name')
  })

  test('validates prop types', () => {
    const source = `
---
export const props = {
  count: { type: Number },
  items: { type: Array }
}
---
<template>
  <div>Count: {count}</div>
</template>
`
    const result = compile(source, { componentName: 'TestComponent' })
    
    expect(result).toContain('expectedType')
    expect(result).toContain('actualType')
    expect(result).toContain('Number')
    expect(result).toContain('Array')
  })
})

