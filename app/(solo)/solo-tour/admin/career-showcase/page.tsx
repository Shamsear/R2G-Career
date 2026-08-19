"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  fetchCareerTournaments, 
  saveCareerTournament, 
  deleteCareerTournament 
} from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../../portal.css";

interface TournamentCard {
  id: number;
  name: string;
  category: "division" | "european" | "special";
  img1: string;
  img2: string;
  display_order: number;
}

export default function CareerShowcaseAdmin() {
  const [tournaments, setTournaments] = useState<TournamentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<"division" | "european" | "special">("division");
  const [formImg1, setFormImg1] = useState("");
  const [formImg2, setFormImg2] = useState("");
  const [formOrder, setFormOrder] = useState<number>(0);

  // Image Uploading States
  const [uploadingImg1, setUploadingImg1] = useState(false);
  const [uploadingImg2, setUploadingImg2] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadData() {
    try {
      const data = await fetchCareerTournaments();
      setTournaments(data || []);
    } catch (e) {
      console.error("Failed to load career tournaments:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleImg1Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg1(true);
    setMessage(null);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `logo-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: '/solo/showcase'
      });
      setFormImg1(res.url);
      setMessage({ text: "Logo image uploaded successfully!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Logo upload failed", type: "error" });
    } finally {
      setUploadingImg1(false);
    }
  };

  const handleImg2Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg2(true);
    setMessage(null);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `standings-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: '/solo/showcase'
      });
      setFormImg2(res.url);
      setMessage({ text: "Standings image uploaded successfully!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Standings upload failed", type: "error" });
    } finally {
      setUploadingImg2(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormCategory("division");
    setFormImg1("");
    setFormImg2("");
    setFormOrder(tournaments.length + 1);
    setShowModal(true);
  };

  const openEditModal = (t: TournamentCard) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormImg1(t.img1);
    setFormImg2(t.img2);
    setFormOrder(t.display_order);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formImg1.trim() || !formImg2.trim()) {
      setMessage({ text: "Please fill in all fields.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await saveCareerTournament({
        id: editingId || undefined,
        name: formName,
        category: formCategory,
        img1: formImg1,
        img2: formImg2,
        display_order: Number(formOrder),
      });

      setMessage({ 
        text: editingId ? "Tournament card updated successfully!" : "New tournament card added successfully!", 
        type: "success" 
      });
      setShowModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
      setMessage({ text: "Failed to save tournament card.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tournament card?")) return;

    setDeletingId(id);
    setMessage(null);
    try {
      await deleteCareerTournament(id);
      setMessage({ text: "Tournament card deleted successfully!", type: "success" });
      await loadData();
    } catch (e) {
      console.error(e);
      setMessage({ text: "Failed to delete tournament card.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const categories = [
    { key: "division", label: "Division Leagues", icon: "fa-solid fa-layer-group" },
    { key: "european", label: "European Cups", icon: "fa-solid fa-earth-europe" },
    { key: "special", label: "Special Tours", icon: "fa-solid fa-star" },
  ];

  if (loading) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading showcase admin..." />
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div style={{ maxWidth: "1400px", width: "95%", margin: "0 auto", padding: "1.5rem 1rem 4rem", position: "relative", zIndex: 2 }}>
        
        {/* Navigation Breadcrumb */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem" }}>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Panel
          </Link>
        </div>

        {/* Hero Header */}
        <div className="portal-header" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="portal-page-badge">
            <i className="fa-solid fa-sitemap" />
            Showcase Management
          </div>
          <h1 className="portal-title" style={{ fontSize: "2.25rem", margin: "0.5rem 0" }}>CAREER SHOWCASE ADMIN</h1>
          <p className="portal-subtitle" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Add, update, or remove tournament cards displayed on the public Career Showcase page.
          </p>
        </div>

        {/* Feedback Messages */}
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

        {/* Add Card Floating / Header Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <button onClick={openAddModal} className="portal-btn btn-primary" style={{ padding: "10px 20px" }}>
            <i className="fa-solid fa-plus" style={{ marginRight: "8px" }} /> Add Tournament Card
          </button>
        </div>

        {/* Showcase Categories and Cards list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {categories.map((cat) => {
            const list = tournaments.filter(t => t.category === cat.key);
            return (
              <div key={cat.key} style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "16px", padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.75rem" }}>
                  <i className={cat.icon} style={{ color: "var(--rose)", fontSize: "1.2rem" }} />
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{cat.label}</h2>
                  <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "10px", color: "var(--text-secondary)", marginLeft: "4px" }}>
                    {list.length} {list.length === 1 ? "card" : "cards"}
                  </span>
                </div>

                {list.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    No tournament cards registered in this category. Click "Add Tournament Card" to create one.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
                    {list.map((t) => (
                      <div key={t.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "14px", overflow: "hidden" }}>
                        
                        {/* Title Header */}
                        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff" }}>{t.name}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>Order: {t.display_order}</span>
                        </div>

                        {/* Image Previews */}
                        <div style={{ padding: "1.25rem" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
                            <div>
                              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Logo Image</div>
                              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
                                <img src={t.img1} alt={t.name} style={{ width: "100%", height: "auto", display: "block" }} onError={(e) => { e.currentTarget.src = "/assets/images/default-club-logo.png"; }} />
                              </div>
                              <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.img1}>{t.img1}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Standings Image</div>
                              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
                                <img src={t.img2} alt={t.name} style={{ width: "100%", height: "auto", display: "block" }} onError={(e) => { e.currentTarget.src = "/assets/images/default-club-logo.png"; }} />
                              </div>
                              <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.img2}>{t.img2}</div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button onClick={() => openEditModal(t)} className="portal-btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.75rem" }}>
                              <i className="fa-solid fa-pen-to-square" style={{ marginRight: "6px" }} /> Edit
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="portal-btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.75rem", borderColor: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }} disabled={deletingId === t.id}>
                              {deletingId === t.id ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-trash-can" style={{ marginRight: "6px" }} />} Delete
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="guide-modal active" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="guide-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "90%", background: "#0c0d12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "2rem", position: "relative" }}>
            <button className="close-guide-modal" onClick={() => setShowModal(false)} style={{ top: "1.5rem", right: "1.5rem" }}>
              <i className="fas fa-times" />
            </button>

            <h2 style={{ fontFamily: "var(--font-display)", color: "#fff", fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
              {editingId ? "Edit Showcase Card" : "New Showcase Card"}
            </h2>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Card Name / Title</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="e.g. DIVISION ONE"
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Showcase Category</label>
                <select 
                  value={formCategory} 
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  <option value="division" style={{ background: "#0c0d12" }}>Division League</option>
                  <option value="european" style={{ background: "#0c0d12" }}>European Cup</option>
                  <option value="special" style={{ background: "#0c0d12" }}>Special Tour</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Logo Image (img1)</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="text" 
                    value={formImg1} 
                    onChange={(e) => setFormImg1(e.target.value)} 
                    placeholder="URL or Upload Image"
                    style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem" }}
                    required
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="img1-file-upload-input" 
                    style={{ display: "none" }} 
                    onChange={handleImg1Upload}
                    disabled={uploadingImg1}
                  />
                  <label 
                    htmlFor="img1-file-upload-input" 
                    className="portal-btn btn-secondary" 
                    style={{ display: "inline-flex", padding: "10px 16px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "10px", whiteSpace: "nowrap", alignItems: "center", justifyContent: "center" }}
                  >
                    {uploadingImg1 ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Standings Image (img2)</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="text" 
                    value={formImg2} 
                    onChange={(e) => setFormImg2(e.target.value)} 
                    placeholder="URL or Upload Image"
                    style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem" }}
                    required
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="img2-file-upload-input" 
                    style={{ display: "none" }} 
                    onChange={handleImg2Upload}
                    disabled={uploadingImg2}
                  />
                  <label 
                    htmlFor="img2-file-upload-input" 
                    className="portal-btn btn-secondary" 
                    style={{ display: "inline-flex", padding: "10px 16px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "10px", whiteSpace: "nowrap", alignItems: "center", justifyContent: "center" }}
                  >
                    {uploadingImg2 ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
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
                  {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Save Card"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
