import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * #9 FIX: React Error Boundary — mencegah blank page saat terjadi JS runtime error.
 * Wrap komponen kritis agar error terisolasi dan tidak merusak seluruh UI.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    // Log ke console di development; bisa diarahkan ke Sentry/dsb di production
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
          <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Terjadi Kesalahan
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Halaman mengalami error yang tidak terduga. Silakan coba muat ulang halaman.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-400">
                  Detail Error (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
