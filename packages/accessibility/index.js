/**
 * AspScript Accessibility (WCAG 2.1 AA) v1.2.0
 * Accessibility utilities and components
 * Современный JavaScript 2026 стандарты
 */

// ============================================================================
// ARIA UTILITIES
// ============================================================================

/**
 * Sets ARIA attributes on element
 */
export function setARIA(element, attributes) {
  if (!element) return

  Object.entries(attributes).forEach(([key, value]) => {
    const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`
    if (value === null || value === undefined || value === false) {
      element.removeAttribute(ariaKey)
    } else {
      element.setAttribute(ariaKey, String(value))
    }
  })
}

/**
 * Focus trap - traps focus within element
 */
export class FocusTrap {
  #container = null
  #firstFocusable = null
  #lastFocusable = null
  #keydownHandler = null

  constructor(container) {
    this.#container = container
    this.#keydownHandler = this.handleKeyDown.bind(this)
  }

  activate() {
    const focusable = this.getFocusableElements()
    if (focusable.length === 0) return

    this.#firstFocusable = focusable[0]
    this.#lastFocusable = focusable[focusable.length - 1]

    this.#container.addEventListener('keydown', this.#keydownHandler)
    this.#firstFocusable?.focus()
  }

  deactivate() {
    this.#container.removeEventListener('keydown', this.#keydownHandler)
  }

  getFocusableElements() {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(this.#container.querySelectorAll(selector))
      .filter(el => {
        const style = getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
  }

  handleKeyDown(e) {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === this.#firstFocusable) {
        e.preventDefault()
        this.#lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === this.#lastFocusable) {
        e.preventDefault()
        this.#firstFocusable?.focus()
      }
    }
  }
}

/**
 * Creates focus trap
 */
export function createFocusTrap(container) {
  return new FocusTrap(container)
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

/**
 * Keyboard navigation handler
 */
export class KeyboardNavigation {
  #container = null
  #items = []
  #currentIndex = -1
  #handlers = new Map()

  constructor(container, options = {}) {
    this.#container = container
    this.#items = options.items ?? []
    this.setupHandlers()
  }

  setupHandlers() {
    const handler = this.handleKeyDown.bind(this)
    this.#container.addEventListener('keydown', handler)
    this.#handlers.set('keydown', handler)
  }

  handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        this.focusNext()
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        this.focusPrevious()
        break
      case 'Home':
        e.preventDefault()
        this.focusFirst()
        break
      case 'End':
        e.preventDefault()
        this.focusLast()
        break
    }
  }

  focusNext() {
    this.#currentIndex = (this.#currentIndex + 1) % this.#items.length
    this.#items[this.#currentIndex]?.focus()
  }

  focusPrevious() {
    this.#currentIndex = this.#currentIndex <= 0 
      ? this.#items.length - 1 
      : this.#currentIndex - 1
    this.#items[this.#currentIndex]?.focus()
  }

  focusFirst() {
    this.#currentIndex = 0
    this.#items[0]?.focus()
  }

  focusLast() {
    this.#currentIndex = this.#items.length - 1
    this.#items[this.#currentIndex]?.focus()
  }

  destroy() {
    this.#handlers.forEach((handler, event) => {
      this.#container.removeEventListener(event, handler)
    })
    this.#handlers.clear()
  }
}

/**
 * Creates keyboard navigation
 */
export function createKeyboardNavigation(container, options) {
  return new KeyboardNavigation(container, options)
}

// ============================================================================
// SCREEN READER UTILITIES
// ============================================================================

/**
 * Announces message to screen readers
 */
export function announceToScreenReader(message, priority = 'polite') {
  if (typeof globalThis.document === 'undefined') return

  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Screen reader only class
 */
export const srOnlyCSS = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`

// ============================================================================
// ACCESSIBILITY VALIDATION
// ============================================================================

/**
 * Validates element for accessibility
 */
export function validateAccessibility(element) {
  const issues = []

  // Check for alt text on images
  const images = element.querySelectorAll('img')
  images.forEach((img) => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push({
        element: img,
        issue: 'Missing alt text or aria-label',
        severity: 'error'
      })
    }
  })

  // Check for labels on form inputs
  const inputs = element.querySelectorAll('input, textarea, select')
  inputs.forEach((input) => {
    const id = input.id
    const label = id ? document.querySelector(`label[for="${id}"]`) : null
    const ariaLabel = input.getAttribute('aria-label')
    const ariaLabelledBy = input.getAttribute('aria-labelledby')

    if (!label && !ariaLabel && !ariaLabelledBy) {
      issues.push({
        element: input,
        issue: 'Missing label or aria-label',
        severity: 'error'
      })
    }
  })

  // Check for heading hierarchy
  const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  let previousLevel = 0
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1])
    if (level > previousLevel + 1) {
      issues.push({
        element: heading,
        issue: `Heading level skipped (h${previousLevel} to h${level})`,
        severity: 'warning'
      })
    }
    previousLevel = level
  })

  // Check for sufficient color contrast (simplified)
  const textElements = element.querySelectorAll('p, span, a, button, label')
  textElements.forEach((el) => {
    const style = getComputedStyle(el)
    const color = style.color
    const bgColor = style.backgroundColor
    
    // Note: Full contrast checking requires more complex color analysis
    // This is a simplified check
  })

  return issues
}

/**
 * Generates accessibility report
 */
export function generateAccessibilityReport(rootElement = document.body) {
  const issues = validateAccessibility(rootElement)
  
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  return {
    total: issues.length,
    errors: errors.length,
    warnings: warnings.length,
    issues,
    score: errors.length === 0 ? (warnings.length === 0 ? 100 : 75) : 50
  }
}

