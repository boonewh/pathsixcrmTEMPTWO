// src/components/ErrorBoundary.tsx
import React from 'react';
import { RefreshCw, AlertTriangle, Home, MessageCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorId: this.generateErrorId()
    };
  }

  generateErrorId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Optional: Send to error reporting service
    // logErrorToService(error, errorInfo, this.state.errorId);
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorId: this.generateErrorId()
    });
  };

  getErrorType(): { title: string; description: string; icon: React.ReactNode; color: string } {
    const error = this.state.error;
    
    if (error?.message.includes('fetch') || error?.message.includes('network')) {
      return {
        title: "Connection Issue",
        description: "Unable to connect to our servers. This might be a temporary network issue.",
        icon: <MessageCircle className="h-8 w-8" />,
        color: "text-orange-500"
      };
    }
    
    if (error?.message.includes('JSON') || error?.message.includes('HTML')) {
      return {
        title: "Server Communication Error",
        description: "The server returned unexpected data. This usually means our backend needs a quick restart.",
        icon: <AlertTriangle className="h-8 w-8" />,
        color: "text-red-500"
      };
    }
    
    return {
      title: "Something Went Wrong",
      description: "An unexpected error occurred. Don't worry, your data is safe!",
      icon: <AlertTriangle className="h-8 w-8" />,
      color: "text-red-500"
    };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error!} resetError={this.resetError} />;
      }

      const errorType = this.getErrorType();

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Main Error Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Header with Icon */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4`}>
                  <div className="text-white">
                    {errorType.icon}
                  </div>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">
                  {errorType.title}
                </h1>
                <p className="text-blue-100 text-sm">
                  Error ID: #{this.state.errorId}
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {errorType.description}
                </p>

                {/* What you can do */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 text-sm mb-3">What you can try:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Refresh the page to reload the application</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Check your internet connection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Try again in a few minutes</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.resetError}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 group"
                  >
                    <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Page
                  </button>
                </div>

                {/* Back to Dashboard */}
                <div className="mt-4">
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="w-full bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 border border-gray-200"
                  >
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Development Debug Info */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors text-sm font-medium">
                  🔧 Debug Information (Development Only)
                </summary>
                <div className="p-4">
                  <div className="mb-3">
                    <span className="text-red-400 font-mono text-xs">Error:</span>
                    <p className="text-sm font-mono mt-1">{this.state.error.message}</p>
                  </div>
                  <div>
                    <span className="text-red-400 font-mono text-xs">Stack Trace:</span>
                    <pre className="text-xs mt-1 overflow-auto bg-black/50 p-2 rounded">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </div>
              </details>
            )}

            {/* Footer */}
            <div className="text-center mt-6 text-xs text-gray-400">
              PathSix CRM • If this persists, contact support
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// BONUS: Custom Error Page for Specific Scenarios
export function NetworkErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-orange-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Internet Connection</h2>
          <p className="text-gray-600 text-sm mb-6">
            Please check your internet connection and try again.
          </p>
          
          <button
            onClick={onRetry}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// BONUS: Loading Error Page
export function LoadingErrorPage({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-gray-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Failed</h2>
          <p className="text-gray-600 text-sm mb-6">
            {message || "We couldn't load this page. Please try again."}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}