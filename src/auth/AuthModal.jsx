import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const MODES = {
  login: { title: "登录 Sign in", cta: "Sign in" },
  register: { title: "创建账户 Create account", cta: "Sign up" },
  reset: { title: "重置密码 Reset password", cta: "Send reset email" },
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
      setError("两次输入的密码不一致 Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        onClose();
      } else if (mode === "register") {
        await signUp(email, password);
        setNotice("验证邮件已发送，请查收邮箱（含垃圾邮件夹）。验证后即可收藏。Check your inbox to verify your email.");
        setMode("login");
      } else {
        await resetPassword(email);
        setNotice("重置邮件已发送，请查收。Check your inbox for the reset link.");
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
            <span>Email 邮箱</span>
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
              <span>Password 密码</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位 / min 6 chars"
              />
            </label>
          )}

          {mode === "register" && (
            <label>
              <span>Confirm 确认密码</span>
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
              <button type="button" onClick={() => setMode("reset")}>忘记密码？</button>
              <span>·</span>
              <button type="button" onClick={() => setMode("register")}>注册新账户</button>
            </>
          )}
          {mode === "register" && (
            <button type="button" onClick={() => setMode("login")}>已有账户？去登录</button>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => setMode("login")}>返回登录</button>
          )}
        </div>
      </div>
    </div>
  );
}
