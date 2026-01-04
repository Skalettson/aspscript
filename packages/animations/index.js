/**
 * AspScript Animation Library v1.2.0
 * Declarative animations and transitions
 * Современный JavaScript 2026 стандарты
 */

// ============================================================================
// TRANSITION SYSTEM
// ============================================================================

/**
 * Creates a CSS transition configuration
 */
export function createTransition(options = {}) {
  const {
    name = 'fade',
    duration = 300,
    easing = 'ease-in-out',
    delay = 0
  } = options

  return {
    name,
    duration,
    easing,
    delay,
    css: generateTransitionCSS(name, duration, easing, delay)
  }
}

/**
 * Fade transition
 */
export function createFade(options = {}) {
  return createTransition({ name: 'fade', ...options })
}

/**
 * Slide transition
 */
export function createSlide(options = {}) {
  const { direction = 'left', ...rest } = options
  const name = `slide-${direction}`
  
  return {
    name,
    ...createTransition({ name, ...rest }),
    css: generateSlideCSS(name, direction, rest.duration ?? 300, rest.easing ?? 'ease-in-out')
  }
}

/**
 * Scale transition
 */
export function createScale(options = {}) {
  return createTransition({ name: 'scale', ...options })
}

/**
 * Rotate transition
 */
export function createRotate(options = {}) {
  return createTransition({ name: 'rotate', ...options })
}

/**
 * Generates transition CSS
 */
function generateTransitionCSS(name, duration, easing, delay) {
  return `
.${name}-enter {
  opacity: 0;
}

.${name}-enter-active {
  transition: opacity ${duration}ms ${easing} ${delay}ms;
  opacity: 1;
}

.${name}-exit {
  opacity: 1;
}

.${name}-exit-active {
  transition: opacity ${duration}ms ${easing} ${delay}ms;
  opacity: 0;
}
  `.trim()
}

/**
 * Generates slide CSS
 */
function generateSlideCSS(name, direction, duration, easing) {
  const transforms = {
    left: 'translateX(-100%)',
    right: 'translateX(100%)',
    up: 'translateY(-100%)',
    down: 'translateY(100%)'
  }

  const transform = transforms[direction] ?? transforms.left

  return `
.${name}-enter {
  opacity: 0;
  transform: ${transform};
}

.${name}-enter-active {
  transition: opacity ${duration}ms ${easing}, transform ${duration}ms ${easing};
  opacity: 1;
  transform: translateX(0) translateY(0);
}

.${name}-exit {
  opacity: 1;
  transform: translateX(0) translateY(0);
}

.${name}-exit-active {
  transition: opacity ${duration}ms ${easing}, transform ${duration}ms ${easing};
  opacity: 0;
  transform: ${transform};
}
  `.trim()
}

// ============================================================================
// GESTURE ANIMATIONS
// ============================================================================

/**
 * Gesture animation handler
 */
export class GestureAnimation {
  #element = null
  #listeners = new Map()

  constructor(element, gestures = {}) {
    this.#element = element
    this.setupGestures(gestures)
  }

  setupGestures(gestures) {
    if (gestures.drag) {
      this.setupDrag(gestures.drag)
    }
    if (gestures.pinch) {
      this.setupPinch(gestures.pinch)
    }
  }

  setupDrag(options = {}) {
    let startX = 0
    let startY = 0
    let isDragging = false

    const onStart = (e) => {
      isDragging = true
      startX = e.touches?.[0]?.clientX ?? e.clientX
      startY = e.touches?.[0]?.clientY ?? e.clientY
      options.onStart?.(e)
    }

    const onMove = (e) => {
      if (!isDragging) return
      const x = (e.touches?.[0]?.clientX ?? e.clientX) - startX
      const y = (e.touches?.[0]?.clientY ?? e.clientY) - startY
      
      this.#element.style.transform = `translate(${x}px, ${y}px)`
      options.onMove?.(e, { x, y })
    }

    const onEnd = (e) => {
      isDragging = false
      options.onEnd?.(e)
    }

    this.#element.addEventListener('mousedown', onStart)
    this.#element.addEventListener('touchstart', onStart)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('touchmove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchend', onEnd)

    this.#listeners.set('drag', { onStart, onMove, onEnd })
  }

  setupPinch(options = {}) {
    let initialDistance = 0
    let initialScale = 1

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const onStart = (e) => {
      if (e.touches.length !== 2) return
      initialDistance = getDistance(e.touches)
      initialScale = parseFloat(this.#element.style.transform?.match(/scale\(([^)]+)\)/)?.[1] ?? '1')
    }

    const onMove = (e) => {
      if (e.touches.length !== 2) return
      const distance = getDistance(e.touches)
      const scale = (distance / initialDistance) * initialScale
      this.#element.style.transform = `scale(${scale})`
      options.onMove?.(e, { scale })
    }

    this.#element.addEventListener('touchstart', onStart)
    this.#element.addEventListener('touchmove', onMove)

    this.#listeners.set('pinch', { onStart, onMove })
  }

  destroy() {
    this.#listeners.forEach((listeners) => {
      Object.entries(listeners).forEach(([event, handler]) => {
        this.#element.removeEventListener(event, handler)
      })
    })
    this.#listeners.clear()
  }
}

/**
 * Creates gesture animation
 */
export function createGestureAnimation(element, gestures) {
  return new GestureAnimation(element, gestures)
}

// ============================================================================
// LIST ANIMATIONS
// ============================================================================

/**
 * List animation configuration
 */
export function createListAnimation(options = {}) {
  const {
    enter = 'slide-in',
    leave = 'slide-out',
    stagger = 50
  } = options

  return {
    enter,
    leave,
    stagger,
    css: generateListAnimationCSS(enter, leave, stagger)
  }
}

/**
 * Generates list animation CSS
 */
function generateListAnimationCSS(enter, leave, stagger) {
  return `
.list-item-enter {
  opacity: 0;
  transform: translateY(20px);
}

.list-item-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 1;
  transform: translateY(0);
}

.list-item-leave {
  opacity: 1;
  transform: translateY(0);
}

.list-item-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: translateY(-20px);
}

.list-item {
  transition-delay: var(--stagger-delay, 0ms);
}
  `.trim()
}

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

/**
 * Animates an element
 */
export async function animateElement(element, keyframes, options = {}) {
  if (!element?.animate) {
    throw new Error('Element.animate is not supported', { cause: { element } })
  }

  const {
    duration = 300,
    easing = 'ease-in-out',
    delay = 0,
    iterations = 1,
    fill = 'forwards'
  } = options

  return element.animate(keyframes, {
    duration,
    easing,
    delay,
    iterations,
    fill
  })
}

/**
 * Animation group - animates multiple elements
 */
export async function animateGroup(elements, animation, options = {}) {
  const { stagger = 0 } = options
  const animations = []

  elements.forEach((element, index) => {
    const delay = index * stagger
    animations.push(animateElement(element, animation.keyframes, { ...animation.options, delay }))
  })

  return Promise.all(animations)
}

// Preset animations
export const animations = {
  fade: createFade(),
  slide: createSlide(),
  scale: createScale(),
  rotate: createRotate(),
  
  slideIn: createSlide({ direction: 'left' }),
  slideOut: createSlide({ direction: 'right' }),
  slideUp: createSlide({ direction: 'up' }),
  slideDown: createSlide({ direction: 'down' })
}

