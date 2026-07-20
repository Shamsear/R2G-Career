"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import { loginSoloAdmin } from "@/utils/solo/serverActions";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      return setError("Please fill in all fields.");
    }
    setError(null);

    startTransition(async () => {
      try {
        const res = await loginSoloAdmin({ username, password, rememberMe });
        if (res.success) {
          router.push("/solo-tour/admin");
          router.refresh();
        } else {
          setError(res.error || "Invalid username or password.");
        }
      } catch (err) {
        setError("An authentication error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "420px", width: "100%", padding: "1.5rem" }}>
        
        {/* Header/Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ margin: "0 auto 1rem auto" }}>
            <i className="fa-solid fa-lock" /> Admin Security
          </div>
          <h1 className="portal-title" style={{ fontSize: "1.8rem", letterSpacing: "2px" }}>ADMIN SIGN IN</h1>
          <p className="portal-subtitle" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
            Enter your credentials to access the Solo Tour Command Center.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="admin-card" style={{ marginTop: 0, padding: "2rem" }}>
          <form onSubmit={handleLogin} id="admin-login-form">
            {error && (
              <div 
                style={{ 
                  backgroundColor: "rgba(239, 68, 68, 0.1)", 
                  border: "1px solid rgba(239, 68, 68, 0.2)", 
                  color: "#ef4444", 
                  borderRadius: "8px", 
                  padding: "0.75rem 1rem", 
                  fontSize: "0.8rem", 
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <i className="fa-solid fa-circle-exclamation" />
                <span>{error}</span>
              </div>
            )}

            <div className="admin-form-group" style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="username-input" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)" }}>
                Username
              </label>
              <input
                id="username-input"
                type="text"
                className="admin-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
                style={{ marginTop: "0.25rem" }}
              />
            </div>

             <div className="admin-form-group" style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="password-input" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  className="admin-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  style={{ marginTop: "0.25rem", paddingRight: "40px", width: "100%" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "55%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  {showPassword ? (
                    <i className="fa-solid fa-eye-slash" />
                  ) : (
                    <i className="fa-solid fa-eye" />
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#a855f7" }}
              />
              <label htmlFor="remember-me" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}>
                Remember session (30 days)
              </label>
            </div>

            <button 
              id="login-btn"
              type="submit" 
              className="portal-btn btn-primary" 
              style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }} />
                  Signing In...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" style={{ marginRight: "8px" }} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info/back link */}
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.75rem", padding: "4px 12px" }}>
            <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}
