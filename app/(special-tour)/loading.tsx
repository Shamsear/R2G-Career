import FullPageLoader from "@/components/common/FullPageLoader";

export default function SpecialTourLoading() {
  return (
    <div className="portal-root-wrapper" style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <FullPageLoader
        title="R2G // SPECIAL TOUR"
        subtitle="Loading tournament fixtures & standings..."
        accentColor="#06b6d4"
        secondaryColor="#22d3ee"
        icon="fa-shield-halved"
      />
    </div>
  );
}
