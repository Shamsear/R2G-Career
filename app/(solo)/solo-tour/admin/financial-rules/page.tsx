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
    match_bonus_rc: "" as any, match_bonus_rt: "" as any, match_bonus_voucher: "" as any,
    match_win_bonus_rc: "" as any, match_win_bonus_rt: "" as any, match_win_bonus_voucher: "" as any,
    match_draw_bonus_rc: "" as any, match_draw_bonus_rt: "" as any, match_draw_bonus_voucher: "" as any,
    match_loss_bonus_rc: "" as any, match_loss_bonus_rt: "" as any, match_loss_bonus_voucher: "" as any,
    tournament_bonus_rc: "" as any, tournament_bonus_rt: "" as any, tournament_bonus_voucher: "" as any,
    season_bonus_rc: "" as any, season_bonus_rt: "" as any, season_bonus_voucher: "" as any,
    walkover_fine_rc: "" as any, walkover_fine_rt: "" as any, walkover_fine_voucher: "" as any,
    match_extension_fee_rc: "" as any, match_extension_fee_rt: "" as any, match_extension_fee_voucher: "" as any,
    goals_scored_bonus_rc: "" as any, goals_scored_bonus_rt: "" as any, goals_scored_bonus_voucher: "" as any,
    clean_sheet_bonus_rc: "" as any, clean_sheet_bonus_rt: "" as any, clean_sheet_bonus_voucher: "" as any,
    rule_violation_fine_rc: "" as any, rule_violation_fine_rt: "" as any, rule_violation_fine_voucher: "" as any,
    match_extension_half_fee_rc: "" as any, match_extension_half_fee_rt: "" as any, match_extension_half_fee_voucher: "" as any,
    tournament_start_bonus_rc: "" as any, tournament_start_bonus_rt: "" as any, tournament_start_bonus_voucher: "" as any,
    position_2nd_bonus_rc: "" as any, position_2nd_bonus_rt: "" as any, position_2nd_bonus_voucher: "" as any,
    position_3rd_bonus_rc: "" as any, position_3rd_bonus_rt: "" as any, position_3rd_bonus_voucher: "" as any,
    position_4th_bonus_rc: "" as any, position_4th_bonus_rt: "" as any, position_4th_bonus_voucher: "" as any,
    position_rewards: [] as any[]
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
      match_bonus_rc: "", match_bonus_rt: "", match_bonus_voucher: "",
      match_win_bonus_rc: "", match_win_bonus_rt: "", match_win_bonus_voucher: "",
      match_draw_bonus_rc: "", match_draw_bonus_rt: "", match_draw_bonus_voucher: "",
      match_loss_bonus_rc: "", match_loss_bonus_rt: "", match_loss_bonus_voucher: "",
      tournament_bonus_rc: "", tournament_bonus_rt: "", tournament_bonus_voucher: "",
      season_bonus_rc: "", season_bonus_rt: "", season_bonus_voucher: "",
      walkover_fine_rc: "", walkover_fine_rt: "", walkover_fine_voucher: "",
      match_extension_fee_rc: "", match_extension_fee_rt: "", match_extension_fee_voucher: "",
      
      goals_scored_bonus_rc: "", goals_scored_bonus_rt: "", goals_scored_bonus_voucher: "",
      clean_sheet_bonus_rc: "", clean_sheet_bonus_rt: "", clean_sheet_bonus_voucher: "",
      rule_violation_fine_rc: "", rule_violation_fine_rt: "", rule_violation_fine_voucher: "",
      match_extension_half_fee_rc: "", match_extension_half_fee_rt: "", match_extension_half_fee_voucher: "",
      tournament_start_bonus_rc: "", tournament_start_bonus_rt: "", tournament_start_bonus_voucher: "",
      position_2nd_bonus_rc: "", position_2nd_bonus_rt: "", position_2nd_bonus_voucher: "",
      position_3rd_bonus_rc: "", position_3rd_bonus_rt: "", position_3rd_bonus_voucher: "",
      position_4th_bonus_rc: "", position_4th_bonus_rt: "", position_4th_bonus_voucher: "",
      position_rewards: []
    } as any);
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
    const p = (v: any) => v === null ? "" : v;
    setRuleForm({
      id: rule.id.toString(),
      name: rule.name,
      match_bonus_rc: p(rule.match_bonus_rc), match_bonus_rt: p(rule.match_bonus_rt), match_bonus_voucher: p(rule.match_bonus_voucher),
      match_win_bonus_rc: p(rule.match_win_bonus_rc), match_win_bonus_rt: p(rule.match_win_bonus_rt), match_win_bonus_voucher: p(rule.match_win_bonus_voucher),
      match_draw_bonus_rc: p(rule.match_draw_bonus_rc), match_draw_bonus_rt: p(rule.match_draw_bonus_rt), match_draw_bonus_voucher: p(rule.match_draw_bonus_voucher),
      match_loss_bonus_rc: p(rule.match_loss_bonus_rc), match_loss_bonus_rt: p(rule.match_loss_bonus_rt), match_loss_bonus_voucher: p(rule.match_loss_bonus_voucher),
      tournament_bonus_rc: p(rule.tournament_bonus_rc), tournament_bonus_rt: p(rule.tournament_bonus_rt), tournament_bonus_voucher: p(rule.tournament_bonus_voucher),
      season_bonus_rc: p(rule.season_bonus_rc), season_bonus_rt: p(rule.season_bonus_rt), season_bonus_voucher: p(rule.season_bonus_voucher),
      walkover_fine_rc: p(rule.walkover_fine_rc), walkover_fine_rt: p(rule.walkover_fine_rt), walkover_fine_voucher: p(rule.walkover_fine_voucher),
      match_extension_fee_rc: p(rule.match_extension_fee_rc), match_extension_fee_rt: p(rule.match_extension_fee_rt), match_extension_fee_voucher: p(rule.match_extension_fee_voucher),
      
      goals_scored_bonus_rc: p(rule.goals_scored_bonus_rc), goals_scored_bonus_rt: p(rule.goals_scored_bonus_rt), goals_scored_bonus_voucher: p(rule.goals_scored_bonus_voucher),
      clean_sheet_bonus_rc: p(rule.clean_sheet_bonus_rc), clean_sheet_bonus_rt: p(rule.clean_sheet_bonus_rt), clean_sheet_bonus_voucher: p(rule.clean_sheet_bonus_voucher),
      rule_violation_fine_rc: p(rule.rule_violation_fine_rc), rule_violation_fine_rt: p(rule.rule_violation_fine_rt), rule_violation_fine_voucher: p(rule.rule_violation_fine_voucher),
      match_extension_half_fee_rc: p(rule.match_extension_half_fee_rc), match_extension_half_fee_rt: p(rule.match_extension_half_fee_rt), match_extension_half_fee_voucher: p(rule.match_extension_half_fee_voucher),
      tournament_start_bonus_rc: p(rule.tournament_start_bonus_rc), tournament_start_bonus_rt: p(rule.tournament_start_bonus_rt), tournament_start_bonus_voucher: p(rule.tournament_start_bonus_voucher),
      position_2nd_bonus_rc: p(rule.position_2nd_bonus_rc), position_2nd_bonus_rt: p(rule.position_2nd_bonus_rt), position_2nd_bonus_voucher: p(rule.position_2nd_bonus_voucher),
      position_3rd_bonus_rc: p(rule.position_3rd_bonus_rc), position_3rd_bonus_rt: p(rule.position_3rd_bonus_rt), position_3rd_bonus_voucher: p(rule.position_3rd_bonus_voucher),
      position_4th_bonus_rc: p(rule.position_4th_bonus_rc), position_4th_bonus_rt: p(rule.position_4th_bonus_rt), position_4th_bonus_voucher: p(rule.position_4th_bonus_voucher),
      position_rewards: rule.position_rewards || []
    });
  };

  const handleDuplicateRule = (rule: any) => {
    const p = (v: any) => v === null ? "" : v;
    setRuleForm({
      id: "", 
      name: `${rule.name} (Copy)`,
      match_bonus_rc: p(rule.match_bonus_rc), match_bonus_rt: p(rule.match_bonus_rt), match_bonus_voucher: p(rule.match_bonus_voucher),
      match_win_bonus_rc: p(rule.match_win_bonus_rc), match_win_bonus_rt: p(rule.match_win_bonus_rt), match_win_bonus_voucher: p(rule.match_win_bonus_voucher),
      match_draw_bonus_rc: p(rule.match_draw_bonus_rc), match_draw_bonus_rt: p(rule.match_draw_bonus_rt), match_draw_bonus_voucher: p(rule.match_draw_bonus_voucher),
      match_loss_bonus_rc: p(rule.match_loss_bonus_rc), match_loss_bonus_rt: p(rule.match_loss_bonus_rt), match_loss_bonus_voucher: p(rule.match_loss_bonus_voucher),
      tournament_bonus_rc: p(rule.tournament_bonus_rc), tournament_bonus_rt: p(rule.tournament_bonus_rt), tournament_bonus_voucher: p(rule.tournament_bonus_voucher),
      season_bonus_rc: p(rule.season_bonus_rc), season_bonus_rt: p(rule.season_bonus_rt), season_bonus_voucher: p(rule.season_bonus_voucher),
      walkover_fine_rc: p(rule.walkover_fine_rc), walkover_fine_rt: p(rule.walkover_fine_rt), walkover_fine_voucher: p(rule.walkover_fine_voucher),
      match_extension_fee_rc: p(rule.match_extension_fee_rc), match_extension_fee_rt: p(rule.match_extension_fee_rt), match_extension_fee_voucher: p(rule.match_extension_fee_voucher),
      
      goals_scored_bonus_rc: p(rule.goals_scored_bonus_rc), goals_scored_bonus_rt: p(rule.goals_scored_bonus_rt), goals_scored_bonus_voucher: p(rule.goals_scored_bonus_voucher),
      clean_sheet_bonus_rc: p(rule.clean_sheet_bonus_rc), clean_sheet_bonus_rt: p(rule.clean_sheet_bonus_rt), clean_sheet_bonus_voucher: p(rule.clean_sheet_bonus_voucher),
      rule_violation_fine_rc: p(rule.rule_violation_fine_rc), rule_violation_fine_rt: p(rule.rule_violation_fine_rt), rule_violation_fine_voucher: p(rule.rule_violation_fine_voucher),
      match_extension_half_fee_rc: p(rule.match_extension_half_fee_rc), match_extension_half_fee_rt: p(rule.match_extension_half_fee_rt), match_extension_half_fee_voucher: p(rule.match_extension_half_fee_voucher),
      tournament_start_bonus_rc: p(rule.tournament_start_bonus_rc), tournament_start_bonus_rt: p(rule.tournament_start_bonus_rt), tournament_start_bonus_voucher: p(rule.tournament_start_bonus_voucher),
      position_2nd_bonus_rc: p(rule.position_2nd_bonus_rc), position_2nd_bonus_rt: p(rule.position_2nd_bonus_rt), position_2nd_bonus_voucher: p(rule.position_2nd_bonus_voucher),
      position_3rd_bonus_rc: p(rule.position_3rd_bonus_rc), position_3rd_bonus_rt: p(rule.position_3rd_bonus_rt), position_3rd_bonus_voucher: p(rule.position_3rd_bonus_voucher),
      position_4th_bonus_rc: p(rule.position_4th_bonus_rc), position_4th_bonus_rt: p(rule.position_4th_bonus_rt), position_4th_bonus_voucher: p(rule.position_4th_bonus_voucher),
      position_rewards: rule.position_rewards || []
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

  const handleAddPositionReward = () => {
    setRuleForm(prev => ({
      ...prev,
      position_rewards: [
        ...(prev.position_rewards || []),
        { position: (prev.position_rewards || []).length + 2, rc: 0, rt: 0, voucher: 0 }
      ]
    }));
  };

  const handleUpdatePositionReward = (index: number, field: string, value: number) => {
    setRuleForm(prev => {
      const updated = [...(prev.position_rewards || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, position_rewards: updated };
    });
  };

  const handleRemovePositionReward = (index: number) => {
    setRuleForm(prev => ({
      ...prev,
      position_rewards: (prev.position_rewards || []).filter((_, idx) => idx !== index)
    }));
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
                          <span style={{ color: "#10b981", fontWeight: 700 }}>{(rule.match_win_bonus_rc ?? "-")} / {(rule.match_win_bonus_rt ?? "-")} / {(rule.match_win_bonus_voucher ?? "-")}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Match Draw:</span>
                          <span style={{ color: "#fbbf24", fontWeight: 700 }}>{(rule.match_draw_bonus_rc ?? "-")} / {(rule.match_draw_bonus_rt ?? "-")} / {(rule.match_draw_bonus_voucher ?? "-")}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Match Loss:</span>
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>{(rule.match_loss_bonus_rc ?? "-")} / {(rule.match_loss_bonus_rt ?? "-")} / {(rule.match_loss_bonus_voucher ?? "-")}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Tourney Bonus:</span>
                          <span style={{ color: "#38bdf8", fontWeight: 700 }}>{(rule.tournament_bonus_rc ?? "-")} / {(rule.tournament_bonus_rt ?? "-")} / {(rule.tournament_bonus_voucher ?? "-")}</span>
                        </div>
                        <div className="rule-pill">
                          <span>Walkover Fine:</span>
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>{(rule.walkover_fine_rc ?? "-")} / {(rule.walkover_fine_rt ?? "-")} / {(rule.walkover_fine_voucher ?? "-")}</span>
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
                {ruleForm.id ? `Editing Template: ${ruleForm.name}` : ruleForm.name ? `Duplicating Template: ${ruleForm.name}` : "Create Universal Rules Template"}
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
                          <input type="number" className="admin-input" value={ruleForm.match_win_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_win_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_win_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_win_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_win_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_win_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 700 }}>Match Draw Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_draw_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_draw_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_draw_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_draw_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_draw_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_draw_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>Match Loss Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_loss_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_loss_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_loss_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_loss_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_loss_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_loss_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Tournament Winner Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#a855f7", fontWeight: 700 }}>Flat Match Played Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#06b6d4", fontWeight: 700 }}>Goals Scored Bonus - Per Goal (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.goals_scored_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, goals_scored_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.goals_scored_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, goals_scored_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.goals_scored_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, goals_scored_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700 }}>Clean Sheet Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.clean_sheet_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, clean_sheet_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.clean_sheet_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, clean_sheet_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.clean_sheet_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, clean_sheet_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 700 }}>Tournament Starting Bonus (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_start_bonus_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_start_bonus_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_start_bonus_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_start_bonus_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.tournament_start_bonus_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, tournament_start_bonus_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem", marginTop: "1rem" }}>
                      <label style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 700, display: "block", marginBottom: "0.75rem" }}>
                        <i className="fa-solid fa-ranking-star" style={{ color: "#38bdf8", marginRight: "6px" }} />
                        Custom Position Standings Rewards (2nd, 3rd, 4th, 5th, etc.)
                      </label>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {(ruleForm.position_rewards || []).map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.01)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="admin-form-group" style={{ marginBottom: 0, width: "120px" }}>
                              <label style={{ fontSize: "0.7rem", marginBottom: "2px" }}>Finish Position</label>
                              <input
                                type="number"
                                className="admin-input"
                                style={{ height: "34px", fontSize: "0.8rem", padding: "6px" }}
                                value={item.position}
                                min={2}
                                onChange={(e) => handleUpdatePositionReward(idx, "position", parseInt(e.target.value) || 0)}
                                placeholder="Pos #"
                                required
                              />
                            </div>
                            
                            <div className="admin-form-group" style={{ marginBottom: 0, flex: 1 }}>
                              <label style={{ fontSize: "0.7rem", marginBottom: "2px" }}>Rewards (RC / RT / Voucher)</label>
                              <div className="currency-input-container" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                                <div className="currency-input-wrapper">
                                  <i className="fa-solid fa-coins currency-icon rc" />
                                  <input
                                    type="number"
                                    className="admin-input"
                                    value={item.rc}
                                    onChange={(e) => handleUpdatePositionReward(idx, "rc", parseInt(e.target.value) || 0)}
                                    placeholder="RC"
                                    min={0}
                                  />
                                </div>
                                <div className="currency-input-wrapper">
                                  <i className="fa-solid fa-star currency-icon rt" />
                                  <input
                                    type="number"
                                    className="admin-input"
                                    value={item.rt}
                                    onChange={(e) => handleUpdatePositionReward(idx, "rt", parseInt(e.target.value) || 0)}
                                    placeholder="RT"
                                    min={0}
                                  />
                                </div>
                                <div className="currency-input-wrapper">
                                  <i className="fa-solid fa-ticket currency-icon voucher" />
                                  <input
                                    type="number"
                                    className="admin-input"
                                    value={item.voucher}
                                    onChange={(e) => handleUpdatePositionReward(idx, "voucher", parseInt(e.target.value) || 0)}
                                    placeholder="V"
                                    min={0}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleRemovePositionReward(idx)}
                              className="portal-btn btn-secondary"
                              style={{ height: "34px", padding: "0 10px", marginTop: "14px", color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAddPositionReward}
                        className="portal-btn btn-secondary"
                        style={{ marginTop: "1rem", width: "100%", height: "38px", justifyContent: "center", fontSize: "0.8rem", color: "#38bdf8", border: "1px dashed rgba(56, 189, 248, 0.4)", background: "rgba(56, 189, 248, 0.05)" }}
                      >
                        <i className="fa-solid fa-plus-circle" /> Add Standings Position Reward
                      </button>
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
                          <input type="number" className="admin-input" value={ruleForm.walkover_fine_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, walkover_fine_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.walkover_fine_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, walkover_fine_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.walkover_fine_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, walkover_fine_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Full Match Extension Fee (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_fee_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_fee_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_fee_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_fee_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_fee_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_fee_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Half Match Extension Fee (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_half_fee_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_half_fee_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_half_fee_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_half_fee_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.match_extension_half_fee_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, match_extension_half_fee_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>Rule Violation Fine (RC / RT / Voucher)</label>
                      <div className="currency-input-container">
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" />
                          <input type="number" className="admin-input" value={ruleForm.rule_violation_fine_rc} onChange={(e) => setRuleForm(prev => ({ ...prev, rule_violation_fine_rc: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RC" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" />
                          <input type="number" className="admin-input" value={ruleForm.rule_violation_fine_rt} onChange={(e) => setRuleForm(prev => ({ ...prev, rule_violation_fine_rt: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="RT" />
                        </div>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" />
                          <input type="number" className="admin-input" value={ruleForm.rule_violation_fine_voucher} onChange={(e) => setRuleForm(prev => ({ ...prev, rule_violation_fine_voucher: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))} placeholder="V" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-btn-row" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                    {ruleForm.id ? "Update Template" : "Save New Template"}
                  </button>
                  {ruleForm.id && (
                    <>
                      <button
                        type="button"
                        className="portal-btn btn-secondary"
                        onClick={() => {
                          const currentName = ruleForm.name;
                          setRuleForm(prev => ({
                            ...prev,
                            id: "",
                            name: currentName.endsWith(" (Copy)") ? currentName : `${currentName} (Copy)`
                          }));
                          showToast("Template duplicated! Modify values and save as a new template.");
                        }}
                        style={{ color: "#38bdf8", background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)" }}
                      >
                        <i className="fa-solid fa-copy" /> Duplicate This
                      </button>
                      <button type="button" className="portal-btn btn-secondary" onClick={clearForm}>
                        Cancel Edit
                      </button>
                    </>
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
