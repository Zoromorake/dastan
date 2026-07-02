import { Component, type ReactNode } from 'react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	label?: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null };

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error(`[Dastan ${this.props.label ?? 'app'}] Unhandled render error:`, error, info);
	}

	render() {
		if (!this.state.hasError) {
			return this.props.children;
		}

		if (this.props.fallback !== undefined) {
			return this.props.fallback;
		}

		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
				<p className="text-base font-medium text-foreground">Something went wrong</p>
				<p className="max-w-sm text-sm text-muted-foreground">
					{this.state.error?.message ?? 'An unexpected error occurred.'}
				</p>
				<button
					className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition hover:bg-accent"
					type="button"
					onClick={() => this.setState({ hasError: false, error: null })}
				>
					Try again
				</button>
			</div>
		);
	}
}
