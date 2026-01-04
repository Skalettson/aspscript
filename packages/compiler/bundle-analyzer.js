/**
 * AspScript Bundle Analyzer
 * Анализ размера и структуры бандла
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { gzipSync } from 'zlib'

/**
 * Анализирует бандл
 * @param {string} bundlePath - путь к бандлу
 * @param {Object} options - опции анализа
 */
export function analyzeBundle(bundlePath, options = {}) {
  const {
    outputPath,
    format = 'console',
    openBrowser = false
  } = options

  console.log('📊 Analyzing bundle...\n')

  if (!existsSync(bundlePath)) {
    throw new Error(`Bundle file not found: ${bundlePath}`)
  }

  // Читаем бандл
  const content = readFileSync(bundlePath, 'utf-8')
  const size = Buffer.byteLength(content, 'utf-8')
  const gzipped = gzipSync(content)
  const gzippedSize = gzipped.length

  // Анализируем структуру
  const analysis = {
    file: bundlePath,
    size,
    gzippedSize,
    compressionRatio: (1 - gzippedSize / size) * 100,
    lines: content.split('\n').length,
    
    // Анализ импортов
    imports: analyzeImports(content),
    
    // Анализ функций
    functions: analyzeFunctions(content),
    
    // Анализ комментариев
    comments: analyzeComments(content),
    
    // Оценка неиспользуемого кода
    unusedCode: estimateUnusedCode(content)
  }

  // Вывод результатов
  if (format === 'console') {
    printConsoleReport(analysis)
  } else if (format === 'json') {
    const json = JSON.stringify(analysis, null, 2)
    if (outputPath) {
      writeFileSync(outputPath, json)
      console.log(`✅ Analysis saved to ${outputPath}`)
    } else {
      console.log(json)
    }
  } else if (format === 'html') {
    const html = generateHtmlReport(analysis)
    if (outputPath) {
      writeFileSync(outputPath, html)
      console.log(`✅ HTML report saved to ${outputPath}`)
      
      if (openBrowser) {
        // Открываем в браузере
        import('child_process').then(({ exec }) => {
          const command = process.platform === 'darwin' ? 'open' :
                         process.platform === 'win32' ? 'start' : 'xdg-open'
          exec(`${command} ${outputPath}`)
        })
      }
    }
  }

  return analysis
}

/**
 * Анализирует импорты
 */
function analyzeImports(content) {
  const importRegex = /import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]/g
  const imports = []
  let match

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return {
    count: imports.length,
    modules: [...new Set(imports)]
  }
}

/**
 * Анализирует функции
 */
function analyzeFunctions(content) {
  const functionRegex = /function\s+(\w+)\s*\(/g
  const arrowRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g
  
  const functions = []
  let match

  while ((match = functionRegex.exec(content)) !== null) {
    functions.push({ name: match[1], type: 'function' })
  }

  while ((match = arrowRegex.exec(content)) !== null) {
    functions.push({ name: match[1], type: 'arrow' })
  }

  return {
    count: functions.length,
    functions
  }
}

/**
 * Анализирует комментарии
 */
function analyzeComments(content) {
  const singleLineComments = (content.match(/\/\/.*/g) || []).length
  const multiLineComments = (content.match(/\/\*[\s\S]*?\*\//g) || []).length
  
  return {
    singleLine: singleLineComments,
    multiLine: multiLineComments,
    total: singleLineComments + multiLineComments
  }
}

/**
 * Оценивает неиспользуемый код
 */
function estimateUnusedCode(content) {
  // Простая эвристика
  const totalLines = content.split('\n').length
  const codeLines = content.split('\n').filter(line => 
    line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')
  ).length

  // Оценка на основе комментариев и пустых строк
  const estimatedUnused = totalLines - codeLines

  return {
    estimatedLines: estimatedUnused,
    percentage: (estimatedUnused / totalLines * 100).toFixed(2)
  }
}

/**
 * Выводит отчет в консоль
 */
function printConsoleReport(analysis) {
  console.log('📦 Bundle Analysis Results')
  console.log('=' .repeat(50))
  console.log()
  console.log(`📁 File: ${analysis.file}`)
  console.log(`📊 Size: ${formatBytes(analysis.size)}`)
  console.log(`🗜️  Gzipped: ${formatBytes(analysis.gzippedSize)} (${analysis.compressionRatio.toFixed(1)}% compression)`)
  console.log(`📝 Lines: ${analysis.lines}`)
  console.log()
  console.log('📦 Imports:')
  console.log(`   Count: ${analysis.imports.count}`)
  console.log(`   Unique modules: ${analysis.imports.modules.length}`)
  console.log()
  console.log('⚙️  Functions:')
  console.log(`   Count: ${analysis.functions.count}`)
  console.log()
  console.log('💬 Comments:')
  console.log(`   Single-line: ${analysis.comments.singleLine}`)
  console.log(`   Multi-line: ${analysis.comments.multiLine}`)
  console.log()
  console.log('🧹 Unused Code (estimated):')
  console.log(`   Lines: ${analysis.unusedCode.estimatedLines}`)
  console.log(`   Percentage: ${analysis.unusedCode.percentage}%`)
  console.log()
  
  // Рекомендации
  console.log('💡 Recommendations:')
  if (analysis.size > 500 * 1024) {
    console.log('   ⚠️  Bundle is large (>500KB). Consider code splitting.')
  }
  if (analysis.imports.count > 20) {
    console.log('   ⚠️  Many imports detected. Review dependencies.')
  }
  if (parseFloat(analysis.unusedCode.percentage) > 20) {
    console.log('   ⚠️  High percentage of unused code. Run tree-shaking.')
  }
  console.log()
}

/**
 * Генерирует HTML отчет
 */
function generateHtmlReport(analysis) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bundle Analysis - ${analysis.file}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 2rem;
    }
    h1 { color: #333; margin-bottom: 1rem; }
    .metric {
      display: inline-block;
      margin: 1rem;
      padding: 1rem;
      background: #f0f0f0;
      border-radius: 4px;
      min-width: 200px;
    }
    .metric-label { font-size: 0.875rem; color: #666; }
    .metric-value { font-size: 1.5rem; font-weight: bold; color: #333; margin-top: 0.5rem; }
    .section { margin: 2rem 0; }
    .section-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 1rem; color: #555; }
    ul { list-style: none; }
    li { padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    .recommendation { background: #fff3cd; padding: 1rem; border-left: 4px solid #ffc107; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Bundle Analysis Report</h1>
    <p><strong>File:</strong> ${analysis.file}</p>
    
    <div class="section">
      <div class="metric">
        <div class="metric-label">Bundle Size</div>
        <div class="metric-value">${formatBytes(analysis.size)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Gzipped Size</div>
        <div class="metric-value">${formatBytes(analysis.gzippedSize)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Compression</div>
        <div class="metric-value">${analysis.compressionRatio.toFixed(1)}%</div>
      </div>
      <div class="metric">
        <div class="metric-label">Lines of Code</div>
        <div class="metric-value">${analysis.lines}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📦 Imports</div>
      <p>Total imports: ${analysis.imports.count}</p>
      <p>Unique modules: ${analysis.imports.modules.length}</p>
      <ul>
        ${analysis.imports.modules.slice(0, 10).map(m => `<li>${m}</li>`).join('')}
        ${analysis.imports.modules.length > 10 ? `<li>... and ${analysis.imports.modules.length - 10} more</li>` : ''}
      </ul>
    </div>

    <div class="section">
      <div class="section-title">⚙️ Functions</div>
      <p>Total functions: ${analysis.functions.count}</p>
    </div>

    <div class="section">
      <div class="section-title">💡 Recommendations</div>
      ${analysis.size > 500 * 1024 ? '<div class="recommendation">⚠️ Bundle is large (>500KB). Consider code splitting.</div>' : ''}
      ${analysis.imports.count > 20 ? '<div class="recommendation">⚠️ Many imports detected. Review dependencies.</div>' : ''}
      ${parseFloat(analysis.unusedCode.percentage) > 20 ? '<div class="recommendation">⚠️ High percentage of unused code. Run tree-shaking.</div>' : ''}
    </div>
  </div>
</body>
</html>`
}

/**
 * Форматирует байты в читаемый формат
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default { analyzeBundle }
