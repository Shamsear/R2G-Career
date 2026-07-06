"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchRwsAlbumPhotos,
  addRwsAlbumPhoto,
  deleteRwsAlbumPhoto
} from "@/utils/solo/serverActions";

export default function RwsAlbumManager() {
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [photoForm, setPhotoForm] = useState({
    title: "",
    tag: "Matchday",
    imageUrl: "",
    dateStr: ""
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadPhotos = async () => {
    try {
      const data = await fetchRwsAlbumPhotos();
      setAlbumPhotos(data || []);
    } catch {
      showToast("Error loading album photos!");
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoForm.title || !photoForm.imageUrl || !photoForm.dateStr) return showToast("All photo fields are required!");
    startTransition(async () => {
      try {
        await addRwsAlbumPhoto(photoForm.title, photoForm.tag, photoForm.imageUrl, photoForm.dateStr);
        showToast("Photo added to RWS album!");
        setPhotoForm({ title: "", tag: "Matchday", imageUrl: "", dateStr: "" });
        loadPhotos();
      } catch {
        showToast("Error uploading photo!");
      }
    });
  };

  const handleDeletePhoto = (id: number) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    startTransition(async () => {
      try {
        await deleteRwsAlbumPhoto(id);
        showToast("Photo deleted!");
        loadPhotos();
      } catch {
        showToast("Error deleting photo!");
      }
    });
  };

  /* ── Derived stats ── */
  const tagCounts: Record<string, number> = {};
  albumPhotos.forEach(p => {
    tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1;
  });
  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

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
          <div className="portal-page-badge"><i className="fa-solid fa-images" /> RWS Gallery</div>
          <h1 className="portal-title">RWS ALBUM</h1>
          <p className="portal-subtitle">Upload gala ceremonies, draft boards, and final celebration photos dynamically to the R2G World Series album.</p>
        </div>

        {/* ── Stats Row ── */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Total Photos</div>
            <div className="stat-value">{albumPhotos.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Unique Tags</div>
            <div className="stat-value">{Object.keys(tagCounts).length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Top Category</div>
            <div className="stat-value">{topTag ? topTag[0] : "—"}</div>
          </div>
        </div>

        {/* ── Upload Card ── */}
        <div className="admin-card">
          <h2 className="admin-card-title"><i className="fa-solid fa-cloud-arrow-up" /> Upload Photo Card</h2>

          <form onSubmit={handleAddPhoto}>
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-pen-to-square" /> Photo Details</div>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-heading" /> Photo Title</label>
                  <input type="text" className="admin-input" value={photoForm.title} onChange={(e) => setPhotoForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Opening Ceremony Stage" />
                </div>
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-tag" /> Tag (Category)</label>
                  <select className="admin-select" value={photoForm.tag} onChange={(e) => setPhotoForm(prev => ({ ...prev, tag: e.target.value }))}>
                    <option value="Ceremony">Ceremony</option>
                    <option value="Matchday">Matchday</option>
                    <option value="Banquet">Banquet</option>
                    <option value="Draft">Draft</option>
                    <option value="Stadium">Stadium</option>
                    <option value="Trophy">Trophy</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-grid" style={{ marginTop: "0.5rem" }}>
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-link" /> Image URL (or path)</label>
                  <input type="text" className="admin-input" value={photoForm.imageUrl} onChange={(e) => setPhotoForm(prev => ({ ...prev, imageUrl: e.target.value }))} placeholder="https://images.unsplash.com/..." />
                </div>
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-calendar-day" /> Date String</label>
                  <input type="text" className="admin-input" value={photoForm.dateStr} onChange={(e) => setPhotoForm(prev => ({ ...prev, dateStr: e.target.value }))} placeholder="June 15, 2026" />
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

        {/* ── Gallery Table ── */}
        <div className="admin-card">
          <h2 className="admin-card-title"><i className="fa-solid fa-table-cells-large" /> Album Gallery</h2>

          {albumPhotos.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-solid fa-photo-film" />
              No photos uploaded yet. Use the form above to add your first photo.
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
