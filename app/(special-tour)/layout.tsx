import type { Metadata } from "next";
import "../globals.css";
import "../portal.css";
import "../styles.css";
import "../pwa.css";
import SoloNavbar from "@/components/solo/SoloNavbar";
import SoloFooter from "@/components/solo/SoloFooter";

export const metadata: Metadata = {
  title: "Road To Glory - Special Tour",
  description: "Special Tour Dashboard",
};

export default function SpecialTourLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
