import { Component, type ReactNode } from 'react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		console.error('Error caught by boundary:', error, errorInfo);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="flex items-center justify-center min-h-screen">
						<div className="text-center">
							<h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
							<p className="text-muted-foreground mb-4">
								{this.state.error?.message || 'An unexpected error occurred'}
							</p>
							<button
								type="button"
								onClick={() => window.location.reload()}
								className="px-4 py-2 bg-primary text-primary-foreground rounded"
							>
								Reload Application
							</button>
						</div>
					</div>
				)
			);
		}

		return this.props.children;
	}
}
