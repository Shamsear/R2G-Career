"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/solo-tour" || pathname === "/solo-tour/tournament-guide" || pathname === "/solo-tour/career-tournament" || pathname === "/solo-tour/trophy-cabinet" || pathname === "/solo-tour/manager-ranking" || pathname === "/solo-tour/career-mode" || pathname === "/solo-tour/registered-clubs" || pathname === "/solo-tour/player-signing" || pathname === "/solo-tour/managers" || pathname.startsWith("/solo-tour/managers/") || pathname === "/solo-tour/player-database") return null;

  return (
    <footer>
      <div className="footer-content">
        <div className="footer-nav">
          <Link href="/">Home</Link>
          <Link href="/tournament-guide">Tournament Guide</Link>
          <Link href="/career-mode">Career Mode</Link>
          <Link href="/manager-ranking">Manager Ranking</Link>
          <Link href="/trophy-cabinet">Trophy Cabinet</Link>
        </div>
        <div className="social-icons">
          <a href="#"><i className="fab fa-facebook-f"></i></a>
          <a href="#"><i className="fab fa-twitter"></i></a>
          <a href="#"><i className="fab fa-instagram"></i></a>
          <a href="#"><i className="fab fa-discord"></i></a>
        </div>
        <div className="copyright">
          <p>&copy; {new Date().getFullYear()} Road to Glory. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
