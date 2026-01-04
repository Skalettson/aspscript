/**
 * AspScript React Native Adapter
 * Адаптер для запуска AspScript компонентов в React Native
 */

const React = require('react')
const { View, Text, TextInput, TouchableOpacity, ScrollView } = require('react-native')

/**
 * Преобразует AspScript компонент в React Native компонент
 * @param {Function} aspscriptComponent - AspScript компонент
 * @returns {React.Component} React Native компонент
 */
function adaptToReactNative(aspscriptComponent) {
  return class AspScriptNativeComponent extends React.Component {
    constructor(props) {
      super(props)

      // Инициализируем AspScript компонент
      this.aspInstance = aspscriptComponent(props)
      this.state = {}

      // Биндим методы
      this.updateState = this.updateState.bind(this)
    }

    componentDidMount() {
      // Вызываем AspScript onMount если есть
      if (this.aspInstance.onMount) {
        this.aspInstance.onMount()
      }
    }

    componentWillUnmount() {
      // Вызываем AspScript onDestroy если есть
      if (this.aspInstance.onDestroy) {
        this.aspInstance.onDestroy()
      }
    }

    componentDidUpdate(prevProps) {
      // Обновляем AspScript компонент при изменении пропсов
      if (JSON.stringify(prevProps) !== JSON.stringify(this.props)) {
        this.aspInstance = aspscriptComponent(this.props)
        this.forceUpdate()
      }
    }

    updateState(newState) {
      this.setState(newState)
    }

    render() {
      // Получаем рендер функцию от AspScript
      const renderResult = this.aspInstance.render()

      // Если результат - строка, парсим как JSX-подобный синтаксис
      if (typeof renderResult === 'string') {
        return this.parseAspScriptJSX(renderResult)
      }

      // Если результат - объект с render методом
      if (renderResult && typeof renderResult.render === 'function') {
        return this.parseAspScriptJSX(renderResult.render())
      }

      return null
    }

    /**
     * Парсит AspScript JSX-подобный синтаксис в React Native компоненты
     * @param {string} jsxString - JSX строка
     * @returns {React.Element} React Native элемент
     */
    parseAspScriptJSX(jsxString) {
      // Упрощенная реализация парсера
      // В продакшене нужна полноценная JSX трансформация

      try {
        // Заменяем AspScript директивы на React Native эквиваленты
        let processed = jsxString

        // Преобразуем HTML теги в React Native компоненты
        processed = processed.replace(/<div([^>]*)>(.*?)<\/div>/gs, (match, attrs, content) => {
          return `<View${attrs}>${content}</View>`
        })

        processed = processed.replace(/<span([^>]*)>(.*?)<\/span>/gs, (match, attrs, content) => {
          return `<Text${attrs}>${content}</Text>`
        })

        processed = processed.replace(/<button([^>]*)>(.*?)<\/button>/gs, (match, attrs, content) => {
          return `<TouchableOpacity${attrs}>${content}</TouchableOpacity>`
        })

        processed = processed.replace(/<input([^>]*)\/?>/gs, (match, attrs) => {
          return `<TextInput${attrs} />`
        })

        processed = processed.replace(/<p([^>]*)>(.*?)<\/p>/gs, (match, attrs, content) => {
          return `<Text${attrs}>${content}</Text>`
        })

        processed = processed.replace(/<h1([^>]*)>(.*?)<\/h1>/gs, (match, attrs, content) => {
          return `<Text style={{fontSize: 24, fontWeight: 'bold'}}${attrs}>${content}</Text>`
        })

        processed = processed.replace(/<h2([^>]*)>(.*?)<\/h2>/gs, (match, attrs, content) => {
          return `<Text style={{fontSize: 20, fontWeight: 'bold'}}${attrs}>${content}</Text>`
        })

        // Преобразуем атрибуты стилей
        processed = processed.replace(/class="([^"]*)"/g, (match, className) => {
          return `style={styles.${className}}`
        })

        processed = processed.replace(/style="([^"]*)"/g, (match, styleString) => {
          // Упрощенная конвертация CSS в React Native стили
          const rnStyle = convertCssToReactNative(styleString)
          return `style={${JSON.stringify(rnStyle)}}`
        })

        // Преобразуем обработчики событий
        processed = processed.replace(/@click="([^"]*)"/g, 'onPress={() => $1}')
        processed = processed.replace(/@change="([^"]*)"/g, 'onChangeText={(text) => $1}')

        // Создаем функцию рендера
        const renderFunction = new Function('React', 'View', 'Text', 'TextInput', 'TouchableOpacity', 'ScrollView', 'props', 'state', `
          const { ${Object.keys(this.props).join(', ')} } = props
          return ${processed}
        `)

        return renderFunction(
          React, View, Text, TextInput, TouchableOpacity, ScrollView,
          this.props, this.state
        )

      } catch (error) {
        console.error('React Native JSX parsing error:', error)
        return React.createElement(Text, {}, 'Render Error')
      }
    }
  }
}

/**
 * Конвертирует CSS стили в React Native стили
 * @param {string} cssString - CSS строка
 * @returns {Object} React Native стили
 */
function convertCssToReactNative(cssString) {
  const rnStyles = {}

  // Разбираем CSS свойства
  const properties = cssString.split(';').filter(p => p.trim())

  properties.forEach(property => {
    const [key, value] = property.split(':').map(s => s.trim())

    if (!key || !value) return

    // Конвертируем CSS свойства в camelCase React Native свойства
    switch (key) {
      case 'background-color':
        rnStyles.backgroundColor = value
        break
      case 'color':
        rnStyles.color = value
        break
      case 'font-size':
        rnStyles.fontSize = parseInt(value)
        break
      case 'font-weight':
        rnStyles.fontWeight = value
        break
      case 'padding':
        rnStyles.padding = parseInt(value)
        break
      case 'margin':
        rnStyles.margin = parseInt(value)
        break
      case 'border-radius':
        rnStyles.borderRadius = parseInt(value)
        break
      case 'width':
        rnStyles.width = value.includes('%') ? value : parseInt(value)
        break
      case 'height':
        rnStyles.height = value.includes('%') ? value : parseInt(value)
        break
      case 'display':
        // Игнорируем display в React Native
        break
      default:
        rnStyles[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value
    }
  })

  return rnStyles
}

/**
 * Создает стили для компонента
 * @param {Object} styles - объект стилей
 * @returns {Object} React Native StyleSheet
 */
function createStyles(styles) {
  const StyleSheet = require('react-native').StyleSheet

  // Конвертируем CSS-in-JS в React Native StyleSheet
  const rnStyles = {}

  Object.entries(styles).forEach(([key, value]) => {
    if (typeof value === 'object') {
      rnStyles[key] = convertCssToReactNative(
        Object.entries(value)
          .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
          .join(';')
      )
    }
  })

  return StyleSheet.create(rnStyles)
}

/**
 * Регистрирует AspScript компонент как нативный
 * @param {string} name - имя компонента
 * @param {Function} component - AspScript компонент
 */
function registerNativeComponent(name, component) {
  const ReactNativeComponent = adaptToReactNative(component)

  // Сохраняем в глобальном реестре
  if (!global.__aspscript_native_components) {
    global.__aspscript_native_components = {}
  }

  global.__aspscript_native_components[name] = ReactNativeComponent
}

/**
 * Получает зарегистрированный нативный компонент
 * @param {string} name - имя компонента
 * @returns {React.Component} нативный компонент
 */
function getNativeComponent(name) {
  return global.__aspscript_native_components?.[name]
}

module.exports = {
  adaptToReactNative,
  createStyles,
  registerNativeComponent,
  getNativeComponent,
  convertCssToReactNative
}
