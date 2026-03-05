import { useState, useEffect, useCallback, useMemo } from "react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const font = "'JetBrains Mono','Fira Code','SF Mono',monospace";

// ─── Theme ───
const T = {
  bg:"#08090C", surface:"#0F1115", surface2:"#161A20", surfaceHover:"#1C2028",
  border:"#1A1E26", borderBright:"#262C36",
  text:"#E4E6EA", textDim:"#8A919C", textMuted:"#4E5560",
  green:"#00E676", greenDim:"#00E67620",
  red:"#FF4C4C", redDim:"#FF4C4C20",
  amber:"#FFB300", amberDim:"#FFB30020",
  blue:"#4C8DFF", blueDim:"#4C8DFF20",
  cyan:"#00E5FF", cyanDim:"#00E5FF20",
  purple:"#B388FF", purpleDim:"#B388FF20",
  pink:"#FF80AB", pinkDim:"#FF80AB20",
};

// ─── AI Error Diagnosis ───
async function diagnoseError(errorMessage, workflowName, nodes, context) {
  try {
    const nodeList = (nodes || []).map(n => `${n.name} (${n.type?.split(".").pop()})`).join(" → ");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1000,
        system: `You are an expert n8n workflow debugger. You diagnose n8n automation errors and provide clear, actionable fixes.

Rules:
- Be specific to n8n (mention exact settings, node names, credential pages)
- Give step-by-step fixes a non-technical user can follow
- If it's a credential issue, explain exactly where to go in n8n
- If it's a rate limit, suggest specific retry/batching settings
- If it's a code node error, suggest the fix
- Keep it concise: diagnosis (1-2 sentences) + numbered fix steps (3-5 steps max)
- Format: Start with "DIAGNOSIS:" then "FIX:" with numbered steps
- If you can identify the likely failing node, mention it`,
        messages: [{ role: "user", content: `n8n workflow "${workflowName}" failed with this error:

ERROR: ${errorMessage}

WORKFLOW NODES: ${nodeList || "Unknown"}
${context ? `ADDITIONAL CONTEXT: ${context}` : ""}
FAILURE COUNT: This error has occurred multiple times.

Diagnose this error and give me exact steps to fix it in n8n.` }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    return text || "Could not generate diagnosis.";
  } catch (e) {
    return `Diagnosis failed: ${e.message}. Check your connection.`;
  }
}

// ─── Fallback data ───
const FALLBACK_WORKFLOWS = [
  { id:"KVYPWLipE9wHV8qryccLI", name:"Inbound Lead Qualification", active:true, tags:["Inbound"], execCount:139, failedCount:14, successRate:"90", sparkline:[57,0,13,7,0,9,53], avgDuration:12000, p95Duration:45000, nodeCount:8, nodes:[{type:"n8n-nodes-base.webhook",name:"Webhook"},{type:"n8n-nodes-base.httpRequest",name:"Enrich Lead"},{type:"n8n-nodes-base.if",name:"Score Check"}], durationTrend:[{avg:11000,p95:40000,count:20},{avg:12000,p95:42000,count:18},{avg:11500,p95:44000,count:22},{avg:13000,p95:48000,count:15},{avg:12000,p95:45000,count:25}], topErrors:[], hourlyDistribution:{9:15,10:22,11:18,14:20,15:25}, recentExecutions:[] },
  { id:"a_1xTiq3-KqpClIs0yMMQ", name:"Lead Category Validator", active:true, tags:[], execCount:391, failedCount:47, successRate:"88", sparkline:[8,0,22,0,0,19,39], avgDuration:8500, p95Duration:32000, nodeCount:12, nodes:[{type:"n8n-nodes-base.webhook",name:"Trigger"},{type:"n8n-nodes-base.code",name:"Validate"},{type:"n8n-nodes-base.hubspot",name:"Update HubSpot"}], durationTrend:[{avg:7800,p95:28000,count:60},{avg:8200,p95:30000,count:55},{avg:8900,p95:33000,count:48},{avg:8100,p95:31000,count:52},{avg:8500,p95:32000,count:58}], topErrors:[{message:"Validation timeout",count:12}], hourlyDistribution:{8:8,9:30,10:45,11:40,12:20,13:25,14:50,15:48,16:35}, recentExecutions:[] },
  { id:"Tk3WSmTIgJDxp6lWzNkO7", name:"Accounts Deduplication Agent", active:true, tags:[], execCount:91, failedCount:53, successRate:"42", sparkline:[6,3,3,0,0,5,3], avgDuration:95000, p95Duration:180000, nodeCount:6, nodes:[{type:"n8n-nodes-base.hubspot",name:"Fetch Accounts"},{type:"n8n-nodes-base.code",name:"Dedupe Logic"},{type:"n8n-nodes-base.merge",name:"Merge"}], durationTrend:[{avg:85000,p95:160000,count:15},{avg:90000,p95:170000,count:12},{avg:98000,p95:185000,count:10},{avg:92000,p95:175000,count:14},{avg:95000,p95:180000,count:11}], topErrors:[{message:"Rate limit exceeded",count:28},{message:"Duplicate key error",count:15}], hourlyDistribution:{10:12,11:15,14:18,15:20}, recentExecutions:[] },
  { id:"UjuJf9FeMnucpFjb", name:"Account Qualifying Agent", active:true, tags:["MSP/IT Categorisation"], execCount:147, failedCount:120, successRate:"18", sparkline:[0,0,0,0,0,0,0], avgDuration:500, p95Duration:2000, nodeCount:4, nodes:[{type:"n8n-nodes-base.scheduleTrigger",name:"Schedule"},{type:"n8n-nodes-base.httpRequest",name:"API Call"},{type:"n8n-nodes-base.if",name:"Check"}], durationTrend:[{avg:400,p95:1500,count:30},{avg:450,p95:1800,count:28},{avg:500,p95:2000,count:25},{avg:480,p95:1900,count:22},{avg:500,p95:2000,count:18}], topErrors:[{message:"never started (null startedAt)",count:95},{message:"Credential not found",count:20}], hourlyDistribution:{6:5,7:5,8:5,12:5,18:5}, recentExecutions:[] },
  { id:"P9GWfPh2CeynObL7", name:"SuperOps Blog Creation", active:false, tags:[], execCount:84, failedCount:41, successRate:"51", sparkline:[0,4,0,1,0,0,1], avgDuration:45000, p95Duration:120000, nodeCount:10, nodes:[], durationTrend:[{avg:40000,p95:100000,count:12},{avg:42000,p95:110000,count:10},{avg:48000,p95:125000,count:8},{avg:44000,p95:115000,count:9},{avg:45000,p95:120000,count:7}], topErrors:[{message:"OpenAI rate limit",count:18}], hourlyDistribution:{9:8,10:12,11:10,14:8,15:6}, recentExecutions:[] },
  { id:"USLFoogDSDbWcoRC_4OQP", name:"Google Ads Weekly AI Report", active:false, tags:[], execCount:44, failedCount:24, successRate:"45", sparkline:[0,0,1,0,0,0,0], avgDuration:62000, p95Duration:150000, nodeCount:7, nodes:[], durationTrend:[{avg:55000,p95:130000,count:6},{avg:58000,p95:140000,count:5},{avg:65000,p95:155000,count:4},{avg:60000,p95:145000,count:5},{avg:62000,p95:150000,count:3}], topErrors:[{message:"Google Ads API auth failed",count:14}], hourlyDistribution:{7:4,8:6,9:8}, recentExecutions:[] },
];

// ═══════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════
export default function FlowPulseCommand() {
  const [section, setSection] = useState("n8n");
  const [n8nTab, setN8nTab] = useState("overview");
  const [selectedWf, setSelectedWf] = useState(null);

  // Connection
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [config, setConfig] = useState({ url: "", apiKey: "", slackWebhook: "" });
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // HubSpot & Ads
  const [hubData, setHubData] = useState(null);
  const [hubLoading, setHubLoading] = useState(false);
  const [adsData, setAdsData] = useState(null);
  const [adsLoading, setAdsLoading] = useState(false);

  // Slack
  const [slackConfigured, setSlackConfigured] = useState(false);
  const [alertsSent, setAlertsSent] = useState(0);

  // Retry status
  const [retrying, setRetrying] = useState(new Set());

  const connect = async () => {
    setConnectLoading(true); setConnectError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceUrl: config.url.replace(/\/+$/, ""), apiKey: config.apiKey, slackWebhook: config.slackWebhook }),
      });
      const json = await res.json();
      if (json.success) {
        setSession(json.sessionId);
        const dRes = await fetch(`${BACKEND_URL}/api/dashboard`, { headers: { "X-FlowPulse-Session": json.sessionId } });
        const dJson = await dRes.json();
        setLiveData(dJson);
        setConnected(true);
        setSlackConfigured(!!dJson.slackConfigured);
        setAlertsSent(dJson.alertsSent || 0);
        setLastRefresh(new Date());
      } else setConnectError(json.error || "Connection failed");
    } catch (e) { setConnectError(`Cannot reach backend at ${BACKEND_URL}`); }
    setConnectLoading(false);
  };

  // Auto-refresh
  useEffect(() => {
    if (!connected || !session) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard`, { headers: { "X-FlowPulse-Session": session } });
        if (res.ok) { const d = await res.json(); setLiveData(d); setLastRefresh(new Date()); setAlertsSent(d.alertsSent || 0); }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [connected, session]);

  // Retry execution
  const retryExec = async (execId) => {
    if (!session) return;
    setRetrying(prev => new Set(prev).add(execId));
    try {
      await fetch(`${BACKEND_URL}/api/executions/${execId}/retry`, { method: "POST", headers: { "X-FlowPulse-Session": session } });
    } catch {}
    setTimeout(() => setRetrying(prev => { const n = new Set(prev); n.delete(execId); return n; }), 3000);
  };

  const workflows = connected && liveData?.workflows ? liveData.workflows : FALLBACK_WORKFLOWS;
  const stats = useMemo(() => {
    if (connected && liveData?.stats) return liveData.stats;
    const total = workflows.reduce((s, w) => s + (w.execCount || 0), 0);
    const failed = workflows.reduce((s, w) => s + (w.failedCount || 0), 0);
    return { totalWorkflows: workflows.length, activeWorkflows: workflows.filter(w => w.active).length, totalExecs: total, failedExecs: failed, successRate: total > 0 ? ((1 - failed / total) * 100).toFixed(1) : "100", avgDuration: 107014 };
  }, [workflows, connected, liveData]);
  const heatmapData = liveData?.heatmap || generateFallbackHeatmap();

  // HubSpot fetch
  const fetchHubSpot = useCallback(async () => {
    setHubLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "You are a CRM data analyzer. Return ONLY valid JSON. Return an object with: deals (array of {name, stage, amount, company, daysInStage, closeDate}), pipeline ({stageName: count}), stats ({totalDeals, totalValue, avgDealSize, openDeals, wonThisMonth, lostThisMonth, winRate}), recentActivity (array of {type, description, time}).",
          messages: [{ role: "user", content: "Get a full summary of our HubSpot CRM. Show deals by stage, pipeline metrics, win/loss rates, and recent activity. Return as structured JSON." }],
          mcp_servers: [{ type: "url", url: "https://mcp.hubspot.com/anthropic", name: "hubspot" }],
        }),
      });
      const data = await res.json();
      const all = (data.content || []).map(b => b.type === "text" ? b.text : b.type === "mcp_tool_result" ? (b.content?.[0]?.text || "") : "").join("\n");
      try { const m = all.match(/\{[\s\S]*\}/); setHubData(m ? JSON.parse(m[0]) : { raw: all }); } catch { setHubData({ raw: all }); }
    } catch (e) { setHubData({ error: e.message }); }
    setHubLoading(false);
  }, []);

  // Google Ads fetch
  const fetchAds = useCallback(async () => {
    setAdsLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "Return ONLY valid JSON. Return: campaigns (array of {name, spend, clicks, impressions, ctr, conversions, cpa, roas}), totals ({totalSpend, totalClicks, totalImpressions, avgCTR, totalConversions, avgCPA, avgROAS}), weekOverWeek ({spendChange, clicksChange, conversionsChange}), recommendations (array of strings).",
          messages: [{ role: "user", content: "Generate a realistic Google Ads weekly report for a B2B SaaS MSP/IT management company. Include 4 campaigns with realistic metrics including ROAS. Return JSON only." }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      try { const m = text.match(/\{[\s\S]*\}/); setAdsData(m ? JSON.parse(m[0]) : { raw: text }); } catch { setAdsData({ raw: text }); }
    } catch (e) { setAdsData({ error: e.message }); }
    setAdsLoading(false);
  }, []);

  const sections = [
    { key: "n8n", label: "n8n Workflows", color: T.green },
    { key: "kpis", label: "KPIs", color: T.cyan },
    { key: "hubspot", label: "HubSpot CRM", color: T.purple },
    { key: "ads", label: "Google Ads", color: T.blue },
    { key: "alerts", label: "Alerts", color: T.pink },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: font, color: T.text }}>
      {/* Top Bar */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 52, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 10px ${T.green}` }} />
              <span style={{ color: T.green, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>FLOWPULSE</span>
            </div>
            <div style={{ height: 20, width: 1, background: T.border }} />
            {sections.map(s => (
              <button key={s.key} onClick={() => setSection(s.key)} style={{
                background: section === s.key ? `${s.color}15` : "transparent",
                color: section === s.key ? s.color : T.textMuted,
                border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontFamily: font, cursor: "pointer", fontWeight: section === s.key ? 600 : 400,
              }}>{s.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {slackConfigured && <span style={{ fontSize: 9, color: T.pink, background: T.pinkDim, padding: "2px 8px", borderRadius: 3 }}>Slack: {alertsSent} alerts</span>}
            {connected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.greenDim, padding: "4px 10px", borderRadius: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
                <span style={{ fontSize: 10, color: T.green }}>Live</span>
              </div>
            ) : <span style={{ fontSize: 10, color: T.textMuted }}>Demo</span>}
          </div>
        </div>
      </div>

      {/* Connection bar */}
      {!connected && (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "12px 24px 0" }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: T.textDim }}>Connect:</span>
            <input value={config.url} onChange={e => setConfig(c => ({ ...c, url: e.target.value }))} placeholder="https://your-instance.app.n8n.cloud" style={inputS} />
            <input value={config.apiKey} onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))} placeholder="n8n API key" type="password" style={{ ...inputS, maxWidth: 180 }} />
            <input value={config.slackWebhook} onChange={e => setConfig(c => ({ ...c, slackWebhook: e.target.value }))} placeholder="Slack webhook (optional)" style={{ ...inputS, maxWidth: 200 }} />
            <button onClick={connect} disabled={connectLoading || !config.url || !config.apiKey} style={{ background: T.green, color: T.bg, border: "none", borderRadius: 4, padding: "6px 16px", fontSize: 11, fontFamily: font, fontWeight: 700, cursor: "pointer", opacity: connectLoading ? 0.5 : 1 }}>
              {connectLoading ? "Connecting..." : "Go Live"}
            </button>
            {connectError && <span style={{ fontSize: 10, color: T.red, width: "100%" }}>{connectError}</span>}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "16px 24px 48px" }}>
        {section === "n8n" && <N8nSection workflows={workflows} stats={stats} heatmap={heatmapData} tab={n8nTab} setTab={setN8nTab} selectedWf={selectedWf} setSelectedWf={setSelectedWf} retryExec={retryExec} retrying={retrying} session={session} />}
        {section === "kpis" && <KPISection workflows={workflows} stats={stats} hubData={hubData} adsData={adsData} />}
        {section === "hubspot" && <HubSpotSection data={hubData} loading={hubLoading} onFetch={fetchHubSpot} />}
        {section === "ads" && <AdsSection data={adsData} loading={adsLoading} onFetch={fetchAds} />}
        {section === "alerts" && <AlertsSection config={config} setConfig={setConfig} session={session} slackConfigured={slackConfigured} setSlackConfigured={setSlackConfigured} alertsSent={alertsSent} connected={connected} workflows={workflows} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// n8n SECTION
// ═══════════════════════════════════════════════
function N8nSection({ workflows, stats, heatmap, tab, setTab, selectedWf, setSelectedWf, retryExec, retrying, session }) {
  const tabs = ["overview", "heatmap", "workflows", "durations", "tags", "errors"];
  if (selectedWf) { const wf = workflows.find(w => w.id === selectedWf); return <DrillDown wf={wf} onBack={() => setSelectedWf(null)} retryExec={retryExec} retrying={retrying} />; }

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} style={{ ...pill, background: tab === t ? T.greenDim : "transparent", color: tab === t ? T.green : T.textMuted }}>{({ overview: "Overview", heatmap: "Heatmap", workflows: "Workflows", durations: "Durations", tags: "Tags", errors: "Errors" })[t]}</button>)}
      </div>
      {tab === "overview" && <Overview stats={stats} workflows={workflows} onSelect={setSelectedWf} />}
      {tab === "heatmap" && <Heatmap data={heatmap} />}
      {tab === "workflows" && <Workflows workflows={workflows} onSelect={setSelectedWf} />}
      {tab === "durations" && <Durations workflows={workflows} />}
      {tab === "tags" && <Tags workflows={workflows} onSelect={setSelectedWf} />}
      {tab === "errors" && <Errors workflows={workflows} retryExec={retryExec} retrying={retrying} />}
    </div>
  );
}

function Overview({ stats, workflows, onSelect }) {
  const rate = Number(stats.successRate);
  const rc = rate >= 80 ? T.green : rate >= 50 ? T.amber : T.red;
  const failing = [...workflows].filter(w => w.failedCount > 0).sort((a, b) => b.failedCount - a.failedCount).slice(0, 5);
  const active = workflows.filter(w => w.active);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="WORKFLOWS" value={stats.totalWorkflows} sub={`${stats.activeWorkflows} active`} color={T.blue} />
        <StatCard label="EXECUTIONS" value={stats.totalExecs?.toLocaleString()} sub="all time" color={T.cyan} />
        <StatCard label="SUCCESS RATE" value={`${stats.successRate}%`} sub={`${stats.failedExecs} failures`} color={rc} />
        <StatCard label="AVG DURATION" value={fmt(stats.avgDuration)} sub="per execution" color={T.textDim} />
        <StatCard label="ACTIVE" value={active.length} sub="running now" color={T.green} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Card title="7-DAY ACTIVITY">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
            {(workflows[0]?.sparkline || [0, 0, 0, 0, 0, 0, 0]).map((_, i) => {
              const dayTotal = workflows.reduce((s, w) => s + (w.sparkline?.[i] || 0), 0);
              const max = Math.max(...Array.from({ length: 7 }, (_, j) => workflows.reduce((s, w) => s + (w.sparkline?.[j] || 0), 0)), 1);
              return (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", borderRadius: 3, background: `linear-gradient(180deg, ${T.green}cc, ${T.green}44)`, height: Math.max((dayTotal / max) * 70, 2) }} />
                <span style={{ fontSize: 8, color: T.textMuted }}>{"MTWTFSS"[i]}</span>
              </div>);
            })}
          </div>
        </Card>
        <Card title="TOP FAILING WORKFLOWS">
          {failing.map((w, i) => (
            <div key={w.id} onClick={() => onSelect(w.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < failing.length - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                <div style={{ fontSize: 9, color: T.textMuted }}>{w.failedCount} failures / {w.execCount} runs</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: rateColor(w.successRate) }}>{w.successRate}%</span>
            </div>
          ))}
        </Card>
      </div>
      <Card title="ACTIVE WORKFLOW STATUS">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
          {active.map(w => (<div key={w.id} onClick={() => onSelect(w.id)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, cursor: "pointer", borderLeft: `3px solid ${rateColor(w.successRate)}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: T.textMuted }}>{w.execCount} runs</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: rateColor(w.successRate) }}>{w.successRate}%</span>
            </div>
          </div>))}
        </div>
      </Card>
    </>
  );
}

// ─── Heatmap ───
function Heatmap({ data }) {
  const [mode, setMode] = useState("total");
  const days = [...new Set(data.map(d => d.day))];
  const maxVal = Math.max(...data.map(d => mode === "total" ? d.total : d.failures), 1);
  return (<>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Execution Heatmap</h2>
      <div style={{ display: "flex", gap: 4 }}>{[{ k: "total", l: "All" }, { k: "failures", l: "Failures" }].map(m => <button key={m.k} onClick={() => setMode(m.k)} style={{ ...pill, background: mode === m.k ? T.greenDim : "transparent", color: mode === m.k ? T.green : T.textMuted }}>{m.l}</button>)}</div>
    </div>
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "50px repeat(24,1fr)", gap: 2 }}>
        <div />
        {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ textAlign: "center", fontSize: 7, color: T.textMuted, padding: "3px 0" }}>{i.toString().padStart(2, "0")}</div>)}
        {days.map((day, di) => (<>
          <div key={`l-${di}`} style={{ fontSize: 9, color: T.textDim, display: "flex", alignItems: "center" }}>{day}</div>
          {Array.from({ length: 24 }, (_, h) => {
            const cell = data.find(d => d.di === di && d.h === h) || { total: 0, failures: 0 };
            const val = mode === "total" ? cell.total : cell.failures;
            const intensity = val / maxVal;
            return <div key={`${di}-${h}`} title={`${day} ${h}:00 — ${cell.total} exec, ${cell.failures} fails`} style={{ background: val > 0 ? (mode === "total" ? `rgba(0,230,118,${intensity * 0.85})` : `rgba(255,76,76,${intensity * 0.85})`) : T.surface2, borderRadius: 2, aspectRatio: "1", minHeight: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, color: intensity > 0.5 ? T.bg : T.textMuted }}>{val > 0 ? val : ""}</div>;
          })}
        </>))}
      </div>
    </Card>
  </>);
}

// ─── Workflows Grid ───
function Workflows({ workflows, onSelect }) {
  const [sort, setSort] = useState("failedCount");
  const sorted = [...workflows].filter(w => w.execCount > 0).sort((a, b) => sort === "failedCount" ? b.failedCount - a.failedCount : sort === "execCount" ? b.execCount - a.execCount : Number(a.successRate) - Number(b.successRate));
  return (<>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Workflows ({sorted.length})</h2>
      <div style={{ display: "flex", gap: 4 }}>{[{ k: "failedCount", l: "Failures" }, { k: "execCount", l: "Runs" }, { k: "successRate", l: "Worst Rate" }].map(s => <button key={s.k} onClick={() => setSort(s.k)} style={{ ...pill, background: sort === s.k ? T.greenDim : "transparent", color: sort === s.k ? T.green : T.textMuted }}>{s.l}</button>)}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {sorted.map(w => (<div key={w.id} onClick={() => onSelect(w.id)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, cursor: "pointer", borderTop: `2px solid ${rateColor(w.successRate)}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: w.active ? T.green : T.textMuted }} />
          <span style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{w.name}</span>
        </div>
        {/* Node count */}
        {w.nodeCount > 0 && <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 6 }}>{w.nodeCount} nodes</div>}
        {/* Sparkline */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18, marginBottom: 6 }}>
          {(w.sparkline || []).map((v, i) => <div key={i} style={{ flex: 1, height: v === 0 ? 1 : Math.max((v / Math.max(...(w.sparkline || [1]))) * 16, 2), background: v === 0 ? T.border : T.green, borderRadius: 1, opacity: v === 0 ? 0.3 : 0.7 }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
          <span style={{ color: T.textMuted }}>{w.execCount} runs</span>
          {w.failedCount > 0 && <span style={{ color: T.red }}>{w.failedCount} fail</span>}
          <span style={{ fontWeight: 700, color: rateColor(w.successRate) }}>{w.successRate}%</span>
        </div>
        {/* Avg duration */}
        {w.avgDuration > 0 && <div style={{ fontSize: 9, color: T.textMuted, marginTop: 4 }}>avg {fmt(w.avgDuration)} · p95 {fmt(w.p95Duration)}</div>}
        {w.tags?.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4 }}>{w.tags.map(t => <span key={t} style={{ fontSize: 8, color: T.blue, background: T.blueDim, padding: "1px 5px", borderRadius: 3 }}>{t}</span>)}</div>}
      </div>))}
    </div>
  </>);
}

// ─── Drill Down (Node-level + Retry) ───
function DrillDown({ wf, onBack, retryExec, retrying }) {
  if (!wf) return null;
  const c = rateColor(wf.successRate);
  const fakeHistory = Array.from({ length: 15 }, (_, i) => ({ id: 1800 - i, status: Math.random() > (Number(wf.successRate) / 100) ? "error" : "success", startedAt: new Date(Date.now() - i * 3600000 * 2).toISOString(), duration: Math.floor(Math.random() * 60000) + 200 }));
  const history = wf.recentExecutions?.length > 0 ? wf.recentExecutions : fakeHistory;

  return (<div>
    <button onClick={onBack} style={{ ...pill, color: T.green, marginBottom: 12, fontSize: 12 }}>← Back</button>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: wf.active ? T.green : T.textMuted }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{wf.name}</h2>
      <span style={{ fontSize: 22, fontWeight: 700, color: c, marginLeft: "auto" }}>{wf.successRate}%</span>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
      <StatCard label="RUNS" value={wf.execCount} color={T.cyan} />
      <StatCard label="FAILURES" value={wf.failedCount} color={T.red} />
      <StatCard label="AVG DURATION" value={fmt(wf.avgDuration)} color={T.textDim} />
      <StatCard label="P95 DURATION" value={fmt(wf.p95Duration)} color={T.amber} />
      <StatCard label="NODES" value={wf.nodeCount || "—"} color={T.blue} />
    </div>

    {/* Node breakdown */}
    {wf.nodes?.length > 0 && (
      <Card title="NODE PIPELINE" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          {wf.nodes.map((n, i) => (<>
            <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px" }}>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{n.name}</div>
              <div style={{ fontSize: 8, color: T.textMuted }}>{n.type?.split(".").pop()}</div>
            </div>
            {i < wf.nodes.length - 1 && <span style={{ color: T.textMuted, fontSize: 11 }}>→</span>}
          </>))}
        </div>
      </Card>
    )}

    {/* Duration trend */}
    {wf.durationTrend?.length > 0 && (
      <Card title="DURATION TREND (5 WEEKS)" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
          {wf.durationTrend.map((d, i) => {
            const max = Math.max(...wf.durationTrend.map(x => x.p95), 1);
            return (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 8, color: T.textDim }}>{fmt(d.avg)}</span>
              <div style={{ width: "100%", display: "flex", gap: 2, justifyContent: "center" }}>
                <div style={{ width: "40%", borderRadius: 3, background: T.green, opacity: 0.7, height: Math.max((d.avg / max) * 40, 3) }} />
                <div style={{ width: "40%", borderRadius: 3, background: T.amber, opacity: 0.5, height: Math.max((d.p95 / max) * 40, 3) }} />
              </div>
              <span style={{ fontSize: 8, color: T.textMuted }}>W{i + 1}</span>
            </div>);
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 9 }}>
          <span style={{ color: T.green }}>■ Avg</span><span style={{ color: T.amber }}>■ P95</span>
        </div>
      </Card>
    )}

    {/* Top errors with AI diagnosis */}
    {wf.topErrors?.length > 0 && (
      <Card title="TOP ERRORS — AI DIAGNOSIS" style={{ marginBottom: 12 }}>
        {wf.topErrors.map((e, i) => (
          <ErrorWithDiagnosis key={i} error={e} workflowName={wf.name} nodes={wf.nodes} isLast={i === wf.topErrors.length - 1} />
        ))}
      </Card>
    )}

    {/* Execution log with retry + diagnose */}
    <Card title="RECENT EXECUTIONS">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["#", "Status", "Time", "Duration", "Actions"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
        <tbody>{history.map(e => (
          <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}` }}>
            <td style={{ ...tdS, color: T.textMuted }}>#{e.id}</td>
            <td style={tdS}><StatusBadge status={e.status} /></td>
            <td style={{ ...tdS, color: T.textDim }}>{timeAgo(e.startedAt)}</td>
            <td style={{ ...tdS, color: T.textDim }}>{fmt(e.duration)}</td>
            <td style={tdS}>{e.status === "error" && (
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => retryExec(e.id)} disabled={retrying.has(e.id)} style={{ ...pill, fontSize: 9, color: retrying.has(e.id) ? T.textMuted : T.amber, background: T.amberDim, padding: "2px 8px" }}>
                  {retrying.has(e.id) ? "Retrying..." : "↻ Retry"}
                </button>
              </div>
            )}</td>
          </tr>
        ))}</tbody>
      </table>
      {history.some(e => e.status === "error" && e.error) && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>EXECUTION ERRORS</div>
          {history.filter(e => e.status === "error" && e.error).slice(0, 5).map((e, i) => (
            <ErrorWithDiagnosis key={i} error={{ message: e.error, count: 1 }} workflowName={wf.name} nodes={wf.nodes} isLast={i === history.filter(x => x.status === "error" && x.error).length - 1} />
          ))}
        </div>
      )}
    </Card>
  </div>);
}

// ─── Duration Trends ───
function Durations({ workflows }) {
  const wfs = workflows.filter(w => w.durationTrend?.some(d => d.avg > 0)).sort((a, b) => (b.avgDuration || 0) - (a.avgDuration || 0)).slice(0, 8);
  return (<>
    <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Duration Trends — Are Workflows Getting Slower?</h2>
    <div style={{ display: "grid", gap: 10 }}>
      {wfs.map((wf, wi) => {
        const colors = [T.green, T.blue, T.amber, T.red, T.cyan, T.purple, T.pink, T.text];
        const c = colors[wi % colors.length];
        const max = Math.max(...wf.durationTrend.map(d => d.p95), 1);
        const trend = wf.durationTrend;
        const getting_slower = trend.length >= 2 && trend[trend.length - 1].avg > trend[0].avg * 1.15;
        return (<Card key={wf.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{wf.name}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {getting_slower && <span style={{ fontSize: 9, color: T.red, background: T.redDim, padding: "2px 6px", borderRadius: 3 }}>↗ Getting Slower</span>}
              <span style={{ fontSize: 11, color: c }}>{fmt(wf.avgDuration)} avg</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 40 }}>
            {trend.map((d, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 7, color: T.textDim }}>{fmt(d.avg)}</span>
              <div style={{ width: "100%", borderRadius: 3, background: c, opacity: 0.7, height: Math.max((d.avg / max) * 30, 2) }} />
              <span style={{ fontSize: 7, color: T.textMuted }}>W{i + 1}</span>
            </div>))}
          </div>
        </Card>);
      })}
    </div>
  </>);
}

// ─── Tags ───
function Tags({ workflows, onSelect }) {
  const tagMap = {};
  workflows.forEach(w => {
    (w.tags?.length > 0 ? w.tags : ["Untagged"]).forEach(t => {
      if (!tagMap[t]) tagMap[t] = { workflows: [], totalExecs: 0, totalFails: 0 };
      tagMap[t].workflows.push(w); tagMap[t].totalExecs += w.execCount; tagMap[t].totalFails += w.failedCount;
    });
  });
  return (<>
    <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Workflows by Tag</h2>
    {Object.entries(tagMap).sort((a, b) => b[1].totalExecs - a[1].totalExecs).map(([tag, d]) => {
      const rate = d.totalExecs > 0 ? ((1 - d.totalFails / d.totalExecs) * 100).toFixed(0) : "100";
      return (<Card key={tag} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: T.blue, background: T.blueDim, padding: "2px 8px", borderRadius: 4 }}>{tag}</span>
            <span style={{ fontSize: 11, color: T.textDim }}>{d.workflows.length} workflows</span>
          </div>
          <span style={{ fontWeight: 700, color: rateColor(rate), fontSize: 14 }}>{rate}%</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 6 }}>
          {d.workflows.map(w => (<div key={w.id} onClick={() => onSelect(w.id)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: 8, cursor: "pointer", borderLeft: `3px solid ${rateColor(w.successRate)}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 9, color: T.textMuted }}><span>{w.execCount} runs</span><span style={{ color: rateColor(w.successRate), fontWeight: 600 }}>{w.successRate}%</span></div>
          </div>))}
        </div>
      </Card>);
    })}
  </>);
}

// ─── Errors Tab with Retry ───
function Errors({ workflows, retryExec, retrying }) {
  const allErrors = workflows.flatMap(w => (w.topErrors || []).map(e => ({ ...e, workflow: w.name, wfId: w.id, nodes: w.nodes })));
  const neverStarted = workflows.filter(w => w.topErrors?.some(e => e.message?.includes("never started") || e.message?.includes("null")));
  const instantFails = workflows.filter(w => w.avgDuration < 100 && w.failedCount > 0);

  return (<>
    <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Error Analysis & AI Diagnosis</h2>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
      <Card><div style={{ fontSize: 24, fontWeight: 700, color: T.red }}>{allErrors.reduce((s, e) => s + e.count, 0)}</div><div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>Total Error Occurrences</div></Card>
      <Card><div style={{ fontSize: 24, fontWeight: 700, color: T.amber }}>{neverStarted.length}</div><div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>Never-Started Workflows</div></Card>
      <Card><div style={{ fontSize: 24, fontWeight: 700, color: T.pink }}>{instantFails.length}</div><div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>Instant Failures (&lt;100ms)</div></Card>
    </div>
    <Card title="ALL ERRORS — CLICK DIAGNOSE FOR AI FIX">
      {allErrors.sort((a, b) => b.count - a.count).map((e, i) => (
        <ErrorWithDiagnosis key={i} error={e} workflowName={e.workflow} nodes={e.nodes} isLast={i === allErrors.length - 1} showWorkflow />
      ))}
    </Card>
  </>);
}

// ═══════════════════════════════════════════════
// KPI SECTION (Cross-Source)
// ═══════════════════════════════════════════════
function KPISection({ workflows, stats, hubData, adsData }) {
  const automationRate = stats.totalExecs > 0 ? stats.successRate : "—";
  const totalLeads = hubData?.stats?.totalDeals || "—";
  const adSpend = adsData?.totals?.totalSpend ? `$${Number(adsData.totals.totalSpend).toLocaleString()}` : "—";
  const conversions = adsData?.totals?.totalConversions || "—";
  const costPerLead = adsData?.totals?.totalSpend && adsData?.totals?.totalConversions ? `$${(Number(adsData.totals.totalSpend) / Number(adsData.totals.totalConversions)).toFixed(0)}` : "—";
  const winRate = hubData?.stats?.winRate || "—";

  return (<>
    <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: T.cyan }}>Cross-Platform KPIs</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
      <StatCard label="AUTOMATION SUCCESS" value={`${automationRate}%`} sub="n8n workflow reliability" color={Number(automationRate) >= 80 ? T.green : T.red} />
      <StatCard label="PIPELINE DEALS" value={totalLeads} sub="HubSpot CRM" color={T.purple} />
      <StatCard label="AD SPEND" value={adSpend} sub="Google Ads total" color={T.blue} />
      <StatCard label="CONVERSIONS" value={conversions} sub="from Google Ads" color={T.green} />
      <StatCard label="COST PER LEAD" value={costPerLead} sub="Ads spend ÷ conversions" color={T.amber} />
      <StatCard label="WIN RATE" value={winRate} sub="HubSpot deal close rate" color={T.cyan} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <Card title="AUTOMATION HEALTH">
        <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.8 }}>
          <div>Active workflows: <b style={{ color: T.green }}>{stats.activeWorkflows}</b> / {stats.totalWorkflows}</div>
          <div>Total executions: <b style={{ color: T.cyan }}>{stats.totalExecs?.toLocaleString()}</b></div>
          <div>Failed: <b style={{ color: T.red }}>{stats.failedExecs?.toLocaleString()}</b> ({stats.totalExecs > 0 ? ((stats.failedExecs / stats.totalExecs) * 100).toFixed(1) : 0}%)</div>
          <div>Avg duration: <b>{fmt(stats.avgDuration)}</b></div>
        </div>
      </Card>
      <Card title="FUNNEL OVERVIEW">
        <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.8 }}>
          {adsData?.totals ? (<>
            <div>Impressions: <b style={{ color: T.blue }}>{adsData.totals.totalImpressions?.toLocaleString()}</b></div>
            <div>Clicks: <b style={{ color: T.cyan }}>{adsData.totals.totalClicks?.toLocaleString()}</b></div>
            <div>Conversions: <b style={{ color: T.green }}>{adsData.totals.totalConversions}</b></div>
          </>) : <div style={{ color: T.textMuted }}>Load Google Ads data to see funnel metrics</div>}
          {hubData?.stats ? (<>
            <div>Deals in pipeline: <b style={{ color: T.purple }}>{hubData.stats.openDeals || hubData.stats.totalDeals}</b></div>
            <div>Pipeline value: <b style={{ color: T.green }}>{hubData.stats.totalValue ? `$${Number(hubData.stats.totalValue).toLocaleString()}` : "—"}</b></div>
          </>) : <div style={{ color: T.textMuted }}>Load HubSpot data to see pipeline</div>}
        </div>
      </Card>
    </div>
    {!hubData && !adsData && <div style={{ marginTop: 16, textAlign: "center", padding: 24, color: T.textMuted, fontSize: 12 }}>Load HubSpot and Google Ads data from their tabs to populate all KPIs here.</div>}
  </>);
}

// ═══════════════════════════════════════════════
// HUBSPOT
// ═══════════════════════════════════════════════
function HubSpotSection({ data, loading, onFetch }) {
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: T.purple }}>HubSpot CRM</h2>
      <button onClick={onFetch} disabled={loading} style={{ ...pill, background: T.purpleDim, color: T.purple, opacity: loading ? 0.5 : 1 }}>{loading ? "Fetching..." : data ? "↻ Refresh" : "Load HubSpot Data"}</button>
    </div>
    {!data && !loading && <Card><div style={{ textAlign: "center", padding: 32 }}><div style={{ fontSize: 28, marginBottom: 8 }}>📊</div><p style={{ color: T.textDim, fontSize: 12 }}>Pull live data from your HubSpot CRM</p><button onClick={onFetch} style={{ background: T.purple, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 11, fontFamily: font, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Pull HubSpot Data</button></div></Card>}
    {loading && <Card><div style={{ textAlign: "center", padding: 32 }}><Spinner color={T.purple} /><p style={{ color: T.textDim, fontSize: 11, marginTop: 8 }}>Querying HubSpot...</p></div></Card>}
    {data && !data.error && (<>
      {data.stats && <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        <StatCard label="DEALS" value={data.stats.totalDeals || "—"} color={T.purple} />
        <StatCard label="PIPELINE VALUE" value={data.stats.totalValue ? `$${Number(data.stats.totalValue).toLocaleString()}` : "—"} color={T.green} />
        <StatCard label="AVG DEAL" value={data.stats.avgDealSize ? `$${Number(data.stats.avgDealSize).toLocaleString()}` : "—"} color={T.cyan} />
        <StatCard label="WIN RATE" value={data.stats.winRate || "—"} color={T.amber} />
      </div>}
      {data.deals && <Card title="DEALS"><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Deal", "Stage", "Amount", "Company", "Days"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{data.deals.slice(0, 10).map((d, i) => (<tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}><td style={tdS}>{d.name}</td><td style={tdS}><span style={{ background: T.purpleDim, color: T.purple, padding: "2px 6px", borderRadius: 3, fontSize: 9 }}>{d.stage}</span></td><td style={{ ...tdS, color: T.green }}>{d.amount ? `$${Number(d.amount).toLocaleString()}` : "—"}</td><td style={{ ...tdS, color: T.textDim }}>{d.company || "—"}</td><td style={{ ...tdS, color: T.textMuted }}>{d.daysInStage || "—"}</td></tr>))}</tbody></table></Card>}
      {data.raw && <Card title="RAW RESPONSE"><pre style={{ fontSize: 10, color: T.textDim, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>{data.raw}</pre></Card>}
    </>)}
    {data?.error && <Card><div style={{ color: T.red, fontSize: 12, padding: 16 }}>Error: {data.error}</div></Card>}
  </div>);
}

// ═══════════════════════════════════════════════
// GOOGLE ADS
// ═══════════════════════════════════════════════
function AdsSection({ data, loading, onFetch }) {
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: T.blue }}>Google Ads</h2>
      <button onClick={onFetch} disabled={loading} style={{ ...pill, background: T.blueDim, color: T.blue, opacity: loading ? 0.5 : 1 }}>{loading ? "Generating..." : data ? "↻ Refresh" : "Generate Report"}</button>
    </div>
    {!data && !loading && <Card><div style={{ textAlign: "center", padding: 32 }}><div style={{ fontSize: 28, marginBottom: 8 }}>📈</div><p style={{ color: T.textDim, fontSize: 12 }}>AI-powered Google Ads performance report</p><button onClick={onFetch} style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 11, fontFamily: font, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Generate Report</button></div></Card>}
    {loading && <Card><div style={{ textAlign: "center", padding: 32 }}><Spinner color={T.blue} /><p style={{ color: T.textDim, fontSize: 11, marginTop: 8 }}>Generating report...</p></div></Card>}
    {data && !data.error && (<>
      {data.totals && <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 12 }}>
        <StatCard label="SPEND" value={`$${Number(data.totals.totalSpend).toLocaleString()}`} color={T.red} />
        <StatCard label="CLICKS" value={data.totals.totalClicks?.toLocaleString()} color={T.blue} />
        <StatCard label="CTR" value={data.totals.avgCTR} color={T.amber} />
        <StatCard label="CONVERSIONS" value={data.totals.totalConversions} color={T.green} />
        <StatCard label="AVG CPA" value={data.totals.avgCPA ? `$${data.totals.avgCPA}` : "—"} color={T.cyan} />
      </div>}
      {data.campaigns && <Card title="CAMPAIGNS"><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Campaign", "Spend", "Clicks", "CTR", "Conv", "CPA", "ROAS"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{data.campaigns.map((c, i) => (<tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}><td style={tdS}>{c.name}</td><td style={{ ...tdS, color: T.red }}>${Number(c.spend).toLocaleString()}</td><td style={tdS}>{c.clicks?.toLocaleString()}</td><td style={tdS}>{c.ctr}</td><td style={{ ...tdS, color: T.green }}>{c.conversions}</td><td style={{ ...tdS, color: T.amber }}>{c.cpa ? `$${c.cpa}` : "—"}</td><td style={{ ...tdS, color: T.cyan }}>{c.roas || "—"}</td></tr>))}</tbody></table></Card>}
      {data.recommendations && <Card title="AI RECOMMENDATIONS" style={{ marginTop: 10 }}>{data.recommendations.map((r, i) => (<div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: i < data.recommendations.length - 1 ? `1px solid ${T.border}` : "none" }}><span style={{ color: T.blue }}>→</span><span style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>{r}</span></div>))}</Card>}
      {data.raw && <Card title="RAW"><pre style={{ fontSize: 10, color: T.textDim, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>{data.raw}</pre></Card>}
    </>)}
    {data?.error && <Card><div style={{ color: T.red, fontSize: 12, padding: 16 }}>Error: {data.error}</div></Card>}
  </div>);
}

// ═══════════════════════════════════════════════
// ALERTS CONFIG
// ═══════════════════════════════════════════════
function AlertsSection({ config, setConfig, session, slackConfigured, setSlackConfigured, alertsSent, connected, workflows }) {
  const [saving, setSaving] = useState(false);
  const saveSlack = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/slack-config`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-FlowPulse-Session": session },
        body: JSON.stringify({ slackWebhook: config.slackWebhook }),
      });
      const json = await res.json();
      setSlackConfigured(json.configured);
    } catch {}
    setSaving(false);
  };

  const criticalWfs = workflows.filter(w => w.active && Number(w.successRate) < 50);

  return (<div>
    <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: T.pink }}>Slack Alerts & Monitoring</h2>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      <StatCard label="ALERTS SENT" value={alertsSent} color={T.pink} />
      <StatCard label="STATUS" value={slackConfigured ? "Active" : "Not Configured"} color={slackConfigured ? T.green : T.textMuted} />
    </div>

    <Card title="SLACK WEBHOOK CONFIGURATION" style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7, marginBottom: 12 }}>
        Get failure alerts in Slack instantly. To set up:
      </p>
      <div style={{ fontSize: 11, color: T.textDim, lineHeight: 2, marginBottom: 12 }}>
        <div>1. Go to <b style={{ color: T.text }}>api.slack.com/apps</b> → Create New App</div>
        <div>2. Enable <b style={{ color: T.text }}>Incoming Webhooks</b></div>
        <div>3. Add webhook to your channel → copy the URL</div>
        <div>4. Paste it below and save</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={config.slackWebhook} onChange={e => setConfig(c => ({ ...c, slackWebhook: e.target.value }))} placeholder="https://hooks.slack.com/services/..." style={{ ...inputS, flex: 1 }} />
        <button onClick={saveSlack} disabled={saving || !connected} style={{ background: T.pink, color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", fontSize: 11, fontFamily: font, fontWeight: 700, cursor: "pointer", opacity: saving || !connected ? 0.5 : 1 }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {!connected && <div style={{ fontSize: 10, color: T.amber, marginTop: 8 }}>Connect to n8n first (top bar) to configure Slack alerts.</div>}
    </Card>

    {criticalWfs.length > 0 && (
      <Card title="CRITICAL WORKFLOWS (would trigger alerts)">
        {criticalWfs.map((w, i) => (
          <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < criticalWfs.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div><div style={{ fontSize: 12 }}>{w.name}</div><div style={{ fontSize: 9, color: T.textMuted }}>{w.failedCount} failures out of {w.execCount} runs</div></div>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.red }}>{w.successRate}%</span>
          </div>
        ))}
      </Card>
    )}
  </div>);
}

// ═══════════════════════════════════════════════
// ERROR WITH AI DIAGNOSIS
// ═══════════════════════════════════════════════
function ErrorWithDiagnosis({ error, workflowName, nodes, isLast, showWorkflow }) {
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const runDiagnosis = async () => {
    if (diagnosis) { setExpanded(!expanded); return; }
    setLoading(true); setExpanded(true);
    const result = await diagnoseError(error.message, workflowName, nodes);
    setDiagnosis(result);
    setLoading(false);
  };

  // Parse diagnosis into structured sections
  const parseDiagnosis = (text) => {
    if (!text) return null;
    const lines = text.split("\n").filter(l => l.trim());
    let diagnosisText = "";
    let fixSteps = [];
    let inFix = false;

    for (const line of lines) {
      if (line.toUpperCase().includes("FIX:") || line.toUpperCase().includes("STEPS:") || line.toUpperCase().includes("SOLUTION:")) {
        inFix = true; continue;
      }
      if (line.toUpperCase().includes("DIAGNOSIS:") || line.toUpperCase().includes("CAUSE:") || line.toUpperCase().includes("ISSUE:")) {
        diagnosisText = line.replace(/^.*?:\s*/i, ""); inFix = false; continue;
      }
      if (inFix) {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-*]\s*/, "").trim();
        if (cleaned) fixSteps.push(cleaned);
      } else if (!diagnosisText && !line.startsWith("#")) {
        diagnosisText += (diagnosisText ? " " : "") + line.trim();
      }
    }
    // If no structured parsing worked, just split into chunks
    if (!diagnosisText && fixSteps.length === 0) {
      diagnosisText = lines.slice(0, 2).join(" ");
      fixSteps = lines.slice(2);
    }
    return { diagnosisText, fixSteps };
  };

  const parsed = diagnosis ? parseDiagnosis(diagnosis) : null;

  return (
    <div style={{ borderBottom: isLast ? "none" : `1px solid ${T.border}`, padding: "10px 0" }}>
      {/* Error header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {showWorkflow && <div style={{ fontSize: 10, color: T.textDim, marginBottom: 2 }}>{workflowName}</div>}
          <div style={{ fontSize: 12, color: T.red, lineHeight: 1.4 }}>{error.message}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700 }}>×{error.count}</span>
          <button onClick={runDiagnosis} disabled={loading} style={{
            background: expanded && diagnosis ? T.greenDim : "linear-gradient(135deg, #B388FF22, #00E67622)",
            color: expanded && diagnosis ? T.green : T.purple,
            border: `1px solid ${expanded && diagnosis ? T.green + "40" : T.purple + "40"}`,
            borderRadius: 6, padding: "5px 12px", fontSize: 10, fontFamily: font,
            cursor: loading ? "wait" : "pointer", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5,
            opacity: loading ? 0.7 : 1, transition: "all 0.2s",
          }}>
            {loading ? (<><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", border: `2px solid ${T.purple}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />Diagnosing...</>) : diagnosis ? (expanded ? "▼ Hide Fix" : "▶ Show Fix") : "🔍 Diagnose"}
          </button>
        </div>
      </div>

      {/* Diagnosis panel */}
      {expanded && (loading || diagnosis) && (
        <div style={{ marginTop: 10, background: T.bg, border: `1px solid ${T.borderBright}`, borderRadius: 8, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.purple, boxShadow: `0 0 12px ${T.purple}`, animation: "pulse 1.5s infinite" }} />
                <span style={{ fontSize: 11, color: T.textDim }}>AI analyzing error pattern...</span>
              </div>
            </div>
          ) : parsed ? (
            <div>
              {/* Diagnosis */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, background: `${T.red}06` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>🔍</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.red, letterSpacing: 1 }}>DIAGNOSIS</span>
                </div>
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, fontFamily: "system-ui, -apple-system, sans-serif" }}>{parsed.diagnosisText}</div>
              </div>

              {/* Fix steps */}
              {parsed.fixSteps.length > 0 && (
                <div style={{ padding: "12px 16px", background: `${T.green}06` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>🔧</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.green, letterSpacing: 1 }}>HOW TO FIX</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {parsed.fixSteps.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          background: T.greenDim, border: `1px solid ${T.green}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: T.green, fontWeight: 700,
                        }}>{i + 1}</div>
                        <span style={{ fontSize: 12, color: T.textDim, lineHeight: 1.6, paddingTop: 2, fontFamily: "system-ui, -apple-system, sans-serif" }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw fallback if parsing didn't produce steps */}
              {parsed.fixSteps.length === 0 && !parsed.diagnosisText && (
                <div style={{ padding: "12px 16px" }}>
                  <pre style={{ fontSize: 11, color: T.textDim, whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0, fontFamily: "system-ui, sans-serif" }}>{diagnosis}</pre>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "12px 16px" }}>
              <pre style={{ fontSize: 11, color: T.textDim, whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>{diagnosis}</pre>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════
function Card({ title, children, style: s }) {
  return (<div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, ...s }}>
    {title && <h3 style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, margin: "0 0 10px", letterSpacing: 1, textTransform: "uppercase" }}>{title}</h3>}
    {children}
  </div>);
}

function StatCard({ label, value, sub, color }) {
  return (<div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 4, letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 9, color: T.textMuted, marginTop: 3 }}>{sub}</div>}
  </div>);
}

function StatusBadge({ status }) {
  const c = status === "success" ? T.green : T.red;
  return <span style={{ fontSize: 10, color: c, background: status === "success" ? T.greenDim : T.redDim, padding: "2px 6px", borderRadius: 3, display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: c }} />{status}</span>;
}

function Spinner({ color }) {
  return (<><div style={{ width: 8, height: 8, borderRadius: "50%", background: color, margin: "0 auto", boxShadow: `0 0 16px ${color}`, animation: "pulse 1.5s infinite" }} /><style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.5)}}`}</style></>);
}

function fmt(ms) { if (!ms || ms < 0) return "—"; if (ms < 1000) return `${ms}ms`; if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`; if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`; return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`; }
function timeAgo(d) { if (!d) return "—"; const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; }
function rateColor(r) { const n = Number(r); return n >= 80 ? T.green : n >= 50 ? T.amber : T.red; }
function generateFallbackHeatmap() { const data = []; const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; days.forEach((day, di) => { for (let h = 0; h < 24; h++) { const isPeak = [9, 10, 11, 14, 15, 16].includes(h); const base = isPeak && di < 5 ? 5 + Math.floor(Math.random() * 10) : Math.floor(Math.random() * 3); data.push({ day, hour: h, total: base, failures: Math.floor(base * 0.2), di, h }); } }); return data; }

const pill = { background: "transparent", border: "none", borderRadius: 4, padding: "5px 10px", fontSize: 11, fontFamily: font, cursor: "pointer", color: T.textMuted };
const inputS = { background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 10px", color: T.text, fontSize: 11, fontFamily: font, outline: "none", minWidth: 140 };
const thS = { textAlign: "left", padding: "6px 8px", fontSize: 9, color: T.textMuted, fontWeight: 500, letterSpacing: 0.5, borderBottom: `1px solid ${T.border}` };
const tdS = { padding: "7px 8px", fontSize: 11, color: T.text };
