import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toast'
import { applyStoredTheme } from './lib/utils'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

// Apply dark/light theme from localStorage before render
applyStoredTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

// #9 FIX: ErrorBoundary paling luar mencegah blank page saat runtime error
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
