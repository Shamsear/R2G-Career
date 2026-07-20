"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";
import { fetchSoloAdminLogs } from "@/utils/solo/serverActions";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadLogs = () => {
    startTransition(async () => {
      try {
        const data = await fetchSoloAdminLogs();
        setLogs(data || []);
      } catch (err) {
        console.error("Failed to load logs:", err);
      }
    });
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.admin_username.toLowerCase().includes(search.toLowerCase()) ||
      log.action_type.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
      
    const matchesUser = filterUser ? log.admin_username === filterUser : true;
    const matchesAction = filterAction ? log.action_type === filterAction : true;
    
    return matchesSearch && matchesUser && matchesAction;
  });

  const uniqueUsers = Array.from(new Set(logs.map(l => l.admin_username)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action_type)));

  const formatDetails = (detailsStr: string) => {
    try {
      const parsed = JSON.parse(detailsStr);
      if (parsed.query && parsed.params) {
        return (
          <div style={{ fontFamily: "monospace", fontSize: "0.75rem", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "#fbbf24", marginBottom: "4px" }}>{parsed.query}</div>
            <div style={{ color: "rgba(255,255,255,0.5)" }}>
              Params: {JSON.stringify(parsed.params)}
            </div>
          </div>
        );
      }
      return <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.75rem" }}>{JSON.stringify(parsed, null, 2)}</pre>;
    } catch {
      return <span>{detailsStr}</span>;
    }
  };

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        
        {/* Header Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div className="portal-page-badge">
              <i className="fa-solid fa-receipt" /> Audit Trail
            </div>
            <h1 className="portal-title">ADMIN AUDIT LOGS</h1>
            <p className="portal-subtitle">Track and inspect all administrative edits, database mutations, and updates in real time.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="button" 
              onClick={loadLogs} 
              className="portal-btn btn-secondary"
              disabled={isPending}
            >
              {isPending ? (
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }} />
              ) : (
                <i className="fa-solid fa-rotate" style={{ marginRight: "6px" }} />
              )}
              Refresh
            </button>
            <Link href="/solo-tour/admin" className="portal-btn btn-primary">
              <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Panel
            </Link>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="admin-card" style={{ marginBottom: "1.5rem", padding: "1.2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            
            <div>
              <label style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Search details/queries</label>
              <input
                type="text"
                placeholder="Search..."
                className="admin-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginTop: "0.25rem" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Admin Username</label>
              <select
                className="admin-select"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                style={{ marginTop: "0.25rem", width: "100%", height: "38px" }}
              >
                <option value="">All Admins</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Action Type</label>
              <select
                className="admin-select"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                style={{ marginTop: "0.25rem", width: "100%", height: "38px" }}
              >
                <option value="">All Action Types</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Logs Table */}
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="admin-list-table">
              <thead>
                <tr>
                  <th style={{ width: "150px" }}>Timestamp</th>
                  <th style={{ width: "120px" }}>Admin</th>
                  <th style={{ width: "160px" }}>Action</th>
                  <th>Mutation Details & Query parameters</th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "1.5rem", marginRight: "8px" }} />
                      Loading logs database...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-receipt" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", color: "rgba(255,255,255,0.1)" }} />
                      No admin actions logged matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          padding: "2px 8px", 
                          borderRadius: "4px", 
                          background: log.admin_username === 'shadow' ? "rgba(168,85,247,0.15)" : "rgba(34,197,94,0.15)", 
                          color: log.admin_username === 'shadow' ? "#c084fc" : "#4ade80", 
                          fontWeight: "bold"
                        }}>
                          {log.admin_username}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span style={{ 
                          fontSize: "0.7rem", 
                          padding: "2px 8px", 
                          borderRadius: "4px", 
                          background: log.action_type.endsWith('QUERY') ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.06)", 
                          color: log.action_type.endsWith('QUERY') ? "#fbbf24" : "#fff",
                          fontWeight: "bold",
                          textTransform: "uppercase"
                        }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {formatDetails(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
