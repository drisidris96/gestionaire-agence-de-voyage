import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-destructive">حدث خطأ في تحميل الصفحة</h2>
          <pre className="text-xs text-muted-foreground bg-muted rounded p-4 max-w-xl overflow-auto text-left dir-ltr">
            {this.state.error.message}
            {"\n"}
            {this.state.error.stack?.split("\n").slice(0, 6).join("\n")}
          </pre>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            onClick={() => this.setState({ error: null })}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
