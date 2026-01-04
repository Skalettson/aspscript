# AspScript TypeScript Guide

Полное руководство по использованию TypeScript с AspScript.

## Установка

```bash
npm install @aspscript/typescript typescript --save-dev
```

## Конфигурация

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@aspscript/*": ["packages/*/src"]
    },
    "types": ["@aspscript/typescript"]
  },
  "include": [
    "src/**/*",
    "packages/**/*.ts",
    "packages/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.aspc"
  ]
}
```

## Типы AspScript

### Реактивные типы

```typescript
import { Reactive, ReactiveValue } from '@aspscript/typescript'

// Базовые реактивные типы
const count: Reactive<number> = $state(0)
const user: Reactive<User> = $state({ name: 'John', age: 25 })

// Получение значения из реактивного объекта
const currentCount: number = count.value
const currentUser: User = user.value

// Вычисляемые значения
const doubled: Reactive<number> = $computed(() => count.value * 2)
const fullName: Reactive<string> = $computed(() => `${user.value.name} ${user.value.surname}`)
```

### Компоненты

```typescript
import { Component, ComponentInstance } from '@aspscript/typescript'

// Типизация компонента
interface UserCardProps {
  user: User
  onEdit: (user: User) => void
  className?: string
}

const UserCard: Component = (props: UserCardProps) => {
  const user = $state(props.user)

  return {
    render: () => `
      <div class="user-card ${props.className || ''}">
        <h3>{user.value.name}</h3>
        <p>Age: {user.value.age}</p>
        <button @click="() => props.onEdit(user.value)">Edit</button>
      </div>
    `
  }
}
```

## Интерфейсы и типы

### Пропсы компонентов

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  onClick?: (event: Event) => void
  children: string
}

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number'
  value: string
  placeholder?: string
  label?: string
  error?: string
  required?: boolean
  onChange?: (value: string) => void
  onBlur?: (event: FocusEvent) => void
}
```

### События

```typescript
interface FormEvents {
  onSubmit: (data: FormData) => void | Promise<void>
  onReset: () => void
  onChange: (field: string, value: any) => void
}

interface ModalEvents {
  onOpen: () => void
  onClose: () => void
  onConfirm: (result: any) => void
}
```

## Примеры типизированных компонентов

### Типизированная форма

```typescript
interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>
  loading?: boolean
}

const LoginForm: Component = (props: LoginFormProps) => {
  const email = $state('')
  const password = $state('')
  const errors = $state<{ email?: string; password?: string }>({})

  const validate = (): boolean => {
    errors.value = {}

    if (!email.value.includes('@')) {
      errors.value.email = 'Invalid email'
    }

    if (password.value.length < 6) {
      errors.value.password = 'Password too short'
    }

    return Object.keys(errors.value).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      await props.onSubmit({
        email: email.value,
        password: password.value
      })
    } catch (error) {
      errors.value.general = error.message
    }
  }

  return {
    render: () => `
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Email</label>
          <input
            type="email"
            #bind="email"
            placeholder="Enter email"
          />
          <span class="error">${errors.value.email || ''}</span>
        </div>

        <div class="form-group">
          <label>Password</label>
          <input
            type="password"
            #bind="password"
            placeholder="Enter password"
          />
          <span class="error">${errors.value.password || ''}</span>
        </div>

        <button type="submit" :disabled="props.loading">
          ${props.loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    `
  }
}
```

### Типизированный API клиент

```typescript
interface ApiResponse<T> {
  data: T
  error?: string
  loading: boolean
}

interface User {
  id: number
  name: string
  email: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`)
      const data = await response.json()

      return {
        data,
        loading: false
      }
    } catch (error) {
      return {
        data: null as T,
        error: error.message,
        loading: false
      }
    }
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    // Implementation...
  }
}

// Использование в компоненте
const UserProfile: Component = () => {
  const api = new ApiClient('/api')
  const user = $state<User | null>(null)
  const loading = $state(true)

  $: effect(async () => {
    const response = await api.get<User>('/user/profile')
    user.value = response.data
    loading.value = response.loading
  })

  return {
    render: () => `
      <div class="profile">
        ${loading.value ? '<div>Loading...</div>' :
          user.value ? `
            <h1>${user.value.name}</h1>
            <p>${user.value.email}</p>
          ` : '<div>Error loading user</div>'
        }
      </div>
    `
  }
}
```

## Продвинутые паттерны

### Generic компоненты

```typescript
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => string
  keyFn?: (item: T) => string | number
  emptyMessage?: string
}

function List<T>(props: ListProps<T>): ComponentInstance {
  return {
    render: () => {
      if (props.items.length === 0) {
        return `<div class="empty">${props.emptyMessage || 'No items'}</div>`
      }

      return `
        <ul class="list">
          ${props.items.map((item, index) => `
            <li key="${props.keyFn ? props.keyFn(item) : index}">
              ${props.renderItem(item, index)}
            </li>
          `).join('')}
        </ul>
      `
    }
  }
}

// Использование
const UserList: Component = () => {
  const users = $state<User[]>([])

  return List<User>({
    items: users.value,
    keyFn: (user) => user.id,
    renderItem: (user) => `<div>${user.name} - ${user.email}</div>`,
    emptyMessage: 'No users found'
  })
}
```

### HOC с типами

```typescript
interface WithLoadingProps {
  loading: boolean
}

function withLoading<P extends object>(
  Component: (props: P) => ComponentInstance
) {
  return (props: P & WithLoadingProps) => {
    if (props.loading) {
      return {
        render: () => '<div class="loading">Loading...</div>'
      }
    }

    return Component(props)
  }
}

// Использование
const UserProfileWithLoading = withLoading(UserProfile)
```

## Интеграция с внешними библиотеками

### React типы (для миграции)

```typescript
// Если нужно использовать React компоненты
import { FC, useState, useEffect } from 'react'

interface AspScriptBridgeProps {
  aspscriptComponent: Component
  reactProps?: any
}

const AspScriptBridge: FC<AspScriptBridgeProps> = ({
  aspscriptComponent,
  reactProps
}) => {
  const [instance, setInstance] = useState<ComponentInstance | null>(null)

  useEffect(() => {
    const componentInstance = aspscriptComponent(reactProps || {})
    setInstance(componentInstance)
  }, [aspscriptComponent, reactProps])

  if (!instance) return <div>Loading...</div>

  return <div dangerouslySetInnerHTML={{ __html: instance.render() }} />
}
```

### Vue типы (для совместимости)

```typescript
// Для проектов с Vue/AspScript совместимостью
interface VueAspScriptBridge {
  setup(): {
    aspInstance: ComponentInstance
    vueData: any
  }

  template: string
}
```

## Лучшие практики

### 1. Строгая типизация

```typescript
// ✅ Хорошо
interface User {
  readonly id: number
  name: string
  email: string
  readonly createdAt: Date
}

const user: Reactive<User> = $state({
  id: 1,
  name: 'John',
  email: 'john@example.com',
  createdAt: new Date()
})

// ❌ Избегать
const user = $state({
  id: 1,
  name: 'John',
  email: 'john@example.com',
  createdAt: new Date()
})
```

### 2. Типы для асинхронных операций

```typescript
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: Reactive<any>[] = []
): Reactive<AsyncState<T>> {
  const state = $state<AsyncState<T>>({
    data: null,
    loading: true,
    error: null
  })

  $: effect(async () => {
    try {
      state.value.loading = true
      state.value.data = await asyncFn()
      state.value.error = null
    } catch (error) {
      state.value.error = error.message
      state.value.data = null
    } finally {
      state.value.loading = false
    }
  })

  return state
}

// Использование
const userData = useAsync(() => fetchUser(currentUserId.value))
```

### 3. Utility типы

```typescript
// Утилиты для работы с реактивными типами
type UnwrapReactive<T> = T extends Reactive<infer U> ? U : T

type ReactiveKeys<T> = {
  [K in keyof T]: T[K] extends Reactive<any> ? K : never
}[keyof T]

type NonReactiveKeys<T> = {
  [K in keyof T]: T[K] extends Reactive<any> ? never : K
}[keyof T]

// Примеры использования
type UserReactive = {
  name: Reactive<string>
  age: number
  settings: Reactive<UserSettings>
}

type ReactiveProps = Pick<UserReactive, ReactiveKeys<UserReactive>>
type NonReactiveProps = Pick<UserReactive, NonReactiveKeys<UserReactive>>
```

## Troubleshooting

### Распространенные ошибки типизации

1. **Property 'value' does not exist on type 'Reactive'**
   ```typescript
   // ❌ Ошибка
   const count: Reactive<number> = $state(0)
   console.log(count + 1) // Ошибка

   // ✅ Правильно
   const count: Reactive<number> = $state(0)
   console.log(count.value + 1)
   ```

2. **Cannot assign to 'value' because it is a read-only property**
   ```typescript
   // Если используется readonly тип
   const count: Reactive<readonly number> = $state(0)
   count.value = 5 // Ошибка

   // Решение: используйте mutable типы для изменяемых данных
   const count: Reactive<number> = $state(0)
   count.value = 5 // OK
   ```

3. **Type inference issues**
   ```typescript
   // Помогите TypeScript с выводом типов
   const users = $state<User[]>([])
   const selectedUser = $computed(() =>
     users.value.find(u => u.id === selectedId.value)
   ) // selectedUser: Reactive<User | undefined>
   ```

## IDE поддержка

### VS Code настройки

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.preferences.preferTypeOnlyAutoImports": true,
  "aspscript.enable": true,
  "aspscript.validate.enable": true
}
```

### Расширения

- **AspScript Language Support** - подсветка синтаксиса .aspc файлов
- **TypeScript Importer** - автоматический импорт типов
- **AspScript Snippets** - сниппеты для быстрой разработки

---

TypeScript + AspScript = ❤️ Максимальная безопасность типов с минимальным boilerplate!
