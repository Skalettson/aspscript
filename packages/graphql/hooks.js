/**
 * AspScript GraphQL Hooks
 * Реактивные хуки для работы с GraphQL
 */

const { $state, $computed, $effect, onMount, onDestroy } = require('@aspscript/core')
const { getGlobalClient } = require('./client')

/**
 * Хук для GraphQL запросов
 * @param {string} query - GraphQL запрос
 * @param {Object} options - опции запроса
 * @returns {Object} реактивное состояние запроса
 */
function useQuery(query, options = {}) {
  const {
    variables = {},
    skip = false,
    pollInterval,
    notifyOnNetworkStatusChange = true,
    onCompleted,
    onError
  } = options

  // Реактивное состояние
  const data = $state(null)
  const loading = $state(false)
  const error = $state(null)
  const networkStatus = $state('idle')

  // Получаем клиент
  let client
  try {
    client = options.client || getGlobalClient()
  } catch (e) {
    // Клиент не установлен - будет ошибка при первом запросе
  }

  // Функция выполнения запроса
  const execute = async (overrideVariables = {}) => {
    if (!client) {
      error.value = new Error('GraphQL client not configured')
      return
    }

    if (skip) return

    try {
      loading.value = true
      error.value = null
      networkStatus.value = 'loading'

      const result = await client.request(query, { ...variables, ...overrideVariables })

      data.value = result
      loading.value = false
      networkStatus.value = 'ready'

      if (onCompleted) {
        onCompleted(result)
      }

    } catch (err) {
      error.value = err
      loading.value = false
      networkStatus.value = 'error'

      if (onError) {
        onError(err)
      }
    }
  }

  // Refetch функция
  const refetch = (newVariables = {}) => {
    return execute(newVariables)
  }

  // Автоматический запрос при монтировании
  onMount(() => {
    if (!skip) {
      execute()
    }

    // Настройка polling если указан интервал
    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(() => {
        if (!skip) {
          execute()
        }
      }, pollInterval)

      // Очистка при размонтировании
      onDestroy(() => clearInterval(interval))
    }
  })

  // Реактивный эффект для изменения переменных
  $effect(() => {
    // Перезапускаем запрос при изменении переменных
    if (!skip && client) {
      execute()
    }
  })

  return {
    data: $computed(() => data.value),
    loading: $computed(() => loading.value),
    error: $computed(() => error.value),
    networkStatus: $computed(() => networkStatus.value),
    refetch,
    execute
  }
}

/**
 * Хук для GraphQL мутаций
 * @param {string} mutation - GraphQL мутация
 * @param {Object} options - опции мутации
 * @returns {Array} [mutateFunction, mutationResult]
 */
function useMutation(mutation, options = {}) {
  const {
    onCompleted,
    onError,
    update
  } = options

  // Состояние мутации
  const data = $state(null)
  const loading = $state(false)
  const error = $state(null)
  const called = $state(false)

  // Получаем клиент
  let client
  try {
    client = options.client || getGlobalClient()
  } catch (e) {
    // Клиент не установлен
  }

  // Функция мутации
  const mutate = async (variables = {}) => {
    if (!client) {
      throw new Error('GraphQL client not configured')
    }

    try {
      loading.value = true
      error.value = null
      called.value = true

      const result = await client.mutate(mutation, variables)

      data.value = result
      loading.value = false

      // Вызываем update функцию для обновления кеша
      if (update) {
        update(result, variables)
      }

      if (onCompleted) {
        onCompleted(result, variables)
      }

      return result

    } catch (err) {
      error.value = err
      loading.value = false

      if (onError) {
        onError(err, variables)
      }

      throw err
    }
  }

  return [
    mutate,
    {
      data: $computed(() => data.value),
      loading: $computed(() => loading.value),
      error: $computed(() => error.value),
      called: $computed(() => called.value)
    }
  ]
}

/**
 * Хук для GraphQL подписок
 * @param {string} subscription - GraphQL подписка
 * @param {Object} options - опции подписки
 * @returns {Object} состояние подписки
 */
function useSubscription(subscription, options = {}) {
  const {
    variables = {},
    skip = false,
    onData,
    onError
  } = options

  // Состояние подписки
  const data = $state(null)
  const loading = $state(false)
  const error = $state(null)

  let unsubscribe = null

  // Получаем клиент
  let client
  try {
    client = options.client || getGlobalClient()
  } catch (e) {
    // Клиент не установлен
  }

  // Callback для данных
  const handleData = (newData) => {
    data.value = newData
    loading.value = false

    if (onData) {
      onData(newData)
    }
  }

  // Callback для ошибок
  const handleError = (err) => {
    error.value = err
    loading.value = false

    if (onError) {
      onError(err)
    }
  }

  // Эффект для управления подпиской
  $effect(() => {
    if (!client || skip) {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      return
    }

    // Отписываемся от предыдущей подписки
    if (unsubscribe) {
      unsubscribe()
    }

    // Начинаем новую подписку
    loading.value = true
    unsubscribe = client.subscribe(subscription, variables, handleData)
  })

  // Очистка при размонтировании
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  return {
    data: $computed(() => data.value),
    loading: $computed(() => loading.value),
    error: $computed(() => error.value)
  }
}

/**
 * Хук для ленивых запросов
 * @param {string} query - GraphQL запрос
 * @param {Object} options - опции
 * @returns {Array} [executeFunction, queryResult]
 */
function useLazyQuery(query, options = {}) {
  const {
    onCompleted,
    onError
  } = options

  // Используем useQuery но с skip: true
  const queryResult = useQuery(query, {
    ...options,
    skip: true,
    onCompleted,
    onError
  })

  // Функция выполнения
  const execute = (variables = {}) => {
    return queryResult.execute(variables)
  }

  return [execute, queryResult]
}

/**
 * Хук для работы с Apollo Client (опционально)
 * @param {Object} options - опции Apollo
 * @returns {Object} Apollo hooks
 */
function useApollo(options = {}) {
  // Проверяем наличие Apollo Client
  let ApolloClient
  try {
    ApolloClient = require('@apollo/client')
  } catch (e) {
    throw new Error('Apollo Client not installed. Run: npm install @apollo/client')
  }

  const {
    useQuery: apolloUseQuery,
    useMutation: apolloUseMutation,
    useSubscription: apolloUseSubscription,
    useLazyQuery: apolloUseLazyQuery
  } = ApolloClient

  // Адаптеры для совместимости с AspScript реактивностью
  const adaptedUseQuery = (query, options = {}) => {
    const apolloResult = apolloUseQuery(query, options)

    // Конвертируем в AspScript реактивность
    return {
      data: $computed(() => apolloResult.data),
      loading: $computed(() => apolloResult.loading),
      error: $computed(() => apolloResult.error),
      refetch: apolloResult.refetch,
      fetchMore: apolloResult.fetchMore
    }
  }

  const adaptedUseMutation = (mutation, options = {}) => {
    const [mutate, result] = apolloUseMutation(mutation, options)

    const adaptedMutate = async (variables) => {
      const apolloResult = await mutate({ variables })
      return apolloResult
    }

    return [
      adaptedMutate,
      {
        data: $computed(() => result.data),
        loading: $computed(() => result.loading),
        error: $computed(() => result.error),
        called: $computed(() => result.called)
      }
    ]
  }

  const adaptedUseSubscription = (subscription, options = {}) => {
    const apolloResult = apolloUseSubscription(subscription, options)

    return {
      data: $computed(() => apolloResult.data),
      loading: $computed(() => apolloResult.loading),
      error: $computed(() => apolloResult.error)
    }
  }

  const adaptedUseLazyQuery = (query, options = {}) => {
    const [execute, result] = apolloUseLazyQuery(query, options)

    return [
      execute,
      {
        data: $computed(() => result.data),
        loading: $computed(() => result.loading),
        error: $computed(() => result.error),
        called: $computed(() => result.called)
      }
    ]
  }

  return {
    useQuery: adaptedUseQuery,
    useMutation: adaptedUseMutation,
    useSubscription: adaptedUseSubscription,
    useLazyQuery: adaptedUseLazyQuery
  }
}

/**
 * Компонент высшего порядка для GraphQL
 * @param {string} query - GraphQL запрос
 * @param {Object} options - опции
 * @returns {Function} HOC
 */
function graphql(query, options = {}) {
  return function GraphQLWrapper(Component) {
    return function GraphQLComponent(props = {}) {
      const queryResult = useQuery(query, {
        ...options,
        variables: { ...options.variables, ...props }
      })

      return Component({
        ...props,
        ...queryResult
      })
    }
  }
}

module.exports = {
  useQuery,
  useMutation,
  useSubscription,
  useLazyQuery,
  useApollo,
  graphql
}
