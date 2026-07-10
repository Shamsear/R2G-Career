"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchFinancialRules,
  createFinancialRule,
  updateFinancialRule,
  deleteFinancialRule
} from "@/utils/solo/serverActions";

export default function FinancialRulesManager() {
  const [financialRules, setFinancialRules] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [ruleForm, setRuleForm] = useState({
    id: "",
    name: "",
    match_bonus_rc: 0, match_bonus_rt: 0, match_bonus_voucher: 0,
    match_win_bonus_rc: 0, match_win_bonus_rt: 0, match_win_bonus_voucher: 0,
    match_draw_bonus_rc: 0, match_draw_bonus_rt: 0, match_draw_bonus_voucher: 0,
    match_loss_bonus_rc: 0, match_loss_bonus_rt: 0, match_loss_bonus_voucher: 0,
    tournament_bonus_rc: 0, tournament_bonus_rt: 0, tournament_bonus_voucher: 0,
    season_bonus_rc: 0, season_bonus_rt: 0, season_bonus_voucher: 0,
    walkover_fine_rc: 0, walkover_fine_rt: 0, walkover_fine_voucher: 0,
    match_extension_fee_rc: 0, match_extension_fee_rt: 0, match_extension_fee_voucher: 0
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadRules = async () => {
    try {
      const data = await fetchFinancialRules();
      setFinancialRules(data || []);
    } catch {
      showToast("Error loading rules!");
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const clearForm = () => {
    setRuleForm({
      id: "", name: "",
      match_bonus_rc: 0, match_bonus_rt: 0, match_bonus_voucher: 0,
      match_win_bonus_rc: 0, match_win_bonus_rt: 0, match_win_bonus_voucher: 0,
      match_draw_bonus_rc: 0, match_draw_bonus_rt: 0, match_draw_bonus_voucher: 0,
      match_loss_bonus_rc: 0, match_loss_bonus_rt: 0, match_loss_bonus_voucher: 0,
      tournament_bonus_rc: 0, tournament_bonus_rt: 0, tournament_bonus_voucher: 0,
      season_bonus_rc: 0, season_bonus_rt: 0, season_bonus_voucher: 0,
      walkover_fine_rc: 0, walkover_fine_rt: 0, walkover_fine_voucher: 0,
      match_extension_fee_rc: 0, match_extension_fee_rt: 0, match_extension_fee_voucher: 0
    });
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.name) return showToast("Template name required!");
    startTransition(async () => {
      try {
        if (ruleForm.id) {
          await updateFinancialRule(parseInt(ruleForm.id), ruleForm);
          showToast("Financial template updated!");
        } else {
          await createFinancialRule(ruleForm);
          showToast("Financial template created!");
        }
        clearForm();
        loadRules();
      } catch {
        showToast("Error saving template!");
      }
    });
  };

  const handleEditRule = (rule: any) => {
    setRuleForm({
      id: rule.id.toString(),
      name: rule.name,
      match_bonus_rc: rule.match_bonus_rc, match_bonus_rt: rule.match_bonus_rt, match_bonus_voucher: rule.match_bonus_voucher,
      match_win_bonus_rc: rule.match_win_bonus_rc || 0, match_win_bonus_rt: rule.match_win_bonus_rt || 0, match_win_bonus_voucher: rule.match_win_bonus_voucher || 0,
      match_draw_bonus_rc: rule.match_draw_bonus_rc || 0, match_draw_bonus_rt: rule.match_draw_bonus_rt || 0, match_draw_bonus_voucher: rule.match_draw_bonus_voucher || 0,
      match_loss_bonus_rc: rule.match_loss_bonus_rc || 0, match_loss_bonus_rt: rule.match_loss_bonus_rt || 0, match_loss_bonus_voucher: rule.match_loss_bonus_voucher || 0,
      tournament_bonus_rc: rule.tournament_bonus_rc, tournament_bonus_rt: rule.tournament_bonus_rt, tournament_bonus_voucher: rule.tournament_bonus_voucher,
      season_bonus_rc: rule.season_bonus_rc, season_bonus_rt: rule.season_bonus_rt, season_bonus_voucher: rule.season_bonus_voucher,
      walkover_fine_rc: rule.walkover_fine_rc, walkover_fine_rt: rule.walkover_fine_rt, walkover_fine_voucher: rule.walkover_fine_voucher,
      match_extension_fee_rc: rule.match_extension_fee_rc, match_extension_fee_rt: rule.match_extension_fee_rt, match_extension_fee_voucher: rule.match_extension_fee_voucher
    });
  };

  const handleDuplicateRule = (rule: any) => {
    setRuleForm({
      id: "", 
      name: `${rule.name} (Copy)`,
      match_bonus_rc: rule.match_bonus_rc, match_bonus_rt: rule.match_bonus_rt, match_bonus_voucher: rule.match_bonus_voucher,
      match_win_bonus_rc: rule.match_win_bonus_rc || 0, match_win_bonus_rt: rule.match_win_bonus_rt || 0, match_win_bonus_voucher: rule.match_win_bonus_voucher || 0,
      match_draw_bonus_rc: rule.match_draw_bonus_rc || 0, match_draw_bonus_rt: rule.match_draw_bonus_rt || 0, match_draw_bonus_voucher: rule.match_draw_bonus_voucher || 0,
      match_loss_bonus_rc: rule.match_loss_bonus_rc || 0, match_loss_bonus_rt: rule.match_loss_bonus_rt || 0, match_loss_bonus_voucher: rule.match_loss_bonus_voucher || 0,
      tournament_bonus_rc: rule.tournament_bonus_rc, tournament_bonus_rt: rule.tournament_bonus_rt, tournament_bonus_voucher: rule.tournament_bonus_voucher,
      season_bonus_rc: rule.season_bonus_rc, season_bonus_rt: rule.season_bonus_rt, season_bonus_voucher: rule.season_bonus_voucher,
      walkover_fine_rc: rule.walkover_fine_rc, walkover_fine_rt: rule.walkover_fine_rt, walkover_fine_voucher: rule.walkover_fine_voucher,
      match_extension_fee_rc: rule.match_extension_fee_rc, match_extension_fee_rt: rule.match_extension_fee_rt, match_extension_fee_voucher: rule.match_extension_fee_voucher
    });
    showToast("Template copied! Adjust values and save.");
  };

  const handleDeleteRule = (id: number) => {
    if (!confirm("Delete this financial template?")) return;
    startTransition(async () => {
      try {
        await deleteFinancialRule(id);
        showToast("Template deleted!");
        clearForm();
        loadRules();
      } catch {
        showToast("Error deleting template!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="financial-rules">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-scale-balanced" /> Financial Templates</div>
          <h1 className="portal-title">FINANCIAL RULES</h1>
          <p className="portal-subtitle">Configure universal templates defining bonuses and fines across rc, rt, and vouchers.</p>
        </div>

        {/* Side-by-side 2-column layout */}
        <div className="financial-layout">
          
          {/* Left Column: Templates list */}
          <div className="financial-sidebar">
            <button className="portal-btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={clearForm}>
              <i className="fa-solid fa-circle-plus" /> Create New Template
            </button>
            
            <div className="rules-list-container">
              {financialRules.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  No templates found.
                </div>
              ) : (
                financialRules.map(rule => {
                  const isActive = ruleForm.id === rule.id.toString();
                  return (
                    <div 
                      key={rule.id} 
                      className={`rule-select-card ${isActive ? 'active' : ''}`}
                      onClick={() => handleEditRule(rule)}
                    >
                      <div className="rule-card-header">
                        <span className="rule-card-title">{rule.name}</span>
                      </div>
                      
                      <div className="rule-card-pills">
                        <div className="rule-pill">
                          <span>Match Win:</span>
                          <span style={{ color: "#10b981", fontWeight: 700 }}>{rule.match_win_bonus_rc} / {rule.match_win_bonus_rt} / {rule.match_win_bonus_voucher}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Match Draw:</span>
                          <span style={{ color: "#fbbf24", fontWeight: 700 }}>{rule.match_draw_bonus_rc} / {rule.match_draw_bonus_rt} / {rule.match_draw_bonus_voucher}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Match Loss:</span>
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>{rule.match_loss_bonus_rc} / {rule.match_loss_bonus_rt} / {rule.match_loss_bonus_voucher}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Tourney Bonus:</span>
                          <span style={{ color: "#38bdf8", fontWeight: 700 }}>{rule.tournament_bonus_rc} / {rule.tournament_bonus_rt} / {rule.tournament_bonus_voucher}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Walkover Fine:</span>
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>{rule.walkover_fine_rc} / {rule.walkover_fine_rt} / {rule.walkover_fine_voucher}</span>
                        </div>
                      </div>

                      <div className="rule-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="portal-btn btn-secondary" style={{ padding: "2px 6px", fontSize: "0.7rem" }} onClick={() => handleDuplicateRule(rule)}>
                          <i className="fa-solid fa-copy" /> Copy
                        </button>
                        <button className="portal-btn btn-danger" style={{ padding: "2px 6px", fontSize: "0.7rem" }} onClick={() => handleDeleteRule(rule.id)}>
                          <i className="fa-solid fa-trash" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Editor */}
          <div className="financial-main">
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h2 className="admin-card-title">
                <i className="fa-solid fa-pen-to-square" /> 
                {ruleForm.id ? `Editing Template: ${ruleForm.name}` : "Create Universal Rules Template"}
              </h2>
              
              <form onSubmit={handleSaveRule}>
                {/* Section 1: Name */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-tag" /> Template Settings</div>
                  <div className="admin-form-group">
                    <label>Template Name</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Standard Division Rules, Champions League Template"
                    />
                  </div>
                </div>

                {/* Section 2: Match & Tournament Bonuses */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-coins" style={{ color: "#fbbf24" }} /> Bonuses Configuration</div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700 }}>Match Win Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_win_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_win_bonus_rc: parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_win_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_win_bonus_rt: parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_win_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_win_bonus_voucher: parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 700 }}>Match Draw Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_draw_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_draw_bonus_rc: parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_draw_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_draw_bonus_rt: parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_draw_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_draw_bonus_voucher: parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>Match Loss Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_loss_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_loss_bonus_rc: parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_loss_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_loss_bonus_rt: parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_loss_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_loss_bonus_voucher: parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Tournament Winner Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_bonus_rc: parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_bonus_rt: parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_bonus_voucher: parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Season Finale Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.season_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, season_bonus_rc: parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.season_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, season_bonus_rt: parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.season_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, season_bonus_voucher: parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Fines & Extension Fees */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444" }} /> Fines & Fees Configuration</div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Walkover Fine (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.walkover_fine_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, walkover_fine_rc: parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.walkover_fine_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, walkover_fine_rt: parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.walkover_fine_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, walkover_fine_voucher: parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Match Extension Fee (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_fee_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_fee_rc: parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_fee_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_fee_rt: parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_fee_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_fee_voucher: parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-btn-row">
                  <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                    {ruleForm.id ? "Update Template" : "Save New Template"}
                  </button>
                  {ruleForm.id && (
                    <button type="button" className="portal-btn btn-secondary" onClick={clearForm}>
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
