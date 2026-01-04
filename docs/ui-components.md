# AspScript UI Components

Компонентная библиотека для быстрой разработки интерфейсов.

## Установка

```bash
npm install @aspscript/ui
```

## Button компонент

### Основное использование

```aspc
import { Button } from '@aspscript/ui'

---
// Базовый кнопка
---

<Button @click="handleClick">Нажми меня</Button>
```

### Варианты и размеры

```aspc
---
// Разные варианты кнопок
---

<div class="button-examples">
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="danger">Danger</Button>

  <Button size="small">Small</Button>
  <Button size="medium">Medium</Button>
  <Button size="large">Large</Button>
</div>
```

### Состояния

```aspc
---
// Кнопки с состояниями
---

<Button :disabled="formInvalid">Отправить</Button>
<Button :loading="isSubmitting">Загрузка...</Button>
```

### API

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger'` | `'primary'` | Визуальный стиль кнопки |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Размер кнопки |
| `disabled` | `boolean` | `false` | Отключена ли кнопка |
| `loading` | `boolean` | `false` | Показывать индикатор загрузки |
| `onClick` | `(event: Event) => void` | - | Обработчик клика |

#### События

- `@click` - клик по кнопке

## Input компонент

### Основное использование

```aspc
import { Input } from '@aspscript/ui'

---
// Базовое поле ввода
---

<Input #bind="username" placeholder="Введите имя" />
```

### С лейблом и валидацией

```aspc
---
// Полная форма ввода
---

<Input
  label="Email"
  type="email"
  #bind="email"
  placeholder="user@example.com"
  required
  :error="emailError"
/>
```

### Разные типы

```aspc
---
// Разные типы полей
---

<Input type="text" #bind="name" label="Имя" />
<Input type="email" #bind="email" label="Email" />
<Input type="password" #bind="password" label="Пароль" />
<Input type="number" #bind="age" label="Возраст" />
```

### API

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `'text'` | HTML тип input |
| `value` | `string` | `''` | Значение поля |
| `placeholder` | `string` | - | Placeholder текст |
| `label` | `string` | - | Текст лейбла |
| `error` | `string` | - | Текст ошибки |
| `disabled` | `boolean` | `false` | Отключено ли поле |
| `readonly` | `boolean` | `false` | Только чтение |
| `required` | `boolean` | `false` | Обязательное поле |

#### События

- `@input` - изменение значения
- `@focus` - получение фокуса
- `@blur` - потеря фокуса
- `@change` - подтверждение изменения

## Modal компонент

### Основное использование

```aspc
import { Modal } from '@aspscript/ui'

---
// Базовое модальное окно
---

<Button @click="showModal = true">Открыть модальное окно</Button>

<Modal :isOpen="showModal" title="Подтверждение" @close="showModal = false">
  <p>Вы уверены, что хотите продолжить?</p>
  <div class="modal-actions">
    <Button variant="secondary" @click="showModal = false">Отмена</Button>
    <Button variant="primary" @click="confirmAction">Подтвердить</Button>
  </div>
</Modal>
```

### Размеры и настройки

```aspc
---
// Модальные окна разных размеров
---

<Modal size="small" :isOpen="showSmall" title="Маленькое окно">
  Содержимое маленького модального окна
</Modal>

<Modal size="large" :isOpen="showLarge" title="Большое окно">
  Содержимое большого модального окна с большим количеством текста...
</Modal>

<Modal :backdrop="false" :isOpen="showNoBackdrop">
  Модальное окно без backdrop
</Modal>
```

### API

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Открыто ли модальное окно |
| `title` | `string` | - | Заголовок модального окна |
| `size` | `'small' \| 'medium' \| 'large' \| 'full'` | `'medium'` | Размер модального окна |
| `closable` | `boolean` | `true` | Можно ли закрыть окно |
| `backdrop` | `boolean` | `true` | Показывать backdrop |
| `onClose` | `() => void` | - | Обработчик закрытия |

#### События

- `@close` - закрытие модального окна

## Продвинутые примеры

### Форма с валидацией

```aspc
import { Input, Button, Modal } from '@aspscript/ui'

---
// Состояние формы
let formData = $state({
  name: '',
  email: '',
  password: ''
})

let errors = $state({})
let showSuccess = $state(false)

// Валидация
$: validateForm = () => {
  errors = {}

  if (!formData.name.trim()) {
    errors.name = 'Имя обязательно'
  }

  if (!formData.email.includes('@')) {
    errors.email = 'Неверный email'
  }

  if (formData.password.length < 6) {
    errors.password = 'Пароль слишком короткий'
  }

  return Object.keys(errors).length === 0
}

// Отправка формы
async function handleSubmit() {
  if (!validateForm()) return

  try {
    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 1000))

    showSuccess = true
    formData = { name: '', email: '', password: '' }
  } catch (error) {
    errors.general = 'Ошибка отправки формы'
  }
}
---

<div class="form-container">
  <h2>Регистрация</h2>

  <form @submit.prevent="handleSubmit">
    <Input
      label="Имя"
      #bind="formData.name"
      placeholder="Введите ваше имя"
      :error="errors.name"
      required
    />

    <Input
      label="Email"
      type="email"
      #bind="formData.email"
      placeholder="user@example.com"
      :error="errors.email"
      required
    />

    <Input
      label="Пароль"
      type="password"
      #bind="formData.password"
      placeholder="Минимум 6 символов"
      :error="errors.password"
      required
    />

    <div #if="errors.general" class="error-message">
      {errors.general}
    </div>

    <Button
      type="submit"
      variant="primary"
      size="large"
      :loading="isSubmitting"
    >
      Зарегистрироваться
    </Button>
  </form>

  <!-- Модальное окно успеха -->
  <Modal :isOpen="showSuccess" title="Успех!" @close="showSuccess = false">
    <p>Регистрация прошла успешно!</p>
    <Button @click="showSuccess = false">Закрыть</Button>
  </Modal>
</div>

<style>
.form-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.form-container h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}

.error-message {
  color: #dc2626;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #fef2f2;
  border-radius: 0.25rem;
  text-align: center;
}
</style>
```

### Динамический список с модальными окнами

```aspc
import { Button, Input, Modal } from '@aspscript/ui'

---
// Состояние приложения
let todos = $state([
  { id: 1, text: 'Изучить AspScript', done: false },
  { id: 2, text: 'Создать приложение', done: false }
])

let newTodo = $state('')
let editingId = $state(null)
let editingText = $state('')
let showDeleteConfirm = $state(false)
let deleteId = $state(null)

// Вычисляемые значения
$: completedCount = todos.filter(t => t.done).length
$: activeTodos = todos.filter(t => !t.done)

// Функции
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

function toggleTodo(id) {
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, done: !todo.done } : todo
  )
}

function startEditing(id, text) {
  editingId = id
  editingText = text
}

function saveEdit() {
  if (editingText.trim()) {
    todos = todos.map(todo =>
      todo.id === editingId ? { ...todo, text: editingText.trim() } : todo
    )
  }
  editingId = null
  editingText = ''
}

function confirmDelete(id) {
  deleteId = id
  showDeleteConfirm = true
}

function deleteTodo() {
  todos = todos.filter(todo => todo.id !== deleteId)
  showDeleteConfirm = false
  deleteId = null
}
---

<div class="todo-app">
  <h1>Список задач ({completedCount}/{todos.length})</h1>

  <!-- Форма добавления -->
  <div class="add-form">
    <Input
      #bind="newTodo"
      placeholder="Новая задача..."
      @keydown.enter="addTodo"
    />
    <Button @click="addTodo">Добавить</Button>
  </div>

  <!-- Список задач -->
  <div class="todo-list">
    <div #for="todo in todos" #key="todo.id" class="todo-item">
      <div class="todo-content">
        <input
          type="checkbox"
          :checked="todo.done"
          @change="toggleTodo(todo.id)"
        />

        <span
          #if="editingId !== todo.id"
          :class="{ 'todo-done': todo.done }"
          @dblclick="startEditing(todo.id, todo.text)"
        >
          {todo.text}
        </span>

        <Input
          #if="editingId === todo.id"
          #bind="editingText"
          @blur="saveEdit"
          @keydown.enter="saveEdit"
          @keydown.escape="editingId = null; editingText = ''"
        />
      </div>

      <div class="todo-actions">
        <Button
          size="small"
          variant="danger"
          @click="confirmDelete(todo.id)"
        >
          Удалить
        </Button>
      </div>
    </div>
  </div>

  <!-- Модальное окно подтверждения удаления -->
  <Modal
    :isOpen="showDeleteConfirm"
    title="Подтверждение удаления"
    @close="showDeleteConfirm = false"
  >
    <p>Вы уверены, что хотите удалить эту задачу?</p>
    <div class="modal-actions">
      <Button variant="secondary" @click="showDeleteConfirm = false">
        Отмена
      </Button>
      <Button variant="danger" @click="deleteTodo">
        Удалить
      </Button>
    </div>
  </Modal>
</div>

<style>
.todo-app {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.add-form > * {
  flex: 1;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  background: white;
}

.todo-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.todo-done {
  text-decoration: line-through;
  color: #6b7280;
}

.todo-actions {
  display: flex;
  gap: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
```

## Темизация

### Кастомные темы

```aspc
---
// Кастомная тема для компонентов
---

<style>
/* Переопределение переменных темы */
:root {
  --as-button-primary-bg: #8b5cf6;
  --as-button-primary-hover: #7c3aed;
  --as-input-border: #8b5cf6;
  --as-input-focus-border: #7c3aed;
  --as-modal-backdrop: rgba(139, 92, 246, 0.5);
}
</style>
```

### Темный режим

```aspc
---
// Темный режим
let isDark = $state(false)

$: effect(() => {
  document.documentElement.classList.toggle('dark', isDark)
})
---

<Button @click="isDark = !isDark">
  Переключить на {isDark ? 'светлую' : 'темную'} тему
</Button>

<!-- Компоненты автоматически адаптируются -->
<Button variant="primary">Primary Button</Button>
<Input label="Example" placeholder="Type here..." />
```

## Кастомизация стилей

### CSS переменные

```css
/* Переопределение через CSS переменные */
.as-button {
  --as-button-border-radius: 0.75rem;
  --as-button-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.as-input {
  --as-input-height: 3rem;
  --as-input-font-size: 1.125rem;
}
```

### Глобальные стили

```css
/* Глобальные переопределения */
.as-button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.as-modal {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
}
```

## Доступность (A11y)

Все компоненты библиотеки соответствуют WCAG 2.1 AA стандартам:

- Правильная семантическая разметка
- ARIA атрибуты
- Клавиатурная навигация
- Фокус индикация
- Экранный ридер поддержка

## Производительность

### Оптимизации

- CSS-in-JS подход для scoped стилей
- Ленивая загрузка компонентов
- Минимальный bundle size
- Tree-shaking поддержка

### Bundle анализ

```bash
# Анализ размера бандла
npm run build -- --analyze

# Проверка tree-shaking
npm run build -- --report
```

---

**AspScript UI Components - готовые блоки для быстрой разработки красивых интерфейсов!** 🎨
