"use client";

import React from "react";

interface FullPageLoaderProps {
  title?: string;
  subtitle?: string;
  accentColor?: string;
  secondaryColor?: string;
  icon?: string;
}

export default function FullPageLoader({
  title = "ROAD TO GLORY",
  subtitle = "Loading experience...",
  accentColor = "#f43f5e",
  secondaryColor = "#fb7185",
  icon = "fa-futbol",
}: FullPageLoaderProps) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "75vh",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        padding: "2rem 1rem",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes r2gLoaderSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes r2gLoaderBar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes r2gLoaderPulse {
          0% { transform: scale(0.94); opacity: 0.75; }
          100% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes r2gLoaderFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `,
        }}
      />
      <div
        style={{
          background: "rgba(14, 16, 26, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "2.5rem 2rem",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px ${accentColor}15`,
          maxWidth: "340px",
          width: "100%",
          animation: "r2gLoaderFade 0.4s ease-out both",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "72px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer glowing ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid transparent",
              borderTopColor: accentColor,
              borderRightColor: secondaryColor,
              animation: "r2gLoaderSpin 1.1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite",
            }}
          />
          {/* Inner pulsating badge */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "r2gLoaderPulse 1.2s infinite alternate ease-in-out",
            }}
          >
            <i className={`fa-solid ${icon}`} style={{ color: secondaryColor, fontSize: "1.15rem" }} />
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: "0.85rem",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              marginBottom: "0.35rem",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.5)",
              letterSpacing: "0.5px",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Progress track */}
        <div
          style={{
            width: "120px",
            height: "3px",
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              height: "100%",
              width: "50%",
              background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})`,
              borderRadius: "10px",
              animation: "r2gLoaderBar 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
