/* Funnel analytics (PostHog). No-ops entirely unless VITE_POSTHOG_KEY is set,
   and the SDK is dynamically imported so unconfigured builds ship zero bytes.

   Funnel events: page views (auto) → assistant_opened → chat_message_sent
   → signup_completed → booking_completed (+ guest_limit_reached). */
let ph = null;

const KEY = import.meta.env.VITE_POSTHOG_KEY;
if (KEY) {
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      autocapture: false,
    });
    ph = posthog;
  });
}

export function track(event, props) {
  ph?.capture(event, props);
}

export function identify(id, props) {
  ph?.identify(id, props);
}
