import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";

export default function VerifyBanner() {
  const { user, verified, resendVerification, refreshUser, firebaseReady } = useAuth();
  const [notice, setNotice] = useState(null);

  if (!firebaseReady || !user || verified) return null;

  return (
    <div className="verify-banner">
      <span>
        📧 验证邮件已发送至 <strong>{user.email}</strong> — 收件并点击链接后即可使用收藏功能。
        (Verify your email to unlock favorites.)
      </span>
      <span className="verify-actions">
        <button
          type="button"
          onClick={async () => {
            await resendVerification();
            setNotice("已重新发送 Resent — check your inbox");
          }}
        >
          重发邮件
        </button>
        <button
          type="button"
          onClick={async () => {
            await refreshUser();
            setNotice("已刷新状态 Refreshed");
          }}
        >
          我已验证，刷新
        </button>
        {notice && <em>{notice}</em>}
      </span>
    </div>
  );
}
