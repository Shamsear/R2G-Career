"use client";

export default function RwsFullPageLoading({ text = "Loading" }: { text?: string }) {
  return (
    <div style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rwsSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rwsLoadingBar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes rwsPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          100% { transform: scale(1.05); opacity: 1; }
        }
      `}} />
      <div style={{
        background: "rgba(255, 255, 255, 0.01)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "3rem",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.25rem",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
        maxWidth: "320px",
        width: "100%",
        animation: "rwsFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both"
      }}>
        <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#a855f7", borderRightColor: "#c084fc", animation: "rwsSpin 1.1s linear infinite" }} />
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "rwsPulse 1.2s infinite alternate" }}>
            <i className="fa-solid fa-trophy" style={{ color: "#c084fc", fontSize: "1rem" }} />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 800, color: "#fff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            R2G // WORLD SERIES
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.5px" }}>
            {text}...
          </div>
        </div>
        <div style={{ width: "100px", height: "2px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", height: "100%", width: "60%", background: "linear-gradient(90deg, #a855f7, #c084fc)", borderRadius: "10px", animation: "rwsLoadingBar 1.6s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}
