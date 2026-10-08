import FullPageLoader from "@/components/common/FullPageLoader";

export default function RwsLoading() {
  return (
    <div className="portal-root-wrapper" style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <FullPageLoader
        title="R2G // WORLD SERIES"
        subtitle="Loading world series arena..."
        accentColor="#a855f7"
        secondaryColor="#c084fc"
        icon="fa-earth-americas"
      />
    </div>
  );
}
