# AspScript

[![npm version](https://img.shields.io/npm/v/@aspscript/core?label=@aspscript/core)](https://www.npmjs.com/package/@aspscript/core)
[![npm version](https://img.shields.io/npm/v/@aspscript/compiler?label=@aspscript/compiler)](https://www.npmjs.com/package/@aspscript/compiler)
[![npm downloads](https://img.shields.io/npm/dm/@aspscript/core)](https://www.npmjs.com/package/@aspscript/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aspscript/framework/ci.yml)](https://github.com/Skalettson/aspscript/actions)
[![Latest Release](https://img.shields.io/badge/release-v1.3.0-blue)](https://github.com/Skalettson/aspscript/releases/tag/v1.3.0)

> Revolutionary compile-time framework that transforms declarative descriptions into high-performance web applications without extra code.

## 🎉 **AspScript v1.3.0 - "Advanced Compiler"**

### 🔀 **Conditional Directives** ⭐ NEW!
Natural syntax for conditional rendering!

```aspc
{#if isLoggedIn}
  <div class="user-panel">
    <h1>Welcome, {user.name}!</h1>
  </div>
{:else if isPending}
  <div class="loading">Loading...</div>
{:else}
  <LoginForm />
{/if}
```

### 🔄 **Optimized Loops** ⭐ NEW!
Powerful directives for list rendering!

```aspc
{#for user in users :key="id"}
  <UserCard :data="user" />
{/for}

{#each todos as (todo, index)}
  <div>{index + 1}. {todo.text}</div>
{/each}
```

### 🧩 **Advanced Components** ⭐ NEW!
Props with validation, events, slots!

```aspc
export const props = {
  title: { type: String, required: true },
  count: { type: Number, default: 0 }
}

export const emits = ['click', 'update']
```

[📖 Learn more about v1.3.0](changelogs/CHANGELOG-v1.3.0.md) | [📋 v1.2.0](changelogs/CHANGELOG-v1.2.0.md)

---

## 🎉 **AspScript v1.2.0 - "Framework Maturity"**

### 🌐 **Production-Ready SSR**
Streaming SSR with progressive rendering, partial hydration, and Edge Computing support!

```javascript
import { renderToStream, hydratePartial } from '@aspscript/core'

// Streaming SSR
const stream = await renderToStream(App, {
  streaming: true,
  suspense: true,
  onChunk: (chunk) => res.write(chunk)
})

// Partial Hydration
await hydratePartial(InteractiveComponent, '#app', {
  lazy: true,
  selectors: ['.interactive']
})
```

### 🎨 **Design System & Theme Engine**
Professional design system with theme management and CSS variables!

```javascript
import { useTheme, createThemeProvider } from '@aspscript/theme'

const { theme, toggleMode } = useTheme()
// Automatic switching between light and dark themes
```

### 🎬 **Animation Library**
Rich animation library with declarative API!

```javascript
import { createFade, createSlide, animations } from '@aspscript/animations'

const fadeTransition = createFade({ duration: 300 })
const slideTransition = createSlide({ direction: 'left' })
```

### ♿ **Accessibility (WCAG 2.1 AA)**
Full accessibility support out of the box!

```javascript
import { createFocusTrap, setARIA, announceToScreenReader } from '@aspscript/accessibility'

const trap = createFocusTrap(modalElement)
trap.activate()
```

### ⚡ **Edge Computing & ISR**
Edge runtime support and Incremental Static Regeneration!

```javascript
import { renderForEdge, createISRConfig, revalidatePath } from '@aspscript/core'

// Edge rendering
const html = await renderForEdge(App, { runtime: 'edge' })

// ISR
const config = createISRConfig({ revalidate: 3600 })
await revalidatePath('/blog/post')
```

[📖 Learn more about v1.2.0](changelogs/CHANGELOG-v1.2.0.md)

**Single-file components** | **Zero-abstraction reactivity** | **Universal rendering** | **WebAssembly optimization**

[🚀 Quick Start](#-quick-start) • [📖 Documentation](https://aspscript.dev) • [💬 Community](https://discord.gg/aspscript) • [🐛 Issues](https://github.com/aspscript/framework/issues)

---

## ✨ Features

- **🚀 Revolutionary Performance** - Compile-time reactivity, tree-shaking, and WebAssembly integration
- **📦 Single-file Components** - Markup, logic, and styles in one `.aspc` file
- **⚛️ Transparent Reactivity** - Automatic dependency tracking with `$state`, `$computed`, `$effect`
- **🌍 True Universal** - One codebase for Web, Mobile, Desktop, Server, and Edge
- **🔧 Zero Configuration** - Built-in SSR/SSG, hot-reload, and advanced optimizations
- **🛡️ Enterprise Ready** - Error boundaries, monitoring, security, and LTS support
- **🎨 Modern DX** - TypeScript support, testing utilities, and rich tooling
- **💅 SCSS/Sass Support** - Variables, mixins, nesting in component styles
- **📊 Performance Monitoring** - Built-in tools for component performance monitoring
- **🔷 TypeScript Integration** - Full component and API typing
- **🌐 Streaming SSR** - Stream rendering with progressive HTML delivery
- **💧 Partial Hydration** - Selective hydration of only interactive components
- **⚡ Edge Computing** - Edge runtime support (Vercel, Netlify Edge)
- **🔄 ISR** - Incremental Static Regeneration for static content optimization
- **🎨 Theme Engine** - Advanced theme system with CSS variables
- **🎬 Animation Library** - Rich animation and transition library
- **♿ Accessibility** - Full WCAG 2.1 AA support out of the box

---

## 📦 Installation

```bash
# Create new project
npm create aspscript@latest my-app
cd my-app

# Start development server
npm run dev
```

---

## 🚀 Quick Start

### Hello World Component

Create `src/App.aspc`:

```aspc
---
let message = $state('Hello, AspScript!')
let count = $state(0)

$: doubled = count * 2
$: effect(() => console.log('Count changed:', count))
---

<div class="app">
  <h1>{message}</h1>
  <p>Count: {count} (doubled: {doubled})</p>
  <button @click="count++">Increment</button>
</div>

<style lang="scss">
$app-padding: 2rem;
$primary-color: #667eea;

.app {
  text-align: center;
  padding: $app-padding;

  h1 {
    color: $primary-color;
    margin-bottom: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, $primary-color, darken($primary-color, 10%));
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: translateY(-2px);
    }
  }
}
</style>
```

### Reactive Todo App

```aspc
---
let todos = $state([])
let newTodo = $state('')
let filter = $state('all')

$: filteredTodos = todos.filter(todo => {
  if (filter === 'active') return !todo.done
  if (filter === 'completed') return todo.done
  return true
})

function addTodo() {
  if (newTodo.trim()) {
    todos = [...todos, {
      id: Date.now(),
      text: newTodo.trim(),
      done: false
    }]
    newTodo = ''
  }
}
---

<div class="todo-app">
  <h1>AspScript Todo</h1>

  <form @submit.prevent="addTodo">
    <input type="text" #bind="newTodo" placeholder="What needs to be done?">
    <button type="submit">Add Todo</button>
  </form>

  <ul>
    <li #for="todo in filteredTodos" #key="todo.id"
        :class="{ completed: todo.done }">
      <input type="checkbox" :checked="todo.done"
             @change="todo.done = $event.target.checked">
      <span>{todo.text}</span>
      <button @click="todos = todos.filter(t => t.id !== todo.id)">×</button>
    </li>
  </ul>

  <div class="filters">
    <button @click="filter = 'all'" :class="{ active: filter === 'all' }">All</button>
    <button @click="filter = 'active'" :class="{ active: filter === 'active' }">Active</button>
    <button @click="filter = 'completed'" :class="{ active: filter === 'completed' }">Completed</button>
  </div>
</div>

<style>
.todo-app { max-width: 400px; margin: 0 auto; font-family: Arial, sans-serif; }
.completed { text-decoration: line-through; opacity: 0.6; }
.filters { display: flex; gap: 0.5rem; margin-top: 1rem; }
.active { background: #007acc; color: white; }
</style>
```

---

## 🏗️ Architecture

AspScript uses multi-stage compilation for maximum performance:

### Compilation Pipeline
1. **Parsing** - `.aspc` files parsed into AST
2. **Static Analysis** - Reactive dependencies and optimization opportunities identified
3. **Optimization** - Minimal code generation without virtual DOM
4. **Code Generation** - Clean JavaScript + CSS + HTML output

### Output Targets
- **Browser**: Optimized vanilla JS with surgical DOM updates
- **Server**: Universal rendering with caching
- **Mobile**: React Native components via adapter
- **Desktop**: Electron/WebView applications
- **WebAssembly**: High-performance WASM modules

---

## ⚡ Performance Comparison

| Framework | Bundle Size | Runtime Performance | DX Rating | Universal Support |
|-----------|-------------|-------------------|-----------|-------------------|
| AspScript | ~15KB       | ⚡⚡⚡⚡⚡          | ⭐⭐⭐⭐⭐     | ✅ Full          |
| React     | ~45KB       | ⚡⚡⚡              | ⭐⭐⭐⭐      | ⚠️ Partial       |
| Vue       | ~25KB       | ⚡⚡⚡⚡             | ⭐⭐⭐⭐⭐     | ⚠️ Partial       |
| Svelte    | ~5KB        | ⚡⚡⚡⚡⚡           | ⭐⭐⭐⭐      | ❌ Limited       |

*Benchmarks based on TodoMVC implementation*

---

## 🎯 Key Innovations

### 1. Transparent Reactivity
```aspc
let count = $state(0)        // Reactive variable
$: doubled = count * 2       // Auto-computed
$: effect(() => console.log(count)) // Auto-effect
```

### 2. Async Blocks
```aspc
$: async fetchData() {
  const result = await api.get('/data')
  data = result
  // Loading/error states handled automatically
}
```

### 3. Smart Directives (v1.3.0 Enhanced!)
```aspc
<!-- Conditional rendering -->
{#if condition}
  <div>Content</div>
{:else if other}
  <div>Other</div>
{:else}
  <div>Fallback</div>
{/if}

<!-- Loops with keying -->
{#for item in items :key="id"}
  <Card :data="item" />
{/for}

<!-- Reactive classes and events -->
<div :class="{active: isActive}" @click="handler">
```

### 4. Scoped Styles
```aspc
<style>
/* Automatically scoped to component */
/* Compiled to CSS-modules */
.button { background: blue; }
</style>
```

### 5. Global State
```aspc
// app.aspc
export const theme = $global('light')

// Any component
import { theme } from './app.aspc'
$: effect(() => document.body.className = theme)
```

---

## 🛠️ Tooling

### CLI Commands
```bash
# Development
aspc dev                    # Start dev server
aspc dev 8080              # Custom port
aspc dev ./src --hmr       # Custom directory with HMR

# Building
aspc build                 # Production build
aspc build --analyze       # With bundle analysis
aspc build --platform web  # Web-only build

# Cross-platform
aspc build --platforms web,ios,android,desktop

# Utilities
aspc analyze bundle.js     # Bundle analysis
aspc migrate vue ./app     # Migrate from Vue
```

### Vite Integration
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import aspscript from '@aspscript/vite-plugin'

export default defineConfig({
  plugins: [aspscript()],
  resolve: {
    alias: {
      '@': '/src',
      '@ui': '/packages/ui'
    }
  }
})
```

### TypeScript Support
```typescript
// Full type definitions included
import { $state, $computed, $effect } from '@aspscript/core'

const count: Reactive<number> = $state(0)
const doubled: Reactive<number> = $computed(() => count.value * 2)

// Autocomplete and type checking everywhere
```

---

## 📱 Universal Development

### Web Development
```javascript
import { renderToString, renderToStream, hydrate, hydratePartial } from '@aspscript/core'

// SSR
const html = renderToString(App)

// Streaming SSR
const stream = await renderToStream(App, {
  streaming: true,
  suspense: true
})

// Full hydration
hydrate(App, document.getElementById('app'))

// Partial hydration
await hydratePartial(InteractiveComponent, '#app', {
  lazy: true
})
```

### Mobile Development (React Native)
```javascript
import { createReactNativeComponent } from '@aspscript/react-native'

const MobileApp = createReactNativeComponent(App)
// Works with Expo and bare React Native
```

### Desktop Applications
```javascript
import { createDesktopApp } from '@aspscript/electron'

const desktopApp = createDesktopApp(App, {
  width: 1200,
  height: 800
})
```

### WebAssembly Integration
```javascript
import { createWASMInstance } from '@aspscript/wasm'

const wasmApp = await createWASMInstance(`
  let count = $state(0)
  $: doubled = count * 2
`, { memorySize: 1024 * 1024 })
```

---

## 🔧 Advanced Features

### Theme Engine
```javascript
import { useTheme, createThemeProvider, defaultTheme, darkTheme } from '@aspscript/theme'

// Using theme
const { theme, mode, toggleMode } = useTheme()

// Creating provider
const provider = createThemeProvider(defaultTheme)
provider.setMode('dark') // Switch to dark theme
```

### Animation Library
```javascript
import { createFade, createSlide, createGestureAnimation } from '@aspscript/animations'

// Fade transition
const fade = createFade({ duration: 300 })

// Slide transition
const slide = createSlide({ direction: 'left', duration: 300 })

// Gesture animations
createGestureAnimation(element, {
  drag: { onMove: (e, { x, y }) => console.log(x, y) },
  pinch: { onMove: (e, { scale }) => console.log(scale) }
})
```

### Accessibility
```javascript
import { createFocusTrap, setARIA, announceToScreenReader } from '@aspscript/accessibility'

// Focus trap for modals
const trap = createFocusTrap(modalElement)
trap.activate()

// ARIA attributes
setARIA(element, {
  role: 'dialog',
  'aria-modal': 'true',
  'aria-labelledby': 'modal-title'
})

// Screen reader announcements
announceToScreenReader('Modal opened')
```

### Streaming SSR & ISR
```javascript
import { renderToStream, createISRConfig, revalidatePath } from '@aspscript/core'

// Streaming SSR
app.get('/', async (req, res) => {
  const stream = await renderToStream(App, {
    props: { user: req.user },
    streaming: true
  })
  stream.pipe(res)
})

// ISR configuration
const config = createISRConfig({
  revalidate: 3600,
  paths: ['/blog/*']
})

// On-demand revalidation
await revalidatePath('/blog/new-post')
```

### Edge Computing
```javascript
import { renderForEdge, createEdgeHandler } from '@aspscript/core'

// Edge handler for Vercel
export default createEdgeHandler(App)

// Or directly
const html = await renderForEdge(App, {
  runtime: 'edge',
  region: request.region
})
```

### Error Boundaries
```aspc
import { ErrorBoundary } from '@aspscript/core'

const SafeComponent = ErrorBoundary({
  fallback: ({ error }) => `<div>Error: ${error.message}</div>`,
  onError: (error) => console.error('Component error:', error)
})(ProblematicComponent)
```

### GraphQL Integration
```javascript
import { useQuery, useMutation } from '@aspscript/graphql'

const { data, loading, error } = useQuery(GET_USERS, {
  variables: { limit: 10 }
})
```

### Microfrontends
```javascript
import { createModuleFederation } from '@aspscript/microfrontends'

const federation = createModuleFederation({
  name: 'shell',
  remotes: {
    header: 'http://localhost:3001/remoteEntry.js',
    dashboard: 'http://localhost:3002/remoteEntry.js'
  }
})
```

### Internationalization
```javascript
import { createI18n } from '@aspscript/i18n'

const i18n = createI18n({
  locale: 'en',
  messages: { en: { hello: 'Hello' }, ru: { hello: 'Привет' } }
})

i18n.t('hello') // Reactive translation
```

---

## 🧪 Testing

### Component Testing
```javascript
import { render, fireEvent } from '@aspscript/testing'

test('button works', () => {
  const { container, findByText } = render(Button, {
    children: 'Click me',
    onClick: mockClick
  })

  fireEvent(findByText('Click me'), 'click')
  expect(mockClick).toHaveBeenCalled()
})
```

### E2E Testing
```javascript
import { createE2eEnvironment } from '@aspscript/testing'

test('full app flow', async () => {
  const { page } = await createE2eEnvironment()
  await page.goto('http://localhost:3000')

  // Test interactions
  await page.click('button')
  await page.waitForSelector('.result')
})
```

---

## 📚 Documentation

- **[Getting Started](https://aspscript.dev/getting-started)** - 5-minute quick start
- **[API Reference](https://aspscript.dev/api)** - Complete API documentation
- **[Migration Guide](https://aspscript.dev/migration)** - Migrate from Vue/React/Svelte
- **[Best Practices](https://aspscript.dev/best-practices)** - Architecture recommendations
- **[Performance](https://aspscript.dev/performance)** - Optimization guides
- **[SSR Guide](https://aspscript.dev/ssr)** - Server-side rendering and Streaming SSR
- **[TypeScript](https://aspscript.dev/typescript)** - Type-safe development
- **[Theme Engine](https://aspscript.dev/theme)** - Design system and themes
- **[Animations](https://aspscript.dev/animations)** - Animation library
- **[Accessibility](https://aspscript.dev/accessibility)** - Accessibility (WCAG 2.1 AA)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information.

### Quick Start for Contributors

```bash
# Fork and clone the repository
git clone https://github.com/skaletun/aspscript.git
cd aspscript

# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build all packages
npm run build
```

### Ways to Contribute

- 🐛 **Bug reports** - report issues you find
- 💡 **Feature requests** - suggest new capabilities
- 📝 **Documentation** - improve docs and guides
- 🧪 **Testing** - test new features and report issues
- 💻 **Code** - contribute code changes
- 🌍 **Translations** - translate documentation

---

## 📄 License

[MIT License](LICENSE) - free for personal and commercial use.

---

## 🌟 Community

- **[Discord](https://discord.gg/skaletun)** - Chat with the community
- **[GitHub Issues](https://github.com/aspscript/framework/issues)** - Bug reports and feature requests


---

**AspScript - The Future of Web Development** 🚀

*Made with ❤️ by Adel Petrov*
