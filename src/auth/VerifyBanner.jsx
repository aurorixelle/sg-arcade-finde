import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";

export default function VerifyBanner() {
  const { user, verified, resendVerification, refreshUser, firebaseReady } = useAuth();
  const [notice, setNotice] = useState(null);

  if (!firebaseReady || !user || verified) return null;

  return (
    <div className="verify-banner">
      <span>
        📧 Verification email sent to <strong>{user.email}</strong> — open it and click the
        link to unlock favorites.
      </span>
      <span className="verify-actions">
        <button
          type="button"
          onClick={async () => {
            await resendVerification();
            setNotice("Resent — check your inbox");
          }}
        >
          Resend email
        </button>
        <button
          type="button"
          onClick={async () => {
            await refreshUser();
            setNotice("Refreshed");
          }}
        >
          I've verified — refresh
        </button>
        {notice && <em>{notice}</em>}
      </span>
    </div>
  );
}
