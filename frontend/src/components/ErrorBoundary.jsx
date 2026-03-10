import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    margin: '2rem',
                    background: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#991b1b'
                }}>
                    <h2 style={{ marginBottom: '1rem' }}>Something went wrong!</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        <summary>Error Details (click to expand)</summary>
                        <p style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {this.state.error && this.state.error.toString()}
                        </p>
                        <p style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#666' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </p>
                    </details>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
