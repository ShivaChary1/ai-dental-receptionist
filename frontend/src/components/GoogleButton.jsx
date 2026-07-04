import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { track } from "../lib/analytics.js";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

let gsiLoading = null;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoading) {
    gsiLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return gsiLoading;
}

/** "Continue with Google" via Google Identity Services. Renders nothing when
 *  VITE_GOOGLE_CLIENT_ID isn't configured, so the app works without it. */
export default function GoogleButton({ label = "continue_with" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const slotRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !slotRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            try {
              const { data } = await api.post("/api/auth/google", {
                credential: response.credential,
              });
              track("signup_completed", { method: "google" });
              login(data);
              navigate("/chat");
            } catch (err) {
              setError(err?.response?.data?.detail || "Google sign-in failed.");
            }
          },
        });
        window.google.accounts.id.renderButton(slotRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: label,
          shape: "rectangular",
          logo_alignment: "left",
          width: 320,
        });
      })
      .catch(() => setError("Couldn't load Google sign-in."));
    return () => { cancelled = true; };
  }, [label, login, navigate]);

  if (!CLIENT_ID) return null;

  return (
    <div className="mt-5">
      <div className="mb-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div ref={slotRef} className="flex justify-center" />
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
