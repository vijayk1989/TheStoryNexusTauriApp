import type { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const DefaultErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
	<div className="flex items-center justify-center min-h-[400px] p-4">
		<Alert variant="destructive" className="max-w-2xl">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Something went wrong</AlertTitle>
			<AlertDescription className="mt-2">
				<p className="mb-4">{error.message}</p>
				<div className="flex gap-2">
					<Button onClick={resetErrorBoundary} variant="outline" size="sm">
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

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: (error: Error, resetError: () => void) => ReactNode;
	onError?: (error: Error, errorInfo: { componentStack: string }) => void;
	resetKeys?: unknown[];
}

export const ErrorBoundary = ({ children, fallback, onError, resetKeys }: ErrorBoundaryProps) => {
	const handleError = (error: Error, info: { componentStack: string }) => {
		console.error('Error caught by boundary:', error, info);
		onError?.(error, info);
	};

	return (
		<ReactErrorBoundary
			FallbackComponent={fallback ? ({ error, resetErrorBoundary }) => fallback(error, resetErrorBoundary) : DefaultErrorFallback}
			onError={handleError}
			resetKeys={resetKeys}
		>
			{children}
		</ReactErrorBoundary>
	);
};
