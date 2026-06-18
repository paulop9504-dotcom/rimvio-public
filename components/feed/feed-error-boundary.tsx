"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RimvioLogo } from "@/components/rimvio-logo";

type FeedErrorBoundaryProps = {
  children: ReactNode;
};

type FeedErrorBoundaryState = {
  error: Error | null;
};

export class FeedErrorBoundary extends Component<
  FeedErrorBoundaryProps,
  FeedErrorBoundaryState
> {
  state: FeedErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FeedErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[feed-boundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <RimvioLogo size="md" appearance="dark" />
          <div className="max-w-sm space-y-2">
            <h1 className="text-[17px] font-semibold text-foreground">
              피드를 불러오지 못했어요
            </h1>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              새로고침 후 다시 시도해 주세요. 계속되면 검색 탭을 이용해 주세요.
            </p>
            {this.state.error.message ? (
              <p className="font-mono text-[10px] text-muted-foreground/70">
                {this.state.error.message}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground"
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
