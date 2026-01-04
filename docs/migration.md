# Миграция на AspScript

Руководство по переходу с других фреймворков на AspScript.

## С Vue.js

### Реактивность

**Vue:**
```javascript
const { reactive, computed, watch } = Vue

const state = reactive({
  count: 0,
  double: computed(() => state.count * 2)
})

watch(() => state.count, (newVal) => {
  console.log('Count changed:', newVal)
})
```

**AspScript:**
```aspc
let count = $state(0)
$: double = count * 2

$: effect(() => {
  console.log('Count changed:', count)
})
```

### Шаблоны

**Vue:**
```vue
<template>
  <div>
    <h1>{{ title }}</h1>
    <ul v-if="items.length">
      <li v-for="item in items" :key="item.id">
        {{ item.name }}
      </li>
    </ul>
    <button @click="addItem">Добавить</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      title: 'Список',
      items: []
    }
  },
  methods: {
    addItem() {
      this.items.push({ id: Date.now(), name: 'Новый элемент' })
    }
  }
}
</script>
```

**AspScript:**
```aspc
---
let title = $state('Список')
let items = $state([])

function addItem() {
  items = [...items, { id: Date.now(), name: 'Новый элемент' }]
}
---

<div>
  <h1>{title}</h1>
  <ul #if="items.length">
    <li #for="item in items" #key="item.id">
      {item.name}
    </li>
  </ul>
  <button @click="addItem">Добавить</button>
</div>
```

## С React

### Компоненты и состояние

**React:**
```jsx
import { useState, useEffect } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log('Count changed:', count)
  }, [count])

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  )
}
```

**AspScript:**
```aspc
---
let count = $state(0)

$: effect(() => {
  console.log('Count changed:', count)
})
---

<div>
  <h1>{count}</h1>
  <button @click="count++">+</button>
</div>
```

### Формы

**React:**
```jsx
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    await login({ email, password })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Войти</button>
    </form>
  )
}
```

**AspScript:**
```aspc
---
let email = $state('')
let password = $state('')

async function handleSubmit() {
  await login({ email, password })
}
---

<form @submit.prevent="handleSubmit">
  <input type="email" #bind="email" placeholder="Email">
  <input type="password" #bind="password" placeholder="Password">
  <button type="submit">Войти</button>
</form>
```

## С Svelte

### Переменные и реактивность

**Svelte:**
```svelte
<script>
  let count = 0
  $: doubled = count * 2

  function increment() {
    count += 1
  }
</script>

<h1>{count}</h1>
<h2>{doubled}</h2>
<button on:click={increment}>+</button>
```

**AspScript:**
```aspc
---
let count = $state(0)
$: doubled = count * 2

function increment() {
  count += 1
}
---

<h1>{count}</h1>
<h2>{doubled}</h2>
<button @click="increment">+</button>
```

### Жизненный цикл

**Svelte:**
```svelte
<script>
  import { onMount, onDestroy } from 'svelte'

  let timer

  onMount(() => {
    timer = setInterval(() => {
      console.log('tick')
    }, 1000)
  })

  onDestroy(() => {
    clearInterval(timer)
  })
</script>
```

**AspScript:**
```aspc
---
let timer

onMount(() => {
  timer = setInterval(() => {
    console.log('tick')
  }, 1000)
})

onDestroy(() => {
  clearInterval(timer)
})
---
```

## Общие паттерны миграции

### 1. Переход от классовых компонентов

**Старый подход:**
```javascript
class MyComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = { count: 0 }
  }

  increment = () => {
    this.setState({ count: this.state.count + 1 })
  }

  render() {
    return <button onClick={this.increment}>{this.state.count}</button>
  }
}
```

**AspScript:**
```aspc
---
let count = $state(0)

function increment() {
  count++
}
---

<button @click="increment">{count}</button>
```

### 2. Замена useEffect

**React/Vue:**
```javascript
useEffect(() => {
  fetchData()
  return () => cleanup()
}, [dependency])
```

**AspScript:**
```aspc
$: effect(() => {
  fetchData()
  // cleanup автоматически при изменении зависимостей
})
```

### 3. Контекст и глобальное состояние

**React Context:**
```jsx
const ThemeContext = createContext()

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Component />
    </ThemeContext.Provider>
  )
}

function Component() {
  const theme = useContext(ThemeContext)
  // ...
}
```

**AspScript:**
```aspc
// app.aspc
export const theme = $global('dark')

// component.aspc
import { theme } from './app.aspc'
// theme автоматически реактивно
```

## Производительность

### Bundle size

- **React + hooks:** ~45KB gzipped
- **Vue 3:** ~22KB gzipped
- **Svelte:** ~2KB gzipped (compiled)
- **AspScript:** ~1.5KB gzipped (compiled, zero runtime)

### Runtime производительность

- **React:** Virtual DOM diffing
- **Vue:** Proxy-based reactivity
- **Svelte:** Compile-time reactivity
- **AspScript:** Zero-abstraction reactivity (direct DOM updates)

## Инструменты миграции

### Автоматическая конвертация

Для больших проектов мы предоставляем инструмент миграции:

```bash
# Конвертация Vue компонентов
aspc migrate vue Component.vue

# Конвертация React компонентов
aspc migrate react Component.jsx

# Конвертация Svelte компонентов
aspc migrate svelte Component.svelte
```

### Постепенная миграция

AspScript поддерживает совместную работу с существующими фреймворками:

```aspc
---
// Использование React компонентов в AspScript
import ReactComponent from './ReactComponent.jsx'
---

<div>
  <h1>AspScript компонент</h1>
  <ReactComponent />
</div>
```

## Лучшие практики миграции

1. **Начинайте с листовых компонентов** - мигрируйте простые компоненты сначала
2. **Тестируйте инкрементально** - проверяйте функциональность после каждой миграции
3. **Используйте типы** - AspScript отлично работает с TypeScript
4. **Оптимизируйте bundle** - tree-shaking работает автоматически
5. **Мониторьте производительность** - zero-abstraction дает значительный прирост

## FAQ

**Q: Нужно ли переписывать весь проект сразу?**
A: Нет, AspScript поддерживает постепенную миграцию. Вы можете мигрировать компоненты по одному.

**Q: Что делать с существующими тестами?**
A: Тесты нужно будет адаптировать, так как меняется структура компонентов.

**Q: Поддерживается ли SSR?**
A: Да, AspScript имеет встроенную поддержку SSR и SSG.

**Q: Как быть с роутингом?**
A: Используйте любой существующий роутер или наш встроенный asp-router.
