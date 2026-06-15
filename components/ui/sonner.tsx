"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** TDS Toast defaults: 3s (5s when action — callers may override) */
const TOAST_DURATION_MS = 3000;

/** TDS 하단 Toast — placement locked in globals.css (--toast-shift-*) */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-center"
      duration={TOAST_DURATION_MS}
      expand={false}
      visibleToasts={2}
      gap={6}
      closeButton={false}
      richColors={false}
      offset={{
        bottom: "var(--toast-bottom-offset-inline)",
      }}
      mobileOffset={{
        bottom: "var(--toast-bottom-offset-inline)",
      }}
      icons={{
        success: null,
        info: null,
        warning: null,
        error: null,
        loading: null,
      }}
      toastOptions={{
        duration: TOAST_DURATION_MS,
        unstyled: true,
        classNames: {
          toast: "rimvio-toast",
          title: "rimvio-toast-title",
          description: "rimvio-toast-description",
          actionButton: "rimvio-toast-action",
          cancelButton: "rimvio-toast-cancel",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
