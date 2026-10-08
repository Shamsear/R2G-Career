import type { Metadata, Viewport } from "next";
import "../globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import NavigationProgress from "@/components/common/NavigationProgress";
import { AuthProvider } from "@/contexts/AuthContext";
import { TeamRegistrationProvider } from "@/contexts/TeamRegistrationContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { TournamentProvider } from "@/contexts/TournamentContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Analytics } from "@vercel/analytics/next";
import RegisterServiceWorker from "./register-sw";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "Road To Glory - Football Auction Platform",
  description: "Experience the thrill of building your dream football team through strategic bidding and competitive auctions",
  icons: {
    icon: '/assets/images/logo11.webp',
    apple: '/assets/images/logo11.webp',
    shortcut: '/assets/images/logo11.webp',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Road To Glory',
  },
  openGraph: {
    title: "Road To Glory - Football Auction Platform",
    description: "Experience the thrill of building your dream football team through strategic bidding and competitive auctions",
    images: ['/assets/images/logo11.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Road To Glory - Football Auction Platform",
    description: "Experience the thrill of building your dream football team through strategic bidding and competitive auctions",
    images: ['/assets/images/logo11.webp'],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className="antialiased min-h-screen flex flex-col"
      >
        <NavigationProgress />
        <QueryProvider>
          <AuthProvider>
            <TeamRegistrationProvider>
              <TournamentProvider>
                <LanguageProvider>
                  <RegisterServiceWorker />
                  <Navbar />
                  <main className="flex-grow">
                    {children}
                  </main>
                  <Footer />
                  <MobileNav />
                </LanguageProvider>
              </TournamentProvider>
            </TeamRegistrationProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}

