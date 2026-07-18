"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchAllClubs,
  updateClubDetails,
  createClub,
  deleteClub
} from "@/utils/solo/serverActions";

export default function ManageClubs() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [clubForm, setClubForm] = useState({
    id: "",
    name: "",
    logoPath: ""
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const data = await fetchAllClubs();
      setClubs(data || []);
    } catch (e) {
      console.error(e);
      showToast("Failed to load clubs.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClubs = useMemo(() => {
    return clubs.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clubs, searchQuery]);

  const clearForm = () => {
    setClubForm({
      id: "",
      name: "",
      logoPath: ""
    });
  };

  const handleSelectClub = (c: any) => {
    setClubForm({
      id: c.id.toString(),
      name: c.name,
      logoPath: c.logo_path || ""
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField("logo");
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `logo-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: '/solo/club-logos'
      });
      setClubForm(prev => ({
        ...prev,
        logoPath: res.url
      }));
      showToast("Logo uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubForm.name.trim()) return showToast("Club name is required!");

    startTransition(async () => {
      try {
        if (clubForm.id) {
          // Update
          await updateClubDetails(parseInt(clubForm.id), clubForm.name.trim(), clubForm.logoPath);
          showToast("Club details updated successfully!");
        } else {
          // Create
          const res = await createClub(clubForm.name.trim(), clubForm.logoPath);
          showToast("New club created successfully!");
          setClubForm(prev => ({ ...prev, id: res.id.toString() }));
        }
        loadData();
      } catch (err: any) {
        console.error(err);
        showToast("Error saving club.");
      }
    });
  };

  const handleDeleteClub = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await deleteClub(id);
        showToast("Club deleted successfully.");
        clearForm();
        loadData();
      } catch (err: any) {
        console.error(err);
        showToast("Failed to delete club. It might be assigned to a manager or active fixtures.");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="clubs">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" id="btn-back-to-admin">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-shield-halved" /> Clubs Database</div>
          <h1 className="portal-title">CLUBS MANAGER</h1>
          <p className="portal-subtitle">Configure, create, and update all clubs and logos registered in the system database.</p>
        </div>

        <div className="financial-layout">
          {/* Left Column: Clubs List */}
          <div className="financial-sidebar">
            <button className="portal-btn btn-primary" id="btn-new-club" style={{ width: "100%", justifyContent: "center" }} onClick={clearForm}>
              <i className="fa-solid fa-circle-plus" /> Register New Club
            </button>

            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "0.25rem" }}>
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: "0.85rem"
                }}
              />
              <input
                type="text"
                id="club-search-input"
                className="admin-input search-input-padding"
                style={{ paddingLeft: "34px", fontSize: "0.85rem" }}
                placeholder="Search clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="clubs-scroll-container">
              {filteredClubs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  No clubs found.
                </div>
              ) : (
                filteredClubs.map(c => {
                  const isSelected = clubForm.id === c.id.toString();
                  return (
                    <div
                      key={c.id}
                      id={`club-item-${c.id}`}
                      className={`club-card-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectClub(c)}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: isSelected ? "1px solid var(--accent-color)" : "1px solid rgba(255,255,255,0.05)",
                        background: isSelected ? "rgba(0, 102, 255, 0.08)" : "rgba(255,255,255,0.01)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        marginBottom: "8px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img
                          src={c.logo_path || '/assets/images/clubs/default.png'}
                          alt={c.name}
                          style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "4px" }}
                          onError={(e) => { (e.target as any).src = '/assets/images/clubs/default.png'; }}
                        />
                        <div>
                          <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem" }}>{c.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>ID: #{c.id}</span>
                        </div>
                      </div>
                      <button
                        className="portal-btn btn-danger"
                        id={`btn-delete-club-${c.id}`}
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClub(c.id, c.name);
                        }}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Edit/Create Form */}
          <div className="financial-main">
            <div className="admin-card">
              <h2 className="admin-card-title">
                <i className="fa-solid fa-file-pen" /> {clubForm.id ? "Edit Club Details" : "Register New Club"}
              </h2>

              <form onSubmit={handleSaveClub}>
                <div className="admin-form-grid" style={{ marginBottom: "1.5rem" }}>
                  <div className="admin-form-group">
                    <label>Club Name</label>
                    <input
                      type="text"
                      id="input-club-name"
                      className="admin-input"
                      value={clubForm.name}
                      onChange={(e) => setClubForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. London FC"
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Logo Path URL</label>
                    <input
                      type="text"
                      id="input-club-logo"
                      className="admin-input"
                      value={clubForm.logoPath}
                      onChange={(e) => setClubForm(prev => ({ ...prev, logoPath: e.target.value }))}
                      placeholder="e.g. /assets/images/clubs/london.png"
                    />
                    
                    <input
                      type="file"
                      accept="image/*"
                      id="club-file-upload-input"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                      disabled={uploadingField !== null}
                    />
                    <label
                      htmlFor="club-file-upload-input"
                      className="portal-btn btn-secondary"
                      id="btn-upload-logo"
                      style={{
                        display: "inline-flex",
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        marginTop: "8px",
                        width: "fit-content",
                        pointerEvents: uploadingField !== null ? "none" : "auto"
                      }}
                    >
                      {uploadingField === 'logo' ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> Uploading...</>
                      ) : (
                        <><i className="fa-solid fa-cloud-arrow-up" /> Upload Logo to ImageKit</>
                      )}
                    </label>
                  </div>
                </div>

                {/* Preview Card */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem"
                }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px"
                  }}>
                    <img
                      src={clubForm.logoPath || '/assets/images/clubs/default.png'}
                      alt="Logo Preview"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onError={(e) => { (e.target as any).src = '/assets/images/clubs/default.png'; }}
                    />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#fff", margin: "0 0 4px 0" }}>
                      {clubForm.name || "Club Name Preview"}
                    </h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {clubForm.id ? `ID: #${clubForm.id}` : "New Club (Unregistered)"}
                    </span>
                  </div>
                </div>

                <div className="admin-btn-row">
                  <button type="submit" className="portal-btn btn-primary" id="btn-save-club" disabled={isPending}>
                    {isPending ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                    ) : (
                      <><i className="fa-solid fa-floppy-disk" /> {clubForm.id ? "Update Club Details" : "Create Club"}</>
                    )}
                  </button>
                  {clubForm.id && (
                    <button type="button" className="portal-btn btn-secondary" id="btn-cancel-edit" onClick={clearForm}>
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
