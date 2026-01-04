# AspScript API Reference

## Реактивность

### $state(initialValue)

Создает реактивную переменную, которая автоматически отслеживает зависимости и обновляет компоненты при изменении.

```aspc
let count = $state(0)
let user = $state({ name: 'John', age: 25 })
let items = $state([])
```

### $computed(getter)

Создает вычисляемое свойство, которое автоматически пересчитывается при изменении зависимостей.

```aspc
let count = $state(0)
let doubled = $computed(() => count * 2)

$: total = items.reduce((sum, item) => sum + item.price, 0)
```

### $effect(callback)

Создает эффект, который выполняется при изменении отслеживаемых реактивных переменных.

```aspc
let count = $state(0)

$: effect(() => {
  console.log('Count changed:', count)
  document.title = `Count: ${count}`
})
```

### $global(initialValue)

Создает глобальное состояние, доступное во всем приложении.

```aspc
// app.aspc
export const theme = $global('light')
export const user = $global(null)

// component.aspc
import { theme, user } from './app.aspc'
```

## Синтаксис шаблонов

### Интерполяция

```aspc
<p>Привет, {user.name}!</p>
<span>Возраст: {user.age + 5}</span>
```

### Директивы

#### #if / #else

Условный рендеринг элементов.

```aspc
<div #if="user.isLoggedIn">
  Добро пожаловать, {user.name}!
</div>
<div #else>
  Пожалуйста, войдите в систему.
</div>
```

#### #for

Циклический рендеринг с автоматическим keying.

```aspc
<ul>
  <li #for="item in items" #key="item.id">
    {item.name}: {item.price}₽
  </li>
</ul>
```

#### :class

Динамические CSS классы.

```aspc
<button :class="{ active: isActive, disabled: !enabled }">
  Кнопка
</button>
```

#### :style

Динамические inline стили.

```aspc
<div :style="{ backgroundColor: theme.color, fontSize: fontSize + 'px' }">
  Контент
</div>
```

#### @event

Обработчики событий.

```aspc
<button @click="count++">+1</button>
<input @input="handleInput" @blur="validateField">
<form @submit.prevent="submitForm">
```

#### #bind

Двусторонняя привязка данных.

```aspc
<input type="text" #bind="username">
<input type="checkbox" #bind="agreeToTerms">
<select #bind="selectedOption">
  <option value="a">Вариант A</option>
  <option value="b">Вариант B</option>
</select>
```

## Жизненный цикл компонентов

### onMount(callback)

Выполняется при монтировании компонента.

```aspc
onMount(() => {
  console.log('Компонент смонтирован')
  // Здесь можно делать запросы к API, устанавливать таймеры и т.д.
})
```

### onDestroy(callback)

Выполняется при размонтировании компонента.

```aspc
onDestroy(() => {
  console.log('Компонент будет размонтирован')
  // Здесь нужно очищать ресурсы: отменять запросы, удалять слушатели
})
```

## Асинхронные операции

### Асинхронные вычисляемые свойства

```aspc
$: async fetchUser() {
  const response = await fetch('/api/user')
  user = await response.json()
}

// Или более явно:
$: user = await fetch('/api/user').then(r => r.json())
```

### Реактивные эффекты с async

```aspc
$: effect(async () => {
  if (userId) {
    const userData = await fetchUser(userId)
    user = userData
  }
})
```

## Работа с формами

### Валидация форм

```aspc
let email = $state('')
let password = $state('')
let errors = $state({})

$: validateForm = () => {
  errors = {}
  if (!email.includes('@')) {
    errors.email = 'Неверный email'
  }
  if (password.length < 6) {
    errors.password = 'Пароль слишком короткий'
  }
}

$: isValid = Object.keys(errors).length === 0
```

### Отправка форм

```aspc
async function submitForm() {
  if (!isValid) return

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (response.ok) {
      // Успешный вход
      user = await response.json()
    } else {
      errors.general = 'Ошибка входа'
    }
  } catch (error) {
    errors.general = 'Сетевая ошибка'
  }
}
```

## Стилизация

### Scoped CSS

Все стили автоматически ограничиваются компонентом.

```aspc
<style>
/* Эти стили применятся только к этому компоненту */
.title { color: blue; }
.active { background: green; }
</style>
```

### CSS переменные

```aspc
<style>
:root {
  --primary-color: #007acc;
  --spacing: 1rem;
}

.button {
  background: var(--primary-color);
  padding: var(--spacing);
}
</style>
```

### Динамические стили

```aspc
let theme = $state('light')

<style>
.container {
  background: {theme === 'dark' ? '#333' : '#fff'};
  color: {theme === 'dark' ? '#fff' : '#333'};
}
</style>
```

## Импорт и экспорт

### Импорт компонентов

```aspc
import Button from './Button.aspc'
import { Modal, Dropdown } from './ui.aspc'
```

### Экспорт компонентов

```aspc
export default function MyComponent() {
  // ...
}

export { HelperFunction, CONSTANTS }
```

## CLI команды

### Инициализация проекта

```bash
aspc init [project-name]
```

### Компиляция файлов

```bash
# Компилировать один файл
aspc compile Component.aspc

# Компилировать с указанием выхода
aspc compile Component.aspc dist/Component.js
```

### Сборка проекта

```bash
# Собрать проект из ./src в ./dist
aspc build

# Собрать из указанной директории
aspc build ./components ./build
```

## Конфигурация

### aspc.config.js

```javascript
export default {
  // Директория исходников
  sourceDir: './src',

  // Выходная директория
  outputDir: './dist',

  // Опции компиляции
  compiler: {
    minify: true,
    sourcemap: true,
    target: 'es2020'
  },

  // Плагины
  plugins: [
    // Ваши плагины
  ]
}
```

## Расширенные возможности

### WebAssembly интеграция

```aspc
// Загрузка WASM модуля
$: wasmModule = await WebAssembly.instantiateStreaming(
  fetch('/math.wasm')
)

// Использование
$: result = wasmModule.instance.exports.add(a, b)
```

### SSR/SSG

```aspc
// Серверный рендеринг
export async function renderToString(component) {
  // AspScript автоматически поддерживает SSR
  return component.renderToString()
}

// Статическая генерация
export async function generateStatic() {
  const routes = ['/', '/about', '/contact']

  for (const route of routes) {
    const html = await renderRoute(route)
    writeFileSync(`dist${route}/index.html`, html)
  }
}
```

### Пользовательские директивы

```aspc
// Регистрация кастомной директивы
directives.tooltip = (element, value) => {
  element.setAttribute('title', value)
}

// Использование
<button #tooltip="'Нажмите для сохранения'">Сохранить</button>
```
