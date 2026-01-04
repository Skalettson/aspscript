/**
 * AspScript UI Component Library
 * Коллекция готовых UI компонентов
 */

// Импорт скомпилированных компонентов
const Button = require('./Button.js')
const Input = require('./Input.js')
const Modal = require('./Modal.js')

// Экспорт компонентов
module.exports = {
  Button,
  Input,
  Modal,

  // Вспомогательные функции
  install(app) {
    // Регистрация глобальных компонентов
    if (app && app.component) {
      app.component('AsButton', Button)
      app.component('AsInput', Input)
      app.component('AsModal', Modal)
    }
  }
}

// Индивидуальный экспорт
module.exports.Button = Button
module.exports.Input = Input
module.exports.Modal = Modal
