// src/components/ErrorBoundary.tsx
"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo?: string | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack ?? null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold text-primary">Something went wrong</h1>
            <p className="text-zinc-400">An unexpected error occurred. Please try refreshing the page.</p>
            {this.state.errorInfo && (
              <details className="whitespace-pre-wrap text-left text-sm text-zinc-500">
                {this.state.errorInfo}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
