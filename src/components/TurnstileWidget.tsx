// src/components/TurnstileWidget.tsx
//
// Wraps Cloudflare Turnstile (https://developers.cloudflare.com/turnstile/).
// Renders nothing — and calls onVerify(null) once — if
// VITE_TURNSTILE_SITE_KEY isn't set, so local dev never gets blocked by a
// missing key. Once the env var is set, drop this in above any auth submit
// button and read the token from onVerify.
//
// Usage:
//   const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
//   <TurnstileWidget onVerify={setTurnstileToken} />
//   ...
//   body: JSON.stringify({ ...formData, turnstileToken })

import { useEffect, useRef, useState } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

interface TurnstileWidgetProps {
  onVerify: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
}

export function TurnstileWidget({ onVerify, theme = "auto" }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) {
      // Bot protection not configured for this environment — don't block
      // the form, just report "no token" so the backend's own graceful
      // skip (see middleware/turnstile.js) takes over.
      onVerify(null);
      return;
    }

    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          callback: (token) => onVerify(token),
          "expired-callback": () => onVerify(null),
          "error-callback": () => {
            setFailed(true);
            onVerify(null);
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div className="space-y-1">
      <div ref={containerRef} />
      {failed && (
        <p className="text-xs text-destructive">
          Verification challenge failed to load. Please refresh and try again.
        </p>
      )}
    </div>
  );
}

export default TurnstileWidget;
