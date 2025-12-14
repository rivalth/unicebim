"use client";

import * as React from "react";
import * as Sentry from "@sentry/nextjs";

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error | null; resetError: () => void }>;
};

/**
 * Error Boundary component that catches React errors and sends them to Sentry.
 * Should be used to wrap app sections that might throw errors.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Send error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback ?? DefaultErrorFallback;
      return <Fallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI.
 * Can be customized by passing a custom `fallback` prop to ErrorBoundary.
 */
function DefaultErrorFallback({ error, resetError }: { error: Error | null; resetError: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Bir hata oluştu</h1>
        <p className="text-sm text-muted-foreground">
          Üzgünüz, beklenmeyen bir hata meydana geldi. Sorun devam ederse lütfen destek ekibiyle iletişime geçin.
        </p>
        {process.env.NODE_ENV === "development" && error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Hata detayları</summary>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <button
          onClick={resetError}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Tekrar dene
        </button>
      </div>
    </div>
  );
}
