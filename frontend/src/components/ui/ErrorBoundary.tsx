import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="card p-8 max-w-md w-full text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">Algo salió mal</h2>
            <p className="text-sm text-muted-foreground mb-4">{this.state.error.message}</p>
            <button
              className="btn-primary"
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
