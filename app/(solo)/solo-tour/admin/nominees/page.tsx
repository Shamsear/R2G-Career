"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchRegisteredClubs,
  nominateRwsCandidate,
  removeRwsCandidate,
  fetchSelectedCandidates
} from "@/utils/solo/serverActions";

export default function RwsNomineesManager() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [nomineeForm, setNomineeForm] = useState({
    clubId: "",
    status: "nominee"
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const clubsData = await fetchRegisteredClubs();
      setClubs(clubsData || []);
      const candData = await fetchSelectedCandidates("R2G World Series");
      setCandidates(candData || []);
    } catch {
      showToast("Error loading nomination details!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNominee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomineeForm.clubId) return showToast("Select a club!");
    startTransition(async () => {
      try {
        await nominateRwsCandidate(parseInt(nomineeForm.clubId), nomineeForm.status);
        showToast("Nomination status updated!");
        setNomineeForm({ clubId: "", status: "nominee" });
        loadData();
      } catch {
        showToast("Error nominating club!");
      }
    });
  };

  const handleRemoveNomination = (clubId: number) => {
    if (!confirm("Are you sure you want to remove this club's nomination?")) return;
    startTransition(async () => {
      try {
        await removeRwsCandidate(clubId);
        showToast("Nomination removed!");
        loadData();
      } catch {
        showToast("Error removing nominee!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="nominees">
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
          <div className="portal-page-badge"><i className="fa-solid fa-user-check" /> RWS Nominees</div>
          <h1 className="portal-title">RWS NOMINEES</h1>
          <p className="portal-subtitle">Nominate managers for the World Series and control their qualification selections status.</p>
        </div>

        {/* Summary Stats Row */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Total Nominees</div>
            <div className="stat-value">{candidates.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Confirmed</div>
            <div className="stat-value">{candidates.filter(c => c.status === "confirmed").length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{candidates.filter(c => c.status === "nominee").length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Available Clubs</div>
            <div className="stat-value">{clubs.length}</div>
          </div>
        </div>

        {/* Nomination Form Card */}
        <div className="admin-card">
          <h2 className="admin-card-title">
            <i className="fa-solid fa-user-plus" />
            Nominate Candidate
          </h2>

          <form onSubmit={handleSaveNominee}>
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-clipboard-list" /> Nomination Details</div>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Nominate Club</label>
                  <select className="admin-select" value={nomineeForm.clubId} onChange={(e) => setNomineeForm(prev => ({ ...prev, clubId: e.target.value }))}>
                    <option value="">-- Select Club --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Selection Status</label>
                  <select className="admin-select" value={nomineeForm.status} onChange={(e) => setNomineeForm(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="nominee">Nominee</option>
                    <option value="confirmed">Confirmed (Selected)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="admin-btn-row">
              <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                {isPending ? <><i className="fa-solid fa-spinner fa-spin" /> Processing...</> : <><i className="fa-solid fa-paper-plane" /> Nominate Club</>}
              </button>
            </div>
          </form>
        </div>

        {/* Candidates Table Card */}
        <div className="admin-card">
          <h2 className="admin-card-title">
            <i className="fa-solid fa-list-check" />
            Nomination Registry
          </h2>

          {candidates.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-solid fa-inbox" />
              No nominations yet. Use the form above to nominate clubs.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-list-table">
                <thead>
                  <tr>
                    <th>Manager / Club</th>
                    <th>Selection Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(cand => (
                    <tr key={cand.id}>
                      <td>
                        <strong>{cand.name}</strong>
                        <span style={{ color: "var(--text-secondary)", marginLeft: "0.5rem", fontSize: "0.8rem" }}>({cand.club})</span>
                      </td>
                      <td>
                        {cand.status === "confirmed" ? (
                          <span className="badge-active" style={{ textTransform: "uppercase" }}>
                            <i className="fa-solid fa-circle-check" style={{ marginRight: "4px" }} />
                            {cand.status}
                          </span>
                        ) : (
                          <span className="badge-info" style={{ textTransform: "uppercase" }}>
                            <i className="fa-solid fa-clock" style={{ marginRight: "4px" }} />
                            {cand.status}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="portal-btn btn-danger" style={{ padding: "3px 10px", fontSize: "0.75rem" }} onClick={() => handleRemoveNomination(cand.id)}>
                          <i className="fa-solid fa-trash" /> Remove
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
