import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
	children: ReactNode;
	fallback?: (error: Error, resetError: () => void) => ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	resetKeys?: unknown[];
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

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error('Error caught by boundary:', error, errorInfo);
		this.props.onError?.(error, errorInfo);
	}

	componentDidUpdate(prevProps: Props): void {
		if (this.state.hasError && this.props.resetKeys) {
			const prevKeys = prevProps.resetKeys || [];
			const currentKeys = this.props.resetKeys;

			if (prevKeys.length !== currentKeys.length ||
				prevKeys.some((key, i) => key !== currentKeys[i])) {
				this.resetError();
			}
		}
	}

	resetError = (): void => {
		this.setState({ hasError: false, error: null });
	};

	render(): ReactNode {
		if (this.state.hasError && this.state.error) {
			if (this.props.fallback) {
				return this.props.fallback(this.state.error, this.resetError);
			}

			return (
				<div className="flex items-center justify-center min-h-[400px] p-4">
					<Alert variant="destructive" className="max-w-2xl">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Something went wrong</AlertTitle>
						<AlertDescription className="mt-2">
							<p className="mb-4">{this.state.error.message}</p>
							<div className="flex gap-2">
								<Button onClick={this.resetError} variant="outline" size="sm">
									Try again
								</Button>
								<Button
									onClick={() => window.location.reload()}
									variant="outline"
									size="sm"
								>
									Reload app
								</Button>
							</div>
						</AlertDescription>
					</Alert>
				</div>
			);
		}

		return this.props.children;
	}
}
