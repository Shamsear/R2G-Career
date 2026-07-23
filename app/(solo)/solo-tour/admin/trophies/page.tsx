"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import CustomSelect from "@/components/ui/CustomSelect";
import {
  fetchSeasonsList,
  createSoloSeason,
  fetchSoloTrophyCabinetItems,
  addSoloTrophyCabinetItem,
  deleteSoloTrophyCabinetItem
} from "@/utils/solo/serverActions";

export default function SoloTrophyCabinetManager() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonKey, setSelectedSeasonKey] = useState<string>("");
  const [cabinetItems, setCabinetItems] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Season Form
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState<number | "">("");
  const [makeActive, setMakeActive] = useState<boolean>(false);
  const [carryOver, setCarryOver] = useState<boolean>(true);

  // Add Item Form
  const [category, setCategory] = useState<"trophy" | "award">("trophy");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadSeasonsAndTrophies = async () => {
    try {
      const seasonList = await fetchSeasonsList();
      setSeasons(seasonList || []);
      
      // Determine default selected season key
      // If seasons exist, choose the active or latest one
      if (seasonList && seasonList.length > 0) {
        const active = seasonList.find(s => s.is_active) || seasonList[0];
        const defaultKey = `season${active.season_number}`;
        setSelectedSeasonKey(defaultKey);
        loadCabinetItems(defaultKey);
      } else {
        // Fallback to season7 if database has no seasons
        setSelectedSeasonKey("season7");
        loadCabinetItems("season7");
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading seasons data!");
    }
  };

  const loadCabinetItems = async (seasonKey: string) => {
    try {
      const items = await fetchSoloTrophyCabinetItems(seasonKey);
      setCabinetItems(items || []);
    } catch (err) {
      console.error(err);
      showToast("Error loading trophy cabinet items!");
    }
  };

  useEffect(() => {
    loadSeasonsAndTrophies();
  }, []);

  const handleSeasonChange = (val: string) => {
    setSelectedSeasonKey(val);
    loadCabinetItems(val);
  };

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonNumber || isNaN(Number(newSeasonNumber))) {
      return showToast("Please enter a valid season number.");
    }

    startTransition(async () => {
      try {
        const res = await createSoloSeason(
          Number(newSeasonNumber),
          makeActive,
          carryOver,
          true, // hosts RWS
          2026 + (Number(newSeasonNumber) - 9), // calculate RWS Year dynamically based on Season 9
          1500, // default RC
          50,   // default RT
          5,    // default Voucher
          2000, // default finale RC
          80,   // default finale RT
          10    // default finale Voucher
        );

        if (res.success) {
          showToast(`✅ Created Season ${newSeasonNumber} successfully!`);
          setShowCreateSeason(false);
          setNewSeasonNumber("");
          
          // Reload seasons list and set the newly created season as selected
          const seasonList = await fetchSeasonsList();
          setSeasons(seasonList || []);
          const newKey = `season${newSeasonNumber}`;
          setSelectedSeasonKey(newKey);
          loadCabinetItems(newKey);
        } else {
          showToast("Failed to create season");
        }
      } catch (err: any) {
        showToast(err.message || "Error creating season!");
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `trophy-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: '/solo/trophies'
      });
      setImageUrl(res.url);
      showToast("Image uploaded successfully to ImageKit!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonKey) return showToast("Please select a target season first!");
    if (!imageUrl.trim()) return showToast("Image URL or uploaded file is required!");

    startTransition(async () => {
      try {
        const res = await addSoloTrophyCabinetItem(selectedSeasonKey, category, imageUrl.trim());
        if (res.success) {
          showToast(`Successfully added ${category} to cabinet!`);
          setImageUrl("");
          loadCabinetItems(selectedSeasonKey);
        } else {
          showToast(res.error || "Error adding item");
        }
      } catch (err) {
        console.error(err);
        showToast("Error adding item to cabinet!");
      }
    });
  };

  const handleDeleteItem = (id: number) => {
    if (!confirm("Are you sure you want to remove this item from the cabinet?")) return;
    startTransition(async () => {
      try {
        const res = await deleteSoloTrophyCabinetItem(id);
        if (res.success) {
          showToast("Item removed from cabinet!");
          loadCabinetItems(selectedSeasonKey);
        } else {
          showToast("Error deleting item");
        }
      } catch (err) {
        console.error(err);
        showToast("Error deleting item from cabinet!");
      }
    });
  };

  // Compile options list for CustomSelect
  // We include legacy seasons (Season 1 and Season 2) as well as database seasons
  const seasonOptions = [
    { value: "season9", label: "Season 9" },
    { value: "season8", label: "Season 8" },
    { value: "season7", label: "Season 7" },
    { value: "season6", label: "Season 6" },
    { value: "season5", label: "Season 5" },
    { value: "season4", label: "Season 4" },
    { value: "season2", label: "Season 2 (Legacy)" },
    { value: "season1", label: "Season 1 (Legacy)" },
  ];

  // Merge any dynamically created database seasons that are not in the predefined list
  seasons.forEach(s => {
    const key = `season${s.season_number}`;
    if (!seasonOptions.find(o => o.value === key)) {
      seasonOptions.unshift({
        value: key,
        label: `Season ${s.season_number}`
      });
    }
  });

  const trophiesList = cabinetItems.filter(item => item.category === "trophy");
  const awardsList = cabinetItems.filter(item => item.category === "award");

  return (
    <div className="portal-root-wrapper" data-module="trophies">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        {/* Hero Header */}
        <div className="portal-header" style={{ marginBottom: "1.5rem" }}>
          <div className="portal-page-badge"><i className="fa-solid fa-trophy" /> Legacy Cabinet Console</div>
          <h1 className="portal-title">SOLO TROPHY CABINET</h1>
          <p className="portal-subtitle">Upload and manage trophies and individual award image grids for historical & active competitive seasons.</p>
        </div>

        {/* ── Season Selector & Inline Creator ── */}
        <div className="admin-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <i className="fa-solid fa-calendar-days" style={{ color: "var(--solo-primary)", fontSize: "1.2rem" }} />
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>Target Season:</span>
              <CustomSelect
                value={selectedSeasonKey}
                onChange={handleSeasonChange}
                options={seasonOptions}
                buttonStyle={{ width: "240px", justifyContent: "space-between" }}
              />
            </div>

            <button
              onClick={() => setShowCreateSeason(!showCreateSeason)}
              className="portal-btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "8px 16px" }}
            >
              {showCreateSeason ? "✕ Close Season Form" : "+ Create Season"}
            </button>
          </div>

          {/* Inline Create Season Form */}
          {showCreateSeason && (
            <form onSubmit={handleCreateSeason} style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 700, marginBottom: "1rem" }}>
                Initialize New Season
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-end" }}>
                <div className="admin-form-group" style={{ flex: "1 1 200px" }}>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Season Number</label>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="e.g. 10"
                    required
                    value={newSeasonNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSeasonNumber(val === "" ? "" : Number(val));
                    }}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={makeActive}
                      onChange={(e) => setMakeActive(e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--solo-primary)" }}
                    />
                    Make Active Immediately
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={carryOver}
                      onChange={(e) => setCarryOver(e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--solo-primary)" }}
                    />
                    Carry Over Wallets & Rosters
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="portal-btn btn-primary"
                  style={{ height: "42px", padding: "0 24px" }}
                >
                  {isPending ? "Creating..." : "Create Season"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Add Item Upload Card ── */}
        <div className="admin-card">
          <h2 className="admin-card-title"><i className="fa-solid fa-cloud-arrow-up" /> Upload Cabinet Item</h2>

          <form onSubmit={handleAddItem}>
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-circle-info" /> Item Configuration</div>
              
              <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
                
                {/* Category selector */}
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-tags" /> Item Category</label>
                  <CustomSelect
                    value={category}
                    onChange={(val) => setCategory(val as "trophy" | "award")}
                    options={[
                      { value: "trophy", label: "🏆 Season Trophy" },
                      { value: "award", label: "🏅 Individual Award" }
                    ]}
                    buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                  />
                </div>

                {/* Upload or input URL */}
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-image" /> Image File / Path</label>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <input
                      type="text"
                      className="admin-input"
                      style={{ flex: 1 }}
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="/assets/images/trophy/... or https://..."
                      required
                    />

                    <input
                      type="file"
                      accept="image/*"
                      id="trophy-file-uploader"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                    />

                    <label
                      htmlFor="trophy-file-uploader"
                      className="portal-btn btn-secondary"
                      style={{
                        display: "inline-flex",
                        padding: "8px 16px",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        height: "40px",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        pointerEvents: uploadingImage ? "none" : "auto"
                      }}
                    >
                      {uploadingImage ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading...</      > : <><i className="fa-solid fa-cloud-arrow-up" /> Upload</>}
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="admin-btn-row">
              <button type="submit" className="portal-btn btn-primary" disabled={isPending || uploadingImage}>
                <i className="fa-solid fa-plus" /> Add Item to Season Cabinet
              </button>
            </div>
          </form>
        </div>

        {/* ── Active Season Cabinet Visualizer ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "2rem" }}>
          
          {/* Trophies Grid Column */}
          <div className="admin-card" style={{ margin: 0 }}>
            <h2 className="admin-card-title" style={{ color: "#ffd700" }}>
              🏆 Trophies ({trophiesList.length})
            </h2>
            
            {trophiesList.length === 0 ? (
              <div className="admin-empty" style={{ padding: "3rem 1rem" }}>
                <i className="fa-solid fa-circle-xmark" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }} />
                No trophies registered for this season.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "1rem",
                padding: "1rem 0"
              }}>
                {trophiesList.map(item => (
                  <div key={item.id} style={{
                    position: "relative",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "10px",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={item.image_url} alt="Trophy Preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="portal-btn btn-danger"
                      style={{
                        padding: "2px 8px",
                        fontSize: "0.68rem",
                        width: "100%",
                        justifyContent: "center",
                        borderRadius: "6px"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Awards Grid Column */}
          <div className="admin-card" style={{ margin: 0 }}>
            <h2 className="admin-card-title" style={{ color: "#38bdf8" }}>
              🏅 Individual Awards ({awardsList.length})
            </h2>
            
            {awardsList.length === 0 ? (
              <div className="admin-empty" style={{ padding: "3rem 1rem" }}>
                <i className="fa-solid fa-circle-xmark" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }} />
                No individual awards registered for this season.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "1rem",
                padding: "1rem 0"
              }}>
                {awardsList.map(item => (
                  <div key={item.id} style={{
                    position: "relative",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "10px",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={item.image_url} alt="Award Preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="portal-btn btn-danger"
                      style={{
                        padding: "2px 8px",
                        fontSize: "0.68rem",
                        width: "100%",
                        justifyContent: "center",
                        borderRadius: "6px"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
