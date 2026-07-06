import type { Metadata } from "next";
import "../globals.css";
import "../portal.css";
import "../styles.css";
import "../pwa.css";
import "./rws/rws.css";
import RwsNavbar from "@/components/rws/RwsNavbar";
import RwsFooter from "@/components/rws/RwsFooter";

export const metadata: Metadata = {
  title: "Road To Glory - World Series",
  description: "R2G World Series Dashboard",
};

export default function RwsLayout({
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
          <RwsNavbar />
          <main className="main-content">
            {children}
          </main>
          <RwsFooter />
        </div>
      </body>
    </html>
  );
}
