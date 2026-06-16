import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * GitHubCallback
 * This page is opened inside the OAuth popup window.
 * It reads ?code= and ?state= from the URL and posts them
 * back to the parent window, then closes itself.
 */
export default function GitHubCallback() {
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (window.opener) {
      if (error || !code) {
        window.opener.postMessage(
          { type: "github-oauth-error", error: error || "No code returned" },
          window.location.origin
        );
      } else {
        window.opener.postMessage(
          { type: "github-oauth-success", code, state },
          window.location.origin
        );
      }
      // Close after a short delay to ensure message is sent
      setTimeout(() => window.close(), 300);
    } else {
      // Not in a popup — redirect normally
      const redirectTo = code ? `/dashboard?github_code=${code}` : "/dashboard";
      window.location.href = redirectTo;
    }
  }, [params]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#06070B" }}
    >
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
        </div>
        <div>
          <div className="text-white font-700 text-lg mb-1">Connecting GitHub...</div>
          <div className="text-white/40 text-sm">This window will close automatically.</div>
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: "#7C5CFF", animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
