// src/components/resume/AtsScoreCard.tsx
import React from "react";
import { AtsAuditResult } from "./types";
import { CheckCircle2, AlertTriangle, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AtsScoreCardProps {
  audit: AtsAuditResult;
}

export const AtsScoreCard: React.FC<AtsScoreCardProps> = ({ audit }) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-500 border-emerald-500 bg-emerald-500/10";
    if (score >= 70) return "text-blue-500 border-blue-500 bg-blue-500/10";
    if (score >= 50) return "text-amber-500 border-amber-500 bg-amber-500/10";
    return "text-red-500 border-red-500 bg-red-500/10";
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
      {/* Top Header & Score Circle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            ATS Readiness Audit
          </div>
          <h3 className="text-base font-bold text-foreground mt-0.5">Applicant Tracking Score</h3>
        </div>

        <div
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 font-bold ${getScoreColor(
            audit.score
          )}`}
        >
          <span className="text-lg leading-none">{audit.score}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>

      {/* Quick Badges */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <Zap className="w-3 h-3 text-amber-500" /> Action Verbs
          </div>
          <div className="font-bold text-foreground text-sm mt-0.5">
            {audit.actionVerbsFound.length} detected
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> Quantifiable Metrics
          </div>
          <div className="font-bold text-foreground text-sm mt-0.5">
            {audit.metricsFoundCount} metrics
          </div>
        </div>
      </div>

      {/* Checks List */}
      <div className="space-y-2 pt-1 border-t border-border/60">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          System Checks & Recommendations
        </div>
        <div className="space-y-1.5">
          {audit.checks.map((chk, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-lg border text-xs transition-colors ${
                chk.passed
                  ? "bg-emerald-500/5 border-emerald-500/20 text-slate-700 dark:text-slate-200"
                  : "bg-amber-500/5 border-amber-500/20 text-slate-700 dark:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {chk.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>{chk.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 pl-5">{chk.feedback}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
