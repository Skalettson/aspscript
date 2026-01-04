/**
 * AspScript Built-in Animations
 * Встроенная система анимаций
 */

/**
 * Создает анимацию перехода
 * @param {Object} options - опции анимации
 * @returns {Object} объект анимации
 */
export function createTransition(options = {}) {
  const {
    duration = 300,
    easing = 'ease',
    delay = 0,
    direction = 'normal'
  } = options

  return {
    duration,
    easing,
    delay,
    direction,
    type: 'transition'
  }
}

/**
 * Создает анимацию появления/исчезновения
 * @param {Object} options - опции анимации
 * @returns {Object} объект анимации
 */
export function createFade(options = {}) {
  const {
    duration = 200,
    from = 0,
    to = 1,
    easing = 'ease'
  } = options

  return {
    type: 'fade',
    duration,
    from,
    to,
    easing,
    keyframes: [
      { opacity: from },
      { opacity: to }
    ]
  }
}

/**
 * Создает анимацию скольжения
 * @param {Object} options - опции анимации
 * @returns {Object} объект анимации
 */
export function createSlide(options = {}) {
  const {
    direction = 'up',
    distance = '20px',
    duration = 300,
    easing = 'ease'
  } = options

  const transforms = {
    up: `translateY(${distance})`,
    down: `translateY(-${distance})`,
    left: `translateX(${distance})`,
    right: `translateX(-${distance})`
  }

  return {
    type: 'slide',
    duration,
    easing,
    keyframes: [
      { transform: transforms[direction], opacity: 0 },
      { transform: 'translate(0, 0)', opacity: 1 }
    ]
  }
}

/**
 * Создает анимацию масштабирования
 * @param {Object} options - опции анимации
 * @returns {Object} объект анимации
 */
export function createScale(options = {}) {
  const {
    from = 0.8,
    to = 1,
    duration = 200,
    easing = 'ease'
  } = options

  return {
    type: 'scale',
    duration,
    easing,
    keyframes: [
      { transform: `scale(${from})`, opacity: 0 },
      { transform: `scale(${to})`, opacity: 1 }
    ]
  }
}

/**
 * Создает анимацию вращения
 * @param {Object} options - опции анимации
 * @returns {Object} объект анимации
 */
export function createRotate(options = {}) {
  const {
    degrees = 180,
    duration = 300,
    easing = 'ease'
  } = options

  return {
    type: 'rotate',
    duration,
    easing,
    keyframes: [
      { transform: `rotate(0deg)` },
      { transform: `rotate(${degrees}deg)` }
    ]
  }
}

/**
 * Применяет анимацию к элементу
 * @param {HTMLElement} element - DOM элемент
 * @param {Object} animation - объект анимации
 * @returns {Promise} промис завершения анимации
 */
export function animateElement(element, animation) {
  if (!element || !animation) return Promise.resolve()

  return new Promise((resolve) => {
    if (!element.animate) {
      // Fallback для браузеров без Web Animations API
      setTimeout(resolve, animation.duration)
      return
    }

    const anim = element.animate(
      animation.keyframes,
      {
        duration: animation.duration,
        easing: animation.easing,
        delay: animation.delay,
        direction: animation.direction,
        fill: 'both'
      }
    )

    anim.addEventListener('finish', resolve)
  })
}

/**
 * Создает директиву анимации
 * @param {Object} animation - объект анимации
 * @returns {Function} функция директивы
 */
export function animationDirective(animation) {
  return (element, binding) => {
    if (!element || !animation) return

    const { value, modifiers } = binding

    // Применяем анимацию при изменении значения
    if (value) {
      animateElement(element, animation)
    }
  }
}

/**
 * Предустановленные анимации
 */
export const animations = {
  // Переходы
  fadeIn: createFade({ from: 0, to: 1 }),
  fadeOut: createFade({ from: 1, to: 0 }),

  // Скольжения
  slideUp: createSlide({ direction: 'up' }),
  slideDown: createSlide({ direction: 'down' }),
  slideLeft: createSlide({ direction: 'left' }),
  slideRight: createSlide({ direction: 'right' }),

  // Масштабирование
  zoomIn: createScale({ from: 0.5, to: 1 }),
  zoomOut: createScale({ from: 1.5, to: 1 }),

  // Вращение
  spin: createRotate({ degrees: 360 }),

  // Комбинированные
  bounceIn: {
    type: 'bounce',
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: [
      { transform: 'scale(0.3)', opacity: 0 },
      { transform: 'scale(1.05)' },
      { transform: 'scale(0.9)' },
      { transform: 'scale(1)', opacity: 1 }
    ]
  }
}

/**
 * Групповые анимации
 * @param {HTMLElement[]} elements - массив элементов
 * @param {Object} animation - объект анимации
 * @param {Object} options - опции группы
 * @returns {Promise} промис завершения всех анимаций
 */
export function animateGroup(elements, animation, options = {}) {
  const {
    stagger = 0,
    reverse = false
  } = options

  const promises = elements.map((element, index) => {
    const delay = stagger * (reverse ? elements.length - 1 - index : index)
    const animWithDelay = { ...animation, delay }

    return animateElement(element, animWithDelay)
  })

  return Promise.all(promises)
}

/**
 * Анимация списка (для v-for)
 * @param {Function} callback - функция анимации
 * @returns {Object} объект анимации списка
 */
export function listAnimation(callback) {
  return {
    type: 'list',
    callback,
    beforeEnter: (element) => callback(element, 'beforeEnter'),
    enter: (element, done) => callback(element, 'enter', done),
    leave: (element, done) => callback(element, 'leave', done)
  }
}
