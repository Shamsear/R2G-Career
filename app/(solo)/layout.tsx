import type { Metadata } from "next";
import "../globals.css";
import "../portal.css";
import "../styles.css";
import "../pwa.css";
import SoloNavbar from "@/components/solo/SoloNavbar";
import SoloFooter from "@/components/solo/SoloFooter";

export const metadata: Metadata = {
  title: "Road To Glory - Solo Tour",
  description: "Solo Tour Dashboard",
};

export default function SoloLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
