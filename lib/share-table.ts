"use client";

import { toPng } from "html-to-image";

function makeStyleSheetsSafe() {
  const safeStyleSheets: { element: CSSStyleSheet; parent: HTMLElement | null }[] = [];
  const docSheets = Array.from(document.styleSheets);
  
  for (const sheet of docSheets) {
    try {
      // Test if accessing rules throws a SecurityError
      const rules = sheet.cssRules;
    } catch (e) {
      // If it throws, temporarily disable it to prevent security issues in canvas rendering
      if (sheet.ownerNode instanceof HTMLElement) {
        const parent = sheet.ownerNode.parentElement;
        sheet.ownerNode.setAttribute("data-temp-disabled", "true");
        sheet.disabled = true;
        safeStyleSheets.push({ element: sheet, parent });
      }
    }
  }
  
  return () => {
    // Restore disabled stylesheets
    for (const entry of safeStyleSheets) {
      entry.element.disabled = false;
      if (entry.element.ownerNode instanceof HTMLElement) {
        entry.element.ownerNode.removeAttribute("data-temp-disabled");
      }
    }
  };
}

async function prepareImages(container: HTMLElement) {
  const images = Array.from(container.getElementsByTagName("img"));
  const promises = images.map((img) => {
    return new Promise<void>((resolve) => {
      if (!img.src) {
        resolve();
        return;
      }
      
      // Skip if already base64 data url
      if (img.src.startsWith("data:")) {
        resolve();
        return;
      }

      const originalSrc = img.src;
      
      // Force CORS and add cache buster
      img.crossOrigin = "anonymous";
      try {
        const url = new URL(img.src);
        url.searchParams.set("cb", "r2g-poster");
        img.src = url.toString();
      } catch (e) {
        // Fallback for relative paths
        img.src = `${originalSrc}${originalSrc.includes("?") ? "&" : "?"}cb=r2g-poster`;
      }

      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => {
          img.src = originalSrc; // fallback to original source
          resolve();
        };
      }
    });
  });
  await Promise.all(promises);
}

/**
 * Captures an HTML element as a high-resolution PNG image Blob.
 * Implements CORS handling, stylesheet protection, and double-rendering to resolve iOS custom font bugs.
 */
export async function captureElementAsPng(element: HTMLElement): Promise<Blob | null> {
  const restoreSheets = makeStyleSheetsSafe();
  await prepareImages(element);

  try {
    // First render to trigger asset downloads & cache bindings
    await toPng(element, { cacheBust: true, pixelRatio: 2 });
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    // Second render for actual capture with proper layers and fonts
    const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 2 });
    
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return blob;
  } catch (err) {
    console.error("Error capturing element as PNG:", err);
    return null;
  } finally {
    restoreSheets();
  }
}

/**
 * Shares a Blob using the native Web Share API on mobile devices, or falls back to browser download link simulation.
 */
export async function shareOrDownloadBlob(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });

  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "Road to Glory Series Update",
        text: "Check out this tournament update from Road to Glory!",
      });
      return true;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return false;
      }
      console.warn("Native share failed, downloading instead:", err);
    }
  }

  // Simulated browser download fallback
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
  return false;
}
