import type { Metadata, Viewport } from "next";
import "../globals.css";
import "../portal.css";
import "../styles.css";
import "../pwa.css";
import SoloNavbar from "@/components/solo/SoloNavbar";
import SoloFooter from "@/components/solo/SoloFooter";

export const metadata: Metadata = {
  title: "Road To Glory - Solo Tour",
  description: "Solo Tour Dashboard",
  icons: {
    icon: '/assets/images/logo11.webp',
    apple: '/assets/images/logo11.webp',
    shortcut: '/assets/images/logo11.webp',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050608",
  viewportFit: "cover",
};

export default function SoloLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#050608" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-navbutton-color" content="#050608" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <div className="app-container">
          <SoloNavbar />
          <main className="main-content">
            {children}
          </main>
          <SoloFooter />
        </div>
      </body>
    </html>
  );
}
