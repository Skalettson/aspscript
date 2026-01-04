/**
 * AspScript Microfrontends
 * Полная поддержка микрофронтендов
 */

const {
  ModuleFederation,
  FederationManager,
  createModuleFederation,
  globalFederationManager
} = require('./federation')

const {
  MicrofrontendsOrchestrator,
  createOrchestrator,
  globalOrchestrator
} = require('./orchestrator')

module.exports = {
  // Module Federation
  ModuleFederation,
  FederationManager,
  createModuleFederation,
  globalFederationManager,

  // Orchestrator
  MicrofrontendsOrchestrator,
  createOrchestrator,
  globalOrchestrator
}
