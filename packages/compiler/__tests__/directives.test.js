/**
 * Tests for Directive Compilation
 * Тесты директив: #if, #for, #each и других
 */

import { compile } from '../index.js'
import { compileConditionalDirectives, compileLoopDirectives } from '../directives.js'

describe('Conditional Directives', () => {
  describe('#if directive', () => {
    test('compiles simple #if', () => {
      const source = `
---
let isActive = $state(true)
---
<template>
  {#if isActive}
    <p>Active</p>
  {/if}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_isActive.value')
      expect(result).toContain('?')
      expect(result).toContain('<p>Active</p>')
    })

    test('compiles #if with #else', () => {
      const source = `
---
let isLoggedIn = $state(false)
---
<template>
  {#if isLoggedIn}
    <p>Welcome</p>
  {:else}
    <p>Please login</p>
  {/if}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_isLoggedIn.value')
      expect(result).toContain('Welcome')
      expect(result).toContain('Please login')
    })

    test('compiles #if with #else if', () => {
      const source = `
---
let status = $state('pending')
---
<template>
  {#if status === 'success'}
    <p>Success!</p>
  {:else if status === 'error'}
    <p>Error!</p>
  {:else}
    <p>Pending...</p>
  {/if}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_status.value')
      expect(result).toContain('Success')
      expect(result).toContain('Error')
      expect(result).toContain('Pending')
    })

    test('compiles nested #if', () => {
      const source = `
---
let isOuter = $state(true)
let isInner = $state(true)
---
<template>
  {#if isOuter}
    <div>
      {#if isInner}
        <p>Both true</p>
      {/if}
    </div>
  {/if}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_isOuter.value')
      expect(result).toContain('_state_isInner.value')
      expect(result).toContain('Both true')
    })

    test('throws error for unclosed #if', () => {
      const source = `
---
let test = $state(true)
---
<template>
  {#if test}
    <p>Test</p>
</template>
`
      expect(() => compile(source, { componentName: 'TestComponent' }))
        .toThrow(/Unclosed/)
    })
  })

  describe('#for directive', () => {
    test('compiles simple #for', () => {
      const source = `
---
let items = $state([1, 2, 3])
---
<template>
  <ul>
    {#for item in items}
      <li>{item}</li>
    {/for}
  </ul>
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_items.value')
      expect(result).toContain('.map(')
      expect(result).toContain('item')
      expect(result).toContain('<li>')
    })

    test('compiles #for with index', () => {
      const source = `
---
let items = $state(['a', 'b', 'c'])
---
<template>
  {#for (item, index) in items}
    <p>{index}: {item}</p>
  {/for}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_items.value')
      expect(result).toContain('item')
      expect(result).toContain('index')
    })

    test('compiles #for with :key', () => {
      const source = `
---
let users = $state([
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
])
---
<template>
  {#for user in users :key="id"}
    <div>{user.name}</div>
  {/for}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_users.value')
      expect(result).toContain('data-key')
    })

    test('compiles nested #for', () => {
      const source = `
---
let matrix = $state([[1, 2], [3, 4]])
---
<template>
  {#for row in matrix}
    <div>
      {#for cell in row}
        <span>{cell}</span>
      {/for}
    </div>
  {/for}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_matrix.value')
      expect(result).toContain('.map(')
      expect(result).toContain('row')
      expect(result).toContain('cell')
    })

    test('throws error for unclosed #for', () => {
      const source = `
---
let items = $state([1, 2, 3])
---
<template>
  {#for item in items}
    <p>{item}</p>
</template>
`
      expect(() => compile(source, { componentName: 'TestComponent' }))
        .toThrow(/Unclosed/)
    })
  })

  describe('#each directive', () => {
    test('compiles #each (alias for #for)', () => {
      const source = `
---
let todos = $state([
  { id: 1, text: 'Task 1' },
  { id: 2, text: 'Task 2' }
])
---
<template>
  {#each todos as todo}
    <div>{todo.text}</div>
  {/each}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_todos.value')
      expect(result).toContain('.map(')
      expect(result).toContain('todo')
    })

    test('compiles #each with index', () => {
      const source = `
---
let items = $state(['a', 'b', 'c'])
---
<template>
  {#each items as (item, i)}
    <p>{i}: {item}</p>
  {/each}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_items.value')
      expect(result).toContain('item')
      expect(result).toContain('i')
    })
  })

  describe('Complex combinations', () => {
    test('compiles #if inside #for', () => {
      const source = `
---
let items = $state([
  { id: 1, active: true },
  { id: 2, active: false }
])
---
<template>
  {#for item in items}
    {#if item.active}
      <div>Active: {item.id}</div>
    {/if}
  {/for}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_items.value')
      expect(result).toContain('item.active')
      expect(result).toContain('Active')
    })

    test('compiles #for inside #if', () => {
      const source = `
---
let showList = $state(true)
let items = $state([1, 2, 3])
---
<template>
  {#if showList}
    <ul>
      {#for item in items}
        <li>{item}</li>
      {/for}
    </ul>
  {/if}
</template>
`
      const result = compile(source, { componentName: 'TestComponent' })
      
      expect(result).toContain('_state_showList.value')
      expect(result).toContain('_state_items.value')
      expect(result).toContain('<ul>')
    })
  })
})

describe('Directive Error Handling', () => {
  test('provides helpful error for invalid #if syntax', () => {
    const source = `
---
let test = $state(true)
---
<template>
  {#if}
    <p>Test</p>
  {/if}
</template>
`
    // Should provide helpful error message
    expect(() => compile(source, { componentName: 'TestComponent' }))
      .toThrow()
  })

  test('provides helpful error for invalid #for syntax', () => {
    const source = `
---
let items = $state([])
---
<template>
  {#for item}
    <p>{item}</p>
  {/for}
</template>
`
    // Should provide helpful error message
    expect(() => compile(source, { componentName: 'TestComponent' }))
      .toThrow()
  })
})

// Helper function to run compiled code and test output
function testCompiledOutput(compiledCode, expectedHTML) {
  // This would require a full test environment with DOM
  // For now, we just check the compilation succeeds
  expect(compiledCode).toBeTruthy()
  expect(compiledCode.length).toBeGreaterThan(0)
}

