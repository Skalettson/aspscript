/**
 * Tests for AspScript Reactivity System
 */

const { $state, $computed, $effect } = require('../reactivity.js')

describe('Reactivity System', () => {
  test('$state creates reactive variable', () => {
    const counter = $state(0)
    expect(counter.value).toBe(0)

    counter.value = 5
    expect(counter.value).toBe(5)
  })

  test('$effect reacts to changes', () => {
    const counter = $state(0)
    let effectValue = 0

    $effect(() => {
      effectValue = counter.value * 2
    })

    expect(effectValue).toBe(0)

    counter.value = 5
    expect(effectValue).toBe(10)
  })

  test('$computed creates computed values', () => {
    const a = $state(1)
    const b = $state(2)
    const sum = $computed(() => a.value + b.value)

    expect(sum.value).toBe(3)

    a.value = 10
    expect(sum.value).toBe(12)
  })

  test('multiple effects work independently', () => {
    const value = $state(1)
    let double = 0
    let triple = 0

    $effect(() => {
      double = value.value * 2
    })

    $effect(() => {
      triple = value.value * 3
    })

    expect(double).toBe(2)
    expect(triple).toBe(3)

    value.value = 5
    expect(double).toBe(10)
    expect(triple).toBe(15)
  })
})
