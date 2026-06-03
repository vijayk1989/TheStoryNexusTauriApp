import * as React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  nodeKey: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SceneBeatErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      `[SceneBeatErrorBoundary] Render error in scene beat node "${this.props.nodeKey}":`,
      error,
      info.componentStack,
    );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="relative my-4 rounded-lg border border-destructive/50 bg-card p-4 text-sm text-muted-foreground">
          <p className="font-medium text-destructive">Scene beat failed to render.</p>
          <p className="mt-1 text-xs opacity-75">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
