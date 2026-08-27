import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppErrorBoundary from './AppErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('AppErrorBoundary', () => {
  it('renders children normally when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <div>hello</div>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('shows the branded fallback instead of a blank page when a child throws', () => {
    // React logs the caught error to the console by default in tests — keep
    // the test output clean.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Un problème est survenu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retour à l'accueil/i })).toBeInTheDocument()

    consoleError.mockRestore()
  })
})
