/**
 * Tests for AspScript Animations
 */

const {
  createFade,
  createSlide,
  createScale,
  animations
} = require('../animations.js')

describe('Animation System', () => {
  test('createFade creates fade animation', () => {
    const fade = createFade({ from: 0, to: 1, duration: 200 })

    expect(fade.type).toBe('fade')
    expect(fade.duration).toBe(200)
    expect(fade.keyframes).toEqual([
      { opacity: 0 },
      { opacity: 1 }
    ])
  })

  test('createSlide creates slide animation', () => {
    const slide = createSlide({ direction: 'up', distance: '10px' })

    expect(slide.type).toBe('slide')
    expect(slide.keyframes).toEqual([
      { transform: 'translateY(10px)', opacity: 0 },
      { transform: 'translate(0, 0)', opacity: 1 }
    ])
  })

  test('createScale creates scale animation', () => {
    const scale = createScale({ from: 0.5, to: 1.2 })

    expect(scale.type).toBe('scale')
    expect(scale.keyframes).toEqual([
      { transform: 'scale(0.5)', opacity: 0 },
      { transform: 'scale(1.2)', opacity: 1 }
    ])
  })

  test('animations object contains presets', () => {
    expect(animations.fadeIn).toBeDefined()
    expect(animations.slideUp).toBeDefined()
    expect(animations.zoomIn).toBeDefined()
    expect(animations.bounceIn).toBeDefined()

    expect(animations.fadeIn.type).toBe('fade')
    expect(animations.slideUp.type).toBe('slide')
  })
})
