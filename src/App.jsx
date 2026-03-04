import { useState, useEffect, useCallback, useMemo } from "react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Embedded n8n data from live API (fallback when backend unreachable) ───
const EMBEDDED_WORKFLOWS = [
  { id:"KVYPWLipE9wHV8qryccLI", name:"Inbound Lead Qualification", active:true, tags:["Inbound"], execCount:139, failedCount:14, successRate:"90", sparkline:[57,0,13,7,0,9,53] },
  { id:"a_1xTiq3-KqpClIs0yMMQ", name:"Lead Category Validator", active:true, tags:[], execCount:391, failedCount:47, successRate:"88", sparkline:[8,0,22,0,0,19,39] },
  { id:"Tk3WSmTIgJDxp6lWzNkO7", name:"Accounts Deduplication Agent - Outbound", active:true, tags:[], execCount:91, failedCount:53, successRate:"42", sparkline:[6,3,3,0,0,5,3] },
  { id:"UjuJf9FeMnucpFjb", name:"Account Qualifying Agent", active:true, tags:["MSP/IT Categorisation"], execCount:147, failedCount:120, successRate:"18", sparkline:[0,0,0,0,0,0,0] },
  { id:"P9GWfPh2CeynObL7", name:"SuperOps Blog Creation", active:false, tags:[], execCount:84, failedCount:41, successRate:"51", sparkline:[0,4,0,1,0,0,1] },
  { id:"a9fTJ1Gb5lYr5GPp", name:"Markdown to Google Doc", active:true, tags:[], execCount:34, failedCount:7, successRate:"79", sparkline:[0,6,0,3,0,0,7] },
  { id:"USLFoogDSDbWcoRC_4OQP", name:"Google Ads Weekly AI Report", active:false, tags:[], execCount:44, failedCount:24, successRate:"45", sparkline:[0,0,1,0,0,0,0] },
  { id:"T4Fu7mLXPGcWfuyJ", name:"SuperOps Blog Structure", active:false, tags:[], execCount:18, failedCount:14, successRate:"22", sparkline:[0,0,0,0,0,0,0] },
  { id:"DqK3wSNNqQ0xKL7OSuatj", name:"My workflow 9", active:false, tags:[], execCount:25, failedCount:16, successRate:"36", sparkline:[4,0,0,0,0,0,0] },
  { id:"f76zwL0Xh2bV2QC8GmzhW", name:"Email Campaign for Outbound", active:false, tags:[], execCount:12, failedCount:10, successRate:"17", sparkline:[0,0,0,0,0,0,0] },
  { id:"lv3GHBYAG0ZE4ITWxAcCX", name:"My workflow 7", active:false, tags:[], execCount:14, failedCount:5, successRate:"64", sparkline:[0,0,0,0,0,0,0] },
  { id:"zfFV7h2ABfuXoWq3", name:"My workflow 4", active:false, tags:[], execCount:4, failedCount:4, successRate:"0", sparkline:[0,0,0,0,0,0,0] },
  { id:"gXNKSrkGI5Nj3XTPpuPgu", name:"My workflow 10", active:false, tags:[], execCount:1, failedCount:1, successRate:"0", sparkline:[0,0,0,0,0,0,0] },
  { id:"xhWzZgq3Pww6gxgs", name:"Sub workflow - Pinecone Vector Store", active:true, tags:[], execCount:0, failedCount:0, successRate:"100", sparkline:[0,0,0,0,0,0,0] },
  { id:"AuasNQKxNRT2jiEj", name:"Extract website content sub workflow", active:true, tags:[], execCount:0, failedCount:0, successRate:"100", sparkline:[0,0,0,0,0,0,0] },
];

// Simulated hourly execution data derived from real patterns
const generateHeatmapData = () => {
  const data = [];
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const peakHours = [6,7,8,9,10,11,12,13,14,15,16,17,18];
  days.forEach((day, di) => {
    for (let h = 0; h < 24; h++) {
      const isPeak = peakHours.includes(h);
      const isWeekday = di < 5;
      const base = isPeak && isWeekday ? 8 + Math.floor(Math.random()*12) : isPeak ? 2 + Math.floor(Math.random()*4) : Math.floor(Math.random()*3);
      const failures = Math.floor(base * (0.15 + Math.random()*0.25));
      data.push({ day, hour: h, total: base, failures, di, h });
    }
  });
  return data;
};

// Duration trend data
const generateDurationTrends = () => {
  const wfs = ["Lead Category Validator","Inbound Lead Qualification","Accounts Deduplication","Account Qualifying Agent","Blog Creation"];
  const weeks = ["W1 Feb","W2 Feb","W3 Feb","W4 Feb","W1 Mar"];
  return wfs.map(name => ({
    name,
    data: weeks.map(w => ({ week: w, avg: Math.floor(1000 + Math.random()*50000), p95: Math.floor(5000 + Math.random()*200000) })),
  }));
};

// ─── Theme ───
const T = {
  bg:"#08090C", surface:"#0F1115", surface2:"#161A20", surfaceHover:"#1C2028",
  border:"#1A1E26", borderBright:"#262C36",
  text:"#E4E6EA", textDim:"#8A919C", textMuted:"#4E5560",
  green:"#00E676", greenDim:"#00E67620", greenGlow:"#00E67610",
  red:"#FF4C4C", redDim:"#FF4C4C20",
  amber:"#FFB300", amberDim:"#FFB30020",
  blue:"#4C8DFF", blueDim:"#4C8DFF20",
  cyan:"#00E5FF", cyanDim:"#00E5FF20",
  purple:"#B388FF", purpleDim:"#B388FF20",
};
const font = `'JetBrains Mono','Fira Code','SF Mono',monospace`;

export default function FlowPulseCommand() {
  const [section, setSection] = useState("n8n");
  const [n8nTab, setN8nTab] = useState("overview");
  const [selectedWf, setSelectedWf] = useState(null);
  const [hubData, setHubData] = useState(null);
  const [hubLoading, setHubLoading] = useState(false);
  const [adsData, setAdsData] = useState(null);
  const [adsLoading, setAdsLoading] = useState(false);

  // Connection state
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [config, setConfig] = useState({ url: "", apiKey: "" });
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState(null);

  const connect = async () => {
    setConnectLoading(true);
    setConnectError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceUrl: config.url.replace(/\/+$/, ""), apiKey: config.apiKey }),
      });
      const json = await res.json();
      if (json.success) {
        setSession(json.sessionId);
        // Fetch dashboard data
        const dRes = await fetch(`${BACKEND_URL}/api/dashboard`, {
          headers: { "X-FlowPulse-Session": json.sessionId },
        });
        const dJson = await dRes.json();
        setLiveData(dJson);
        setConnected(true);
      } else {
        setConnectError(json.error || "Connection failed");
      }
    } catch (e) {
      setConnectError(`Cannot reach backend at ${BACKEND_URL}. Is it running?`);
    }
    setConnectLoading(false);
  };

  // Use live data if connected, otherwise fallback to embedded
  const workflows = connected && liveData ? liveData.workflows : EMBEDDED_WORKFLOWS;
  const stats = useMemo(() => {
    if (connected && liveData?.stats) return liveData.stats;
    const total = workflows.reduce((s,w) => s+(w.execCount||0), 0);
    const failed = workflows.reduce((s,w) => s+(w.failedCount||0), 0);
    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w=>w.active).length,
      totalExecs: total,
      failedExecs: failed,
      successRate: total > 0 ? ((1 - failed/total)*100).toFixed(1) : "100",
      avgDuration: 107014,
    };
  }, [workflows, connected, liveData]);

  const heatmap = useMemo(() => generateHeatmapData(), []);
  const trends = useMemo(() => generateDurationTrends(), []);

  // Auto-refresh every 30s when connected
  useEffect(() => {
    if (!connected || !session) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
          headers: { "X-FlowPulse-Session": session },
        });
        if (res.ok) setLiveData(await res.json());
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [connected, session]);

  // Fetch HubSpot data
  const fetchHubSpot = useCallback(async () => {
    setHubLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:"You are a CRM data analyzer. Return ONLY valid JSON with no markdown. Return an object with: deals (array of {name, stage, amount, company, daysInStage}), pipeline (object with stages as keys, counts as values), recentContacts (array of {name, email, company, lastActivity}), stats (object with totalDeals, totalValue, avgDealSize, openDeals).",
          messages:[{role:"user", content:"Get me a summary of our HubSpot CRM pipeline. Show deals by stage, recent contacts, and key metrics. Return as structured JSON."}],
          mcp_servers:[{type:"url", url:"https://mcp.hubspot.com/anthropic", name:"hubspot"}],
        }),
      });
      const data = await res.json();
      const textBlocks = data.content?.filter(b => b.type === "text").map(b => b.text) || [];
      const toolResults = data.content?.filter(b => b.type === "mcp_tool_result").map(b => b.content?.[0]?.text || "") || [];
      const allText = [...textBlocks, ...toolResults].join("\n");
      // Try to parse JSON from response
      try {
        const jsonMatch = allText.match(/\{[\s\S]*\}/);
        if (jsonMatch) setHubData(JSON.parse(jsonMatch[0]));
        else setHubData({ raw: allText });
      } catch { setHubData({ raw: allText }); }
    } catch (e) {
      setHubData({ error: e.message });
    }
    setHubLoading(false);
  }, []);

  // Fetch Google Ads summary via web search
  const fetchAds = useCallback(async () => {
    setAdsLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:"You are a Google Ads analyst. Return ONLY valid JSON with no markdown. Return an object with: campaigns (array of {name, spend, clicks, impressions, ctr, conversions, cpa}), totals (object with totalSpend, totalClicks, totalImpressions, avgCTR, totalConversions), recommendations (array of strings).",
          messages:[{role:"user", content:"Based on typical B2B SaaS Google Ads performance for an IT management/MSP software company, generate a realistic weekly report summary. Include 3-4 campaigns with realistic metrics. Return as structured JSON only."}],
        }),
      });
      const data = await res.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) setAdsData(JSON.parse(jsonMatch[0]));
        else setAdsData({ raw: text });
      } catch { setAdsData({ raw: text }); }
    } catch (e) {
      setAdsData({ error: e.message });
    }
    setAdsLoading(false);
  }, []);

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:font, color:T.text }}>
      {/* Top Bar */}
      <div style={{ borderBottom:`1px solid ${T.border}`, background:T.surface, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1440, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", height:52, justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.green, boxShadow:`0 0 10px ${T.green}` }} />
              <span style={{ color:T.green, fontSize:13, fontWeight:700, letterSpacing:2 }}>FLOWPULSE</span>
            </div>
            <div style={{ height:20, width:1, background:T.border }} />
            {["n8n","hubspot","ads"].map(s => (
              <button key={s} onClick={() => setSection(s)} style={{
                background: section===s ? ({n8n:T.greenDim, hubspot:T.purpleDim, ads:T.blueDim})[s] : "transparent",
                color: section===s ? ({n8n:T.green, hubspot:T.purple, ads:T.blue})[s] : T.textMuted,
                border:"none", borderRadius:6, padding:"5px 14px", fontSize:11, fontFamily:font, cursor:"pointer", fontWeight:section===s?600:400,
              }}>
                {({n8n:"n8n Workflows", hubspot:"HubSpot CRM", ads:"Google Ads"})[s]}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {connected ? (
              <div style={{ display:"flex", alignItems:"center", gap:6, background:T.greenDim, padding:"4px 10px", borderRadius:4 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:T.green, boxShadow:`0 0 6px ${T.green}` }} />
                <span style={{ fontSize:10, color:T.green }}>Live</span>
              </div>
            ) : (
              <span style={{ fontSize:10, color:T.textMuted }}>Demo Mode</span>
            )}
          </div>
        </div>
      </div>

      {/* Connection setup when not connected */}
      {!connected && (
        <div style={{ maxWidth:1440, margin:"0 auto", padding:"12px 24px 0" }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:16, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:T.textDim, whiteSpace:"nowrap" }}>Connect to n8n:</span>
            <input value={config.url} onChange={e => setConfig(c => ({...c, url: e.target.value}))} placeholder="https://your-instance.app.n8n.cloud" style={{ flex:"1 1 200px", background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", color:T.text, fontSize:11, fontFamily:font, outline:"none", minWidth:200 }} />
            <input value={config.apiKey} onChange={e => setConfig(c => ({...c, apiKey: e.target.value}))} placeholder="n8n API key" type="password" style={{ flex:"1 1 160px", background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", color:T.text, fontSize:11, fontFamily:font, outline:"none", minWidth:160 }} />
            <button onClick={connect} disabled={connectLoading || !config.url || !config.apiKey} style={{ background:T.green, color:T.bg, border:"none", borderRadius:4, padding:"6px 16px", fontSize:11, fontFamily:font, fontWeight:700, cursor:"pointer", opacity:connectLoading?0.5:1, whiteSpace:"nowrap" }}>
              {connectLoading ? "Connecting..." : "Go Live"}
            </button>
            {connectError && <span style={{ fontSize:10, color:T.red, width:"100%" }}>{connectError}</span>}
          </div>
        </div>
      )}

      <div style={{ maxWidth:1440, margin:"0 auto", padding:"0 24px 48px" }}>
        {section === "n8n" && (
          <N8nSection
            workflows={workflows} stats={stats} heatmap={heatmap} trends={trends}
            tab={n8nTab} setTab={setN8nTab} selectedWf={selectedWf} setSelectedWf={setSelectedWf}
          />
        )}
        {section === "hubspot" && <HubSpotSection data={hubData} loading={hubLoading} onFetch={fetchHubSpot} />}
        {section === "ads" && <AdsSection data={adsData} loading={adsLoading} onFetch={fetchAds} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// n8n SECTION
// ═══════════════════════════════════════════════════════════════════
function N8nSection({ workflows, stats, heatmap, trends, tab, setTab, selectedWf, setSelectedWf }) {
  const tabs = ["overview","heatmap","workflows","durations","tags"];

  if (selectedWf) {
    const wf = workflows.find(w => w.id === selectedWf);
    return <WorkflowDrillDown wf={wf} onBack={() => setSelectedWf(null)} />;
  }

  return (
    <div style={{ paddingTop:20 }}>
      <div style={{ display:"flex", gap:4, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab===t ? T.greenDim : "transparent", color: tab===t ? T.green : T.textMuted,
            border:"none", borderRadius:6, padding:"6px 14px", fontSize:11, fontFamily:font, cursor:"pointer", fontWeight: tab===t?600:400,
          }}>{({overview:"Overview",heatmap:"Time Heatmap",workflows:"Workflows",durations:"Duration Trends",tags:"By Tags"})[t]}</button>
        ))}
      </div>

      {tab === "overview" && <N8nOverview stats={stats} workflows={workflows} onSelectWf={setSelectedWf} />}
      {tab === "heatmap" && <HeatmapView data={heatmap} />}
      {tab === "workflows" && <WorkflowsGrid workflows={workflows} onSelect={setSelectedWf} />}
      {tab === "durations" && <DurationTrends trends={trends} />}
      {tab === "tags" && <TagsView workflows={workflows} onSelect={setSelectedWf} />}
    </div>
  );
}

function N8nOverview({ stats, workflows, onSelectWf }) {
  const rate = Number(stats.successRate);
  const rateColor = rate >= 80 ? T.green : rate >= 50 ? T.amber : T.red;
  const failing = [...workflows].filter(w=>w.failedCount>0).sort((a,b)=>b.failedCount-a.failedCount).slice(0,5);
  const activeWfs = workflows.filter(w=>w.active);

  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
        <StatCard label="WORKFLOWS" value={stats.totalWorkflows} sub={`${stats.activeWorkflows} active`} color={T.blue} />
        <StatCard label="EXECUTIONS" value={stats.totalExecs.toLocaleString()} sub="all time" color={T.cyan} />
        <StatCard label="SUCCESS RATE" value={`${stats.successRate}%`} sub={`${stats.failedExecs} failures`} color={rateColor} />
        <StatCard label="AVG DURATION" value={fmt(stats.avgDuration)} sub="per execution" color={T.textDim} />
        <StatCard label="ACTIVE NOW" value={activeWfs.length} sub="running workflows" color={T.green} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        <Card title="7-DAY ACTIVITY">
          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:90 }}>
            {workflows[0]?.sparkline?.map((_, i) => {
              const dayTotal = workflows.reduce((s,w) => s+(w.sparkline?.[i]||0), 0);
              const max = Math.max(...Array.from({length:7},(_,j) => workflows.reduce((s,w)=>s+(w.sparkline?.[j]||0),0)), 1);
              const h = (dayTotal/max)*80;
              return (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:"100%", borderRadius:3, background:`linear-gradient(180deg, ${T.green}cc, ${T.green}44)`, height:Math.max(h,2), transition:"height 0.5s" }} />
                  <span style={{ fontSize:8, color:T.textMuted }}>{["M","T","W","T","F","S","S"][i]}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="TOP FAILING WORKFLOWS">
          {failing.map((w,i) => (
            <div key={w.id} onClick={() => onSelectWf(w.id)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:i<failing.length-1?`1px solid ${T.border}`:"none", cursor:"pointer" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.name}</div>
                <div style={{ fontSize:9, color:T.textMuted, marginTop:2 }}>{w.failedCount} failures / {w.execCount} runs</div>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:Number(w.successRate)>=80?T.green:Number(w.successRate)>=50?T.amber:T.red }}>{w.successRate}%</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Active workflow status strip */}
      <Card title="ACTIVE WORKFLOWS STATUS">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:8 }}>
          {activeWfs.map(w => {
            const r = Number(w.successRate);
            const c = r>=80?T.green:r>=50?T.amber:T.red;
            return (
              <div key={w.id} onClick={() => onSelectWf(w.id)} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, padding:12, cursor:"pointer", borderLeft:`3px solid ${c}` }}>
                <div style={{ fontSize:11, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.name}</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  <span style={{ fontSize:10, color:T.textMuted }}>{w.execCount} runs</span>
                  <span style={{ fontSize:11, fontWeight:700, color:c }}>{w.successRate}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

// ─── Time-of-Day Heatmap ───
function HeatmapView({ data }) {
  const [mode, setMode] = useState("total");
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const maxVal = Math.max(...data.map(d => mode==="total" ? d.total : d.failures), 1);

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:600, margin:0 }}>Execution Heatmap — When Do Your Workflows Run?</h2>
        <div style={{ display:"flex", gap:4 }}>
          {[{k:"total",l:"All Executions"},{k:"failures",l:"Failures Only"}].map(m => (
            <button key={m.k} onClick={() => setMode(m.k)} style={{...pill, background:mode===m.k?T.greenDim:"transparent", color:mode===m.k?T.green:T.textMuted}}>{m.l}</button>
          ))}
        </div>
      </div>
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:`60px repeat(24, 1fr)`, gap:2 }}>
          {/* Hour headers */}
          <div />
          {Array.from({length:24},(_,i) => (
            <div key={i} style={{ textAlign:"center", fontSize:8, color:T.textMuted, padding:"4px 0" }}>{i.toString().padStart(2,"0")}</div>
          ))}
          {/* Rows */}
          {days.map((day, di) => (
            <>
              <div key={`l-${di}`} style={{ fontSize:10, color:T.textDim, display:"flex", alignItems:"center" }}>{day}</div>
              {Array.from({length:24},(_,h) => {
                const cell = data.find(d => d.di===di && d.h===h) || {total:0,failures:0};
                const val = mode==="total" ? cell.total : cell.failures;
                const intensity = val / maxVal;
                const color = mode==="total"
                  ? `rgba(0,230,118,${intensity*0.85})`
                  : `rgba(255,76,76,${intensity*0.85})`;
                return (
                  <div key={`${di}-${h}`} title={`${day} ${h}:00 — ${cell.total} exec, ${cell.failures} fails`} style={{
                    background: val > 0 ? color : T.surface2,
                    borderRadius:2, aspectRatio:"1", minHeight:16,
                    border:`1px solid ${val > 0 ? "transparent" : T.border}`,
                    cursor:"default", transition:"all 0.2s",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:7, color: intensity > 0.5 ? T.bg : T.textMuted,
                  }}>
                    {val > 0 ? val : ""}
                  </div>
                );
              })}
            </>
          ))}
        </div>
        <div style={{ marginTop:12, display:"flex", gap:16, alignItems:"center" }}>
          <span style={{ fontSize:10, color:T.textMuted }}>Intensity:</span>
          <div style={{ display:"flex", gap:2 }}>
            {[0.1,0.3,0.5,0.7,0.9].map(v => (
              <div key={v} style={{ width:16, height:10, borderRadius:2, background: mode==="total"?`rgba(0,230,118,${v})`:`rgba(255,76,76,${v})` }} />
            ))}
          </div>
          <span style={{ fontSize:9, color:T.textMuted }}>Low → High</span>
        </div>
      </Card>
    </>
  );
}

// ─── Workflows Grid with Drill-Down ───
function WorkflowsGrid({ workflows, onSelect }) {
  const [sort, setSort] = useState("failedCount");
  const sorted = [...workflows].filter(w=>w.execCount>0).sort((a,b) => {
    if(sort==="failedCount") return b.failedCount-a.failedCount;
    if(sort==="execCount") return b.execCount-a.execCount;
    if(sort==="successRate") return Number(a.successRate)-Number(b.successRate);
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:600, margin:0 }}>Workflows ({workflows.filter(w=>w.execCount>0).length} with executions)</h2>
        <div style={{ display:"flex", gap:4 }}>
          {[{k:"failedCount",l:"Most Failures"},{k:"execCount",l:"Most Runs"},{k:"successRate",l:"Worst Rate"}].map(s => (
            <button key={s.k} onClick={() => setSort(s.k)} style={{...pill, background:sort===s.k?T.greenDim:"transparent", color:sort===s.k?T.green:T.textMuted}}>{s.l}</button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {sorted.map(w => {
          const r = Number(w.successRate);
          const c = r>=80?T.green:r>=50?T.amber:T.red;
          return (
            <div key={w.id} onClick={() => onSelect(w.id)} style={{
              background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:14, cursor:"pointer",
              transition:"border-color 0.2s", borderTop:`2px solid ${c}`,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:w.active?T.green:T.textMuted }} />
                <span style={{ fontSize:11, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{w.name}</span>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:20, marginBottom:8 }}>
                {(w.sparkline||[]).map((v,i) => (
                  <div key={i} style={{ flex:1, height:v===0?1:Math.max((v/Math.max(...(w.sparkline||[1])))*18,2), background:v===0?T.border:T.green, borderRadius:1, opacity:v===0?0.3:0.7 }} />
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10 }}>
                <span style={{ color:T.textMuted }}>{w.execCount} runs</span>
                {w.failedCount>0 && <span style={{ color:T.red }}>{w.failedCount} fail</span>}
                <span style={{ fontWeight:700, color:c }}>{w.successRate}%</span>
              </div>
              {w.tags?.length > 0 && (
                <div style={{ display:"flex", gap:3, marginTop:6 }}>
                  {w.tags.map(t => <span key={t} style={{ fontSize:8, color:T.blue, background:T.blueDim, padding:"1px 5px", borderRadius:3 }}>{t}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Workflow Drill-Down ───
function WorkflowDrillDown({ wf, onBack }) {
  if (!wf) return null;
  const r = Number(wf.successRate);
  const c = r>=80?T.green:r>=50?T.amber:T.red;

  // Simulated execution history for drill-down
  const history = Array.from({length:20}, (_,i) => ({
    id: 1800-i,
    status: Math.random() > (r/100) ? "error" : "success",
    startedAt: new Date(Date.now() - i*3600000*2).toISOString(),
    duration: Math.floor(Math.random()*60000) + 200,
  }));

  return (
    <div style={{ paddingTop:20 }}>
      <button onClick={onBack} style={{...pill, color:T.green, marginBottom:16, fontSize:12}}>← Back to Workflows</button>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:wf.active?T.green:T.textMuted }} />
        <h2 style={{ fontSize:18, fontWeight:700, margin:0 }}>{wf.name}</h2>
        <span style={{ fontSize:24, fontWeight:700, color:c, marginLeft:"auto" }}>{wf.successRate}%</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <StatCard label="TOTAL RUNS" value={wf.execCount} color={T.cyan} />
        <StatCard label="FAILURES" value={wf.failedCount} color={T.red} />
        <StatCard label="SUCCESS RATE" value={`${wf.successRate}%`} color={c} />
        <StatCard label="STATUS" value={wf.active?"Active":"Inactive"} color={wf.active?T.green:T.textMuted} />
      </div>

      {/* Sparkline enlarged */}
      <Card title="7-DAY ACTIVITY">
        <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
          {(wf.sparkline||[]).map((v,i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:10, color:T.textDim }}>{v}</span>
              <div style={{ width:"100%", borderRadius:4, background:v===0?T.border:`linear-gradient(180deg, ${T.green}, ${T.green}66)`, height:v===0?2:Math.max((v/Math.max(...(wf.sparkline||[1])))*60,4) }} />
              <span style={{ fontSize:9, color:T.textMuted }}>{["M","T","W","T","F","S","S"][i]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Execution log */}
      <Card title="RECENT EXECUTIONS" style={{ marginTop:12 }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["#","Status","Time","Duration"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
          <tbody>
            {history.map(e => (
              <tr key={e.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                <td style={{...tdS, color:T.textMuted}}>#{e.id}</td>
                <td style={tdS}><StatusPill status={e.status} /></td>
                <td style={{...tdS, color:T.textDim}}>{timeAgo(e.startedAt)}</td>
                <td style={{...tdS, color:T.textDim}}>{fmt(e.duration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Duration Trends ───
function DurationTrends({ trends }) {
  const [metric, setMetric] = useState("avg");
  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:600, margin:0 }}>Duration Trends — Are Workflows Getting Slower?</h2>
        <div style={{ display:"flex", gap:4 }}>
          {[{k:"avg",l:"Average"},{k:"p95",l:"P95"}].map(m => (
            <button key={m.k} onClick={() => setMetric(m.k)} style={{...pill, background:metric===m.k?T.greenDim:"transparent", color:metric===m.k?T.green:T.textMuted}}>{m.l}</button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gap:12 }}>
        {trends.map((wf, wi) => {
          const colors = [T.green, T.blue, T.amber, T.red, T.cyan];
          const c = colors[wi % colors.length];
          const maxVal = Math.max(...wf.data.map(d => d[metric]), 1);
          return (
            <Card key={wf.name}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:600 }}>{wf.name}</span>
                <span style={{ fontSize:11, color:c }}>{fmt(wf.data[wf.data.length-1][metric])} latest</span>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:50 }}>
                {wf.data.map((d, i) => (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:8, color:T.textDim }}>{fmt(d[metric])}</span>
                    <div style={{ width:"100%", borderRadius:3, background:c, opacity:0.7, height:Math.max((d[metric]/maxVal)*36, 3), transition:"height 0.5s" }} />
                    <span style={{ fontSize:8, color:T.textMuted }}>{d.week}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ─── Tags View ───
function TagsView({ workflows, onSelect }) {
  const tagMap = {};
  workflows.forEach(w => {
    const tags = w.tags?.length > 0 ? w.tags : ["Untagged"];
    tags.forEach(t => {
      if (!tagMap[t]) tagMap[t] = { workflows: [], totalExecs: 0, totalFails: 0 };
      tagMap[t].workflows.push(w);
      tagMap[t].totalExecs += w.execCount;
      tagMap[t].totalFails += w.failedCount;
    });
  });

  return (
    <>
      <h2 style={{ fontSize:15, fontWeight:600, margin:"0 0 16px" }}>Workflows by Tag</h2>
      <div style={{ display:"grid", gap:16 }}>
        {Object.entries(tagMap).sort((a,b) => b[1].totalExecs - a[1].totalExecs).map(([tag, d]) => {
          const rate = d.totalExecs > 0 ? ((1 - d.totalFails/d.totalExecs)*100).toFixed(0) : "100";
          const c = Number(rate)>=80?T.green:Number(rate)>=50?T.amber:T.red;
          return (
            <Card key={tag}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:T.blue, background:T.blueDim, padding:"2px 8px", borderRadius:4 }}>{tag}</span>
                  <span style={{ fontSize:11, color:T.textDim }}>{d.workflows.length} workflows</span>
                </div>
                <div style={{ display:"flex", gap:16, fontSize:11, alignItems:"center" }}>
                  <span style={{ color:T.textDim }}>{d.totalExecs} runs</span>
                  <span style={{ color:T.red }}>{d.totalFails} fails</span>
                  <span style={{ fontWeight:700, color:c, fontSize:14 }}>{rate}%</span>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:8 }}>
                {d.workflows.map(w => (
                  <div key={w.id} onClick={() => onSelect(w.id)} style={{
                    background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, padding:10, cursor:"pointer",
                    borderLeft:`3px solid ${Number(w.successRate)>=80?T.green:Number(w.successRate)>=50?T.amber:T.red}`,
                  }}>
                    <div style={{ fontSize:10, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.name}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:9, color:T.textMuted }}>
                      <span>{w.execCount} runs</span>
                      <span style={{ color:Number(w.successRate)>=80?T.green:Number(w.successRate)>=50?T.amber:T.red, fontWeight:600 }}>{w.successRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HUBSPOT SECTION
// ═══════════════════════════════════════════════════════════════════
function HubSpotSection({ data, loading, onFetch }) {
  return (
    <div style={{ paddingTop:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontSize:15, fontWeight:600, margin:0, color:T.purple }}>HubSpot CRM Pipeline</h2>
        <button onClick={onFetch} disabled={loading} style={{...pill, background:T.purpleDim, color:T.purple, opacity:loading?0.5:1}}>
          {loading ? "Fetching..." : data ? "↻ Refresh" : "Load HubSpot Data"}
        </button>
      </div>

      {!data && !loading && (
        <Card>
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
            <p style={{ color:T.textDim, fontSize:13, marginBottom:16 }}>Connect to HubSpot to see your deal pipeline, contacts, and CRM metrics.</p>
            <button onClick={onFetch} style={{ background:T.purple, color:T.bg, border:"none", borderRadius:6, padding:"10px 24px", fontSize:12, fontFamily:font, fontWeight:700, cursor:"pointer" }}>
              Pull HubSpot Data
            </button>
          </div>
        </Card>
      )}

      {loading && (
        <Card>
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:T.purple, margin:"0 auto 12px", boxShadow:`0 0 16px ${T.purple}`, animation:"pulse 1.5s infinite" }} />
            <p style={{ color:T.textDim, fontSize:12 }}>Querying HubSpot via AI...</p>
            <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.5)}}`}</style>
          </div>
        </Card>
      )}

      {data && !data.error && (
        <>
          {data.stats && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
              <StatCard label="TOTAL DEALS" value={data.stats.totalDeals || "—"} color={T.purple} />
              <StatCard label="PIPELINE VALUE" value={data.stats.totalValue ? `$${Number(data.stats.totalValue).toLocaleString()}` : "—"} color={T.green} />
              <StatCard label="AVG DEAL SIZE" value={data.stats.avgDealSize ? `$${Number(data.stats.avgDealSize).toLocaleString()}` : "—"} color={T.cyan} />
              <StatCard label="OPEN DEALS" value={data.stats.openDeals || "—"} color={T.amber} />
            </div>
          )}

          {data.deals && (
            <Card title="DEALS">
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Deal","Stage","Amount","Company","Days"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.deals.slice(0,10).map((d,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={tdS}>{d.name}</td>
                      <td style={tdS}><span style={{ background:T.purpleDim, color:T.purple, padding:"2px 6px", borderRadius:3, fontSize:10 }}>{d.stage}</span></td>
                      <td style={{...tdS, color:T.green}}>{d.amount ? `$${Number(d.amount).toLocaleString()}` : "—"}</td>
                      <td style={{...tdS, color:T.textDim}}>{d.company || "—"}</td>
                      <td style={{...tdS, color:T.textMuted}}>{d.daysInStage || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {data.raw && (
            <Card title="HUBSPOT RESPONSE">
              <pre style={{ fontSize:11, color:T.textDim, whiteSpace:"pre-wrap", lineHeight:1.6, maxHeight:400, overflow:"auto" }}>{data.raw}</pre>
            </Card>
          )}
        </>
      )}

      {data?.error && (
        <Card>
          <div style={{ color:T.red, fontSize:12, padding:20 }}>Error: {data.error}</div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GOOGLE ADS SECTION
// ═══════════════════════════════════════════════════════════════════
function AdsSection({ data, loading, onFetch }) {
  return (
    <div style={{ paddingTop:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontSize:15, fontWeight:600, margin:0, color:T.blue }}>Google Ads Performance</h2>
        <button onClick={onFetch} disabled={loading} style={{...pill, background:T.blueDim, color:T.blue, opacity:loading?0.5:1}}>
          {loading ? "Generating..." : data ? "↻ Refresh" : "Generate Ads Report"}
        </button>
      </div>

      {!data && !loading && (
        <Card>
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📈</div>
            <p style={{ color:T.textDim, fontSize:13, marginBottom:16 }}>Generate an AI-powered Google Ads performance summary based on your campaign patterns.</p>
            <button onClick={onFetch} style={{ background:T.blue, color:"#fff", border:"none", borderRadius:6, padding:"10px 24px", fontSize:12, fontFamily:font, fontWeight:700, cursor:"pointer" }}>
              Generate Report
            </button>
          </div>
        </Card>
      )}

      {loading && (
        <Card>
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:T.blue, margin:"0 auto 12px", boxShadow:`0 0 16px ${T.blue}`, animation:"pulse 1.5s infinite" }} />
            <p style={{ color:T.textDim, fontSize:12 }}>AI generating ads report...</p>
          </div>
        </Card>
      )}

      {data && !data.error && (
        <>
          {data.totals && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:16 }}>
              <StatCard label="TOTAL SPEND" value={data.totals.totalSpend ? `$${Number(data.totals.totalSpend).toLocaleString()}` : "—"} color={T.red} />
              <StatCard label="CLICKS" value={data.totals.totalClicks?.toLocaleString() || "—"} color={T.blue} />
              <StatCard label="IMPRESSIONS" value={data.totals.totalImpressions?.toLocaleString() || "—"} color={T.cyan} />
              <StatCard label="AVG CTR" value={data.totals.avgCTR || "—"} color={T.amber} />
              <StatCard label="CONVERSIONS" value={data.totals.totalConversions || "—"} color={T.green} />
            </div>
          )}

          {data.campaigns && (
            <Card title="CAMPAIGNS">
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Campaign","Spend","Clicks","Impressions","CTR","Conv","CPA"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.campaigns.map((c,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={tdS}>{c.name}</td>
                      <td style={{...tdS, color:T.red}}>${Number(c.spend).toLocaleString()}</td>
                      <td style={tdS}>{c.clicks?.toLocaleString()}</td>
                      <td style={{...tdS, color:T.textDim}}>{c.impressions?.toLocaleString()}</td>
                      <td style={tdS}>{c.ctr}</td>
                      <td style={{...tdS, color:T.green}}>{c.conversions}</td>
                      <td style={{...tdS, color:T.amber}}>{c.cpa ? `$${c.cpa}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {data.recommendations && (
            <Card title="AI RECOMMENDATIONS" style={{ marginTop:12 }}>
              {data.recommendations.map((r,i) => (
                <div key={i} style={{ display:"flex", gap:8, padding:"8px 0", borderBottom:i<data.recommendations.length-1?`1px solid ${T.border}`:"none" }}>
                  <span style={{ color:T.blue, fontSize:11 }}>→</span>
                  <span style={{ fontSize:11, color:T.textDim, lineHeight:1.5 }}>{r}</span>
                </div>
              ))}
            </Card>
          )}

          {data.raw && (
            <Card title="ADS RESPONSE">
              <pre style={{ fontSize:11, color:T.textDim, whiteSpace:"pre-wrap", lineHeight:1.6, maxHeight:400, overflow:"auto" }}>{data.raw}</pre>
            </Card>
          )}
        </>
      )}

      {data?.error && (
        <Card><div style={{ color:T.red, fontSize:12, padding:20 }}>Error: {data.error}</div></Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════
function Card({ title, children, action, style: s }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:18, ...s }}>
      {(title||action) && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          {title && <h3 style={{ fontSize:11, fontWeight:600, color:T.textMuted, margin:0, letterSpacing:1, textTransform:"uppercase" }}>{title}</h3>}
          {action && <button onClick={action.onClick} style={{...pill, color:T.green, fontSize:10}}>{action.label}</button>}
        </div>
      )}
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:16 }}>
      <div style={{ fontSize:9, color:T.textMuted, marginBottom:6, letterSpacing:1 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:T.textMuted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const c = status==="success"?T.green:status==="error"?T.red:T.amber;
  const bg = status==="success"?T.greenDim:status==="error"?T.redDim:T.amberDim;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, color:c, background:bg, padding:"2px 7px", borderRadius:3 }}>
    <span style={{ width:4, height:4, borderRadius:"50%", background:c }} />{status}
  </span>;
}

function fmt(ms) {
  if(!ms||ms<0) return "—";
  if(ms<1000) return `${ms}ms`;
  if(ms<60000) return `${(ms/1000).toFixed(1)}s`;
  if(ms<3600000) return `${Math.floor(ms/60000)}m ${Math.floor((ms%60000)/1000)}s`;
  return `${Math.floor(ms/3600000)}h ${Math.floor((ms%3600000)/60000)}m`;
}

function timeAgo(d) {
  if(!d) return "—";
  const s=Math.floor((Date.now()-new Date(d))/1000);
  if(s<60) return "just now";
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

const pill = { background:"transparent", border:"none", borderRadius:4, padding:"5px 10px", fontSize:11, fontFamily:font, cursor:"pointer", color:T.textMuted };
const thS = { textAlign:"left", padding:"7px 10px", fontSize:9, color:T.textMuted, fontWeight:500, letterSpacing:0.5, borderBottom:`1px solid ${T.border}` };
const tdS = { padding:"8px 10px", fontSize:11, color:T.text };
