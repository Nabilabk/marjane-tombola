import { Component, type ReactNode } from 'react'

/**
 * Generic safety net for anything that renders WebGL. If canvas/context
 * creation throws (unsupported browser, context-creation failure, driver
 * issue), render `fallback` instead of taking the whole screen down.
 * Error boundaries have no hook equivalent — has to be a class component.
 */
export default class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('3D scene failed to render, falling back:', error)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
