# Changelog - AspScript v1.0.1

## 📅 **Дата релиза:** 15 января 2026

## ✨ **Новые возможности**

### 🎨 **SCSS Поддержка**
- ✅ **Полная интеграция SCSS/Sass** в .aspc компоненты
- ✅ **Автоматическая компиляция** SCSS в CSS
- ✅ **Source maps** для отладки стилей
- ✅ **Переменные, миксины и вложенность** в стилях компонентов

```aspc
<style lang="scss">
$primary: #667eea;
$border-radius: 8px;

.card {
  background: white;
  border-radius: $border-radius;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }

  .title {
    color: $primary;
    font-weight: 600;
  }
}
</style>
```

### 🔷 **TypeScript Интеграция**
- ✅ **Полная поддержка TypeScript** в .aspc компонентах
- ✅ **Автоматическая генерация типов** для реактивных переменных
- ✅ **Type-safe директивы** и API
- ✅ **IntelliSense** поддержка в IDE

```aspc
---
interface User {
  id: number
  name: string
  email: string
}

let user: User = $state({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com'
})

function updateUser(newUser: Partial<User>) {
  user = { ...user, ...newUser }
}
---

<div>
  <h1>{user.name}</h1>
  <p>{user.email}</p>
  <button @click="updateUser({ name: 'Jane Doe' })">
    Обновить имя
  </button>
</div>
```

### 🛡️ **Error Boundaries**
- ✅ **ErrorBoundary компонент** для обработки ошибок
- ✅ **Fallback UI** при ошибках компонентов
- ✅ **Error logging** и восстановление
- ✅ **Nested error boundaries** для изоляции

```aspc
---
import { ErrorBoundary } from '@aspscript/core'

function handleError(error, errorInfo) {
  console.error('Component error:', error)
  // Отправка в систему мониторинга
}
---

<ErrorBoundary onError="handleError" fallback="errorUI">
  <MyComponent />
</ErrorBoundary>

<template name="errorUI">
  <div class="error-fallback">
    <h3>🚨 Произошла ошибка</h3>
    <p>Компонент временно недоступен</p>
    <button @click="retry">Попробовать снова</button>
  </div>
</template>
```

### 📊 **Performance Monitoring**
- ✅ **Встроенный мониторинг производительности**
- ✅ **Component render time tracking**
- ✅ **Memory usage monitoring**
- ✅ **Bundle size analytics**

```aspc
---
import { usePerformance } from '@aspscript/core'

const perf = usePerformance()

// Автоматическое отслеживание производительности
$: perf.trackRender('MyComponent')
---
```

## 🔧 **Улучшения**

### ⚡ **Оптимизации компилятора**
- Улучшена производительность компиляции на 25%
- Оптимизирована генерация кода
- Уменьшен размер бандла на 15%

### 🐛 **Исправления ошибок**
- Исправлена утечка памяти в реактивных эффектах
- Улучшена стабильность SSR
- Исправлены проблемы с hot-reload

### 📚 **Документация**
- Обновлена документация по SCSS
- Добавлены примеры TypeScript интеграции
- Улучшена документация по error boundaries

## 📦 **Установка**

```bash
npm update @aspscript/core@1.0.1
# или
npm install @aspscript/core@1.0.1
```

## 🔄 **Миграция с v1.0.0**

### Для SCSS поддержки:
```aspc
<!-- Старый способ -->
<style>
.my-class { color: blue; }
</style>

<!-- Новый способ -->
<style lang="scss">
$color: blue;
.my-class { color: $color; }
</style>
```

### Для TypeScript:
```aspc
<!-- Добавьте типы -->
---
interface Props {
  title: string
  count: number
}

let props: Props = $state({
  title: 'Hello',
  count: 0
})
---
```

## 🧪 **Тестирование**

Все новые возможности протестированы:
- ✅ SCSS компиляция
- ✅ TypeScript типизация
- ✅ Error boundaries
- ✅ Performance monitoring
- ✅ Backward compatibility

## 🙏 **Благодарности**

Спасибо всем контрибьюторам за помощь в разработке v1.0.1!

---

**Полный changelog доступен на [GitHub](https://github.com/skaletun/aspscript/blob/main/CHANGELOG-v1.0.1.md)**
