/**
 * AspScript Testing Suite
 * Полная система тестирования для AspScript
 */

const componentTestUtils = require('./component-test-utils')
const e2eUtils = require('./e2e-utils')

module.exports = {
  // Component testing
  ...componentTestUtils,

  // E2E testing
  ...e2eUtils,

  // Jest presets
  jestPreset: {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['@aspscript/testing/setup'],
    testMatch: [
      '<rootDir>/src/**/*.test.js',
      '<rootDir>/src/**/*.spec.js'
    ],
    collectCoverageFrom: [
      'src/**/*.{js,aspc}',
      '!src/**/*.d.ts',
      '!src/**/*.test.js',
      '!src/**/*.spec.js'
    ],
    coverageReporters: ['text', 'lcov', 'html']
  },

  // Setup file for Jest
  setupFile: `
    // Global test setup for AspScript
    const { createTestEnvironment } = require('@aspscript/testing')

    // Setup test environment before each test
    beforeEach(() => {
      const env = createTestEnvironment()
      global.testEnv = env
    })

    // Cleanup after each test
    afterEach(() => {
      if (global.testEnv) {
        global.testEnv.cleanup()
      }
    })

    // Custom matchers
    expect.extend({
      toBeRendered(received) {
        const pass = received && typeof received.render === 'function'
        return {
          message: () => \`expected \${received} to be a rendered AspScript component\`,
          pass
        }
      },

      toHaveTextContent(received, expectedText) {
        const textContent = received.textContent || received.innerText || ''
        const pass = textContent.includes(expectedText)
        return {
          message: () => \`expected element to have text content "\${expectedText}", but got "\${textContent}"\`,
          pass
        }
      }
    })
  `
}
