import FullPageLoader from "@/components/common/FullPageLoader";

export default function PredictionLoading() {
  return (
    <div className="portal-root-wrapper" style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <FullPageLoader
        title="MASTER OF PREDICTION"
        subtitle="Loading predictions & leaderboards..."
        accentColor="#fbbf24"
        secondaryColor="#fde047"
        icon="fa-crown"
      />
    </div>
  );
}
