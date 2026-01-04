# AspScript

[![npm version](https://badge.fury.io/js/aspscript.svg)](https://badge.fury.io/js/aspscript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aspscript/framework/ci.yml)](https://github.com/aspscript/framework/actions)
[![Coverage](https://img.shields.io/codecov/c/github/aspscript/framework)](https://codecov.io/gh/aspscript/framework)
[![Latest Release](https://img.shields.io/badge/release-v1.2.0-blue)](https://github.com/skaletun/aspscript/releases/tag/v1.2.0)

> Революционный компилируемый фреймворк, который превращает декларативные описания в высокопроизводительные веб-приложения без лишнего кода.

## 🎉 **AspScript v1.2.0 - "Framework Maturity"**

### 🌐 **Production-Ready SSR**
Streaming SSR с прогрессивным рендерингом, частичная гидратация и поддержка Edge Computing!

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
Профессиональная дизайн-система с системой тем и CSS переменными!

```javascript
import { useTheme, createThemeProvider } from '@aspscript/theme'

const { theme, toggleMode } = useTheme()
// Автоматическое переключение между светлой и темной темой
```

### 🎬 **Animation Library**
Богатая библиотека анимаций с декларативным API!

```javascript
import { createFade, createSlide, animations } from '@aspscript/animations'

const fadeTransition = createFade({ duration: 300 })
const slideTransition = createSlide({ direction: 'left' })
```

### ♿ **Accessibility (WCAG 2.1 AA)**
Полная поддержка доступности из коробки!

```javascript
import { createFocusTrap, setARIA, announceToScreenReader } from '@aspscript/accessibility'

const trap = createFocusTrap(modalElement)
trap.activate()
```

### ⚡ **Edge Computing & ISR**
Поддержка Edge runtime и Incremental Static Regeneration!

```javascript
import { renderForEdge, createISRConfig, revalidatePath } from '@aspscript/core'

// Edge rendering
const html = await renderForEdge(App, { runtime: 'edge' })

// ISR
const config = createISRConfig({ revalidate: 3600 })
await revalidatePath('/blog/post')
```

[📖 Подробнее о v1.2.0](changelogs/CHANGELOG-v1.2.0.md)

**Однофайловые компоненты** | **Прозрачная реактивность** | **Универсальный рендеринг** | **WebAssembly оптимизация**

[🚀 Быстрый старт](#-быстрый-старт) • [📖 Документация](https://aspscript.dev) • [💬 Сообщество](https://discord.gg/skaletun) • [🐛 Issues](https://github.com/aspscript/framework/issues)

---

## ✨ Возможности

- **🚀 Революционная производительность** - Компиляция реактивности, tree-shaking и WebAssembly интеграция
- **📦 Однофайловые компоненты** - Разметка, логика и стили в одном `.aspc` файле
- **⚛️ Прозрачная реактивность** - Автоматическое отслеживание зависимостей с `$state`, `$computed`, `$effect`
- **🌍 Истинная универсальность** - Один код для Web, Mobile, Desktop, Server и Edge
- **🔧 Нулевая конфигурация** - Встроенные SSR/SSG, hot-reload и продвинутые оптимизации
- **🛡️ Enterprise готовность** - Error boundaries, мониторинг, безопасность и LTS поддержка
- **🎨 Современный DX** - TypeScript поддержка, тестовые утилиты и богатый инструментарий
- **💅 SCSS/Sass поддержка** - Переменные, миксины, вложенность в стилях компонентов
- **📊 Performance monitoring** - Встроенные инструменты для мониторинга производительности
- **🔷 TypeScript интеграция** - Полная типизация компонентов и API
- **🌐 Streaming SSR** - Потоковый рендеринг с прогрессивной передачей HTML
- **💧 Partial Hydration** - Селективная гидратация только интерактивных компонентов
- **⚡ Edge Computing** - Поддержка Edge runtime (Vercel, Netlify Edge)
- **🔄 ISR** - Incremental Static Regeneration для оптимизации статического контента
- **🎨 Theme Engine** - Продвинутая система тем с CSS переменными
- **🎬 Animation Library** - Богатая библиотека анимаций и переходов
- **♿ Accessibility** - Полная поддержка WCAG 2.1 AA из коробки

---

## 📦 Установка

```bash
# Создание нового проекта
npm create aspscript@latest my-app
cd my-app

# Запуск сервера разработки
npm run dev
```

---

## 🚀 Быстрый старт

### Hello World компонент

Создайте `src/App.aspc`:

```aspc
---
let message = $state('Привет, AspScript!')
let count = $state(0)

$: doubled = count * 2
$: effect(() => console.log('Count changed:', count))
---

<div class="app">
  <h1>{message}</h1>
  <p>Count: {count} (doubled: {doubled})</p>
  <button @click="count++">Увеличить</button>
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

### Реактивное Todo приложение

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
    <input type="text" #bind="newTodo" placeholder="Что нужно сделать?">
    <button type="submit">Добавить задачу</button>
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
    <button @click="filter = 'all'" :class="{ active: filter === 'all' }">Все</button>
    <button @click="filter = 'active'" :class="{ active: filter === 'active' }">Активные</button>
    <button @click="filter = 'completed'" :class="{ active: filter === 'completed' }">Выполненные</button>
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

## 🏗️ Архитектура

AspScript использует многоступенчатую компиляцию для достижения максимальной производительности:

### Этапы компиляции
1. **Парсинг** - `.aspc` файлы разбираются на AST
2. **Статический анализ** - Выявление реактивных зависимостей и возможностей оптимизации
3. **Оптимизация** - Генерация минимального кода без виртуального DOM
4. **Генерация кода** - Вывод чистого JavaScript + CSS + HTML

### Целевые платформы
- **Браузер**: Оптимизированный ванильный JS с точечными обновлениями DOM
- **Сервер**: Универсальный рендеринг с кэшированием
- **Мобильные**: React Native компоненты через адаптер
- **Десктоп**: Electron/WebView приложения
- **WebAssembly**: Высокопроизводительные WASM модули

---

## ⚡ Сравнение производительности

| Фреймворк | Размер бандла | Производительность | Рейтинг DX | Универсальная поддержка |
|-----------|---------------|-------------------|------------|-------------------------|
| AspScript | ~15KB         | ⚡⚡⚡⚡⚡          | ⭐⭐⭐⭐⭐      | ✅ Полная               |
| React     | ~45KB         | ⚡⚡⚡              | ⭐⭐⭐⭐       | ⚠️ Частичная            |
| Vue       | ~25KB         | ⚡⚡⚡⚡             | ⭐⭐⭐⭐⭐      | ⚠️ Частичная            |
| Svelte    | ~5KB          | ⚡⚡⚡⚡⚡           | ⭐⭐⭐⭐       | ❌ Ограниченная         |

*Бenchmarks основаны на TodoMVC реализации*

---

## 🎯 Ключевые инновации

### 1. Прозрачная реактивность
```aspc
let count = $state(0)        // Реактивная переменная
$: doubled = count * 2       // Автоматическое вычисление
$: effect(() => console.log(count)) // Автоматический эффект
```

### 2. Асинхронные блоки
```aspc
$: async fetchData() {
  const result = await api.get('/data')
  data = result
  // Состояния loading/error обрабатываются автоматически
}
```

### 3. Умные директивы
```aspc
<div #if="condition"         <!-- Условный рендеринг -->
     #for="item in items"    <!-- Циклы с keying -->
     :class="{...}"          <!-- Реактивные классы -->
     @event="handler">       <!-- Обработчики событий -->
```

### 4. Scoped стили
```aspc
<style>
/* Автоматически scoped к компоненту */
/* Компилируется в CSS-modules */
.button { background: blue; }
</style>
```

### 5. Глобальное состояние
```aspc
// app.aspc
export const theme = $global('light')

// Любой компонент
import { theme } from './app.aspc'
$: effect(() => document.body.className = theme)
```

---

## 🛠️ Инструментарий

### CLI команды
```bash
# Разработка
aspc dev                    # Запуск dev сервера
aspc dev 8080              # Кастомный порт
aspc dev ./src --hmr       # Кастомная директория с HMR

# Сборка
aspc build                 # Продакшн сборка
aspc build --analyze       # С анализом бандла
aspc build --platform web  # Только веб-сборка

# Кросс-платформенная
aspc build --platforms web,ios,android,desktop

# Утилиты
aspc analyze bundle.js     # Анализ бандла
aspc migrate vue ./app     # Миграция с Vue
```

### Vite интеграция
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

### TypeScript поддержка
```typescript
// Полные определения типов включены
import { $state, $computed, $effect } from '@aspscript/core'

const count: Reactive<number> = $state(0)
const doubled: Reactive<number> = $computed(() => count.value * 2)

// Автодополнение и проверки типов везде
```

---

## 📱 Универсальная разработка

### Веб разработка
```javascript
import { renderToString, renderToStream, hydrate, hydratePartial } from '@aspscript/core'

// SSR
const html = renderToString(App)

// Streaming SSR
const stream = await renderToStream(App, {
  streaming: true,
  suspense: true
})

// Полная гидратация
hydrate(App, document.getElementById('app'))

// Частичная гидратация
await hydratePartial(InteractiveComponent, '#app', {
  lazy: true
})
```

### Мобильная разработка (React Native)
```javascript
import { createReactNativeComponent } from '@aspscript/react-native'

const MobileApp = createReactNativeComponent(App)
// Работает с Expo и чистым React Native
```

### Десктоп приложения
```javascript
import { createDesktopApp } from '@aspscript/electron'

const desktopApp = createDesktopApp(App, {
  width: 1200,
  height: 800
})
```

### WebAssembly интеграция
```javascript
import { createWASMInstance } from '@aspscript/wasm'

const wasmApp = await createWASMInstance(`
  let count = $state(0)
  $: doubled = count * 2
`, { memorySize: 1024 * 1024 })
```

---

## 🔧 Продвинутые возможности

### Theme Engine
```javascript
import { useTheme, createThemeProvider, defaultTheme, darkTheme } from '@aspscript/theme'

// Использование темы
const { theme, mode, toggleMode } = useTheme()

// Создание провайдера
const provider = createThemeProvider(defaultTheme)
provider.setMode('dark') // Переключение на темную тему
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

// Focus trap для модальных окон
const trap = createFocusTrap(modalElement)
trap.activate()

// ARIA атрибуты
setARIA(element, {
  role: 'dialog',
  'aria-modal': 'true',
  'aria-labelledby': 'modal-title'
})

// Объявления для скрин-ридеров
announceToScreenReader('Модальное окно открыто')
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

// ISR конфигурация
const config = createISRConfig({
  revalidate: 3600,
  paths: ['/blog/*']
})

// Регенерация по требованию
await revalidatePath('/blog/new-post')
```

### Edge Computing
```javascript
import { renderForEdge, createEdgeHandler } from '@aspscript/core'

// Edge handler для Vercel
export default createEdgeHandler(App)

// Или напрямую
const html = await renderForEdge(App, {
  runtime: 'edge',
  region: request.region
})
```

### Error Boundaries
```aspc
import { ErrorBoundary } from '@aspscript/core'

const SafeComponent = ErrorBoundary({
  fallback: ({ error }) => `<div>Ошибка: ${error.message}</div>`,
  onError: (error) => console.error('Ошибка компонента:', error)
})(ProblematicComponent)
```

### GraphQL интеграция
```javascript
import { useQuery, useMutation } from '@aspscript/graphql'

const { data, loading, error } = useQuery(GET_USERS, {
  variables: { limit: 10 }
})
```

### Микрофронтенды
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

### Интернационализация
```javascript
import { createI18n } from '@aspscript/i18n'

const i18n = createI18n({
  locale: 'ru',
  messages: { en: { hello: 'Hello' }, ru: { hello: 'Привет' } }
})

i18n.t('hello') // Реактивный перевод
```

---

## 🧪 Тестирование

### Тестирование компонентов
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

### E2E тестирование
```javascript
import { createE2eEnvironment } from '@aspscript/testing'

test('full app flow', async () => {
  const { page } = await createE2eEnvironment()
  await page.goto('http://localhost:3000')

  // Тестируем взаимодействия
  await page.click('button')
  await page.waitForSelector('.result')
})
```

---

## 📚 Документация

- **[Быстрый старт](https://aspscript.dev/getting-started)** - Запуск за 5 минут
- **[API Reference](https://aspscript.dev/api)** - Полная документация API
- **[Руководство миграции](https://aspscript.dev/migration)** - Миграция с Vue/React/Svelte
- **[Лучшие практики](https://aspscript.dev/best-practices)** - Рекомендации по архитектуре
- **[Производительность](https://aspscript.dev/performance)** - Руководства по оптимизации
- **[SSR Guide](https://aspscript.dev/ssr)** - Серверный рендеринг и Streaming SSR
- **[TypeScript](https://aspscript.dev/typescript)** - Типизированная разработка
- **[Theme Engine](https://aspscript.dev/theme)** - Дизайн-система и темы
- **[Animations](https://aspscript.dev/animations)** - Библиотека анимаций
- **[Accessibility](https://aspscript.dev/accessibility)** - Доступность (WCAG 2.1 AA)

---

## 🤝 Вклад в развитие

Мы приветствуем вклад! Пожалуйста, ознакомьтесь с нашим [Руководством по внесению вклада](CONTRIBUTING.md) для подробной информации.

### Быстрый старт для контрибьюторов

```bash
# Форк и клон репозитория
git clone https://github.com/skaletun/aspscript.git
cd aspscript

# Установка зависимостей
npm install

# Запуск разработки
npm run dev

# Запуск тестов
npm test

# Сборка всех пакетов
npm run build
```

### Способы внести вклад

- 🐛 **Bug reports** - сообщите о найденных проблемах
- 💡 **Feature requests** - предложите новые возможности
- 📝 **Documentation** - улучшите документацию
- 🧪 **Testing** - протестируйте новые возможности
- 💻 **Code** - внесите изменения в код
- 🌍 **Translations** - переведите документацию

---

## 📄 Лицензия

[MIT License](LICENSE) - бесплатно для личного и коммерческого использования.

---

## 🌟 Сообщество

- **[Discord](https://discord.gg/skaletun)** - Общение с сообществом
- **[GitHub Issues](https://github.com/aspscript/framework/issues)** - Баг репорты и запросы фич


---

**AspScript - Будущее веб-разработки** 🚀

*Создано с ❤️ от Adel Petrov*