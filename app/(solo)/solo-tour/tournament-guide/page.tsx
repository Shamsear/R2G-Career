"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "../../../portal.css";
import "./tournament-guide.css";

export default function TournamentGuide() {
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("faqs");

  const openModal = (src: string) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const sections = [
    { id: "faqs", label: "Career FAQs", icon: "fa-question-circle" },
    { id: "roadmap", label: "Road Map", icon: "fa-map-marked-alt" },
    { id: "card-types", label: "Card Types", icon: "fa-id-card" },
    { id: "points", label: "Point System", icon: "fa-chart-line" },
    { id: "transfers", label: "Transfer Market", icon: "fa-exchange-alt" },
    { id: "match-guide", label: "Match Guide", icon: "fa-gavel" },
    { id: "bonus", label: "Match Bonus", icon: "fa-gift" },
    { id: "awards", label: "Season Awards", icon: "fa-trophy" },
    { id: "rewards", label: "Season Rewards", icon: "fa-award" },
    { id: "currency", label: "Currency Type", icon: "fa-money-bill-wave" },
    { id: "coin-exchange", label: "Coin Exchange", icon: "fa-ticket-alt" },
    { id: "token-exchange", label: "Token Exchange", icon: "fa-coins" },
    { id: "events", label: "Special Events", icon: "fa-star" },
    { id: "important", label: "Important Notes", icon: "fa-exclamation-circle" }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const offset = 100; // offset for sticky navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="portal-root-wrapper">
      {/* Background Grids and Glow Orbs */}
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Main Container */}
      <div className="portal-container">
        {/* Navigation / Back Button */}
        <div className="guide-wrapper">
          <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
        </div>

        {/* Header Section */}
        <header className="portal-header">
          <h1 className="portal-title">TOURNAMENT GUIDE</h1>
          <p className="portal-subtitle">
            Welcome to the Road to Glory Guide. Learn the point systems, rules, exchanges, and events.
          </p>
        </header>

        {/* Layout with Sidebar Navigation and Content Area */}
        <div className="guide-layout">
          {/* Sticky Sidebar Navigation (Desktop) */}
          <aside className="guide-sidebar">
            <div className="guide-sidebar-title">Table of Contents</div>
            {sections.map((sec) => (
              <button 
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`sidebar-link ${activeSection === sec.id ? "active" : ""}`}
              >
                <i className={`fas ${sec.icon}`}></i>
                <span>{sec.label}</span>
              </button>
            ))}
          </aside>

          {/* Scrolling Content Area */}
          <div className="guide-content-area">
            {/* Section 1: FAQs */}
            <section id="faqs" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-question-circle" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Career Mode FAQs
              </h2>
              <p className="section-text" style={{ marginBottom: "1.5rem" }}>
                Frequently asked questions about how to play career mode in Road to Glory.
              </p>
              
              <div className="faq-accordion">
                {/* FAQ 1 */}
                <div className={`faq-item ${openFaq === "faq-1" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("faq-1")}>
                    <span>How to play career mode?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    Buy players through auction and use these players only to make the squad to compete in R2G.
                  </div>
                </div>

                {/* FAQ 2 */}
                <div className={`faq-item ${openFaq === "faq-2" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("faq-2")}>
                    <span>How to buy players through auction?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    Each franchise has club coins as their bank balance. They can use this amount to bid and buy <span className="highlight">5☆</span>, <span className="highlight">4☆</span> and <span className="highlight">3☆</span> players during player auction.
                  </div>
                </div>

                {/* FAQ 3 */}
                <div className={`faq-item ${openFaq === "faq-3" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("faq-3")}>
                    <span>How do each franchise gets their R2G Coins?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    Whenever a new franchise is registered they are rewarded with a total of <span className="highlight">1500</span> R2G Coins and <span className="highlight">100</span> R2G Tokens. Each club will also get R2G Coins by their performance in each match but this coins will only add during the season end.
                  </div>
                </div>

                {/* FAQ 4 */}
                <div className={`faq-item ${openFaq === "faq-4" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("faq-4")}>
                    <span>What are the other use or purpose of R2G Coins?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    R2G Coins can be used during the transfer market and also R2G Coins are used to pay the player salary.
                  </div>
                </div>

                {/* FAQ 5 */}
                <div className={`faq-item ${openFaq === "faq-5" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("faq-5")}>
                    <span>Do we lose players if their salary is not paid?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    No, we won't lose player. The franchise will only lose player when his contract comes to an end. At that time only he will be free agent. If salary is not paid, the player <span className="highlight">can't</span> be used for upcoming matches.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Road Map */}
            <section id="roadmap" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-map-marked-alt" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Road Map
              </h2>
              <p className="section-text">
                Follow our season roadmap to understand how the tournament progresses from start to finish.
              </p>
              <div className="roadmap-img-card" onClick={() => openModal("/assets/images/guide/auction1.webp")}>
                <Image src="/assets/images/guide/auction1.webp" alt="Road Map" width={600} height={400} style={{ width: "100%", height: "auto" }} />
              </div>
            </section>

            {/* Section 3: Card Types */}
            <section id="card-types" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-id-card" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Card Types
              </h2>
              <p className="section-text">
                Different card types represent various levels of player rarity and special abilities.
              </p>
              <div className="image-gallery">
                <div className="roadmap-img-card" style={{ flex: "1 1 250px", marginTop: 0 }} onClick={() => openModal("/assets/images/guide/auction4.webp")}>
                  <Image src="/assets/images/guide/auction4.webp" alt="Card Type 1" width={300} height={200} style={{ width: "100%", height: "auto" }} />
                </div>
                <div className="roadmap-img-card" style={{ flex: "1 1 250px", marginTop: 0 }} onClick={() => openModal("/assets/images/guide/auction5.webp")}>
                  <Image src="/assets/images/guide/auction5.webp" alt="Card Type 2" width={300} height={200} style={{ width: "100%", height: "auto" }} />
                </div>
              </div>
            </section>

            {/* Section 4: Point System */}
            <section id="points" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-chart-line" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Point System
              </h2>
              <p className="section-text">
                Understanding the point system used to calculate match performance and season standings.
              </p>
              <div className="roadmap-img-card" onClick={() => openModal("/assets/images/guide/pointsystem.jpg")}>
                <Image src="/assets/images/guide/pointsystem.jpg" alt="Point System" width={600} height={400} style={{ width: "100%", height: "auto" }} />
              </div>
            </section>

            {/* Section 5: Transfer Market */}
            <section id="transfers" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-exchange-alt" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Transfer Market
              </h2>
              <p className="section-text" style={{ marginBottom: "1.5rem" }}>
                The transfer market allows teams to buy, sell, loan, and trade players during specific periods.
              </p>
              
              <div className="faq-accordion">
                {/* Transfer FAQ 1 */}
                <div className={`faq-item ${openFaq === "trans-1" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("trans-1")}>
                    <span>When will be the transfer window for R2G?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    There will be two Transfer window for a season. The transfer window time will be given accordingly and during that time sale, swap and loan for a player can be done.
                  </div>
                </div>

                {/* Transfer FAQ 2 */}
                <div className={`faq-item ${openFaq === "trans-2" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("trans-2")}>
                    <span>How does loan transfer work?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    The loan amount is determined between the base price and auctioned price.
                  </div>
                </div>

                {/* Transfer FAQ 3 */}
                <div className={`faq-item ${openFaq === "trans-3" ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq("trans-3")}>
                    <span>Is free transfer allowed?</span>
                    <i className="fas fa-chevron-down faq-icon-indicator"></i>
                  </button>
                  <div className="faq-body">
                    No, free transfer is not allowed, but one can sale the player for interested club coins.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Match Guide */}
            <section id="match-guide" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-gavel" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Match Guide
              </h2>
              <p className="section-text" style={{ marginBottom: "1.5rem" }}>
                Follow these rules when playing matches in the Road to Glory tournament.
              </p>
              
              <ul className="qa-list" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <li className="faq-item active" style={{ borderLeft: "4px solid var(--solo-primary)", background: "rgba(236, 72, 153, 0.03)" }}>
                  <div className="faq-body" style={{ display: "block", maxHeight: "none", padding: "1.25rem 1.5rem", color: "#ffffff", fontWeight: 600 }}>
                    CAN ONLY USE PLAYERS BOUGHT FROM PLAYER AUCTION, IF NOT AVAILABLE CAN USE <span className="highlight">1☆</span> OR <span className="highlight">2☆</span> PLAYERS
                  </div>
                </li>
                <li className="faq-item active" style={{ borderLeft: "4px solid var(--solo-primary)", background: "rgba(236, 72, 153, 0.03)" }}>
                  <div className="faq-body" style={{ display: "block", maxHeight: "none", padding: "1.25rem 1.5rem", color: "#ffffff", fontWeight: 600 }}>
                    MATCH TIME:- 6 MINUTES
                  </div>
                </li>
                <li className="faq-item active" style={{ borderLeft: "4px solid var(--solo-primary)", background: "rgba(236, 72, 153, 0.03)" }}>
                  <div className="faq-body" style={{ display: "block", maxHeight: "none", padding: "1.25rem 1.5rem", color: "#ffffff", fontWeight: 600 }}>
                    PENALTY AND EXTRA TIME SHOULD BE OFF
                  </div>
                </li>
                <li className="faq-item active" style={{ borderLeft: "4px solid var(--solo-primary)", background: "rgba(236, 72, 153, 0.03)" }}>
                  <div className="faq-body" style={{ display: "block", maxHeight: "none", padding: "1.25rem 1.5rem", color: "#ffffff", fontWeight: 600 }}>
                    RANDOM CONDITION
                  </div>
                </li>
              </ul>
            </section>

            {/* Section 7: Match Bonus */}
            <section id="bonus" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-gift" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Match Bonus
              </h2>
              <p className="section-text">
                Earn special bonuses and rewards for performances during matches.
              </p>
              <div className="roadmap-img-card" onClick={() => openModal("/assets/images/guide/bonus.webp")}>
                <Image src="/assets/images/guide/bonus.webp" alt="Match Bonus" width={300} height={200} style={{ width: "100%", height: "auto" }} />
              </div>
            </section>

            {/* Section 8: Season Awards */}
            <section id="awards" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-trophy" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Season Awards
              </h2>
              <p className="section-text">
                End-of-season awards recognize top performers and achievements throughout the tournament.
              </p>
              <div className="roadmap-img-card" onClick={() => openModal("/assets/images/guide/awards.webp")}>
                <Image src="/assets/images/guide/awards.webp" alt="Season Awards" width={300} height={200} style={{ width: "100%", height: "auto" }} />
              </div>
            </section>

            {/* Section 9: Season Rewards */}
            <section id="rewards" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-award" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Season Rewards
              </h2>
              <p className="section-text">
                Earn RT rewards based on your division at the end of the season.
              </p>
              <div className="roadmap-img-card" onClick={() => openModal("/assets/images/guide/seasonrewards.jpg")}>
                <Image src="/assets/images/guide/seasonrewards.jpg" alt="Season Rewards" width={600} height={300} style={{ width: "100%", height: "auto" }} />
              </div>
            </section>

            {/* Section 10: Currency Type */}
            <section id="currency" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-money-bill-wave" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Currency Type
              </h2>
              <p className="section-text">
                Different currency types used in the auction system to purchase players and manage your franchise.
              </p>
              <div className="image-gallery">
                <div className="roadmap-img-card" style={{ flex: "1 1 200px", marginTop: 0 }} onClick={() => openModal("/assets/images/guide/voucher.jpg")}>
                  <Image src="/assets/images/guide/voucher.jpg" alt="R2G Voucher" width={300} height={200} style={{ width: "100%", height: "auto" }} />
                </div>
                <div className="roadmap-img-card" style={{ flex: "1 1 200px", marginTop: 0 }} onClick={() => openModal("/assets/images/guide/auction2.webp")}>
                  <Image src="/assets/images/guide/auction2.webp" alt="Currency Type Example 1" width={300} height={200} style={{ width: "100%", height: "auto" }} />
                </div>
                <div className="roadmap-img-card" style={{ flex: "1 1 200px", marginTop: 0 }} onClick={() => openModal("/assets/images/guide/auction3.webp")}>
                  <Image src="/assets/images/guide/auction3.webp" alt="Currency Type Example 2" width={300} height={200} style={{ width: "100%", height: "auto" }} />
                </div>
              </div>
            </section>

            {/* Section 11: Coin Exchange */}
            <section id="coin-exchange" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-ticket-alt" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> R2G Coin Exchange
              </h2>
              <p className="section-text">
                Exchange your Coins for R2G Vouchers, Tokens, and other valuable rewards.
              </p>
              <div className="roadmap-img-card" onClick={() => openModal("/assets/images/guide/voucherexchange.jpg")}>
                <Image src="/assets/images/guide/voucherexchange.jpg" alt="Voucher Exchange" width={600} height={300} style={{ width: "100%", height: "auto" }} />
              </div>
            </section>

            {/* Section 12: Token Exchange */}
            <section id="token-exchange" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-coins" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> R2G Token Exchange
              </h2>
              <p className="section-text">
                Exchange your R2G Tokens for RT points according to the rates shown below.
              </p>
              <div className="roadmap-img-card" onClick={() => openModal("/assets/images/guide/tokenexchange.jpg")}>
                <Image src="/assets/images/guide/tokenexchange.jpg" alt="Token Exchange" width={600} height={300} style={{ width: "100%", height: "auto" }} />
              </div>
            </section>

            {/* Section 13: Special Events */}
            <section id="events" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-star" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Special Events
              </h2>
              <p className="section-text" style={{ marginBottom: "1.5rem" }}>
                Limited-time community events with exclusive rewards and challenges. Join and enjoy unique formats and bonuses.
              </p>

              <div className="events-gallery" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* Event 1 */}
                <div className="event-item" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "1.5rem" }}>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/meetup.jpg")}>
                    <Image src="/assets/images/guide/meetup.jpg" alt="Meetup Event" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>

                {/* Event 2 */}
                <div className="event-item" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "1.5rem" }}>
                  <p className="section-text" style={{ color: "#ffffff", fontWeight: 600, fontSize: "1.05rem" }}>
                    🏆 WORLD SERIES CHAMPIONSHIP:
                  </p>
                  <p className="section-text" style={{ fontSize: "0.95rem", margin: "0.5rem 0 1rem 0" }}>
                    The ULTIMATE showdown of the year! This is THE championship everyone's been waiting for - happening once a year and open to ALL R2G players! Battle it out for EPIC rewards including exclusive jerseys, mystery boxes packed with surprises, and SO MUCH MORE! Don't miss your shot at GLORY! 🔥
                  </p>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/worldseries.jpg")}>
                    <Image src="/assets/images/guide/worldseries.jpg" alt="World Series Championship" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>

                {/* Event 3 */}
                <div className="event-item" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "1.5rem" }}>
                  <p className="section-text" style={{ color: "#ffffff", fontWeight: 600 }}>
                    R2G Prediction Event:
                  </p>
                  <p className="section-text" style={{ fontSize: "0.95rem", margin: "0.5rem 0 1rem 0" }}>
                    Predict match outcomes and tournament results to earn rewards based on your accuracy.
                  </p>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/prediction.jpg")}>
                    <Image src="/assets/images/guide/prediction.jpg" alt="R2G Prediction" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>

                {/* Event 4 */}
                <div className="event-item" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "1.5rem" }}>
                  <p className="section-text" style={{ color: "#ffffff", fontWeight: 600 }}>
                    eFootball POTW Event:
                  </p>
                  <p className="section-text" style={{ fontSize: "0.95rem", margin: "0.5rem 0 1rem 0" }}>
                    This event is based on POTW (Player of the Week) cards from eFootball.
                  </p>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/spinwin.jpg")}>
                    <Image src="/assets/images/guide/spinwin.jpg" alt="Spin & Win Event" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>

                {/* Event 5 */}
                <div className="event-item" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "1.5rem" }}>
                  <p className="section-text" style={{ color: "#ffffff", fontWeight: 600 }}>
                    Voucher Rewards:
                  </p>
                  <p className="section-text" style={{ fontSize: "0.95rem", margin: "0.5rem 0 1rem 0" }}>
                    Earn special vouchers through various events and activities.
                  </p>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/scratch.jpg")}>
                    <Image src="/assets/images/guide/scratch.jpg" alt="Scratch Cards" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>

                {/* Event 6 */}
                <div className="event-item" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "1.5rem" }}>
                  <p className="section-text" style={{ color: "#ffffff", fontWeight: 600 }}>
                    Voucher Crate:
                  </p>
                  <p className="section-text" style={{ fontSize: "0.95rem", margin: "0.5rem 0 1rem 0" }}>
                    Open voucher crates to discover valuable rewards and exclusive items.
                  </p>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/vouchercrate.jpg")}>
                    <Image src="/assets/images/guide/vouchercrate.jpg" alt="Voucher Crate" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>

                {/* Event 7 */}
                <div className="event-item" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "1.5rem" }}>
                  <p className="section-text" style={{ color: "#ffffff", fontWeight: 600 }}>
                    Voucher Packs:
                  </p>
                  <p className="section-text" style={{ fontSize: "0.95rem", margin: "0.5rem 0 1rem 0" }}>
                    Collect and open voucher packs to unlock exclusive rewards and bonuses.
                  </p>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/voucherpack.jpg")}>
                    <Image src="/assets/images/guide/voucherpack.jpg" alt="Voucher Pack" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>

                {/* Event 8 */}
                <div className="event-item" style={{ paddingBottom: 0 }}>
                  <p className="section-text" style={{ color: "#ffffff", fontWeight: 600 }}>
                    Wildcards:
                  </p>
                  <p className="section-text" style={{ fontSize: "0.95rem", margin: "0.5rem 0 1rem 0" }}>
                    Unlock the power to acquire unsold players from the transfer market! These players can be used by your team for 1 week, giving you tactical flexibility when you need it most.
                  </p>
                  <div className="roadmap-img-card" style={{ marginTop: 0 }} onClick={() => openModal("/assets/images/guide/wildcards.jpg")}>
                    <Image src="/assets/images/guide/wildcards.jpg" alt="Wildcards" width={500} height={300} style={{ width: "100%", height: "auto" }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 14: Important Notes */}
            <section id="important" className="glass-panel" style={{ margin: 0 }}>
              <h2 className="section-heading">
                <i className="fas fa-exclamation-circle" style={{ marginRight: "0.75rem", color: "var(--solo-primary)" }}></i> Important Notes
              </h2>
              
              <div className="faq-item active" style={{ borderLeft: "4px solid var(--solo-primary)", background: "rgba(236, 72, 153, 0.03)" }}>
                <div className="faq-body" style={{ display: "block", maxHeight: "none", padding: "1.5rem" }}>
                  <h3 style={{ color: "#ffffff", fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Administrative Notes</h3>
                  <ul className="portal-card-highlights" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <li style={{ color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-circle-info"></i> If there is any doubt or issue, contact admins directly and clear it as soon as possible.
                    </li>
                    <li style={{ color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-circle-info"></i> All decisions taken by admins will be final.
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="portal-footer">
          <div className="portal-status-bar">
            <div className="status-item">
              <span className="status-indicator online"></span>
              Guide Version: 2026.1
            </div>
            <div className="status-item">
              Solo Tour Handbook
            </div>
          </div>
          <div className="portal-copyright">
            &copy; 2026 Road to Glory. All rights reserved.
          </div>
        </footer>
      </div>

      {/* High-Fidelity Blurred Backdrop Modal */}
      <div 
        className={`guide-modal ${modalImage ? "active" : ""}`}
        onClick={closeModal}
      >
        <button className="close-guide-modal" onClick={closeModal}>
          <i className="fas fa-times"></i>
        </button>
        {modalImage && (
          <div className="guide-modal-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={modalImage} 
              alt="Roadmap Enlarged" 
              style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
