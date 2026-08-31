import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const MODES = {
  login: { title: "Sign in", cta: "Sign in" },
  register: { title: "Create account", cta: "Sign up" },
  reset: { title: "Reset password", cta: "Send reset email" },
};

export default function AuthModal({ initialMode = "login", onClose }) {
  const { signIn, signUp, resetPassword, friendlyAuthError } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        onClose();
      } else if (mode === "register") {
        await signUp(email, password);
        setNotice("Verification email sent — check your inbox (and spam folder). Verify your email to unlock favorites.");
        setMode("login");
      } else {
        await resetPassword(email);
        setNotice("Reset email sent — check your inbox for the reset link.");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>{MODES[mode].title}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          {mode !== "reset" && (
            <label>
              <span>Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min 6 chars"
              />
            </label>
          )}

          {mode === "register" && (
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                required
                value={confirm}
                autoComplete="new-password"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}

          <button type="submit" className="submit-btn" disabled={busy}>
            {busy ? "…" : MODES[mode].cta}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" && (
            <>
              <button type="button" onClick={() => setMode("reset")}>Forgot password?</button>
              <span>·</span>
              <button type="button" onClick={() => setMode("register")}>Create an account</button>
            </>
          )}
          {mode === "register" && (
            <button type="button" onClick={() => setMode("login")}>Already have an account? Sign in</button>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => setMode("login")}>Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
