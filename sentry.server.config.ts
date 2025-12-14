// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION
    ? `unicebim@${process.env.NEXT_PUBLIC_APP_VERSION}`
    : undefined,

  // Filter out health check noise
  ignoreErrors: [
    // Browser extension errors
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    // Network errors that are not actionable
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],

  // Filter out known non-actionable routes
  beforeSend(event) {
    // Filter out health check errors
    if (event.request?.url?.includes("/api/health")) {
      return null;
    }
    return event;
  },
});
