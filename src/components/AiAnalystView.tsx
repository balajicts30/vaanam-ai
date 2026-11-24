"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Calendar,
  CalendarRange,
  Languages,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  AiAnalystReport,
  ContentLanguage,
  WeatherIntelligencePayload,
} from "@/types/weather";
import { apiGenerateAnalyst } from "@/lib/client-api";

interface Props {
  payload: WeatherIntelligencePayload;
  defaultLanguage: ContentLanguage;
}

export function AiAnalystView({ payload, defaultLanguage }: Props) {
  const [language, setLanguage] = useState<ContentLanguage>(defaultLanguage);
  const [report, setReport] = useState<AiAnalystReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (lang: ContentLanguage) => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiGenerateAnalyst(payload, lang);
      setReport(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.location.id, payload.retrievedAt, language]);

  const officialAlerts = payload.alerts.filter((a) => a.origin !== "AI_RISK_INDICATOR");
  const aiRiskAlerts = payload.alerts.filter((a) => a.origin === "AI_RISK_INDICATOR");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            AI Weather Analyst — {payload.location.name}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Translates live ECMWF IFS/ENS &amp; SEAS5 model outputs into clear, conversational language
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl bg-slate-900/90 border border-cyan-500/25 p-1">
            <Languages className="w-3.5 h-3.5 text-cyan-400 ml-2 mr-1" />
            {(
              [
                { id: "en", label: "English" },
                { id: "ta", label: "தமிழ்" },
                { id: "bilingual", label: "Tamil + EN" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLanguage(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  language === opt.id
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadReport(language)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-cyan-400/50 text-slate-200"
            title="Regenerate briefing"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-950/30 border border-rose-500/40 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading && !report && (
        <div className="glass-card rounded-2xl p-10 flex items-center justify-center gap-3 text-cyan-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Analyzing real meteorological model outputs...</span>
        </div>
      )}

      {report && (
        <div className="space-y-5">
          {/* Headline + Engine Badge */}
          <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-cyan-400/30">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                {report.generatedBy === "GEMINI_AI"
                  ? `Powered by Gemini AI (${report.modelUsed})`
                  : "Deterministic Model-Grounded Synthesizer (Set GEMINI_API_KEY for Gemini LLM)"}
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{report.headline}</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              Generated {new Date(report.generatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* 4 Conversational Briefings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Sun className="w-4 h-4" /> Current Weather Explanation
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {report.currentExplanation}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Daily Weather Briefing
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {report.dailyBriefing}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <CalendarRange className="w-4 h-4" /> Weekly Weather Briefing
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {report.weeklyBriefing}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 space-y-2.5 border-indigo-400/25">
              <h3 className="text-sm font-bold text-violet-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 30-Day Extended Outlook
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {report.outlook30Day}
              </p>
            </div>
          </div>

          {/* Key Takeaways */}
          {report.keyTakeaways.length > 0 && (
            <div className="glass-card-subtle rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Key Takeaways
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {report.keyTakeaways.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-slate-200 bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Separated Official Government Warnings vs AI Risk Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl p-5 space-y-3 border-rose-500/25">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Official Government Warnings (IMD / NWS)
              </h3>
              {officialAlerts.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No active official CAP warnings matched for {payload.location.name} at retrieval time. Always verify with{" "}
                  <a
                    href="https://mausam.imd.gov.in/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-300 underline"
                  >
                    mausam.imd.gov.in
                  </a>{" "}
                  for India.
                </p>
              ) : (
                officialAlerts.map((a) => (
                  <div key={a.id} className="rounded-xl bg-rose-950/30 border border-rose-500/35 p-3">
                    <div className="text-xs font-bold text-rose-200">{a.title}</div>
                    <p className="text-xs text-slate-300 mt-1">{a.description}</p>
                    <div className="text-[10px] text-slate-400 mt-1.5">{a.source}</div>
                  </div>
                ))
              )}
            </div>

            <div className="glass-card rounded-2xl p-5 space-y-3 border-amber-500/25">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                AI Model-Derived Risk Indicators
              </h3>
              {aiRiskAlerts.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No severe weather thresholds (heavy rain, thunderstorm, strong wind, heatwave, cyclone pressure drop) triggered in current ECMWF model runs.
                </p>
              ) : (
                aiRiskAlerts.map((a) => (
                  <div key={a.id} className="rounded-xl bg-amber-950/25 border border-amber-500/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-200">{a.title}</span>
                      <span className="text-[10px] font-mono text-amber-300">{a.severity}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{a.description}</p>
                    <div className="text-[10px] text-slate-400 mt-1.5">{a.source}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
