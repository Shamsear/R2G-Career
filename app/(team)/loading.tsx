import FullPageLoader from "@/components/common/FullPageLoader";

export default function TeamLoading() {
  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
      <FullPageLoader
        title="ROAD TO GLORY"
        subtitle="Loading squad & auction data..."
        accentColor="#3b82f6"
        secondaryColor="#60a5fa"
        icon="fa-futbol"
      />
    </div>
  );
}
