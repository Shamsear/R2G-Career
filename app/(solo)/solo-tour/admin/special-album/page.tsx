"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchTournamentsByType,
  fetchSpecialTourAlbumPhotos,
  addSpecialTourAlbumPhoto,
  deleteSpecialTourAlbumPhoto
} from "@/utils/solo/serverActions";

function SpecialAlbumManagerContent() {
  const searchParams = useSearchParams();
  const initialTourneyId = searchParams.get("id") ? parseInt(searchParams.get("id") as string, 10) : null;

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourneyId, setSelectedTourneyId] = useState<number | null>(initialTourneyId);
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [photoForm, setPhotoForm] = useState({
    title: "",
    tag: "Matchday",
    imageUrl: "",
    dateStr: ""
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function loadTournaments() {
      try {
        const list = await fetchTournamentsByType("special");
        setTournaments(list || []);
        if (!selectedTourneyId && list && list.length > 0) {
          setSelectedTourneyId(list[0].id);
        }
      } catch (err) {
        console.error("Error loading special tournaments:", err);
      }
    }
    loadTournaments();
  }, []);

  const loadPhotos = async (tId: number) => {
    try {
      const data = await fetchSpecialTourAlbumPhotos(tId);
      setAlbumPhotos(data || []);
    } catch {
      showToast("Error loading album photos!");
    }
  };

  useEffect(() => {
    if (selectedTourneyId) {
      loadPhotos(selectedTourneyId);
    } else {
      setAlbumPhotos([]);
    }
  }, [selectedTourneyId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `special-album-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: '/solo/special-album'
      });
      setPhotoForm(prev => ({
        ...prev,
        imageUrl: res.url
      }));
      showToast("Photo uploaded successfully to ImageKit!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourneyId) return showToast("Please select a Special Tournament!");
    if (!photoForm.title || !photoForm.imageUrl || !photoForm.dateStr) return showToast("All photo fields are required!");

    startTransition(async () => {
      try {
        await addSpecialTourAlbumPhoto(
          selectedTourneyId,
          photoForm.title,
          photoForm.tag,
          photoForm.imageUrl,
          photoForm.dateStr
        );
        showToast("Photo added to Special Tour album!");
        setPhotoForm({ title: "", tag: "Matchday", imageUrl: "", dateStr: "" });
        loadPhotos(selectedTourneyId);
      } catch {
        showToast("Error uploading photo!");
      }
    });
  };

  const handleDeletePhoto = (id: number) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    startTransition(async () => {
      try {
        await deleteSpecialTourAlbumPhoto(id);
        showToast("Photo deleted!");
        if (selectedTourneyId) loadPhotos(selectedTourneyId);
      } catch {
        showToast("Error deleting photo!");
      }
    });
  };

  const selectedTourney = tournaments.find(t => t.id === selectedTourneyId);

  return (
    <div className="portal-root-wrapper" data-module="album">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container">
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-camera-retro" /> Special Tour Gallery</div>
          <h1 className="portal-title">SPECIAL TOUR ALBUM</h1>
          <p className="portal-subtitle">Upload ceremony photos, matchday snapshots, and trophy presentation highlights dynamically to Special Tournaments.</p>
        </div>

        {/* Tournament Selector */}
        <div className="admin-card">
          <div className="admin-form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem", display: "block" }}>
              <i className="fa-solid fa-trophy" style={{ color: "#c084fc", marginRight: "6px" }} /> Select Special Tournament
            </label>
            <select
              className="admin-select"
              value={selectedTourneyId || ""}
              onChange={(e) => setSelectedTourneyId(parseInt(e.target.value, 10))}
              style={{ fontSize: "0.9rem", padding: "10px 14px", borderRadius: "10px" }}
            >
              {tournaments.length === 0 && <option value="">No Special Tournaments available</option>}
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Card */}
        {selectedTourneyId && (
          <div className="admin-card">
            <h2 className="admin-card-title">
              <i className="fa-solid fa-cloud-arrow-up" /> Upload Photo for {selectedTourney?.name}
            </h2>

            <form onSubmit={handleAddPhoto}>
              <div className="sub-card">
                <div className="sub-card-title"><i className="fa-solid fa-pen-to-square" /> Photo Details</div>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label><i className="fa-solid fa-heading" /> Photo Title</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={photoForm.title}
                      onChange={(e) => setPhotoForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Special Cup Final Ceremony"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label><i className="fa-solid fa-tag" /> Tag (Category)</label>
                    <select
                      className="admin-select"
                      value={photoForm.tag}
                      onChange={(e) => setPhotoForm(prev => ({ ...prev, tag: e.target.value }))}
                    >
                      <option value="Ceremony">Ceremony</option>
                      <option value="Matchday">Matchday</option>
                      <option value="Highlights">Highlights</option>
                      <option value="Banquet">Banquet</option>
                      <option value="Draft">Draft</option>
                      <option value="Stadium">Stadium</option>
                      <option value="Trophy">Trophy</option>
                    </select>
                  </div>
                </div>
                <div className="admin-form-grid" style={{ marginTop: "0.5rem" }}>
                  <div className="admin-form-group">
                    <label><i className="fa-solid fa-link" /> Image URL (or upload file)</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="text"
                        className="admin-input"
                        style={{ flex: 1 }}
                        value={photoForm.imageUrl}
                        onChange={(e) => setPhotoForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                      />
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        id="special-album-file-upload"
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                      />
                      <label
                        htmlFor="special-album-file-upload"
                        className="portal-btn btn-secondary"
                        style={{
                          display: "inline-flex",
                          padding: "8px 12px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          height: "38px",
                          alignItems: "center",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          pointerEvents: uploadingImage ? "none" : "auto"
                        }}
                      >
                        {uploadingImage ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading...</> : <><i className="fa-solid fa-cloud-arrow-up" /> Upload Photo</>}
                      </label>
                    </div>
                  </div>
                  <div className="admin-form-group">
                    <label><i className="fa-solid fa-calendar-day" /> Date String</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={photoForm.dateStr}
                      onChange={(e) => setPhotoForm(prev => ({ ...prev, dateStr: e.target.value }))}
                      placeholder="e.g. July 2026"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-btn-row">
                <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                  <i className="fa-solid fa-cloud-arrow-up" /> Upload Photo Card
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Gallery Table */}
        <div className="admin-card">
          <h2 className="admin-card-title"><i className="fa-solid fa-table-cells-large" /> Album Gallery</h2>

          {albumPhotos.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-solid fa-photo-film" />
              No photos uploaded for this Special Tournament yet. Use the form above to add your first photo.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-list-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Title</th>
                    <th>Tag</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {albumPhotos.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10,
                          overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(0,0,0,0.3)", flexShrink: 0
                        }}>
                          <img
                            src={p.image_url || p.imageUrl}
                            alt={p.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      </td>
                      <td><strong>{p.title}</strong></td>
                      <td>
                        <span className="badge-info">#{p.tag}</span>
                      </td>
                      <td>{p.date_str}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="portal-btn btn-danger" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => handleDeletePhoto(p.id)}>
                          <i className="fa-solid fa-trash-can" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpecialAlbumManager() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "4rem", color: "#fff" }}>Loading Album Manager...</div>}>
      <SpecialAlbumManagerContent />
    </Suspense>
  );
}
