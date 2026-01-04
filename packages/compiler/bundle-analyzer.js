/**
 * AspScript Bundle Analyzer
 * Анализатор размера бандла и оптимизаций
 */

const fs = require('fs')
const path = require('path')
const { optimizeBundle, createOptimizationReport } = require('./treeshaker')

/**
 * Анализирует бандл и создает отчет
 * @param {string} bundlePath - путь к бандлу
 * @param {Object} options - опции анализа
 * @returns {Object} анализ бандла
 */
function analyzeBundle(bundlePath, options = {}) {
  const {
    outputPath,
    format = 'console',
    openBrowser = false
  } = options

  console.log('🔍 Analyzing AspScript bundle...')

  try {
    // Читаем бандл
    const bundleContent = fs.readFileSync(bundlePath, 'utf-8')

    // Анализируем структуру
    const analysis = {
      size: {
        raw: bundleContent.length,
        gzipped: estimateGzipSize(bundleContent),
        human: {
          raw: formatBytes(bundleContent.length),
          gzipped: formatBytes(estimateGzipSize(bundleContent))
        }
      },
      chunks: [],
      dependencies: new Map(),
      features: new Map(),
      treeShaking: {}
    }

    // Анализируем chunks (если это multi-chunk бандл)
    analysis.chunks = analyzeChunks(bundleContent)

    // Анализируем зависимости
    analysis.dependencies = analyzeDependencies(bundleContent)

    // Анализируем использование фич
    analysis.features = analyzeFeatures(bundleContent)

    // Tree shaking анализ
    analysis.treeShaking = optimizeBundle([bundleContent])

    // Выводим отчет
    outputAnalysis(analysis, format, outputPath)

    if (openBrowser && format === 'html') {
      openBrowserReport(outputPath)
    }

    return analysis

  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message)
    throw error
  }
}

/**
 * Анализирует chunks в бандле
 * @param {string} content - содержимое бандла
 * @returns {Array} массив chunks
 */
function analyzeChunks(content) {
  const chunks = []

  // Ищем разделители chunks (webpack style)
  const chunkRegex = /\/\*!\s*chunk:\s*(\w+)\s*\*\//g
  let match

  while ((match = chunkRegex.exec(content)) !== null) {
    const chunkName = match[1]
    const start = match.index
    const end = content.indexOf('/*! chunk:', start + 1)

    const chunkContent = end > 0 ? content.slice(start, end) : content.slice(start)
    const size = chunkContent.length

    chunks.push({
      name: chunkName,
      size,
      sizeHuman: formatBytes(size),
      content: chunkContent.substring(0, 200) + (chunkContent.length > 200 ? '...' : '')
    })
  }

  // Если chunks не найдены, считаем весь бандл одним chunk
  if (chunks.length === 0) {
    chunks.push({
      name: 'main',
      size: content.length,
      sizeHuman: formatBytes(content.length),
      content: content.substring(0, 200) + '...'
    })
  }

  return chunks
}

/**
 * Анализирует зависимости в бандле
 * @param {string} content - содержимое бандла
 * @returns {Map} карта зависимостей
 */
function analyzeDependencies(content) {
  const dependencies = new Map()

  // Ищем импорты
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    const dep = match[1]
    dependencies.set(dep, (dependencies.get(dep) || 0) + 1)
  }

  // Ищем require
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((match = requireRegex.exec(content)) !== null) {
    const dep = match[1]
    dependencies.set(dep, (dependencies.get(dep) || 0) + 1)
  }

  return dependencies
}

/**
 * Анализирует использование фич AspScript
 * @param {string} content - содержимое бандла
 * @returns {Map} карта фич
 */
function analyzeFeatures(content) {
  const features = new Map()

  // AspScript API
  const apiFeatures = [
    '$state', '$computed', '$effect', '$global',
    'renderToString', 'renderToHTML', 'hydrate',
    'createFade', 'createSlide', 'animateElement',
    'lazy', 'Suspense'
  ]

  apiFeatures.forEach(feature => {
    const count = (content.match(new RegExp(`\\b${feature}\\b`, 'g')) || []).length
    if (count > 0) {
      features.set(feature, count)
    }
  })

  return features
}

/**
 * Оценивает размер после gzip сжатия
 * @param {string} content - содержимое
 * @returns {number} примерный размер после gzip
 */
function estimateGzipSize(content) {
  // Простая эвристика: gzip обычно сжимает на 60-80%
  // В реальности нужно использовать настоящий gzip
  const compressionRatio = 0.7
  return Math.round(content.length * compressionRatio)
}

/**
 * Форматирует байты в человекочитаемый вид
 * @param {number} bytes - количество байт
 * @returns {string} форматированная строка
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Выводит анализ в указанном формате
 * @param {Object} analysis - анализ бандла
 * @param {string} format - формат вывода
 * @param {string} outputPath - путь для сохранения
 */
function outputAnalysis(analysis, format, outputPath) {
  switch (format) {
    case 'json':
      outputJSON(analysis, outputPath)
      break
    case 'html':
      outputHTML(analysis, outputPath)
      break
    default:
      outputConsole(analysis)
  }
}

/**
 * Выводит анализ в консоль
 * @param {Object} analysis - анализ бандла
 */
function outputConsole(analysis) {
  console.log('\n📊 AspScript Bundle Analysis')
  console.log('='.repeat(40))

  console.log(`📏 Bundle Size:`)
  console.log(`  • Raw: ${analysis.size.human.raw}`)
  console.log(`  • Gzipped: ${analysis.size.human.gzipped}`)

  console.log(`\n📦 Chunks: ${analysis.chunks.length}`)
  analysis.chunks.forEach(chunk => {
    console.log(`  • ${chunk.name}: ${chunk.sizeHuman}`)
  })

  console.log(`\n📚 Dependencies: ${analysis.dependencies.size}`)
  for (const [dep, count] of analysis.dependencies) {
    console.log(`  • ${dep}: ${count} usage(s)`)
  }

  console.log(`\n⚡ AspScript Features: ${analysis.features.size}`)
  for (const [feature, count] of analysis.features) {
    console.log(`  • ${feature}: ${count} usage(s)`)
  }

  console.log(`\n🌳 Tree Shaking:`)
  console.log(createOptimizationReport(analysis.treeShaking))
}

/**
 * Сохраняет анализ в JSON
 * @param {Object} analysis - анализ бандла
 * @param {string} outputPath - путь для сохранения
 */
function outputJSON(analysis, outputPath) {
  const filePath = outputPath || 'bundle-analysis.json'
  fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2))
  console.log(`✅ Analysis saved to ${filePath}`)
}

/**
 * Создает HTML отчет
 * @param {Object} analysis - анализ бандла
 * @param {string} outputPath - путь для сохранения
 */
function outputHTML(analysis, outputPath) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AspScript Bundle Analysis</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0; color: #007acc; }
        .metric p { margin: 5px 0 0 0; color: #666; }
        .section { margin: 30px 0; }
        .section h2 { border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        .item { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .bar { background: #007acc; height: 20px; border-radius: 10px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AspScript Bundle Analysis</h1>
            <p>Detailed analysis of your bundle size and optimization opportunities</p>
        </div>

        <div class="metrics">
            <div class="metric">
                <h3>${analysis.size.human.raw}</h3>
                <p>Bundle Size</p>
            </div>
            <div class="metric">
                <h3>${analysis.size.human.gzipped}</h3>
                <p>Gzipped Size</p>
            </div>
            <div class="metric">
                <h3>${analysis.chunks.length}</h3>
                <p>Chunks</p>
            </div>
            <div class="metric">
                <h3>${analysis.features.size}</h3>
                <p>Features Used</p>
            </div>
        </div>

        <div class="section">
            <h2>📦 Chunks</h2>
            ${analysis.chunks.map(chunk => `
                <div class="item">
                    <strong>${chunk.name}</strong>
                    <span>${chunk.sizeHuman}</span>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📚 Dependencies</h2>
            ${Array.from(analysis.dependencies.entries()).map(([dep, count]) => `
                <div class="item">
                    <strong>${dep}</strong>
                    <span>${count} usage(s)</span>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>⚡ AspScript Features</h2>
            ${Array.from(analysis.features.entries()).map(([feature, count]) => `
                <div class="item">
                    <strong>${feature}</strong>
                    <span>${count} usage(s)</span>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🌳 Tree Shaking Analysis</h2>
            <pre>${createOptimizationReport(analysis.treeShaking)}</pre>
        </div>
    </div>
</body>
</html>`

  const filePath = outputPath || 'bundle-analysis.html'
  fs.writeFileSync(filePath, html)
  console.log(`✅ HTML report saved to ${filePath}`)
}

/**
 * Открывает HTML отчет в браузере
 * @param {string} filePath - путь к HTML файлу
 */
function openBrowserReport(filePath) {
  const { exec } = require('child_process')
  const fullPath = path.resolve(filePath)

  // Определяем команду для открытия браузера в зависимости от ОС
  const command = process.platform === 'darwin' ? `open ${fullPath}` :
                 process.platform === 'win32' ? `start ${fullPath}` :
                 `xdg-open ${fullPath}`

  exec(command, (error) => {
    if (error) {
      console.log(`Please open ${fullPath} in your browser`)
    }
  })
}

module.exports = {
  analyzeBundle,
  analyzeChunks,
  analyzeDependencies,
  analyzeFeatures,
  formatBytes
}
