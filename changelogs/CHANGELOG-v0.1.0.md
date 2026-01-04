# AspScript v0.1.0 (MVP) - Initial Release

> Release Date: January 2026

## 🎉 First Public Release

Welcome to AspScript - the revolutionary compile-time framework! This MVP release introduces the core concepts and basic functionality.

## ✨ Added

### Core Features
- **Single-file Components** (`.aspc` files) - Markup, logic, and styles in one file
- **Basic Reactivity System** - `$state()` for reactive variables
- **Template Directives** - `#if`, `#for`, `:bind` directives
- **Scoped CSS** - Automatic CSS scoping per component
- **Basic CLI** - `aspc compile` command for building components

### Examples
- **Counter Example** - Basic reactive counter component
- **Todo App Example** - Simple todo application

### Documentation
- **Basic README** - Framework introduction and examples
- **API Documentation** - Core API reference

## 🏗️ Architecture

- **Compiler Core** - Basic AST parsing and code generation
- **Package Structure** - Monorepo with core, compiler, and CLI packages
- **Build System** - Basic compilation pipeline

## 🔧 Technical Details

- **File Format**: `.aspc` files with frontmatter syntax
- **Compilation Target**: ES5+ compatible JavaScript
- **CSS Output**: Scoped CSS with component hashes
- **Bundle Size**: ~8KB minified core

## 📦 Installation

```bash
npm install @aspscript/core @aspscript/compiler @aspscript/cli
```

## 🚀 Quick Start

```aspc
---
let count = $state(0)
---

<div>
  <p>Count: {count}</p>
  <button @click="count++">Increment</button>
</div>

<style>
div { text-align: center; padding: 2rem; }
</style>
```

## 🤝 Contributing

This is the first release! We're looking for feedback and contributions. Please:

- Try the examples
- Report bugs on GitHub
- Suggest new features
- Help with documentation

## 🙏 Acknowledgments

Special thanks to:
- The JavaScript community for inspiration
- Early adopters who tested the MVP
- Contributors who helped shape the initial API

---

**AspScript v0.1.0** - The journey begins! 🚀
