"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { 
  fetchSeasonsList, 
  createSoloSeason, 
  fetchSoloTrophyCabinetItems, 
  addSoloTrophyCabinetItem, 
  deleteSoloTrophyCabinetItem,
  updateSoloTrophyCabinetItem,
  reorderSoloTrophyCabinetItem
} from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../../portal.css";
import "../admin.css";

interface CabinetItem {
  id: number;
  season_key: string;
  category: "trophy" | "award";
  image_url: string;
  display_order: number;
}

export default function SoloTrophyCabinetManager() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Create Season Form
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState<number | "">("");
  const [makeActive, setMakeActive] = useState<boolean>(false);
  const [carryOver, setCarryOver] = useState<boolean>(true);

  // Edit / Add Item Form Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSeasonKey, setFormSeasonKey] = useState("season7");
  const [formCategory, setFormCategory] = useState<"trophy" | "award">("trophy");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formOrder, setFormOrder] = useState<number>(1);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadAllData = async () => {
    try {
      const seasonList = await fetchSeasonsList();
      setSeasons(seasonList || []);
      
      const items = await fetchSoloTrophyCabinetItems();
      setCabinetItems(items || []);
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error loading cabinet database data!", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonNumber || isNaN(Number(newSeasonNumber))) {
      setMessage({ text: "Please enter a valid season number.", type: "error" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSoloSeason(
          Number(newSeasonNumber),
          makeActive,
          carryOver,
          true, 
          2026 + (Number(newSeasonNumber) - 9), 
          1500, 
          50,   
          5,    
          2000, 
          80,   
          10    
        );

        if (res.success) {
          setMessage({ text: `✅ Created Season ${newSeasonNumber} successfully!`, type: "success" });
          setShowCreateSeason(false);
          setNewSeasonNumber("");
          await loadAllData();
        } else {
          setMessage({ text: "Failed to create season", type: "error" });
        }
      } catch (err: any) {
        setMessage({ text: err.message || "Error creating season!", type: "error" });
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setMessage(null);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `trophy-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: '/solo/trophies'
      });
      setFormImageUrl(res.url);
      setMessage({ text: "Image uploaded successfully to ImageKit!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Upload failed", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  const openAddModal = (initialSeasonKey?: string) => {
    setEditingId(null);
    setFormSeasonKey(initialSeasonKey || "season7");
    setFormCategory("trophy");
    setFormImageUrl("");
    
    const count = cabinetItems.filter(item => item.season_key === (initialSeasonKey || "season7")).length;
    setFormOrder(count + 1);
    setShowModal(true);
  };

  const openEditModal = (item: CabinetItem) => {
    setEditingId(item.id);
    setFormSeasonKey(item.season_key);
    setFormCategory(item.category);
    setFormImageUrl(item.image_url);
    setFormOrder(item.display_order);
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImageUrl.trim()) {
      setMessage({ text: "Please provide an image URL or upload one.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        const res = await updateSoloTrophyCabinetItem({
          id: editingId,
          seasonKey: formSeasonKey,
          category: formCategory,
          imageUrl: formImageUrl.trim(),
          displayOrder: Number(formOrder)
        });

        if (res.success) {
          setMessage({ text: "Cabinet item updated successfully!", type: "success" });
          setShowModal(false);
          await loadAllData();
        } else {
          setMessage({ text: res.error || "Failed to update item", type: "error" });
        }
      } else {
        const res = await addSoloTrophyCabinetItem(formSeasonKey, formCategory, formImageUrl.trim());
        if (res.success) {
          setMessage({ text: "New item added successfully to cabinet!", type: "success" });
          setShowModal(false);
          await loadAllData();
        } else {
          setMessage({ text: res.error || "Failed to add item", type: "error" });
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessage({ text: e.message || "Failed to save cabinet item.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to remove this item from the cabinet?")) return;
    setMessage(null);
    try {
      const res = await deleteSoloTrophyCabinetItem(id);
      if (res.success) {
        setMessage({ text: "Item removed from cabinet successfully!", type: "success" });
        await loadAllData();
      } else {
        setMessage({ text: "Failed to delete item", type: "error" });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Error deleting item from cabinet!", type: "error" });
    }
  };

  const handleReorder = async (current: CabinetItem, direction: "up" | "down", siblingList: CabinetItem[]) => {
    const currentIndex = siblingList.findIndex(t => t.id === current.id);
    if (currentIndex === -1) return;

    let sibling: CabinetItem | null = null;
    if (direction === "up" && currentIndex > 0) {
      sibling = siblingList[currentIndex - 1];
    } else if (direction === "down" && currentIndex < siblingList.length - 1) {
      sibling = siblingList[currentIndex + 1];
    }

    if (!sibling) return;

    try {
      const res = await reorderSoloTrophyCabinetItem(current.id, sibling.display_order, sibling.id, current.display_order);
      if (res.success) {
        await loadAllData();
      } else {
        setMessage({ text: res.error || "Failed to reorder item", type: "error" });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Failed to reorder item", type: "error" });
    }
  };

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

  seasons.forEach(s => {
    const key = `season${s.season_number}`;
    if (!seasonOptions.find(o => o.value === key)) {
      seasonOptions.unshift({ value: key, label: `Season ${s.season_number}` });
    }
  });

  // Group items by season
  const groupedSeasons: Record<string, { trophies: CabinetItem[], awards: CabinetItem[] }> = {};
  cabinetItems.forEach((item) => {
    const key = item.season_key;
    if (!groupedSeasons[key]) {
      groupedSeasons[key] = { trophies: [], awards: [] };
    }
    if (item.category === 'trophy') {
      groupedSeasons[key].trophies.push(item);
    } else {
      groupedSeasons[key].awards.push(item);
    }
  });

  // Sort season keys descending
  const sortedSeasonKeys = Object.keys(groupedSeasons).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return numB - numA;
  });

  if (loading) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading legacy cabinet console..." />
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div style={{ maxWidth: "1400px", width: "95%", margin: "0 auto", padding: "1.5rem 1rem 4rem", position: "relative", zIndex: 2 }}>
        
        {/* Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem" }}>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        {/* Hero Header */}
        <div className="portal-header" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="portal-page-badge">
            <i className="fa-solid fa-trophy" />
            Trophy Cabinet Console
          </div>
          <h1 className="portal-title" style={{ fontSize: "2.25rem", margin: "0.5rem 0" }}>SOLO TROPHY CABINET</h1>
          <p className="portal-subtitle" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Manage the entire inventory of trophies and awards across all seasons on a single page.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div style={{
            padding: "1rem 1.5rem",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: message.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
            color: message.type === "success" ? "#34d399" : "#f87171"
          }}>
            <i className={message.type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation"} />
            <span>{message.text}</span>
          </div>
        )}

        {/* Action Bar */}
        <div style={{ padding: "1.25rem 1.75rem", marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)", borderRadius: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
              🏆 Cabinet Inventory: <span style={{ color: "var(--solo-primary)" }}>{cabinetItems.length} items registered</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setShowCreateSeason(!showCreateSeason)}
              className="portal-btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "8px 16px" }}
            >
              {showCreateSeason ? "✕ Close Season Form" : "+ Initialize Season"}
            </button>
            <button onClick={() => openAddModal()} className="portal-btn btn-primary" style={{ padding: "8px 20px" }}>
              <i className="fa-solid fa-plus" style={{ marginRight: "6px" }} /> Add Cabinet Item
            </button>
          </div>
        </div>

        {/* Create Season Collapsible Form */}
        {showCreateSeason && (
          <div style={{ padding: "1.5rem", marginBottom: "2rem", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)", borderRadius: "16px" }}>
            <form onSubmit={handleCreateSeason}>
              <h3 style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 700, marginBottom: "1rem" }}>
                Initialize New Season
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Season Number</label>
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
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff" }}
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
                    Make Active
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={carryOver}
                      onChange={(e) => setCarryOver(e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--solo-primary)" }}
                    />
                    Carry Over Rosters
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
          </div>
        )}

        {/* List of Seasons */}
        {sortedSeasonKeys.length === 0 ? (
          <div className="portal-card" style={{ padding: "4rem 2rem", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <i className="fa-solid fa-circle-xmark" style={{ fontSize: "2rem", color: "var(--rose)", marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "0.5rem" }}>No Cabinet Items Found</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: "450px", margin: "0 auto 1.5rem" }}>
              There are currently no trophies or awards registered in the database. Add your first item to initialize.
            </p>
            <button onClick={() => openAddModal()} className="portal-btn btn-primary">
              + Add First Item
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
            {sortedSeasonKeys.map((seasonKey) => {
              const seasonNum = seasonKey.replace(/\D/g, "");
              const sTrophies = groupedSeasons[seasonKey].trophies;
              const sAwards = groupedSeasons[seasonKey].awards;

              return (
                <div 
                  key={seasonKey}
                  style={{
                    background: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "20px",
                    padding: "1.75rem",
                    position: "relative"
                  }}
                >
                  {/* Season Title Header */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    paddingBottom: "1rem",
                    marginBottom: "1.75rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.72rem", background: "var(--solo-primary-glow)", color: "var(--solo-primary)", padding: "2px 8px", borderRadius: "8px", fontWeight: 700, textTransform: "uppercase" }}>Season {seasonNum}</span>
                      <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", margin: 0, textTransform: "uppercase" }}>SEASON {seasonNum} CABINET</h2>
                    </div>

                    <button 
                      onClick={() => openAddModal(seasonKey)} 
                      className="portal-btn btn-secondary" 
                      style={{ fontSize: "0.75rem", padding: "6px 14px" }}
                    >
                      + Add to Season {seasonNum}
                    </button>
                  </div>

                  {/* Columns */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                    
                    {/* Trophies Column */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem" }}>
                        <i className="fa-solid fa-trophy" style={{ color: "#ffd700", fontSize: "1.05rem" }} />
                        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: 0 }}>Trophies ({sTrophies.length})</h3>
                      </div>

                      {sTrophies.length === 0 ? (
                        <div style={{ padding: "2rem", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          No trophies registered.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
                          {sTrophies.map(item => (
                            <div key={item.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}>
                                <img src={item.image_url} alt="Trophy Preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.src = "/assets/images/default-club-logo.png"; }} />
                              </div>
                              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.image_url}>
                                {item.image_url}
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <button 
                                    onClick={() => handleReorder(item, "up", sTrophies)} 
                                    disabled={sTrophies.indexOf(item) === 0}
                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: sTrophies.indexOf(item) === 0 ? "not-allowed" : "pointer", opacity: sTrophies.indexOf(item) === 0 ? 0.3 : 1, padding: 0 }}
                                    title="Move Up"
                                  >
                                    <i className="fa-solid fa-arrow-up" />
                                  </button>
                                  <button 
                                    onClick={() => handleReorder(item, "down", sTrophies)} 
                                    disabled={sTrophies.indexOf(item) === sTrophies.length - 1}
                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: sTrophies.indexOf(item) === sTrophies.length - 1 ? "not-allowed" : "pointer", opacity: sTrophies.indexOf(item) === sTrophies.length - 1 ? 0.3 : 1, padding: 0 }}
                                    title="Move Down"
                                  >
                                    <i className="fa-solid fa-arrow-down" />
                                  </button>
                                  <span style={{ marginLeft: "2px" }}>Order: {item.display_order}</span>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button onClick={() => openEditModal(item)} style={{ background: "none", border: "none", color: "var(--solo-primary)", cursor: "pointer", padding: 0 }}><i className="fa-solid fa-pen-to-square" /></button>
                                  <button onClick={() => handleDeleteItem(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}><i className="fa-solid fa-trash" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Awards Column */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem" }}>
                        <i className="fa-solid fa-award" style={{ color: "#a855f7", fontSize: "1.05rem" }} />
                        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: 0 }}>Individual Awards ({sAwards.length})</h3>
                      </div>

                      {sAwards.length === 0 ? (
                        <div style={{ padding: "2rem", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          No individual awards registered.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
                          {sAwards.map(item => (
                            <div key={item.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}>
                                <img src={item.image_url} alt="Award Preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.src = "/assets/images/default-club-logo.png"; }} />
                              </div>
                              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.image_url}>
                                {item.image_url}
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <button 
                                    onClick={() => handleReorder(item, "up", sAwards)} 
                                    disabled={sAwards.indexOf(item) === 0}
                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: sAwards.indexOf(item) === 0 ? "not-allowed" : "pointer", opacity: sAwards.indexOf(item) === 0 ? 0.3 : 1, padding: 0 }}
                                    title="Move Up"
                                  >
                                    <i className="fa-solid fa-arrow-up" />
                                  </button>
                                  <button 
                                    onClick={() => handleReorder(item, "down", sAwards)} 
                                    disabled={sAwards.indexOf(item) === sAwards.length - 1}
                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: sAwards.indexOf(item) === sAwards.length - 1 ? "not-allowed" : "pointer", opacity: sAwards.indexOf(item) === sAwards.length - 1 ? 0.3 : 1, padding: 0 }}
                                    title="Move Down"
                                  >
                                    <i className="fa-solid fa-arrow-down" />
                                  </button>
                                  <span style={{ marginLeft: "2px" }}>Order: {item.display_order}</span>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button onClick={() => openEditModal(item)} style={{ background: "none", border: "none", color: "var(--solo-primary)", cursor: "pointer", padding: 0 }}><i className="fa-solid fa-pen-to-square" /></button>
                                  <button onClick={() => handleDeleteItem(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}><i className="fa-solid fa-trash" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="guide-modal active" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="guide-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "90%", background: "#0c0d12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "2rem", position: "relative" }}>
            <button className="close-guide-modal" onClick={() => setShowModal(false)} style={{ top: "1.5rem", right: "1.5rem" }}>
              <i className="fas fa-times" />
            </button>

            <h2 style={{ fontFamily: "var(--font-display)", color: "#fff", fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
              {editingId ? "Edit Cabinet Item" : "New Cabinet Item"}
            </h2>

            <form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Season Key</label>
                <select 
                  value={formSeasonKey} 
                  onChange={(e) => setFormSeasonKey(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  {seasonOptions.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ background: "#0c0d12" }}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Category</label>
                <select 
                  value={formCategory} 
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  <option value="trophy" style={{ background: "#0c0d12" }}>🏆 Season Trophy</option>
                  <option value="award" style={{ background: "#0c0d12" }}>🏅 Individual Award</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Trophy/Award Image</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="text" 
                    value={formImageUrl} 
                    onChange={(e) => setFormImageUrl(e.target.value)} 
                    placeholder="URL or Upload Image"
                    style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem" }}
                    required
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="trophy-upload-input" 
                    style={{ display: "none" }} 
                    onChange={handleFileUpload}
                    disabled={uploadingImage}
                  />
                  <label 
                    htmlFor="trophy-upload-input" 
                    className="portal-btn btn-secondary" 
                    style={{ display: "inline-flex", padding: "10px 16px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "10px", whiteSpace: "nowrap", alignItems: "center", justifyContent: "center" }}
                  >
                    {uploadingImage ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Display Order Sequence</label>
                <input 
                  type="number" 
                  value={formOrder} 
                  onChange={(e) => setFormOrder(Number(e.target.value))} 
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowModal(false)} className="portal-btn btn-secondary" style={{ padding: "8px 18px", fontSize: "0.8rem" }}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn btn-primary" style={{ padding: "8px 24px", fontSize: "0.8rem" }} disabled={saving}>
                  {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Save Item"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
