"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type FeedSlotCardBoundaryProps = {
  slotId: string;
  children: ReactNode;
};

type FeedSlotCardBoundaryState = {
  error: Error | null;
};

/** One bad slot card must not take down the whole feed. */
export class FeedSlotCardBoundary extends Component<
  FeedSlotCardBoundaryProps,
  FeedSlotCardBoundaryState
> {
  state: FeedSlotCardBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FeedSlotCardBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[feed-slot-card:${this.props.slotId}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="py-5 text-center"
          data-feed-slot-card-error={this.props.slotId}
        >
          <p className="text-[13px] font-medium text-muted-foreground">
            이 일정을 표시하지 못했어요
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 text-[11px] font-semibold text-primary underline-offset-2 hover:text-primary/80 hover:underline"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
