import FullPageLoader from "@/components/common/FullPageLoader";

export default function PortalLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050608" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <FullPageLoader
        title="ROAD TO GLORY"
        subtitle="Loading portal gateway..."
        accentColor="#38bdf8"
        secondaryColor="#818cf8"
        icon="fa-bolt"
      />
    </div>
  );
}
