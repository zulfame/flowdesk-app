import React, { Component } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/composite/EmptyState";

/**
 * Global React error boundary (Exception Handling).
 * Catches render-time exceptions in the subtree and shows a recoverable
 * fallback (EmptyState `error`) instead of a blank screen.
 * `componentDidCatch` is the hook for future error reporting (e.g. Sentry).
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught an error:", error, info);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-svh items-center justify-center p-6"
          data-testid="app-error-boundary"
        >
          <div className="w-full max-w-md">
            <EmptyState
              variant="error"
              title="Terjadi kesalahan"
              description="Halaman tidak dapat dimuat. Silakan muat ulang."
              action={
                <Button
                  size="sm"
                  onClick={this.handleReload}
                  data-testid="error-boundary-reload"
                >
                  <RefreshCw className="size-4" /> Muat ulang
                </Button>
              }
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
