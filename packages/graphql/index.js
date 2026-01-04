/**
 * AspScript GraphQL Integration
 * Полная интеграция GraphQL для AspScript
 */

const {
  GraphQLClient,
  GraphQLError,
  createClient,
  setGlobalClient,
  getGlobalClient,
  gql
} = require('./client')

const {
  useQuery,
  useMutation,
  useSubscription,
  useLazyQuery,
  useApollo,
  graphql
} = require('./hooks')

module.exports = {
  // Клиент
  GraphQLClient,
  GraphQLError,
  createClient,
  setGlobalClient,
  getGlobalClient,
  gql,

  // Хуки
  useQuery,
  useMutation,
  useSubscription,
  useLazyQuery,
  useApollo,
  graphql
}
