/**
 * AspScript TypeScript Declarations
 * Полные типы для AspScript API
 */

import { ReadableStream } from 'stream/web'

// Реактивные типы
export interface Reactive<T = any> {
  value: T
}

export type ReactiveValue<T> = T extends Reactive<infer U> ? U : T

// Основные API функции
export declare function $state<T>(initialValue: T): Reactive<T>

export declare function $computed<T>(getter: () => T): Reactive<T>

export declare function $effect(callback: () => void): () => void

export declare function $global<T>(initialValue: T, key?: string): Reactive<T>

// Жизненный цикл компонентов
export declare function onMount(callback: () => void): void

export declare function onDestroy(callback: () => void): () => void

// SSR API
export declare function renderToString(component: Component): string

export interface RenderOptions {
  title?: string
  lang?: string
  meta?: Array<{ name: string; content: string }>
  links?: Array<{ rel: string; href: string }>
  scripts?: Array<{ src: string; defer?: boolean; async?: boolean }>
}

export declare function renderToHTML(component: Component, options?: RenderOptions): string

export declare function hydrate(component: Component, container: HTMLElement): void

export interface StreamOptions {
  onChunk?: (chunk: string, index: number) => void
  onError?: (error: Error) => void
  onComplete?: (fullHTML: string) => void
}

export declare function renderToStream(component: Component, options?: StreamOptions): ReadableStream

export declare function renderWithData(component: Component, initialData?: Record<string, any>): string

export declare function getSSRData(): Record<string, any>

export declare function render(component: Component, container: HTMLElement): void

export declare function autoRender(component: Component, container: HTMLElement): void

export declare function isSSR(): boolean

export declare function isBrowser(): boolean

// Hot-reload API
export declare function registerForHotReload(component: Component, moduleId: string): void

export declare function createHotReloadWrapper(component: Component, moduleId: string): Component

export declare function enableHotReload(): void

export declare function importWithHotReload(modulePath: string): Promise<any>

export declare function isHotReloadSupported(): boolean

// Анимации
export interface AnimationOptions {
  duration?: number
  easing?: string
  delay?: number
  direction?: 'normal' | 'reverse' | 'alternate'
}

export declare function createTransition(options?: AnimationOptions): Animation

export declare function createFade(options?: { duration?: number; from?: number; to?: number; easing?: string }): Animation

export declare function createSlide(options?: { direction?: 'up' | 'down' | 'left' | 'right'; distance?: string; duration?: number; easing?: string }): Animation

export declare function createScale(options?: { from?: number; to?: number; duration?: number; easing?: string }): Animation

export declare function createRotate(options?: { degrees?: number; duration?: number; easing?: string }): Animation

export declare function animateElement(element: HTMLElement, animation: Animation): Promise<void>

export declare function animationDirective(animation: Animation): DirectiveFunction

export declare const animations: {
  fadeIn: Animation
  fadeOut: Animation
  slideUp: Animation
  slideDown: Animation
  slideLeft: Animation
  slideRight: Animation
  zoomIn: Animation
  zoomOut: Animation
  spin: Animation
  bounceIn: Animation
}

export declare function animateGroup(elements: HTMLElement[], animation: Animation, options?: { stagger?: number; reverse?: boolean }): Promise<void>

export declare function listAnimation(callback: (element: HTMLElement, action: string, done?: () => void) => void): ListAnimation

// Типы для компонентов
export interface Component {
  (): ComponentInstance
}

export interface ComponentInstance {
  render(): string
  styles?: string
  cleanup?: () => void
}

export interface Animation {
  type: string
  duration: number
  easing: string
  keyframes: Keyframe[]
  delay?: number
  direction?: string
}

export interface Keyframe {
  [property: string]: string | number
}

export interface ListAnimation {
  type: string
  callback: Function
  beforeEnter?: (element: HTMLElement) => void
  enter?: (element: HTMLElement, done: () => void) => void
  leave?: (element: HTMLElement, done: () => void) => void
}

export interface DirectiveFunction {
  (element: HTMLElement, binding: DirectiveBinding): void
}

export interface DirectiveBinding {
  value: any
  modifiers: Record<string, boolean>
}

// Глобальные типы для .aspc файлов
declare global {
  // Расширение для .aspc файлов
  interface AspScriptModule {
    default: Component
  }

  // Глобальные функции в .aspc контексте
  function $state<T>(initialValue: T): Reactive<T>
  function $computed<T>(getter: () => T): Reactive<T>
  function $effect(callback: () => void): () => void
  function $global<T>(initialValue: T, key?: string): Reactive<T>
  function onMount(callback: () => void): void
  function onDestroy(callback: () => void): () => void

  // DOM API
  const DOM: {
    createElement(tag: string, attrs?: Record<string, any>, ...children: any[]): HTMLElement
    setTextContent(element: HTMLElement, text: string): void
    setAttribute(element: HTMLElement, name: string, value: any): void
    toggleClass(element: HTMLElement, className: string, condition: boolean): void
    setVisible(element: HTMLElement, visible: boolean): void
  }
}

// Модульные декларации
declare module '*.aspc' {
  const component: Component
  export default component
}

// Типы для Web APIs в SSR контексте
declare global {
  interface Window {
    __ASPSCRIPT_DATA__?: Record<string, any>
    _aspscript_components?: Map<string, any>
  }

  // Мок для SSR
  const document: Document | undefined
  const window: Window | undefined
}

export {}
