import { Component, type ReactNode } from 'react'

/**
 * Top-level safety net — wraps every route (public tombola AND admin) so a
 * thrown render error anywhere below shows a branded recovery screen instead
 * of a blank white page. Mirrors the narrower pattern already used for 3D
 * scenes in tombola/screens/components/WebGLErrorBoundary.tsx, just scoped
 * to the whole app. Sits above both .admin-shell and the tombola tree, so it
 * can only rely on the global tokens index.css sets on :root (--brand-*,
 * --ink, --page), not the admin's scoped --pf-* ones.
 *
 * Error boundaries have no hook equivalent — has to stay a class component.
 */
export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('Unhandled error — app crashed:', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: 'var(--page, #fcfaf6)',
          color: 'var(--ink, #1a1714)',
          fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
        }}
      >
        <img src="/logo.png" alt="" style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 10 }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Un problème est survenu</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-muted, #6f6a63)', maxWidth: 360 }}>
            Quelque chose s'est mal passé. Vous pouvez réessayer — l'équipe technique a été notifiée.
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            marginTop: 4,
            padding: '10px 20px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--brand-primary, #0c2340)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }
}
