// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Catches any uncaught errors in the React tree and shows a friendly
 * error screen instead of a blank page (white screen of death).
 *
 * Wrap the entire <App /> with this.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });

    // TODO: send to Sentry / LogRocket / your logger
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleReload = () => window.location.reload();
  handleGoHome = () => (window.location.href = "/");

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              We've been notified and are looking into it. Please try again.
            </p>
          </div>

          {isDev && this.state.error && (
            <details className="text-left bg-muted rounded-lg p-3 text-xs overflow-auto max-h-48">
              <summary className="cursor-pointer font-medium mb-2">
                Error details (dev only)
              </summary>
              <pre className="whitespace-pre-wrap break-words text-destructive">
                {this.state.error.toString()}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input hover:bg-accent transition"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;