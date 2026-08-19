"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSoloGuideAssets, saveSoloGuideAsset } from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../../portal.css";
import "../admin.css";

interface GuideAsset {
  id: number;
  asset_key: string;
  label: string;
  image_url: string;
}

export default function TournamentGuideAdmin() {
  const [assets, setAssets] = useState<GuideAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadAssets = async () => {
    try {
      const data = await fetchSoloGuideAssets();
      setAssets(data || []);
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error loading guide assets!", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setMessage(null);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `guide-${editingKey}-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: '/solo/guide'
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

  const openEditModal = (asset: GuideAsset) => {
    setEditingKey(asset.asset_key);
    setFormLabel(asset.label);
    setFormImageUrl(asset.image_url);
    setMessage(null);
    setShowModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImageUrl.trim()) {
      setMessage({ text: "Please provide an image URL or upload one.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await saveSoloGuideAsset(editingKey, formLabel.trim(), formImageUrl.trim());
      if (res.success) {
        setMessage({ text: "Guide asset updated successfully!", type: "success" });
        setShowModal(false);
        await loadAssets();
      } else {
        setMessage({ text: res.error || "Failed to update guide asset", type: "error" });
      }
    } catch (e: any) {
      console.error(e);
      setMessage({ text: e.message || "Failed to save guide asset.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading handbook console..." />
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
            <i className="fa-solid fa-book" />
            Tournament Guide Console
          </div>
          <h1 className="portal-title" style={{ fontSize: "2.25rem", margin: "0.5rem 0" }}>TOURNAMENT GUIDE MANAGER</h1>
          <p className="portal-subtitle" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Upload, update, and manage the visual assets and posters used across the handbook/guide sections.
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

        {/* Info Box */}
        <div style={{ padding: "1.25rem 1.75rem", marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)", borderRadius: "16px" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
            📖 Handbook Assets: <span style={{ color: "var(--solo-primary)" }}>{assets.length} images mapped in DB</span>
          </span>
        </div>

        {/* Assets Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {assets.map((asset) => (
            <div key={asset.id} style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "16px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", background: "var(--solo-primary-glow)", color: "var(--solo-primary)", padding: "2px 8px", borderRadius: "8px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  {asset.asset_key}
                </span>
              </div>
              <h3 style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 700, margin: 0 }}>
                {asset.label}
              </h3>
              
              {/* Image Frame */}
              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}>
                <img src={asset.image_url} alt={asset.label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.src = "/assets/images/default-club-logo.png"; }} />
              </div>

              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={asset.image_url}>
                {asset.image_url}
              </div>

              <button 
                onClick={() => openEditModal(asset)} 
                className="portal-btn btn-secondary" 
                style={{ width: "100%", justifyContent: "center", fontSize: "0.78rem", padding: "6px" }}
              >
                <i className="fa-solid fa-pen-to-square" style={{ marginRight: "6px" }} /> Edit Poster
              </button>
            </div>
          ))}
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
              Edit Handbook Poster
            </h2>

            <form onSubmit={handleSaveAsset} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Asset Key</label>
                <input 
                  type="text" 
                  value={editingKey} 
                  disabled
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px", color: "var(--text-muted)", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Label / Title</label>
                <input 
                  type="text" 
                  value={formLabel} 
                  onChange={(e) => setFormLabel(e.target.value)} 
                  placeholder="Asset Description label"
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Poster Image URL</label>
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
                    id="guide-upload-input" 
                    style={{ display: "none" }} 
                    onChange={handleFileUpload}
                    disabled={uploadingImage}
                  />
                  <label 
                    htmlFor="guide-upload-input" 
                    className="portal-btn btn-secondary" 
                    style={{ display: "inline-flex", padding: "10px 16px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "10px", whiteSpace: "nowrap", alignItems: "center", justifyContent: "center" }}
                  >
                    {uploadingImage ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowModal(false)} className="portal-btn btn-secondary" style={{ padding: "8px 18px", fontSize: "0.8rem" }}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn btn-primary" style={{ padding: "8px 24px", fontSize: "0.8rem" }} disabled={saving}>
                  {saving ? <i className="fa-solid fa-spinner fa-spin" /> : "Save Poster"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
