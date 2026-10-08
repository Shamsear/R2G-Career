import FullPageLoader from "@/components/common/FullPageLoader";

export default function SoloLoading() {
  return (
    <div className="portal-root-wrapper" style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <FullPageLoader
        title="R2G // SOLO CAREER"
        subtitle="Loading tacticians & career data..."
        accentColor="#f43f5e"
        secondaryColor="#fb7185"
        icon="fa-trophy"
      />
    </div>
  );
}
