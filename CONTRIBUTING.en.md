# Contributing to AspScript

Welcome! 🎉 We're excited that you're interested in contributing to AspScript. This document will help you get started with contributing to this revolutionary web framework.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Documentation](#documentation)
- [Community](#community)

## 🤝 Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:

- **Be respectful** - Treat everyone with respect and kindness
- **Be inclusive** - Welcome people from all backgrounds and experiences
- **Be collaborative** - Work together to achieve common goals
- **Be patient** - Understand that everyone has different levels of experience
- **Be constructive** - Provide helpful feedback and focus on solutions

## 🌟 Ways to Contribute

There are many ways to contribute to AspScript:

### 💻 Code Contributions
- **Core Framework** - Compiler, reactivity system, SSR
- **Packages** - UI components, GraphQL client, testing utilities
- **Tools** - CLI, Vite plugin, build tools
- **Documentation** - Guides, examples, API docs

### 📚 Non-Code Contributions
- **Bug Reports** - Help us identify and fix issues
- **Feature Requests** - Suggest new capabilities
- **Documentation** - Improve guides and examples
- **Tutorials** - Create learning content
- **Testing** - Test new features and report issues
- **Community Support** - Help other developers
- **Translations** - Translate documentation
- **Design** - UI/UX improvements

### 🐛 Reporting Bugs

Found a bug? Please [open an issue](https://github.com/aspscript/framework/issues) with:

- Clear title describing the issue
- Detailed description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment info (OS, Node.js version, etc.)
- Code examples or screenshots

### 💡 Feature Requests

Have an idea for a new feature? [Create an issue](https://github.com/aspscript/framework/issues) with:

- Clear description of the feature
- Use case and benefits
- Implementation suggestions (optional)
- Related issues or discussions

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **Git** for version control
- **VS Code** with recommended extensions (optional)

### Quick Setup

```bash
# Fork the repository
git clone https://github.com/skaletun/aspscript.git
cd aspscript

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## 🛠️ Development Setup

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/aspscript/framework.git
   cd framework
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Git hooks** (recommended)
   ```bash
   npm run prepare
   ```

### Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build all packages
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
npm run format       # Format code

# Specific packages
npm run build:core   # Build core package
npm run test:core    # Test core package
npm run dev:ui       # Develop UI components
```

### IDE Setup

For the best development experience:

1. **VS Code Extensions**:
   - TypeScript and JavaScript Language Features
   - Prettier - Code formatter
   - ESLint
   - GitLens
   - AspScript (if available)

2. **Settings**:
   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "typescript.preferences.importModuleSpecifier": "relative"
   }
   ```

## 🏗️ Project Structure

```
aspscript/
├── packages/                 # Monorepo packages
│   ├── core/                # Core reactivity & SSR
│   ├── compiler/            # AspScript compiler
│   ├── ui/                  # UI component library
│   ├── graphql/             # GraphQL integration
│   ├── testing/             # Testing utilities
│   └── ...
├── examples/                # Example applications
├── docs/                    # Documentation
├── scripts/                 # Build and dev scripts
├── .github/                 # GitHub configuration
├── CHANGELOG-*.md          # Version changelogs
└── README.md               # Main documentation
```

### Key Directories

- **`packages/core/`** - Core reactivity system, SSR, animations
- **`packages/compiler/`** - `.aspc` file compilation
- **`packages/ui/`** - Reusable UI components
- **`packages/graphql/`** - GraphQL client and hooks
- **`packages/testing/`** - Testing utilities and frameworks
- **`examples/`** - Working examples and demos
- **`docs/`** - Documentation and guides

## 📝 Coding Standards

### Code Style

We use modern JavaScript/TypeScript with these standards:

- **ES2020+** features (with transpilation)
- **TypeScript** for type safety
- **Functional programming** principles where appropriate
- **Descriptive variable names** and clear comments

### Formatting

Code is automatically formatted with Prettier:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `reactive-state.ts`)
- **Functions**: `camelCase` (e.g., `createReactiveState`)
- **Classes**: `PascalCase` (e.g., `ReactiveState`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Types**: `PascalCase` (e.g., `ReactiveValue<T>`)

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Testing
- `chore:` - Maintenance

Examples:
```
feat(compiler): add support for async components
fix(ssr): resolve hydration mismatch in streaming
docs(api): update reactivity guide
```

## 🧪 Testing

### Test Structure

Tests are organized by package and type:

```
packages/core/__tests__/
├── reactivity.test.js
├── ssr.test.js
└── animations.test.js

packages/compiler/__tests__/
├── parser.test.js
└── transformer.test.js
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm run test:core
npm run test:compiler

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Writing Tests

Use the comprehensive testing framework:

```javascript
import { render, fireEvent, waitFor } from '@aspscript/testing'

describe('MyComponent', () => {
  test('renders correctly', () => {
    const { container } = render(MyComponent, { prop: 'value' })
    expect(container.textContent).toContain('expected text')
  })

  test('handles user interaction', async () => {
    const { findByText } = render(MyComponent)
    const button = findByText('Click me')

    fireEvent(button, 'click')

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled()
    })
  })
})
```

### Test Coverage

Maintain high test coverage:
- **Core packages**: 95%+ coverage
- **UI components**: 90%+ coverage
- **Integration tests**: Critical paths covered

## 🔄 Submitting Changes

### Development Workflow

1. **Choose an issue** or create one
2. **Create a branch** from `main`
3. **Make changes** following coding standards
4. **Write tests** for new functionality
5. **Run tests** and ensure they pass
6. **Update documentation** if needed
7. **Commit changes** with conventional commits
8. **Push branch** and create pull request

### Branch Naming

```
feature/short-description
fix/issue-number-description
docs/update-guide
chore/update-dependencies
```

Examples:
```
feature/add-async-components
fix/123-hydration-bug
docs/update-ssr-guide
```

### Pull Request Process

1. **Create PR** from your branch to `main`
2. **Fill PR template** with:
   - Clear title and description
   - Link to related issue
   - Breaking changes (if any)
   - Testing instructions

3. **Code Review**:
   - Address reviewer feedback
   - Ensure CI passes
   - Get approval from maintainers

4. **Merge**:
   - Squash merge for clean history
   - Delete branch after merge

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement

## Related Issues
Fixes #123

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Breaking Changes
List any breaking changes and migration guide
```

## 📚 Documentation

### Documentation Types

- **API Docs** - Auto-generated from JSDoc comments
- **Guides** - User-facing documentation
- **Examples** - Working code examples
- **Changelogs** - Version change history

### Contributing to Docs

```bash
# Start docs development server
npm run docs:dev

# Build documentation
npm run docs:build

# Check links
npm run docs:check
```

### Writing Documentation

- Use clear, concise language
- Include code examples
- Keep examples up-to-date
- Follow existing documentation patterns

## 🌐 Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and discussions
- **Discord** - Real-time chat and community support
- **Twitter** - Framework updates and announcements

### Getting Help

- **Documentation** - Check docs first
- **GitHub Issues** - Search existing issues
- **Discord** - Ask the community
- **Stack Overflow** - Use `aspscript` tag

### Recognition

Contributors are recognized in:
- **CHANGELOG.md** - Release notes
- **Contributors file** - Project contributors
- **Social media** - Community shoutouts

## 🎯 Areas Needing Help

### High Priority
- **Performance optimizations** - Core framework performance
- **Browser compatibility** - Cross-browser testing
- **Accessibility** - A11y improvements
- **TypeScript support** - Type definitions and DX

### Medium Priority
- **Internationalization** - i18n support expansion
- **Mobile development** - React Native improvements
- **Documentation** - Guides and tutorials
- **Tooling** - Development tools and integrations

### Nice to Have
- **WebAssembly** - WASM compilation improvements
- **Edge computing** - Cloudflare Workers support
- **AI integration** - AI-assisted development
- **Plugin ecosystem** - Third-party plugins

## 🙏 Thank You

Your contributions make AspScript better for everyone! Whether it's:
- Fixing a bug
- Adding a feature
- Improving documentation
- Helping other developers
- Or just starring the repo

Every contribution counts and is greatly appreciated! 🚀

---

**Happy coding with AspScript!** 🎨✨
