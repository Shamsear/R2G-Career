"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or search params change, navigation has finished
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Listen to all link clicks across the document
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    const startProgress = () => {
      setLoading(true);
      setProgress(15);

      clearInterval(progressInterval);
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 60) return prev + Math.random() * 15;
          if (prev < 85) return prev + Math.random() * 5;
          if (prev < 95) return prev + 0.5;
          return prev;
        });
      }, 150);
    };

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a") as HTMLAnchorElement | null;

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, hash links, downloads, target="_blank", or modifier clicks
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        // If absolute URL to current host, allow it
        try {
          const url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin) return;
          if (url.pathname === window.location.pathname && url.search === window.location.search) {
            // Clicking same page URL
            return;
          }
        } catch {
          return;
        }
      } else {
        // Relative link
        if (href === pathname || href === `${pathname}${window.location.search}`) {
          return;
        }
      }

      startProgress();
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      clearInterval(progressInterval);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "3px",
        zIndex: 9999999,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #f43f5e 0%, #fbbf24 50%, #38bdf8 100%)",
          boxShadow: "0 0 12px rgba(244, 63, 94, 0.8), 0 0 24px rgba(251, 191, 36, 0.6)",
          transition: progress === 100 ? "width 0.2s ease-out, opacity 0.3s ease-out" : "width 0.25s ease-out",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

export default function NavigationProgress() {
  return (
    <React.Suspense fallback={null}>
      <NavigationProgressBar />
    </React.Suspense>
  );
}
