// FlowPulse Command Center v3
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Animated Counter Hook ───
function useAnimatedValue(target, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const num = typeof target === "string" ? parseFloat(target.replace(/[^0-9.-]/g, "")) : target;
    if (isNaN(num)) { setDisplay(target); return; }

    const start = prevRef.current;
    const diff = num - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = num;
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return display;
}

// Format animated number for display
function AnimatedNum({ value, prefix = "", suffix = "", decimals = 0 }) {
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  const isNum = !isNaN(num) && isFinite(num);
  const animated = useAnimatedValue(isNum ? num : 0);

  if (!isNum) return <span>{value}</span>;

  const formatted = decimals > 0
    ? animated.toFixed(decimals)
    : Math.round(animated).toLocaleString();

  return <span>{prefix}{formatted}{suffix}</span>;
}

// Animated bar that grows from 0
function AnimatedBar({ height, color, delay = 0, style = {} }) {
  const [h, setH] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setH(height), 50 + delay);
    return () => clearTimeout(t);
  }, [height, delay]);
  return <div style={{ ...style, height: h, background: color, transition: `height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`, borderRadius: style.borderRadius || 6 }} />;
}

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const mono = "'JetBrains Mono','Fira Code','SF Mono',monospace";
const sans = "system-ui,-apple-system,'Segoe UI',sans-serif";

// ─── Refined Color System ───
const T = {
  bg:"#0B0E13", surface:"#12161D", surface2:"#1A1F2A", surfaceHover:"#212736",
  border:"#1E2430", borderBright:"#2A3140",
  text:"#DEE2E8", textDim:"#8B95A5", textMuted:"#505B6B",
  // Softer, more professional palette
  green:"#34D399", greenDim:"#34D39918", greenSoft:"#34D39940",
  red:"#F87171", redDim:"#F8717118", redSoft:"#F8717140",
  amber:"#FBBF24", amberDim:"#FBBF2418", amberSoft:"#FBBF2440",
  blue:"#60A5FA", blueDim:"#60A5FA18", blueSoft:"#60A5FA40",
  cyan:"#22D3EE", cyanDim:"#22D3EE18",
  purple:"#A78BFA", purpleDim:"#A78BFA18",
  pink:"#F472B6", pinkDim:"#F472B618",
  // Gradients
  greenGrad:"linear-gradient(180deg, #34D399, #059669)",
  redGrad:"linear-gradient(180deg, #F87171, #DC2626)",
  blueGrad:"linear-gradient(180deg, #60A5FA, #2563EB)",
};

// ─── AI Error Diagnosis ───
async function diagnoseError(errorMessage, workflowName, nodes) {
  try {
    const nodeList = (nodes || []).map(n => `${n.name} (${n.type?.split(".").pop()})`).join(" → ");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1000,
        system: `You are an expert n8n workflow debugger. Diagnose errors and provide clear fixes.
Rules: Be specific to n8n. Give step-by-step fixes. Format: "DIAGNOSIS:" then "FIX:" with numbered steps (3-5 max). Mention exact n8n settings/pages.`,
        messages: [{ role: "user", content: `n8n workflow "${workflowName}" failed:\n\nERROR: ${errorMessage}\nNODES: ${nodeList || "Unknown"}\n\nDiagnose and give exact fix steps.` }],
      }),
    });
    const data = await res.json();
    return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n") || "Could not generate diagnosis.";
  } catch (e) { return `Diagnosis failed: ${e.message}`; }
}

// ─── Fallback Data ───
const FALLBACK_WORKFLOWS = [
  { id:"1", name:"Inbound Lead Qualification", active:true, tags:["Inbound"], execCount:139, failedCount:14, successRate:"90", sparkline:[57,12,13,7,22,9,53], avgDuration:12000, p95Duration:45000, nodeCount:8, nodes:[{type:"n8n-nodes-base.webhook",name:"Webhook"},{type:"n8n-nodes-base.httpRequest",name:"Enrich Lead"},{type:"n8n-nodes-base.if",name:"Score Check"}], durationTrend:[{avg:11000,p95:40000,count:20},{avg:12000,p95:42000,count:18},{avg:11500,p95:44000,count:22},{avg:13000,p95:48000,count:15},{avg:12000,p95:45000,count:25}], topErrors:[], hourlyDistribution:{}, recentExecutions:[] },
  { id:"2", name:"Lead Category Validator", active:true, tags:[], execCount:391, failedCount:47, successRate:"88", sparkline:[8,15,22,18,10,19,39], avgDuration:8500, p95Duration:32000, nodeCount:12, nodes:[{type:"n8n-nodes-base.webhook",name:"Trigger"},{type:"n8n-nodes-base.code",name:"Validate"},{type:"n8n-nodes-base.hubspot",name:"Update HubSpot"}], durationTrend:[{avg:7800,p95:28000,count:60},{avg:8200,p95:30000,count:55},{avg:8900,p95:33000,count:48},{avg:8100,p95:31000,count:52},{avg:8500,p95:32000,count:58}], topErrors:[{message:"Validation timeout on HubSpot API call",count:12},{message:"Contact not found in CRM",count:8}], hourlyDistribution:{}, recentExecutions:[] },
  { id:"3", name:"Accounts Deduplication Agent", active:true, tags:[], execCount:91, failedCount:53, successRate:"42", sparkline:[6,3,3,8,2,5,3], avgDuration:95000, p95Duration:180000, nodeCount:6, nodes:[{type:"n8n-nodes-base.hubspot",name:"Fetch Accounts"},{type:"n8n-nodes-base.code",name:"Dedupe Logic"},{type:"n8n-nodes-base.merge",name:"Merge"}], durationTrend:[{avg:85000,p95:160000,count:15},{avg:90000,p95:170000,count:12},{avg:98000,p95:185000,count:10},{avg:92000,p95:175000,count:14},{avg:95000,p95:180000,count:11}], topErrors:[{message:"HubSpot rate limit exceeded (429)",count:28},{message:"Duplicate key constraint violation",count:15}], hourlyDistribution:{}, recentExecutions:[] },
  { id:"4", name:"Account Qualifying Agent", active:true, tags:["MSP/IT"], execCount:147, failedCount:120, successRate:"18", sparkline:[0,0,2,0,1,0,0], avgDuration:500, p95Duration:2000, nodeCount:4, nodes:[{type:"n8n-nodes-base.scheduleTrigger",name:"Schedule"},{type:"n8n-nodes-base.httpRequest",name:"API Call"},{type:"n8n-nodes-base.if",name:"Check"}], durationTrend:[{avg:400,p95:1500,count:30},{avg:450,p95:1800,count:28},{avg:500,p95:2000,count:25},{avg:480,p95:1900,count:22},{avg:500,p95:2000,count:18}], topErrors:[{message:"Execution never started (null startedAt) — trigger/credential misconfigured",count:95},{message:"Credential not found for HTTP Request node",count:20}], hourlyDistribution:{}, recentExecutions:[] },
  { id:"5", name:"SuperOps Blog Creation", active:false, tags:[], execCount:84, failedCount:41, successRate:"51", sparkline:[0,4,0,1,3,0,1], avgDuration:45000, p95Duration:120000, nodeCount:10, nodes:[], durationTrend:[{avg:40000,p95:100000,count:12},{avg:42000,p95:110000,count:10},{avg:48000,p95:125000,count:8},{avg:44000,p95:115000,count:9},{avg:45000,p95:120000,count:7}], topErrors:[{message:"OpenAI API rate limit exceeded",count:18},{message:"Response timeout after 120s",count:8}], hourlyDistribution:{}, recentExecutions:[] },
  { id:"6", name:"Google Ads Weekly Report", active:false, tags:[], execCount:44, failedCount:24, successRate:"45", sparkline:[0,0,1,0,2,0,0], avgDuration:62000, p95Duration:150000, nodeCount:7, nodes:[], durationTrend:[{avg:55000,p95:130000,count:6},{avg:58000,p95:140000,count:5},{avg:65000,p95:155000,count:4},{avg:60000,p95:145000,count:5},{avg:62000,p95:150000,count:3}], topErrors:[{message:"Google Ads API authentication failed — token expired",count:14}], hourlyDistribution:{}, recentExecutions:[] },
  { id:"7", name:"Markdown to Google Doc", active:true, tags:[], execCount:34, failedCount:7, successRate:"79", sparkline:[0,6,0,3,4,0,7], avgDuration:18000, p95Duration:35000, nodeCount:5, nodes:[], durationTrend:[{avg:15000,p95:30000,count:5},{avg:17000,p95:33000,count:4},{avg:18000,p95:35000,count:6},{avg:16000,p95:32000,count:5},{avg:18000,p95:35000,count:7}], topErrors:[{message:"Google Drive permission denied",count:4}], hourlyDistribution:{}, recentExecutions:[] },
];

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function FlowPulseCommand() {
  const [section, setSection] = useState("n8n");
  const [n8nTab, setN8nTab] = useState("overview");
  const [selectedWf, setSelectedWf] = useState(null);
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [config, setConfig] = useState({ url:"", apiKey:"", slackWebhook:"" });
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [hubData, setHubData] = useState(null);
  const [hubLoading, setHubLoading] = useState(false);
  const [adsData, setAdsData] = useState(null);
  const [adsLoading, setAdsLoading] = useState(false);
  const [slackConfigured, setSlackConfigured] = useState(false);
  const [alertsSent, setAlertsSent] = useState(0);
  const [retrying, setRetrying] = useState(new Set());

  const connect = async () => {
    setConnectLoading(true); setConnectError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/connect`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ instanceUrl:config.url.replace(/\/+$/,""), apiKey:config.apiKey, slackWebhook:config.slackWebhook }) });
      const json = await res.json();
      if (json.success) {
        setSession(json.sessionId);
        const dRes = await fetch(`${BACKEND_URL}/api/dashboard`, { headers:{"X-FlowPulse-Session":json.sessionId} });
        const dJson = await dRes.json();
        setLiveData(dJson); setConnected(true); setSlackConfigured(!!dJson.slackConfigured); setAlertsSent(dJson.alertsSent||0);
      } else setConnectError(json.error||"Connection failed");
    } catch(e) { setConnectError(`Cannot reach backend at ${BACKEND_URL}`); }
    setConnectLoading(false);
  };

  useEffect(() => {
    if (!connected||!session) return;
    const iv = setInterval(async () => { try { const r = await fetch(`${BACKEND_URL}/api/dashboard`,{headers:{"X-FlowPulse-Session":session}}); if(r.ok){const d=await r.json();setLiveData(d);setAlertsSent(d.alertsSent||0);} } catch{} }, 30000);
    return () => clearInterval(iv);
  }, [connected, session]);

  const retryExec = async (id) => {
    if(!session) return;
    setRetrying(p=>new Set(p).add(id));
    try { await fetch(`${BACKEND_URL}/api/executions/${id}/retry`,{method:"POST",headers:{"X-FlowPulse-Session":session}}); } catch{}
    setTimeout(()=>setRetrying(p=>{const n=new Set(p);n.delete(id);return n;}),3000);
  };

  const workflows = connected && liveData?.workflows ? liveData.workflows : FALLBACK_WORKFLOWS;
  const stats = useMemo(() => {
    if (connected && liveData?.stats) return liveData.stats;
    const total = workflows.reduce((s,w)=>s+(w.execCount||0),0);
    const failed = workflows.reduce((s,w)=>s+(w.failedCount||0),0);
    return { totalWorkflows:workflows.length, activeWorkflows:workflows.filter(w=>w.active).length, totalExecs:total, failedExecs:failed, successRate:total>0?((1-failed/total)*100).toFixed(1):"100", avgDuration:107014 };
  }, [workflows,connected,liveData]);
  const heatmapData = liveData?.heatmap || genHeatmap();

  const fetchHub = useCallback(async () => {
    setHubLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"Return ONLY valid JSON. Object with: deals(array of {name,stage,amount,company,daysInStage}), stats({totalDeals,totalValue,avgDealSize,openDeals,winRate}).",messages:[{role:"user",content:"Get HubSpot CRM pipeline summary as JSON."}],mcp_servers:[{type:"url",url:"https://mcp.hubspot.com/anthropic",name:"hubspot"}]})});
      const data = await res.json();
      const all = (data.content||[]).map(b=>b.type==="text"?b.text:b.type==="mcp_tool_result"?(b.content?.[0]?.text||""):"").join("\n");
      try{const m=all.match(/\{[\s\S]*\}/);setHubData(m?JSON.parse(m[0]):{raw:all});}catch{setHubData({raw:all});}
    } catch(e){setHubData({error:e.message});} setHubLoading(false);
  },[]);

  const fetchAds = useCallback(async () => {
    setAdsLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"Return ONLY valid JSON. Object with: campaigns(array of {name,spend,clicks,impressions,ctr,conversions,cpa,roas}), totals({totalSpend,totalClicks,totalImpressions,avgCTR,totalConversions,avgCPA}), recommendations(array of strings).",messages:[{role:"user",content:"Generate a realistic Google Ads weekly report for a B2B SaaS MSP/IT company. 4 campaigns. JSON only."}]})});
      const data = await res.json();
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      try{const m=text.match(/\{[\s\S]*\}/);setAdsData(m?JSON.parse(m[0]):{raw:text});}catch{setAdsData({raw:text});}
    } catch(e){setAdsData({error:e.message});} setAdsLoading(false);
  },[]);

  const navItems = [
    {key:"n8n",label:"Workflows",color:T.green,icon:"⚡"},
    {key:"enrichment",label:"Enrichment",color:"#F59E0B",icon:"🧬"},
    {key:"integrations",label:"Integrations",color:T.amber,icon:"🔌"},
    {key:"kpis",label:"KPIs",color:T.cyan,icon:"📊"},
    {key:"hubspot",label:"HubSpot",color:T.purple,icon:"💼"},
    {key:"ads",label:"Google Ads",color:T.blue,icon:"📈"},
    {key:"alerts",label:"Alerts",color:T.pink,icon:"🔔"},
  ];

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text}}>
      {/* ─── Top Bar ─── */}
      <div style={{borderBottom:`1px solid ${T.border}`,background:T.surface,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",height:56,justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg, ${T.green}, ${T.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚡</div>
              <div>
                <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:T.text,letterSpacing:1.5}}>FLOWPULSE</div>
                <div style={{fontFamily:sans,fontSize:9,color:T.textMuted,marginTop:-1}}>Ops Command Center</div>
              </div>
            </div>
            <div style={{height:28,width:1,background:T.border}} />
            {/* Nav */}
            {navItems.map(n=>(
              <button key={n.key} onClick={()=>setSection(n.key)} style={{
                background:section===n.key?`${n.color}12`:"transparent",
                color:section===n.key?n.color:T.textMuted,
                border:section===n.key?`1px solid ${n.color}25`:"1px solid transparent",
                borderRadius:8,padding:"7px 14px",fontFamily:sans,fontSize:12,cursor:"pointer",fontWeight:section===n.key?600:400,
                display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",
              }}><span style={{fontSize:12}}>{n.icon}</span>{n.label}</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {slackConfigured&&<span style={{fontFamily:mono,fontSize:9,color:T.pink,background:T.pinkDim,padding:"3px 10px",borderRadius:20}}>{alertsSent} alerts sent</span>}
            {connected?(
              <div style={{display:"flex",alignItems:"center",gap:6,background:T.greenDim,padding:"5px 12px",borderRadius:20,border:`1px solid ${T.greenSoft}`}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:T.green,boxShadow:`0 0 8px ${T.green}`}}/>
                <span style={{fontFamily:mono,fontSize:10,color:T.green,fontWeight:600}}>LIVE</span>
              </div>
            ):<span style={{fontFamily:mono,fontSize:10,color:T.textMuted,background:T.surface2,padding:"5px 12px",borderRadius:20}}>DEMO</span>}
          </div>
        </div>
      </div>

      {/* ─── Connection Bar ─── */}
      {!connected&&(
        <div style={{maxWidth:1400,margin:"0 auto",padding:"14px 28px 0"}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={{fontFamily:sans,fontSize:12,color:T.textDim,fontWeight:500}}>Connect n8n:</span>
            <input value={config.url} onChange={e=>setConfig(c=>({...c,url:e.target.value}))} placeholder="https://your-instance.app.n8n.cloud" style={inputS}/>
            <input value={config.apiKey} onChange={e=>setConfig(c=>({...c,apiKey:e.target.value}))} placeholder="API key" type="password" style={{...inputS,maxWidth:160}}/>
            <button onClick={connect} disabled={connectLoading||!config.url||!config.apiKey} style={{
              background:T.greenGrad,color:"#0B0E13",border:"none",borderRadius:8,padding:"8px 20px",
              fontFamily:sans,fontSize:12,fontWeight:700,cursor:"pointer",opacity:connectLoading?0.5:1,
              boxShadow:`0 2px 12px ${T.greenDim}`,
            }}>{connectLoading?"Connecting...":"Go Live"}</button>
            {connectError&&<span style={{fontFamily:sans,fontSize:11,color:T.red,width:"100%"}}>{connectError}</span>}
          </div>
        </div>
      )}

      {/* ─── Content ─── */}
      <div style={{maxWidth:1400,margin:"0 auto",padding:"20px 28px 60px"}}>
        {section==="n8n"&&<N8nSection workflows={workflows} stats={stats} heatmap={heatmapData} tab={n8nTab} setTab={setN8nTab} selectedWf={selectedWf} setSelectedWf={setSelectedWf} retryExec={retryExec} retrying={retrying}/>}
        {section==="enrichment"&&<EnrichmentMarketplace workflows={workflows}/>}
        {section==="integrations"&&<IntegrationsSection connected={connected} hubData={hubData} adsData={adsData} slackConfigured={slackConfigured} stats={stats} workflows={workflows}/>}
        {section==="kpis"&&<KPIs workflows={workflows} stats={stats} hubData={hubData} adsData={adsData}/>}
        {section==="hubspot"&&<HubSpot data={hubData} loading={hubLoading} onFetch={fetchHub}/>}
        {section==="ads"&&<Ads data={adsData} loading={adsLoading} onFetch={fetchAds}/>}
        {section==="alerts"&&<Alerts config={config} setConfig={setConfig} session={session} slackConfigured={slackConfigured} setSlackConfigured={setSlackConfigured} alertsSent={alertsSent} connected={connected} workflows={workflows}/>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// n8n SECTION
// ═══════════════════════════════════════
function N8nSection({workflows,stats,heatmap,tab,setTab,selectedWf,setSelectedWf,retryExec,retrying}) {
  const tabs = ["overview","heatmap","workflows","durations","errors"];
  if(selectedWf){const wf=workflows.find(w=>w.id===selectedWf);return <DrillDown wf={wf} onBack={()=>setSelectedWf(null)} retryExec={retryExec} retrying={retrying}/>;}
  return (<div>
    <div style={{display:"flex",gap:6,marginBottom:20}}>
      {tabs.map(t=><button key={t} onClick={()=>setTab(t)} style={{
        background:tab===t?T.greenDim:"transparent",color:tab===t?T.green:T.textMuted,
        border:tab===t?`1px solid ${T.greenSoft}`:"1px solid transparent",
        borderRadius:8,padding:"7px 16px",fontFamily:sans,fontSize:12,cursor:"pointer",fontWeight:tab===t?600:400,transition:"all 0.15s",
      }}>{({overview:"Overview",heatmap:"Heatmap",workflows:"All Workflows",durations:"Durations",errors:"Errors"})[t]}</button>)}
    </div>
    {tab==="overview"&&<Overview stats={stats} workflows={workflows} onSelect={setSelectedWf}/>}
    {tab==="heatmap"&&<HeatmapTab data={heatmap}/>}
    {tab==="workflows"&&<WorkflowsTab workflows={workflows} onSelect={setSelectedWf}/>}
    {tab==="durations"&&<DurationsTab workflows={workflows}/>}
    {tab==="errors"&&<ErrorsTab workflows={workflows} retryExec={retryExec} retrying={retrying}/>}
  </div>);
}

// ─── Overview ───
function Overview({stats,workflows,onSelect}) {
  const rate=Number(stats.successRate);
  const rc=rate>=80?T.green:rate>=50?T.amber:T.red;
  const failing=[...workflows].filter(w=>w.failedCount>0).sort((a,b)=>b.failedCount-a.failedCount).slice(0,5);
  const active=workflows.filter(w=>w.active);

  // 7-day chart data with labels
  const dayLabels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const dayTotals=Array.from({length:7},(_,i)=>workflows.reduce((s,w)=>s+(w.sparkline?.[i]||0),0));
  const maxDay=Math.max(...dayTotals,1);

  return (<>
    {/* Stat cards with visual weight */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
      <BigStat label="Workflows" value={stats.totalWorkflows} sub={`${stats.activeWorkflows} active`} color={T.blue} icon="📋"/>
      <BigStat label="Executions" value={stats.totalExecs?.toLocaleString()} sub="all time" color={T.cyan} icon="🔄"/>
      <BigStat label="Success Rate" value={`${stats.successRate}%`} sub={`${stats.failedExecs} failed`} color={rc} icon={rate>=80?"✅":"⚠️"} highlight={rate<60}/>
      <BigStat label="Avg Duration" value={fmt(stats.avgDuration)} sub="per execution" color={T.textDim} icon="⏱"/>
      <BigStat label="Active Now" value={active.length} sub="running workflows" color={T.green} icon="⚡"/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1.2fr 0.8fr",gap:12,marginBottom:16}}>
      {/* ─── 7-Day Chart with Numbers ─── */}
      <Card title="7-Day Execution Volume">
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:140,padding:"10px 0"}}>
          {dayTotals.map((val,i)=>{
            const h=maxDay>0?(val/maxDay)*100:0;
            return (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                {/* Number label on top — animated */}
                <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:val>0?T.green:T.textMuted}}><AnimatedNum value={val}/></span>
                {/* Bar */}
                <AnimatedBar height={Math.max(h,4)} color={val>0?T.greenGrad:T.surface2} delay={i*80} style={{width:"100%",maxWidth:48,borderRadius:6,boxShadow:val>0?`0 2px 12px ${T.greenDim}`:"none"}} />
                {/* Day label */}
                <span style={{fontFamily:sans,fontSize:11,color:T.textMuted,fontWeight:500}}>{dayLabels[i]}</span>
              </div>
            );
          })}
        </div>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>Total this week</span>
          <span style={{fontFamily:mono,fontSize:16,fontWeight:700,color:T.green}}><AnimatedNum value={dayTotals.reduce((a,b)=>a+b,0)}/></span>
        </div>
      </Card>

      {/* ─── Top Failing ─── */}
      <Card title="Top Failing Workflows">
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {failing.map((w,i)=>{
            const r=Number(w.successRate);
            const barW=w.execCount>0?(w.failedCount/w.execCount)*100:0;
            return (
              <div key={w.id} onClick={()=>onSelect(w.id)} style={{padding:"10px 12px",borderRadius:8,cursor:"pointer",transition:"background 0.15s",background:"transparent"}} onMouseEnter={e=>e.currentTarget.style.background=T.surface2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:12}}>{w.name}</span>
                  <span style={{fontFamily:mono,fontSize:14,fontWeight:700,color:rateC(r)}}>{w.successRate}%</span>
                </div>
                {/* Failure bar */}
                <div style={{height:4,borderRadius:2,background:T.surface2,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:2,background:rateC(r),width:`${barW}%`,transition:"width 0.5s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>{w.failedCount} failures</span>
                  <span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>{w.execCount} total runs</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>

    {/* Active workflows strip */}
    <Card title="Active Workflows">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
        {active.map(w=>{
          const r=Number(w.successRate);
          return (
            <div key={w.id} onClick={()=>onSelect(w.id)} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:14,cursor:"pointer",transition:"all 0.15s",borderLeft:`3px solid ${rateC(r)}`}} onMouseEnter={e=>e.currentTarget.style.borderColor=rateC(r)} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 6px ${T.green}`}}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{w.name}</span>
              </div>
              {/* Mini chart with numbers */}
              <div style={{display:"flex",alignItems:"flex-end",gap:3,height:28,marginBottom:8}}>
                {(w.sparkline||[]).map((v,i)=>{
                  const max=Math.max(...(w.sparkline||[1]),1);
                  return <div key={i} style={{flex:1,borderRadius:2,background:v>0?`${T.green}60`:T.surface2,height:Math.max((v/max)*24,2),transition:"height 0.3s"}}/>;
                })}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>{w.execCount} runs</span>
                <span style={{fontFamily:mono,fontSize:13,fontWeight:700,color:rateC(r)}}>{w.successRate}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  </>);
}

// ─── Heatmap ───
function HeatmapTab({data}) {
  const [mode,setMode]=useState("total");
  const days=[...new Set(data.map(d=>d.day))];
  const maxV=Math.max(...data.map(d=>mode==="total"?d.total:d.failures),1);
  return (<>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div><h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0}}>Execution Heatmap</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>When do your workflows run and fail?</p></div>
      <div style={{display:"flex",gap:4}}>{[{k:"total",l:"All Executions",c:T.green},{k:"failures",l:"Failures Only",c:T.red}].map(m=><button key={m.k} onClick={()=>setMode(m.k)} style={{background:mode===m.k?`${m.c}15`:"transparent",color:mode===m.k?m.c:T.textMuted,border:mode===m.k?`1px solid ${m.c}30`:"1px solid transparent",borderRadius:8,padding:"6px 14px",fontFamily:sans,fontSize:11,cursor:"pointer",fontWeight:mode===m.k?600:400}}>{m.l}</button>)}</div>
    </div>
    <Card>
      <div style={{display:"grid",gridTemplateColumns:"56px repeat(24,1fr)",gap:3}}>
        <div/>
        {Array.from({length:24},(_,i)=><div key={i} style={{textAlign:"center",fontFamily:mono,fontSize:8,color:T.textMuted,padding:"4px 0"}}>{i.toString().padStart(2,"0")}</div>)}
        {days.map((day,di)=><>
          <div key={`l-${di}`} style={{fontFamily:sans,fontSize:10,color:T.textDim,display:"flex",alignItems:"center",fontWeight:500}}>{day}</div>
          {Array.from({length:24},(_,h)=>{
            const cell=data.find(d=>d.di===di&&d.h===h)||{total:0,failures:0};
            const val=mode==="total"?cell.total:cell.failures;
            const intensity=val/maxV;
            const bg=val>0?(mode==="total"?`rgba(52,211,153,${0.15+intensity*0.7})`:`rgba(248,113,113,${0.15+intensity*0.7})`):T.surface2;
            return <div key={`${di}-${h}`} title={`${day} ${h}:00 — ${cell.total} runs, ${cell.failures} fails`} style={{background:bg,borderRadius:3,aspectRatio:"1",minHeight:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:val>=10?7:8,color:intensity>0.4?"#0B0E13":T.textMuted,fontWeight:600,transition:"all 0.15s",cursor:"default"}}>{val>0?val:""}</div>;
          })}
        </>)}
      </div>
      {/* Legend */}
      <div style={{marginTop:14,display:"flex",gap:20,alignItems:"center",paddingTop:10,borderTop:`1px solid ${T.border}`}}>
        <span style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>Intensity:</span>
        <div style={{display:"flex",gap:3,alignItems:"center"}}>
          {[0.1,0.25,0.45,0.65,0.85].map(v=><div key={v} style={{width:18,height:12,borderRadius:3,background:mode==="total"?`rgba(52,211,153,${v})`:`rgba(248,113,113,${v})`}}/>)}
          <span style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginLeft:4}}>Low → High</span>
        </div>
      </div>
    </Card>
  </>);
}

// ─── All Workflows ───
function WorkflowsTab({workflows,onSelect}) {
  const [sort,setSort]=useState("failedCount");
  const sorted=[...workflows].filter(w=>w.execCount>0).sort((a,b)=>sort==="failedCount"?b.failedCount-a.failedCount:sort==="execCount"?b.execCount-a.execCount:Number(a.successRate)-Number(b.successRate));
  return (<>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0}}>All Workflows <span style={{fontFamily:mono,fontSize:13,color:T.textMuted,fontWeight:400}}>({sorted.length})</span></h2>
      <div style={{display:"flex",gap:4}}>{[{k:"failedCount",l:"Most Failures"},{k:"execCount",l:"Most Runs"},{k:"successRate",l:"Worst Rate"}].map(s=><button key={s.k} onClick={()=>setSort(s.k)} style={{background:sort===s.k?T.greenDim:"transparent",color:sort===s.k?T.green:T.textMuted,border:sort===s.k?`1px solid ${T.greenSoft}`:"1px solid transparent",borderRadius:8,padding:"6px 14px",fontFamily:sans,fontSize:11,cursor:"pointer",fontWeight:sort===s.k?600:400}}>{s.l}</button>)}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      {sorted.map(w=>{
        const r=Number(w.successRate);
        const max=Math.max(...(w.sparkline||[1]),1);
        return (
          <div key={w.id} onClick={()=>onSelect(w.id)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,cursor:"pointer",transition:"all 0.15s",borderTop:`3px solid ${rateC(r)}`}} onMouseEnter={e=>{e.currentTarget.style.borderColor=rateC(r);e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="none";}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:w.active?T.green:T.textMuted,boxShadow:w.active?`0 0 6px ${T.green}`:"none"}}/>
              <span style={{fontFamily:sans,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{w.name}</span>
            </div>
            {w.nodeCount>0&&<div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginBottom:8}}>{w.nodeCount} nodes · avg {fmt(w.avgDuration)}</div>}
            {/* Sparkline with values */}
            <div style={{display:"flex",alignItems:"flex-end",gap:3,height:32,marginBottom:8}}>
              {(w.sparkline||[]).map((v,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  {v>0&&<span style={{fontFamily:mono,fontSize:7,color:T.textDim}}>{v}</span>}
                  <div style={{width:"100%",borderRadius:2,background:v>0?`${T.green}50`:T.surface2,height:Math.max((v/max)*22,2)}}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><span style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>{w.execCount} runs</span>{w.failedCount>0&&<span style={{fontFamily:sans,fontSize:11,color:T.red,marginLeft:8}}>{w.failedCount} failed</span>}</div>
              <span style={{fontFamily:mono,fontSize:15,fontWeight:700,color:rateC(r)}}>{w.successRate}%</span>
            </div>
            {w.tags?.length>0&&<div style={{display:"flex",gap:4,marginTop:8}}>{w.tags.map(t=><span key={t} style={{fontFamily:sans,fontSize:9,color:T.blue,background:T.blueDim,padding:"2px 8px",borderRadius:12,border:`1px solid ${T.blueSoft}`}}>{t}</span>)}</div>}
          </div>
        );
      })}
    </div>
  </>);
}

// ─── Duration Trends ───
function DurationsTab({workflows}) {
  const wfs=workflows.filter(w=>w.durationTrend?.some(d=>d.avg>0)).sort((a,b)=>(b.avgDuration||0)-(a.avgDuration||0)).slice(0,8);
  const colors=[T.green,T.blue,T.amber,T.red,T.cyan,T.purple,T.pink,T.text];
  const weekLabels=["W1","W2","W3","W4","W5"];
  return (<>
    <div style={{marginBottom:14}}><h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0}}>Duration Trends</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Are your workflows getting slower over time?</p></div>
    <div style={{display:"grid",gap:12}}>
      {wfs.map((wf,wi)=>{
        const c=colors[wi%colors.length];
        const trend=wf.durationTrend||[];
        const maxP=Math.max(...trend.map(d=>d.p95),1);
        const slower=trend.length>=2&&trend[trend.length-1].avg>trend[0].avg*1.15;
        return (
          <Card key={wf.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:10,height:10,borderRadius:3,background:c}}/>
                <span style={{fontFamily:sans,fontSize:13,fontWeight:600}}>{wf.name}</span>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                {slower&&<span style={{fontFamily:sans,fontSize:10,color:T.red,background:T.redDim,padding:"3px 10px",borderRadius:12,fontWeight:600,border:`1px solid ${T.redSoft}`}}>↗ Getting Slower</span>}
                <span style={{fontFamily:mono,fontSize:12,color:c,fontWeight:600}}>{fmt(wf.avgDuration)} avg</span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:12,height:70}}>
              {trend.map((d,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontFamily:mono,fontSize:10,color:T.text,fontWeight:600}}>{fmt(d.avg)}</span>
                  <div style={{width:"100%",display:"flex",gap:3,justifyContent:"center",alignItems:"flex-end"}}>
                    <div style={{width:"40%",borderRadius:4,background:c,opacity:0.8,height:Math.max((d.avg/maxP)*44,4),transition:"height 0.5s"}}/>
                    <div style={{width:"40%",borderRadius:4,background:`${T.amber}60`,height:Math.max((d.p95/maxP)*44,4),transition:"height 0.5s"}}/>
                  </div>
                  <span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>{weekLabels[i]}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:16,marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
              <span style={{fontFamily:sans,fontSize:10,color:c}}>■ Average</span>
              <span style={{fontFamily:sans,fontSize:10,color:T.amber}}>■ P95</span>
              <span style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginLeft:"auto"}}>p95: {fmt(wf.p95Duration)}</span>
            </div>
          </Card>
        );
      })}
    </div>
  </>);
}

// ─── Errors Tab ───
function ErrorsTab({workflows,retryExec,retrying}) {
  const allErrors=workflows.flatMap(w=>(w.topErrors||[]).map(e=>({...e,workflow:w.name,nodes:w.nodes})));
  const neverStarted=workflows.filter(w=>w.topErrors?.some(e=>e.message?.includes("never started")||e.message?.includes("null")));
  const total=allErrors.reduce((s,e)=>s+e.count,0);
  return (<>
    <div style={{marginBottom:14}}><h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0}}>Error Analysis & AI Diagnosis</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Click "Diagnose" on any error for an AI-powered fix</p></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
      <BigStat label="Error Occurrences" value={total} color={T.red} icon="❌"/>
      <BigStat label="Never-Started" value={neverStarted.length} sub="trigger/credential issues" color={T.amber} icon="⚠️"/>
      <BigStat label="Affected Workflows" value={new Set(allErrors.map(e=>e.workflow)).size} color={T.pink} icon="📋"/>
    </div>
    <Card title="All Errors">
      {allErrors.sort((a,b)=>b.count-a.count).map((e,i)=>(
        <ErrorDiag key={i} error={e} workflowName={e.workflow} nodes={e.nodes} isLast={i===allErrors.length-1} showWf/>
      ))}
    </Card>
  </>);
}

// ─── Drill Down ───
function DrillDown({wf,onBack,retryExec,retrying}) {
  if(!wf) return null;
  const c=rateC(Number(wf.successRate));
  const fakeHist=Array.from({length:15},(_,i)=>({id:1800-i,status:Math.random()>(Number(wf.successRate)/100)?"error":"success",startedAt:new Date(Date.now()-i*7200000).toISOString(),duration:Math.floor(Math.random()*60000)+200,error:Math.random()>0.5?wf.topErrors?.[0]?.message:null}));
  const history=wf.recentExecutions?.length>0?wf.recentExecutions:fakeHist;
  const trend=wf.durationTrend||[];
  const maxP=Math.max(...trend.map(d=>d.p95),1);

  return (<div>
    <button onClick={onBack} style={{fontFamily:sans,fontSize:13,color:T.green,background:"transparent",border:"none",cursor:"pointer",padding:"4px 0",marginBottom:16,fontWeight:500}}>← Back to list</button>
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
      <div style={{width:12,height:12,borderRadius:"50%",background:wf.active?T.green:T.textMuted,boxShadow:wf.active?`0 0 8px ${T.green}`:"none"}}/>
      <h2 style={{fontFamily:sans,fontSize:22,fontWeight:700,margin:0}}>{wf.name}</h2>
      <span style={{fontFamily:mono,fontSize:28,fontWeight:700,color:c,marginLeft:"auto"}}><AnimatedNum value={Number(wf.successRate)} suffix="%" decimals={0}/></span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
      <BigStat label="Runs" value={wf.execCount} color={T.cyan} icon="🔄"/>
      <BigStat label="Failures" value={wf.failedCount} color={T.red} icon="❌"/>
      <BigStat label="Avg Duration" value={fmt(wf.avgDuration)} color={T.textDim} icon="⏱"/>
      <BigStat label="P95 Duration" value={fmt(wf.p95Duration)} color={T.amber} icon="📈"/>
      <BigStat label="Nodes" value={wf.nodeCount||"—"} color={T.blue} icon="🔗"/>
    </div>

    {/* Node pipeline */}
    {wf.nodes?.length>0&&<Card title="Node Pipeline" style={{marginBottom:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {wf.nodes.map((n,i)=><>
          <div key={i} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px"}}>
            <div style={{fontFamily:sans,fontSize:11,fontWeight:600}}>{n.name}</div>
            <div style={{fontFamily:mono,fontSize:9,color:T.textMuted}}>{n.type?.split(".").pop()}</div>
          </div>
          {i<wf.nodes.length-1&&<span style={{color:T.textMuted,fontSize:16}}>→</span>}
        </>)}
      </div>
    </Card>}

    {/* Duration trend with numbers */}
    {trend.length>0&&<Card title="Duration Trend (5 Weeks)" style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:12,height:80}}>
        {trend.map((d,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <span style={{fontFamily:mono,fontSize:10,color:T.text,fontWeight:600}}>{fmt(d.avg)}</span>
            <div style={{width:"100%",display:"flex",gap:3,justifyContent:"center",alignItems:"flex-end"}}>
              <div style={{width:"40%",borderRadius:4,background:T.green,opacity:0.8,height:Math.max((d.avg/maxP)*50,4)}}/>
              <div style={{width:"40%",borderRadius:4,background:`${T.amber}60`,height:Math.max((d.p95/maxP)*50,4)}}/>
            </div>
            <span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>W{i+1}</span>
          </div>
        ))}
      </div>
    </Card>}

    {/* Errors with diagnosis */}
    {wf.topErrors?.length>0&&<Card title="Errors — AI Diagnosis" style={{marginBottom:12}}>
      {wf.topErrors.map((e,i)=><ErrorDiag key={i} error={e} workflowName={wf.name} nodes={wf.nodes} isLast={i===wf.topErrors.length-1}/>)}
    </Card>}

    {/* Execution log */}
    <Card title="Recent Executions">
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["#","Status","Time","Duration","Actions"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
      <tbody>{history.map(e=>(
        <tr key={e.id} style={{borderBottom:`1px solid ${T.border}`}}>
          <td style={{...tdS,color:T.textMuted,fontFamily:mono}}>#{e.id}</td>
          <td style={tdS}><StatusBadge status={e.status}/></td>
          <td style={{...tdS,color:T.textDim}}>{timeAgo(e.startedAt)}</td>
          <td style={{...tdS,color:T.textDim,fontFamily:mono}}>{fmt(e.duration)}</td>
          <td style={tdS}>{e.status==="error"&&<button onClick={()=>retryExec(e.id)} disabled={retrying.has(e.id)} style={{background:T.amberDim,color:T.amber,border:`1px solid ${T.amberSoft}`,borderRadius:6,padding:"3px 10px",fontFamily:sans,fontSize:10,cursor:"pointer",fontWeight:600}}>{retrying.has(e.id)?"Retrying...":"↻ Retry"}</button>}</td>
        </tr>
      ))}</tbody></table>
    </Card>
  </div>);
}

// ═══════════════════════════════════════
// KPIs
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// INTEGRATIONS SECTION
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ENRICHMENT MARKETPLACE
// ═══════════════════════════════════════
const ENRICHMENT_TOOLS = [
  {
    id:"zoominfo",name:"ZoomInfo",icon:"🔎",color:"#6366F1",
    tagline:"Enterprise B2B intelligence",
    tier:"Enterprise",pricing:"$$$",
    capabilities:["company","contact","intent","techstack"],
    dataPoints:["Revenue, employees, industry","Direct dials, emails, titles","Buying intent signals","Technology stack"],
    coverage:"300M+ contacts, 100M+ companies",
    avgEnrichRate:94,creditsPerLookup:1,
    n8nNode:"n8n-nodes-base.httpRequest",
    useCases:["Account scoring","ICP matching","Lead routing"],
  },
  {
    id:"apollo",name:"Apollo.io",icon:"🚀",color:"#8B5CF6",
    tagline:"Sales intelligence & engagement",
    tier:"Growth",pricing:"$$",
    capabilities:["contact","company","email_verify","social"],
    dataPoints:["Verified emails & phones","Company firmographics","Email deliverability scores","LinkedIn profiles"],
    coverage:"270M+ contacts, 60M+ companies",
    avgEnrichRate:87,creditsPerLookup:1,
    n8nNode:"n8n-nodes-base.httpRequest",
    useCases:["Outbound sequences","Email finding","Contact discovery"],
  },
  {
    id:"clearbit",name:"Clearbit / Breeze",icon:"✨",color:"#3B82F6",
    tagline:"Real-time enrichment APIs",
    tier:"Mid-market",pricing:"$$",
    capabilities:["company","contact","visitor_id","techstack"],
    dataPoints:["50+ company attributes","Contact role & seniority","Website visitor reveal","Tech stack detection"],
    coverage:"50M+ companies, real-time",
    avgEnrichRate:82,creditsPerLookup:1,
    n8nNode:"n8n-nodes-base.httpRequest",
    useCases:["Form enrichment","Lead scoring","Website personalization"],
  },
  {
    id:"clay",name:"Clay",icon:"🏺",color:"#EC4899",
    tagline:"Waterfall enrichment platform",
    tier:"Growth",pricing:"$$",
    capabilities:["company","contact","email_verify","social","techstack"],
    dataPoints:["Multi-source waterfall","75+ enrichment providers","AI-powered research","Automated workflows"],
    coverage:"Aggregates multiple sources",
    avgEnrichRate:96,creditsPerLookup:5,
    n8nNode:"n8n-nodes-base.httpRequest",
    useCases:["Waterfall enrichment","Account research","List building"],
  },
  {
    id:"hunter",name:"Hunter.io",icon:"🎯",color:"#F97316",
    tagline:"Email finding & verification",
    tier:"Starter",pricing:"$",
    capabilities:["email_verify","contact"],
    dataPoints:["Email addresses","Confidence scores","Domain search","Bulk verification"],
    coverage:"100M+ email addresses",
    avgEnrichRate:78,creditsPerLookup:1,
    n8nNode:"n8n-nodes-base.hunter",
    useCases:["Email finding","Deliverability check","Domain prospecting"],
  },
  {
    id:"lusha",name:"Lusha",icon:"📞",color:"#10B981",
    tagline:"B2B contact & company data",
    tier:"Mid-market",pricing:"$$",
    capabilities:["contact","company"],
    dataPoints:["Direct phone numbers","Business emails","Company data","Decision-maker contacts"],
    coverage:"100M+ business profiles",
    avgEnrichRate:80,creditsPerLookup:1,
    n8nNode:"n8n-nodes-base.httpRequest",
    useCases:["Phone prospecting","Contact enrichment","Sales outreach"],
  },
  {
    id:"linkedin",name:"LinkedIn Sales Nav",icon:"💼",color:"#0077B5",
    tagline:"Professional network data",
    tier:"Enterprise",pricing:"$$$",
    capabilities:["contact","social","intent","company"],
    dataPoints:["Job titles & history","Company pages","InMail data","Relationship mapping"],
    coverage:"900M+ professionals",
    avgEnrichRate:91,creditsPerLookup:0,
    n8nNode:"n8n-nodes-base.httpRequest",
    useCases:["Lead research","Warm intros","Account mapping"],
  },
  {
    id:"builtwith",name:"BuiltWith / Wappalyzer",icon:"🔧",color:"#EAB308",
    tagline:"Technology stack detection",
    tier:"Starter",pricing:"$",
    capabilities:["techstack","visitor_id"],
    dataPoints:["Technologies used","CMS & frameworks","Analytics tools","Marketing stack"],
    coverage:"250M+ websites",
    avgEnrichRate:95,creditsPerLookup:1,
    n8nNode:"n8n-nodes-base.httpRequest",
    useCases:["Competitive analysis","ICP tech filtering","Market sizing"],
  },
];

const ENRICHMENT_TYPES = [
  {id:"company",label:"Company Enrichment",icon:"🏢",desc:"Firmographics, revenue, employee count, industry",color:"#60A5FA"},
  {id:"contact",label:"Contact Enrichment",icon:"👤",desc:"Email, phone, title, seniority, department",color:"#A78BFA"},
  {id:"techstack",label:"Tech Stack Detection",icon:"⚙️",desc:"Software, tools, frameworks a company uses",color:"#FBBF24"},
  {id:"intent",label:"Intent Data",icon:"🎯",desc:"Buying signals, research activity, content consumption",color:"#F87171"},
  {id:"email_verify",label:"Email Verification",icon:"✉️",desc:"Deliverability check, bounce prediction, catch-all detection",color:"#34D399"},
  {id:"social",label:"Social Profiles",icon:"🌐",desc:"LinkedIn, Twitter, company social presence",color:"#22D3EE"},
  {id:"visitor_id",label:"Visitor Identification",icon:"👁️",desc:"De-anonymize website visitors into companies/contacts",color:"#F472B6"},
];

function EnrichmentMarketplace({workflows}) {
  const [subTab,setSubTab]=useState("marketplace");
  const [connectedTools,setConnectedTools]=useState(new Set(["zoominfo"])); // demo: zoominfo pre-connected
  const [selectedTool,setSelectedTool]=useState(null);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");

  const toggleConnect=(id)=>{
    setConnectedTools(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n;});
  };

  const filteredTools = ENRICHMENT_TOOLS.filter(t=>{
    if(filter!=="all"&&!t.capabilities.includes(filter)) return false;
    if(search&&!t.name.toLowerCase().includes(search.toLowerCase())&&!t.tagline.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedCount=connectedTools.size;
  const totalCapabilities=new Set(ENRICHMENT_TOOLS.filter(t=>connectedTools.has(t.id)).flatMap(t=>t.capabilities)).size;
  const avgEnrichRate=connectedCount>0?Math.round(ENRICHMENT_TOOLS.filter(t=>connectedTools.has(t.id)).reduce((s,t)=>s+t.avgEnrichRate,0)/connectedCount):0;

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div>
        <h2 style={{fontFamily:sans,fontSize:18,fontWeight:700,margin:0}}>Enrichment Marketplace</h2>
        <p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Browse, connect, and monitor your enrichment tools</p>
      </div>
      <div style={{display:"flex",gap:4}}>
        {[{k:"marketplace",l:"🛒 Marketplace"},{k:"pipeline",l:"🔗 Pipeline"},{k:"coverage",l:"📊 Coverage"}].map(t=>
          <button key={t.k} onClick={()=>setSubTab(t.k)} style={{background:subTab===t.k?"#F59E0B18":"transparent",color:subTab===t.k?"#F59E0B":T.textMuted,border:subTab===t.k?"1px solid #F59E0B40":"1px solid transparent",borderRadius:8,padding:"7px 16px",fontFamily:sans,fontSize:12,cursor:"pointer",fontWeight:subTab===t.k?600:400}}>{t.l}</button>
        )}
      </div>
    </div>

    {subTab==="marketplace"&&<>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <BigStat label="Tools Connected" value={connectedCount} sub={`of ${ENRICHMENT_TOOLS.length} available`} color={T.green} icon="🔌"/>
        <BigStat label="Enrichment Types" value={totalCapabilities} sub={`of ${ENRICHMENT_TYPES.length} types covered`} color={T.cyan} icon="🧬"/>
        <BigStat label="Avg Match Rate" value={`${avgEnrichRate}%`} sub="across connected tools" color={T.amber} icon="🎯"/>
        <BigStat label="Est. Credits/Day" value={connectedCount*50} sub="based on workflow volume" color={T.purple} icon="🪙"/>
      </div>

      {/* Search + Filter */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tools..." style={{...inputS,minWidth:200}}/>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          <button onClick={()=>setFilter("all")} style={{background:filter==="all"?"#F59E0B18":"transparent",color:filter==="all"?"#F59E0B":T.textMuted,border:filter==="all"?"1px solid #F59E0B40":"1px solid transparent",borderRadius:20,padding:"5px 12px",fontFamily:sans,fontSize:10,cursor:"pointer",fontWeight:filter==="all"?600:400}}>All</button>
          {ENRICHMENT_TYPES.map(et=>
            <button key={et.id} onClick={()=>setFilter(et.id)} style={{background:filter===et.id?`${et.color}18`:"transparent",color:filter===et.id?et.color:T.textMuted,border:filter===et.id?`1px solid ${et.color}40`:"1px solid transparent",borderRadius:20,padding:"5px 12px",fontFamily:sans,fontSize:10,cursor:"pointer",fontWeight:filter===et.id?600:400,display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10}}>{et.icon}</span>{et.label.split(" ")[0]}</button>
          )}
        </div>
      </div>

      {/* Tool Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
        {filteredTools.map(tool=>{
          const isConn=connectedTools.has(tool.id);
          return (
            <div key={tool.id} style={{background:T.surface,border:`1px solid ${isConn?`${tool.color}40`:T.border}`,borderRadius:14,overflow:"hidden",transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              {/* Top color bar */}
              <div style={{height:3,background:isConn?tool.color:`${tool.color}30`}}/>
              <div style={{padding:18}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`${tool.color}15`,border:`1px solid ${tool.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{tool.icon}</div>
                    <div>
                      <div style={{fontFamily:sans,fontSize:15,fontWeight:700}}>{tool.name}</div>
                      <div style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>{tool.tagline}</div>
                    </div>
                  </div>
                  {/* Pricing badge */}
                  <div style={{background:T.surface2,borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontFamily:mono,fontSize:11,color:"#F59E0B",fontWeight:700}}>{tool.pricing}</span>
                    <span style={{fontFamily:sans,fontSize:9,color:T.textMuted}}>{tool.tier}</span>
                  </div>
                </div>

                {/* Capabilities */}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
                  {tool.capabilities.map(cap=>{
                    const et=ENRICHMENT_TYPES.find(e=>e.id===cap);
                    return et?<span key={cap} style={{fontFamily:sans,fontSize:9,color:et.color,background:`${et.color}12`,border:`1px solid ${et.color}25`,padding:"3px 8px",borderRadius:12,display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:8}}>{et.icon}</span>{et.label.split(" ")[0]}</span>:null;
                  })}
                </div>

                {/* Data points */}
                <div style={{marginBottom:12}}>
                  {tool.dataPoints.map((dp,i)=>(
                    <div key={i} style={{fontFamily:sans,fontSize:11,color:T.textDim,padding:"3px 0",display:"flex",gap:6}}>
                      <span style={{color:tool.color}}>•</span>{dp}
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div style={{display:"flex",gap:16,padding:"10px 0",borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`,marginBottom:12}}>
                  <div><span style={{fontFamily:sans,fontSize:9,color:T.textMuted}}>Match Rate</span><div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:T.green}}>{tool.avgEnrichRate}%</div></div>
                  <div><span style={{fontFamily:sans,fontSize:9,color:T.textMuted}}>Coverage</span><div style={{fontFamily:sans,fontSize:11,color:T.text,fontWeight:500}}>{tool.coverage.split(",")[0]}</div></div>
                  <div><span style={{fontFamily:sans,fontSize:9,color:T.textMuted}}>n8n Node</span><div style={{fontFamily:mono,fontSize:10,color:T.cyan}}>{tool.n8nNode.split(".").pop()}</div></div>
                </div>

                {/* Use cases */}
                <div style={{display:"flex",gap:4,marginBottom:14}}>
                  {tool.useCases.map((uc,i)=><span key={i} style={{fontFamily:sans,fontSize:9,color:T.textMuted,background:T.bg,padding:"3px 8px",borderRadius:8,border:`1px solid ${T.border}`}}>{uc}</span>)}
                </div>

                {/* Connect button */}
                <button onClick={()=>toggleConnect(tool.id)} style={{
                  width:"100%",padding:"10px 0",borderRadius:10,fontFamily:sans,fontSize:12,fontWeight:700,cursor:"pointer",
                  transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  background:isConn?`${tool.color}15`:tool.color,
                  color:isConn?tool.color:"#fff",
                  border:isConn?`1px solid ${tool.color}40`:"none",
                  boxShadow:isConn?"none":`0 4px 16px ${tool.color}30`,
                }}>
                  {isConn?<><span style={{width:8,height:8,borderRadius:"50%",background:T.green,boxShadow:`0 0 6px ${T.green}`}}/>Connected — Click to Disconnect</>:<>Connect {tool.name}</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>}

    {subTab==="pipeline"&&<EnrichmentPipeline connectedTools={connectedTools}/>}
    {subTab==="coverage"&&<EnrichmentCoverage connectedTools={connectedTools}/>}
  </div>);
}

// ─── Enrichment Pipeline View ───
function EnrichmentPipeline({connectedTools}) {
  const connected=ENRICHMENT_TOOLS.filter(t=>connectedTools.has(t.id));
  const stages=[
    {name:"Raw Lead In",icon:"📥",desc:"New lead enters from form, ad, or import",count:1000},
    {name:"Company Enrichment",icon:"🏢",desc:"Firmographics, revenue, industry",tools:connected.filter(t=>t.capabilities.includes("company")),count:940},
    {name:"Contact Enrichment",icon:"👤",desc:"Email, phone, title, seniority",tools:connected.filter(t=>t.capabilities.includes("contact")),count:870},
    {name:"Tech Stack Check",icon:"⚙️",desc:"What software do they use?",tools:connected.filter(t=>t.capabilities.includes("techstack")),count:870},
    {name:"Email Verification",icon:"✉️",desc:"Is the email deliverable?",tools:connected.filter(t=>t.capabilities.includes("email_verify")),count:810},
    {name:"Intent Scoring",icon:"🎯",desc:"Are they actively buying?",tools:connected.filter(t=>t.capabilities.includes("intent")),count:380},
    {name:"Enriched Lead Out",icon:"✅",desc:"Fully enriched → CRM / Outbound",count:380},
  ];
  const maxCount=Math.max(...stages.map(s=>s.count));

  return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Card title="Enrichment Pipeline — How Data Flows Through Your Tools">
      {stages.map((stage,i)=>{
        const w=(stage.count/maxCount)*100;
        return (
          <div key={i} style={{padding:"14px 0",borderBottom:i<stages.length-1?`1px solid ${T.border}`:"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{stage.icon}</span>
                <div>
                  <div style={{fontFamily:sans,fontSize:13,fontWeight:600}}>{stage.name}</div>
                  <div style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>{stage.desc}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {stage.tools&&stage.tools.length>0&&(
                  <div style={{display:"flex",gap:3}}>{stage.tools.map(t=><span key={t.id} style={{fontSize:9,color:t.color,background:`${t.color}15`,border:`1px solid ${t.color}30`,padding:"2px 8px",borderRadius:12,fontFamily:sans,fontWeight:600}}>{t.name}</span>)}</div>
                )}
                {stage.tools&&stage.tools.length===0&&<span style={{fontFamily:sans,fontSize:10,color:T.red}}>No tool connected</span>}
                <span style={{fontFamily:mono,fontSize:14,fontWeight:700,color:T.text}}><AnimatedNum value={stage.count}/></span>
              </div>
            </div>
            {/* Pipeline bar */}
            <div style={{height:8,borderRadius:4,background:T.surface2,overflow:"hidden"}}>
              <AnimatedBar height={8} color={i===0||i===stages.length-1?T.greenGrad:stage.tools?.length>0?`${T.green}60`:`${T.red}30`} delay={i*100} style={{width:`${w}%`,borderRadius:4}}/>
            </div>
            {i<stages.length-1&&i>0&&stage.count<stages[i-1].count&&(
              <div style={{fontFamily:sans,fontSize:9,color:T.amber,marginTop:4}}>↓ {((1-stage.count/stages[i-1].count)*100).toFixed(0)}% drop — {stages[i-1].count-stage.count} records lost</div>
            )}
          </div>
        );
      })}
    </Card>

    {/* What's missing */}
    {ENRICHMENT_TYPES.filter(et=>!ENRICHMENT_TOOLS.some(t=>connectedTools.has(t.id)&&t.capabilities.includes(et.id))).length>0&&(
      <Card title="⚠️ Gaps in Your Enrichment Stack">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
          {ENRICHMENT_TYPES.filter(et=>!ENRICHMENT_TOOLS.some(t=>connectedTools.has(t.id)&&t.capabilities.includes(et.id))).map(et=>(
            <div key={et.id} style={{background:T.bg,border:`1px solid ${T.red}20`,borderRadius:10,padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:14}}>{et.icon}</span>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:T.red}}>{et.label}</span>
              </div>
              <div style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>{et.desc}</div>
              <div style={{fontFamily:sans,fontSize:9,color:T.amber,marginTop:6}}>→ {ENRICHMENT_TOOLS.filter(t=>t.capabilities.includes(et.id)).map(t=>t.name).join(", ")} can fill this</div>
            </div>
          ))}
        </div>
      </Card>
    )}
  </div>);
}

// ─── Enrichment Coverage Matrix ───
function EnrichmentCoverage({connectedTools}) {
  return (<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Coverage stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
      <BigStat label="Types Covered" value={new Set(ENRICHMENT_TOOLS.filter(t=>connectedTools.has(t.id)).flatMap(t=>t.capabilities)).size} sub={`of ${ENRICHMENT_TYPES.length} total`} color={T.green} icon="✅"/>
      <BigStat label="Redundancy" value={`${ENRICHMENT_TOOLS.filter(t=>connectedTools.has(t.id)).length>1?"Yes":"No"}`} sub="multiple tools per type" color={ENRICHMENT_TOOLS.filter(t=>connectedTools.has(t.id)).length>1?T.green:T.amber} icon="🔄"/>
      <BigStat label="Avg Match Rate" value={`${connectedTools.size>0?Math.round(ENRICHMENT_TOOLS.filter(t=>connectedTools.has(t.id)).reduce((s,t)=>s+t.avgEnrichRate,0)/connectedTools.size):0}%`} sub="weighted average" color={T.cyan} icon="📊"/>
      <BigStat label="Tools Connected" value={connectedTools.size} sub={`of ${ENRICHMENT_TOOLS.length}`} color={T.purple} icon="🔌"/>
    </div>

    {/* Coverage matrix: enrichment type vs tool */}
    <Card title="Coverage Matrix — Which Tool Covers What">
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead>
            <tr>
              <th style={{...thS,minWidth:160}}>Enrichment Type</th>
              {ENRICHMENT_TOOLS.map(t=><th key={t.id} style={{...thS,textAlign:"center",fontSize:9,minWidth:80,color:connectedTools.has(t.id)?t.color:T.textMuted}}>{t.icon}<br/>{t.name.split(" ")[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {ENRICHMENT_TYPES.map(et=>(
              <tr key={et.id} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:"10px 10px",fontFamily:sans,fontSize:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{et.icon}</span>
                    <div>
                      <div style={{fontWeight:600,color:T.text}}>{et.label}</div>
                      <div style={{fontSize:9,color:T.textMuted}}>{et.desc.substring(0,40)}...</div>
                    </div>
                  </div>
                </td>
                {ENRICHMENT_TOOLS.map(tool=>{
                  const has=tool.capabilities.includes(et.id);
                  const isConn=connectedTools.has(tool.id);
                  return (
                    <td key={tool.id} style={{textAlign:"center",padding:8}}>
                      {has?(
                        <div style={{width:28,height:28,borderRadius:8,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:isConn?`${T.green}20`:`${tool.color}10`,border:`1px solid ${isConn?T.greenSoft:`${tool.color}20`}`}}>
                          {isConn?"✅":"○"}
                        </div>
                      ):(
                        <span style={{color:T.textMuted,fontSize:10}}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{display:"flex",gap:16,marginTop:12,paddingTop:10,borderTop:`1px solid ${T.border}`,fontFamily:sans,fontSize:10,color:T.textMuted}}>
        <span>✅ = Connected & covers this type</span>
        <span>○ = Supports but not connected</span>
        <span>— = Not supported</span>
      </div>
    </Card>

    {/* Recommended combos */}
    <Card title="💡 Recommended Tool Combinations">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          <div style={{fontFamily:sans,fontSize:13,fontWeight:600,marginBottom:6}}>🏆 Best for Outbound</div>
          <div style={{fontFamily:sans,fontSize:11,color:T.textDim,lineHeight:1.6}}>Apollo + Hunter + LinkedIn Sales Nav</div>
          <div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginTop:4}}>Covers: contacts, emails, verification, social</div>
        </div>
        <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          <div style={{fontFamily:sans,fontSize:13,fontWeight:600,marginBottom:6}}>🎯 Best for Account-Based</div>
          <div style={{fontFamily:sans,fontSize:11,color:T.textDim,lineHeight:1.6}}>ZoomInfo + Clearbit + BuiltWith</div>
          <div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginTop:4}}>Covers: firmographics, intent, tech stack, visitors</div>
        </div>
        <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          <div style={{fontFamily:sans,fontSize:13,fontWeight:600,marginBottom:6}}>💰 Best Budget Stack</div>
          <div style={{fontFamily:sans,fontSize:11,color:T.textDim,lineHeight:1.6}}>Apollo + Hunter + BuiltWith</div>
          <div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginTop:4}}>$-$$ range, covers 5 of 7 enrichment types</div>
        </div>
        <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
          <div style={{fontFamily:sans,fontSize:13,fontWeight:600,marginBottom:6}}>🧬 Maximum Coverage</div>
          <div style={{fontFamily:sans,fontSize:11,color:T.textDim,lineHeight:1.6}}>Clay (waterfall) + ZoomInfo + LinkedIn</div>
          <div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginTop:4}}>96% match rate, all 7 types covered</div>
        </div>
      </div>
    </Card>
  </div>);
}

// ═══════════════════════════════════════
// INTEGRATIONS SECTION
// ═══════════════════════════════════════
const INTEGRATIONS = [
  { id:"n8n", name:"n8n", icon:"⚡", color:"#34D399", desc:"Workflow automation", dataType:"Workflows & executions", category:"Automation" },
  { id:"hubspot", name:"HubSpot CRM", icon:"🟠", color:"#A78BFA", desc:"CRM & deal pipeline", dataType:"Contacts, deals, pipeline", category:"CRM" },
  { id:"google_ads", name:"Google Ads", icon:"📢", color:"#60A5FA", desc:"Ad campaigns", dataType:"Campaigns, spend, conversions", category:"Advertising" },
  { id:"slack", name:"Slack", icon:"💬", color:"#F472B6", desc:"Team communication", dataType:"Alerts & notifications", category:"Communication" },
  { id:"gmail", name:"Gmail", icon:"📧", color:"#F87171", desc:"Email automation", dataType:"Emails sent & received", category:"Communication" },
  { id:"sheets", name:"Google Sheets", icon:"📗", color:"#34D399", desc:"Spreadsheet data", dataType:"Rows synced & updated", category:"Data" },
  { id:"intercom", name:"Intercom", icon:"💭", color:"#60A5FA", desc:"Customer messaging", dataType:"Conversations & tickets", category:"Support" },
  { id:"linear", name:"Linear", icon:"🔷", color:"#A78BFA", desc:"Issue tracking", dataType:"Issues & projects", category:"Project Mgmt" },
  { id:"figma", name:"Figma", icon:"🎨", color:"#F472B6", desc:"Design collaboration", dataType:"Files & components", category:"Design" },
];

function IntegrationsSection({connected,hubData,adsData,slackConfigured,stats,workflows}) {
  const [subTab,setSubTab]=useState("hub");

  // Build live status for each integration
  const getStatus = (id) => {
    switch(id) {
      case "n8n": return connected ? {status:"connected",lastSync:"Live",dataPoints:stats.totalExecs||0,health:Number(stats.successRate)||0,errors:stats.failedExecs||0} : {status:"disconnected"};
      case "hubspot": return hubData && !hubData.error ? {status:"connected",lastSync:"Last fetch",dataPoints:hubData.stats?.totalDeals||0,health:92,errors:0} : hubData?.error ? {status:"error",error:hubData.error} : {status:"disconnected"};
      case "google_ads": return adsData && !adsData.error ? {status:"connected",lastSync:"Last fetch",dataPoints:adsData.totals?.totalClicks||0,health:88,errors:0} : {status:"disconnected"};
      case "slack": return slackConfigured ? {status:"connected",lastSync:"Active",dataPoints:0,health:100,errors:0} : {status:"disconnected"};
      default: return {status:"available"};
    }
  };

  const integrations = INTEGRATIONS.map(i => ({...i,...getStatus(i.id)}));
  const connectedCount = integrations.filter(i=>i.status==="connected").length;
  const errorCount = integrations.filter(i=>i.status==="error").length;

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div>
        <h2 style={{fontFamily:sans,fontSize:18,fontWeight:700,margin:0}}>Integrations</h2>
        <p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>{connectedCount} connected · {errorCount} errors · {INTEGRATIONS.length} total</p>
      </div>
      <div style={{display:"flex",gap:4}}>
        {[{k:"hub",l:"Hub"},{k:"flow",l:"Data Flow"},{k:"health",l:"Health"}].map(t=>
          <button key={t.k} onClick={()=>setSubTab(t.k)} style={{background:subTab===t.k?T.amberDim:"transparent",color:subTab===t.k?T.amber:T.textMuted,border:subTab===t.k?`1px solid ${T.amberSoft}`:"1px solid transparent",borderRadius:8,padding:"7px 16px",fontFamily:sans,fontSize:12,cursor:"pointer",fontWeight:subTab===t.k?600:400}}>{t.l}</button>
        )}
      </div>
    </div>

    {subTab==="hub"&&<IntegrationHub integrations={integrations}/>}
    {subTab==="flow"&&<DataFlowMap integrations={integrations} stats={stats} hubData={hubData} adsData={adsData}/>}
    {subTab==="health"&&<HealthMonitor integrations={integrations}/>}
  </div>);
}

// ─── Integration Hub ───
function IntegrationHub({integrations}) {
  const statusConfig = {
    connected:{label:"Connected",color:T.green,bg:T.greenDim,border:T.greenSoft},
    error:{label:"Error",color:T.red,bg:T.redDim,border:T.redSoft},
    disconnected:{label:"Not Connected",color:T.textMuted,bg:T.surface2,border:T.border},
    available:{label:"Available",color:T.textMuted,bg:T.surface2,border:T.border},
  };
  const categories = [...new Set(integrations.map(i=>i.category))];

  return (<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Summary strip */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      <BigStat label="Connected" value={integrations.filter(i=>i.status==="connected").length} sub={`of ${integrations.length} integrations`} color={T.green} icon="✅"/>
      <BigStat label="Data Points Synced" value={integrations.reduce((s,i)=>s+(i.dataPoints||0),0).toLocaleString()} sub="across all integrations" color={T.cyan} icon="🔄"/>
      <BigStat label="Errors" value={integrations.filter(i=>i.status==="error").length} sub="need attention" color={integrations.some(i=>i.status==="error")?T.red:T.green} icon={integrations.some(i=>i.status==="error")?"⚠️":"✅"}/>
    </div>

    {/* Integration cards by category */}
    {categories.map(cat=>(
      <div key={cat}>
        <h3 style={{fontFamily:sans,fontSize:12,fontWeight:600,color:T.textMuted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:10}}>{cat}</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {integrations.filter(i=>i.category===cat).map(intg=>{
            const sc = statusConfig[intg.status]||statusConfig.available;
            return (
              <div key={intg.id} style={{background:T.surface,border:`1px solid ${intg.status==="connected"?sc.border:T.border}`,borderRadius:12,padding:18,transition:"all 0.2s",position:"relative",overflow:"hidden"}} onMouseEnter={e=>e.currentTarget.style.borderColor=intg.color} onMouseLeave={e=>e.currentTarget.style.borderColor=intg.status==="connected"?sc.border:T.border}>
                {intg.status==="connected"&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:intg.color}}/>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:10,background:`${intg.color}15`,border:`1px solid ${intg.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{intg.icon}</div>
                    <div>
                      <div style={{fontFamily:sans,fontSize:14,fontWeight:600}}>{intg.name}</div>
                      <div style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>{intg.desc}</div>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div style={{display:"flex",alignItems:"center",gap:5,background:sc.bg,padding:"4px 10px",borderRadius:20,border:`1px solid ${sc.border}`}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:sc.color,boxShadow:intg.status==="connected"?`0 0 6px ${sc.color}`:"none"}}/>
                    <span style={{fontFamily:sans,fontSize:9,color:sc.color,fontWeight:600}}>{sc.label}</span>
                  </div>
                </div>
                {/* Data info */}
                <div style={{fontFamily:sans,fontSize:11,color:T.textDim,marginBottom:8}}>{intg.dataType}</div>
                {intg.status==="connected"&&(
                  <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                    <div><span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>Synced:</span><span style={{fontFamily:mono,fontSize:11,color:T.text,marginLeft:6,fontWeight:600}}>{(intg.dataPoints||0).toLocaleString()}</span></div>
                    <div><span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>Status:</span><span style={{fontFamily:sans,fontSize:10,color:T.green,marginLeft:6}}>● Active</span></div>
                  </div>
                )}
                {intg.status==="error"&&(
                  <div style={{background:T.redDim,borderRadius:6,padding:8,marginTop:4}}>
                    <span style={{fontFamily:sans,fontSize:10,color:T.red}}>{intg.error||"Connection error — check credentials"}</span>
                  </div>
                )}
                {(intg.status==="disconnected"||intg.status==="available")&&(
                  <div style={{paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                    <button style={{background:`${intg.color}15`,color:intg.color,border:`1px solid ${intg.color}30`,borderRadius:8,padding:"6px 16px",fontFamily:sans,fontSize:11,cursor:"pointer",fontWeight:600,width:"100%"}}>Connect {intg.name}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>);
}

// ─── Data Flow Map ───
function DataFlowMap({integrations,stats,hubData,adsData}) {
  const flows = [
    {from:"Google Ads",to:"n8n",label:`${adsData?.totals?.totalClicks||"—"} clicks`,color:T.blue,active:!!adsData},
    {from:"n8n",to:"HubSpot CRM",label:`${hubData?.stats?.totalDeals||"—"} deals`,color:T.purple,active:!!hubData},
    {from:"n8n",to:"Slack",label:"Failure alerts",color:T.pink,active:integrations.find(i=>i.id==="slack")?.status==="connected"},
    {from:"Gmail",to:"n8n",label:"Email triggers",color:T.red,active:false},
    {from:"n8n",to:"Google Sheets",label:"Data exports",color:T.green,active:false},
    {from:"Intercom",to:"n8n",label:"Support tickets",color:T.blue,active:false},
    {from:"Linear",to:"n8n",label:"Issue updates",color:T.purple,active:false},
  ];

  // Pipeline funnel
  const funnel = [
    {stage:"Impressions",value:adsData?.totals?.totalImpressions||28400,source:"Google Ads",color:T.blue},
    {stage:"Clicks",value:adsData?.totals?.totalClicks||890,source:"Google Ads",color:T.blue},
    {stage:"Leads Captured",value:hubData?.stats?.totalDeals||142,source:"n8n → HubSpot",color:T.green},
    {stage:"Qualified",value:Math.floor((hubData?.stats?.totalDeals||142)*0.45),source:"n8n Workflow",color:T.amber},
    {stage:"Won",value:Math.floor((hubData?.stats?.totalDeals||142)*0.18),source:"HubSpot CRM",color:T.purple},
  ];
  const maxFunnel=Math.max(...funnel.map(f=>f.value),1);

  return (<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card title="Data Flow Between Tools">
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {flows.map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:f.active?`${f.color}06`:T.bg,border:`1px solid ${f.active?`${f.color}20`:T.border}`,borderRadius:10,opacity:f.active?1:0.5}}>
            {/* Source */}
            <div style={{minWidth:120,fontFamily:sans,fontSize:12,fontWeight:600,color:f.active?T.text:T.textMuted}}>{f.from}</div>
            {/* Arrow with data */}
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:2,background:f.active?f.color:T.border,borderRadius:1,position:"relative"}}>
                {f.active&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:f.color,boxShadow:`0 0 8px ${f.color}`,animation:"flowPulse 2s infinite"}}/>}
              </div>
              <span style={{fontFamily:mono,fontSize:10,color:f.active?f.color:T.textMuted,fontWeight:600,whiteSpace:"nowrap"}}>{f.label}</span>
              <div style={{fontSize:14,color:f.active?f.color:T.textMuted}}>→</div>
            </div>
            {/* Destination */}
            <div style={{minWidth:120,fontFamily:sans,fontSize:12,fontWeight:600,color:f.active?T.text:T.textMuted,textAlign:"right"}}>{f.to}</div>
            {/* Status */}
            <div style={{width:8,height:8,borderRadius:"50%",background:f.active?T.green:T.textMuted,boxShadow:f.active?`0 0 6px ${T.green}`:"none"}}/>
          </div>
        ))}
      </div>
      <style>{`@keyframes flowPulse{0%{left:0%;opacity:0}20%{opacity:1}80%{opacity:1}100%{left:100%;opacity:0}}`}</style>
    </Card>

    {/* Conversion Funnel */}
    <Card title="Conversion Funnel — End to End">
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {funnel.map((f,i)=>{
          const w=(f.value/maxFunnel)*100;
          const convRate=i>0?((f.value/funnel[i-1].value)*100).toFixed(1)+"%":"—";
          return (
            <div key={i}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:sans,fontSize:13,fontWeight:600}}>{f.stage}</span>
                  <span style={{fontFamily:sans,fontSize:9,color:T.textMuted,background:T.surface2,padding:"2px 8px",borderRadius:10}}>{f.source}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {i>0&&<span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>conv: <span style={{color:T.amber,fontWeight:600}}>{convRate}</span></span>}
                  <span style={{fontFamily:mono,fontSize:14,fontWeight:700,color:f.color}}><AnimatedNum value={f.value}/></span>
                </div>
              </div>
              <div style={{height:24,borderRadius:6,background:T.surface2,overflow:"hidden",position:"relative"}}>
                <AnimatedBar height={24} color={`${f.color}60`} delay={i*120} style={{width:`${w}%`,position:"absolute",top:0,left:0,borderRadius:6}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between"}}>
        <span style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>Overall conversion: Impression → Won</span>
        <span style={{fontFamily:mono,fontSize:13,fontWeight:700,color:T.green}}>
          <AnimatedNum value={funnel.length>1?((funnel[funnel.length-1].value/funnel[0].value)*100):0} suffix="%" decimals={2}/>
        </span>
      </div>
    </Card>
  </div>);
}

// ─── Health Monitor ───
function HealthMonitor({integrations}) {
  const connected = integrations.filter(i=>i.status==="connected"||i.status==="error");
  // Simulated uptime data (24 hours, each slot = 1 hour)
  const genUptime=(health)=>Array.from({length:24},()=>Math.random()*100<(health||80)?"up":"down");

  return (<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      <BigStat label="Overall Uptime" value="97.2%" sub="last 24 hours" color={T.green} icon="📡"/>
      <BigStat label="Active Connections" value={connected.length} sub={`of ${integrations.length} total`} color={T.cyan} icon="🔗"/>
      <BigStat label="Avg Response Time" value="1.2s" sub="across integrations" color={T.amber} icon="⏱"/>
    </div>

    <Card title="Connection Health — Last 24 Hours">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {integrations.map(intg=>{
          const health=intg.health||0;
          const uptime=intg.status==="connected"?genUptime(health):genUptime(0);
          const uptimePct=intg.status==="connected"?`${health}%`:"—";
          const sc=intg.status==="connected"?T.green:intg.status==="error"?T.red:T.textMuted;

          return (
            <div key={intg.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              {/* Icon + name */}
              <div style={{display:"flex",alignItems:"center",gap:8,minWidth:160}}>
                <span style={{fontSize:16}}>{intg.icon}</span>
                <div>
                  <div style={{fontFamily:sans,fontSize:12,fontWeight:600}}>{intg.name}</div>
                  <div style={{fontFamily:sans,fontSize:9,color:T.textMuted}}>{intg.status==="connected"?"Connected":intg.status==="error"?"Error":"Offline"}</div>
                </div>
              </div>
              {/* Uptime bar (24 hours) */}
              <div style={{flex:1,display:"flex",gap:2,alignItems:"center"}}>
                {uptime.map((s,i)=>(
                  <div key={i} style={{flex:1,height:20,borderRadius:2,background:s==="up"?`${T.green}50`:`${T.red}30`,transition:"background 0.3s"}} title={`${23-i}h ago: ${s}`}/>
                ))}
              </div>
              {/* Uptime % */}
              <div style={{minWidth:60,textAlign:"right"}}>
                <div style={{fontFamily:mono,fontSize:14,fontWeight:700,color:sc}}>{uptimePct}</div>
                <div style={{fontFamily:sans,fontSize:8,color:T.textMuted}}>uptime</div>
              </div>
              {/* Status dot */}
              <div style={{width:10,height:10,borderRadius:"50%",background:sc,boxShadow:intg.status==="connected"?`0 0 8px ${sc}`:"none"}}/>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:10,display:"flex",gap:16,fontSize:10,color:T.textMuted,fontFamily:sans}}>
        <span><span style={{display:"inline-block",width:10,height:8,borderRadius:2,background:`${T.green}50`,marginRight:4}}/>Up</span>
        <span><span style={{display:"inline-block",width:10,height:8,borderRadius:2,background:`${T.red}30`,marginRight:4}}/>Down</span>
        <span style={{marginLeft:"auto"}}>← 24h ago · Now →</span>
      </div>
    </Card>
  </div>);
}

// ═══════════════════════════════════════
// KPIs (Enhanced with Source Attribution)
// ═══════════════════════════════════════
function KPIs({workflows,stats,hubData,adsData}) {
  const costPerLead=adsData?.totals?.totalSpend&&adsData?.totals?.totalConversions?`$${(Number(adsData.totals.totalSpend)/Number(adsData.totals.totalConversions)).toFixed(0)}`:"—";
  const costPerDealWon=adsData?.totals?.totalSpend&&hubData?.stats?.totalDeals?`$${(Number(adsData.totals.totalSpend)/Math.max(Math.floor(Number(hubData.stats.totalDeals)*0.18),1)).toFixed(0)}`:"—";
  const roiEstimate=hubData?.stats?.totalValue&&adsData?.totals?.totalSpend?`${((Number(hubData.stats.totalValue)/Number(adsData.totals.totalSpend))*100).toFixed(0)}%`:"—";
  const timeSaved=stats.totalExecs?`${Math.floor(stats.totalExecs*2.5)}min`:"—"; // ~2.5 min saved per automation

  return (<>
    <div style={{marginBottom:14}}><h2 style={{fontFamily:sans,fontSize:18,fontWeight:700,margin:0}}>Cross-Platform KPIs</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Every metric shows which tool it comes from</p></div>

    {/* Row 1: Core Revenue Metrics */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
      <KPICard label="Pipeline Value" value={hubData?.stats?.totalValue?`$${Number(hubData.stats.totalValue).toLocaleString()}`:"—"} source="HubSpot" sourceColor={T.purple} sourceIcon="🟠" color={T.green} icon="💰"/>
      <KPICard label="Ad Spend" value={adsData?.totals?.totalSpend?`$${Number(adsData.totals.totalSpend).toLocaleString()}`:"—"} source="Google Ads" sourceColor={T.blue} sourceIcon="📢" color={T.red} icon="💳"/>
      <KPICard label="ROI Estimate" value={roiEstimate} source="HubSpot + Ads" sourceColor={T.amber} sourceIcon="🔗" color={T.cyan} icon="📊"/>
      <KPICard label="Cost Per Deal Won" value={costPerDealWon} source="Ads ÷ HubSpot" sourceColor={T.amber} sourceIcon="🔗" color={T.amber} icon="🏆"/>
    </div>

    {/* Row 2: Conversion Metrics */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
      <KPICard label="Conversions" value={adsData?.totals?.totalConversions||"—"} source="Google Ads" sourceColor={T.blue} sourceIcon="📢" color={T.green} icon="✅"/>
      <KPICard label="Cost Per Lead" value={costPerLead} source="Ads ÷ Conversions" sourceColor={T.amber} sourceIcon="🔗" color={T.amber} icon="💸"/>
      <KPICard label="Win Rate" value={hubData?.stats?.winRate||"—"} source="HubSpot" sourceColor={T.purple} sourceIcon="🟠" color={T.cyan} icon="🎯"/>
      <KPICard label="Open Deals" value={hubData?.stats?.openDeals||hubData?.stats?.totalDeals||"—"} source="HubSpot" sourceColor={T.purple} sourceIcon="🟠" color={T.purple} icon="💼"/>
    </div>

    {/* Row 3: Automation Metrics */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
      <KPICard label="Automation Rate" value={`${stats.successRate}%`} source="n8n" sourceColor={T.green} sourceIcon="⚡" color={Number(stats.successRate)>=80?T.green:T.red} icon={Number(stats.successRate)>=80?"✅":"⚠️"} highlight={Number(stats.successRate)<60}/>
      <KPICard label="Time Saved" value={timeSaved} source="n8n" sourceColor={T.green} sourceIcon="⚡" color={T.cyan} icon="⏱"/>
      <KPICard label="Errors Prevented" value={stats.totalExecs?Math.floor(stats.totalExecs*0.92):0} source="n8n" sourceColor={T.green} sourceIcon="⚡" color={T.green} icon="🛡"/>
      <KPICard label="Active Automations" value={stats.activeWorkflows} source="n8n" sourceColor={T.green} sourceIcon="⚡" color={T.blue} icon="🔄"/>
    </div>

    {/* Detail cards */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card title="Automation Health (n8n)">
        <Metric label="Active workflows" value={stats.activeWorkflows} total={stats.totalWorkflows} color={T.green}/>
        <Metric label="Total executions" value={stats.totalExecs?.toLocaleString()} color={T.cyan}/>
        <Metric label="Failed" value={stats.failedExecs?.toLocaleString()} sub={stats.totalExecs>0?`${((stats.failedExecs/stats.totalExecs)*100).toFixed(1)}%`:""} color={T.red}/>
        <Metric label="Avg duration" value={fmt(stats.avgDuration)} color={T.textDim}/>
      </Card>
      <Card title="Ad → Lead Funnel">
        {adsData?.totals?(<>
          <Metric label="Impressions" value={adsData.totals.totalImpressions?.toLocaleString()} color={T.blue}/>
          <Metric label="Clicks" value={adsData.totals.totalClicks?.toLocaleString()} color={T.cyan}/>
          <Metric label="CTR" value={adsData.totals.avgCTR} color={T.amber}/>
          <Metric label="Conversions" value={adsData.totals.totalConversions} color={T.green}/>
        </>):<p style={{fontFamily:sans,fontSize:12,color:T.textMuted}}>Load Google Ads data to see funnel</p>}
        {hubData?.stats?(<Metric label="Pipeline value" value={hubData.stats.totalValue?`$${Number(hubData.stats.totalValue).toLocaleString()}`:"—"} color={T.purple}/>):<p style={{fontFamily:sans,fontSize:12,color:T.textMuted}}>Load HubSpot to see pipeline</p>}
      </Card>
    </div>
    {!hubData&&!adsData&&<div style={{marginTop:20,textAlign:"center",padding:32,color:T.textMuted,fontFamily:sans,fontSize:13,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`}}>Load HubSpot and Google Ads from their tabs to populate all KPIs</div>}
  </>);
}

// ═══════════════════════════════════════
// HUBSPOT & ADS
// ═══════════════════════════════════════
function HubSpot({data,loading,onFetch}) {
  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div><h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0,color:T.purple}}>HubSpot CRM</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Live pipeline and deal data</p></div>
      <button onClick={onFetch} disabled={loading} style={{background:T.purpleDim,color:T.purple,border:`1px solid ${T.purple}30`,borderRadius:8,padding:"7px 16px",fontFamily:sans,fontSize:12,cursor:"pointer",fontWeight:600,opacity:loading?0.5:1}}>{loading?"Fetching...":data?"↻ Refresh":"Load Data"}</button>
    </div>
    {!data&&!loading&&<EmptyState emoji="💼" text="Pull live data from your HubSpot CRM" btn="Load HubSpot" color={T.purple} onClick={onFetch}/>}
    {loading&&<LoadingCard color={T.purple} text="Querying HubSpot..."/>}
    {data&&!data.error&&(<>
      {data.stats&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
        <BigStat label="Deals" value={data.stats.totalDeals||"—"} color={T.purple} icon="📋"/>
        <BigStat label="Pipeline Value" value={data.stats.totalValue?`$${Number(data.stats.totalValue).toLocaleString()}`:"—"} color={T.green} icon="💰"/>
        <BigStat label="Avg Deal" value={data.stats.avgDealSize?`$${Number(data.stats.avgDealSize).toLocaleString()}`:"—"} color={T.cyan} icon="📊"/>
        <BigStat label="Win Rate" value={data.stats.winRate||"—"} color={T.amber} icon="🏆"/>
      </div>}
      {data.deals&&<Card title="Deals"><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Deal","Stage","Amount","Company"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{data.deals.slice(0,10).map((d,i)=><tr key={i} style={{borderBottom:`1px solid ${T.border}`}}><td style={{...tdS,fontFamily:sans}}>{d.name}</td><td style={tdS}><span style={{background:T.purpleDim,color:T.purple,padding:"3px 8px",borderRadius:12,fontFamily:sans,fontSize:10,fontWeight:500}}>{d.stage}</span></td><td style={{...tdS,color:T.green,fontFamily:mono}}>{d.amount?`$${Number(d.amount).toLocaleString()}`:"—"}</td><td style={{...tdS,color:T.textDim,fontFamily:sans}}>{d.company||"—"}</td></tr>)}</tbody></table></Card>}
      {data.raw&&<Card title="Response"><pre style={{fontFamily:mono,fontSize:10,color:T.textDim,whiteSpace:"pre-wrap",maxHeight:300,overflow:"auto",margin:0}}>{data.raw}</pre></Card>}
    </>)}
    {data?.error&&<Card><p style={{color:T.red,fontFamily:sans,fontSize:12}}>Error: {data.error}</p></Card>}
  </div>);
}

function Ads({data,loading,onFetch}) {
  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div><h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0,color:T.blue}}>Google Ads</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Campaign performance and AI recommendations</p></div>
      <button onClick={onFetch} disabled={loading} style={{background:T.blueDim,color:T.blue,border:`1px solid ${T.blue}30`,borderRadius:8,padding:"7px 16px",fontFamily:sans,fontSize:12,cursor:"pointer",fontWeight:600,opacity:loading?0.5:1}}>{loading?"Generating...":data?"↻ Refresh":"Generate Report"}</button>
    </div>
    {!data&&!loading&&<EmptyState emoji="📈" text="AI-powered Google Ads performance report" btn="Generate Report" color={T.blue} onClick={onFetch}/>}
    {loading&&<LoadingCard color={T.blue} text="Generating report..."/>}
    {data&&!data.error&&(<>
      {data.totals&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:12}}>
        <BigStat label="Spend" value={`$${Number(data.totals.totalSpend).toLocaleString()}`} color={T.red} icon="💳"/>
        <BigStat label="Clicks" value={data.totals.totalClicks?.toLocaleString()} color={T.blue} icon="👆"/>
        <BigStat label="CTR" value={data.totals.avgCTR} color={T.amber} icon="📊"/>
        <BigStat label="Conversions" value={data.totals.totalConversions} color={T.green} icon="✅"/>
        <BigStat label="Avg CPA" value={data.totals.avgCPA?`$${data.totals.avgCPA}`:"—"} color={T.cyan} icon="💰"/>
      </div>}
      {data.campaigns&&<Card title="Campaigns"><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Campaign","Spend","Clicks","CTR","Conv","CPA","ROAS"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{data.campaigns.map((c,i)=><tr key={i} style={{borderBottom:`1px solid ${T.border}`}}><td style={{...tdS,fontFamily:sans}}>{c.name}</td><td style={{...tdS,color:T.red,fontFamily:mono}}>${Number(c.spend).toLocaleString()}</td><td style={{...tdS,fontFamily:mono}}>{c.clicks?.toLocaleString()}</td><td style={{...tdS,fontFamily:mono}}>{c.ctr}</td><td style={{...tdS,color:T.green,fontFamily:mono}}>{c.conversions}</td><td style={{...tdS,color:T.amber,fontFamily:mono}}>{c.cpa?`$${c.cpa}`:"—"}</td><td style={{...tdS,color:T.cyan,fontFamily:mono}}>{c.roas||"—"}</td></tr>)}</tbody></table></Card>}
      {data.recommendations&&<Card title="AI Recommendations" style={{marginTop:12}}>{data.recommendations.map((r,i)=><div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<data.recommendations.length-1?`1px solid ${T.border}`:"none"}}><span style={{color:T.blue,fontSize:14}}>→</span><span style={{fontFamily:sans,fontSize:12,color:T.textDim,lineHeight:1.6}}>{r}</span></div>)}</Card>}
    </>)}
    {data?.error&&<Card><p style={{color:T.red,fontFamily:sans,fontSize:12}}>Error: {data.error}</p></Card>}
  </div>);
}

// ═══════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════
function Alerts({config,setConfig,session,slackConfigured,setSlackConfigured,alertsSent,connected,workflows}) {
  const [saving,setSaving]=useState(false);
  const saveSlack=async()=>{if(!session)return;setSaving(true);try{const r=await fetch(`${BACKEND_URL}/api/slack-config`,{method:"POST",headers:{"Content-Type":"application/json","X-FlowPulse-Session":session},body:JSON.stringify({slackWebhook:config.slackWebhook})});const j=await r.json();setSlackConfigured(j.configured);}catch{}setSaving(false);};
  const critical=workflows.filter(w=>w.active&&Number(w.successRate)<50);

  return (<div>
    <div style={{marginBottom:14}}><h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0,color:T.pink}}>Slack Alerts</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Get instant failure notifications in Slack</p></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      <BigStat label="Alerts Sent" value={alertsSent} color={T.pink} icon="🔔"/>
      <BigStat label="Status" value={slackConfigured?"Active":"Not Set"} color={slackConfigured?T.green:T.textMuted} icon={slackConfigured?"✅":"⚙️"}/>
    </div>
    <Card title="Configure Slack Webhook" style={{marginBottom:16}}>
      <div style={{fontFamily:sans,fontSize:12,color:T.textDim,lineHeight:2,marginBottom:14}}>
        <div>1. Go to <b style={{color:T.text}}>api.slack.com/apps</b> → Create New App</div>
        <div>2. Enable <b style={{color:T.text}}>Incoming Webhooks</b> → Add to channel</div>
        <div>3. Copy the webhook URL and paste below</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={config.slackWebhook} onChange={e=>setConfig(c=>({...c,slackWebhook:e.target.value}))} placeholder="https://hooks.slack.com/services/..." style={{...inputS,flex:1}}/>
        <button onClick={saveSlack} disabled={saving||!connected} style={{background:T.pink,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontFamily:sans,fontSize:12,fontWeight:700,cursor:"pointer",opacity:saving||!connected?0.5:1}}>
          {saving?"Saving...":"Save"}
        </button>
      </div>
      {!connected&&<p style={{fontFamily:sans,fontSize:11,color:T.amber,marginTop:8}}>Connect to n8n first to configure alerts.</p>}
    </Card>
    {critical.length>0&&<Card title="Critical Workflows (would trigger alerts)">
      {critical.map((w,i)=><div key={w.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<critical.length-1?`1px solid ${T.border}`:"none"}}>
        <div><div style={{fontFamily:sans,fontSize:13}}>{w.name}</div><div style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>{w.failedCount} failures / {w.execCount} runs</div></div>
        <span style={{fontFamily:mono,fontSize:16,fontWeight:700,color:T.red}}>{w.successRate}%</span>
      </div>)}
    </Card>}
  </div>);
}

// ═══════════════════════════════════════
// ERROR DIAGNOSIS COMPONENT
// ═══════════════════════════════════════
function ErrorDiag({error,workflowName,nodes,isLast,showWf}) {
  const [diag,setDiag]=useState(null);
  const [loading,setLoading]=useState(false);
  const [expanded,setExpanded]=useState(false);

  const run=async()=>{
    if(diag){setExpanded(!expanded);return;}
    setLoading(true);setExpanded(true);
    const r=await diagnoseError(error.message,workflowName,nodes);
    setDiag(r);setLoading(false);
  };

  const parse=(text)=>{
    if(!text) return null;
    const lines=text.split("\n").filter(l=>l.trim());
    let dx="",steps=[];let inFix=false;
    for(const l of lines){
      if(/fix:|steps:|solution:/i.test(l)){inFix=true;continue;}
      if(/diagnosis:|cause:|issue:/i.test(l)){dx=l.replace(/^.*?:\s*/i,"");inFix=false;continue;}
      if(inFix){const c=l.replace(/^\d+[\.\)]\s*/,"").replace(/^[-*]\s*/,"").trim();if(c)steps.push(c);}
      else if(!dx&&!l.startsWith("#")) dx+=(dx?" ":"")+l.trim();
    }
    if(!dx&&steps.length===0){dx=lines.slice(0,2).join(" ");steps=lines.slice(2);}
    return {dx,steps};
  };

  const p=diag?parse(diag):null;

  return (
    <div style={{borderBottom:isLast?"none":`1px solid ${T.border}`,padding:"12px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{flex:1,minWidth:0}}>
          {showWf&&<div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginBottom:3}}>{workflowName}</div>}
          <div style={{fontFamily:sans,fontSize:12,color:T.red,lineHeight:1.5}}>{error.message}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <span style={{fontFamily:mono,fontSize:12,color:T.textMuted,fontWeight:700}}>×{error.count}</span>
          <button onClick={run} disabled={loading} style={{
            background:expanded&&diag?"linear-gradient(135deg,#34D39915,#22D3EE15)":"linear-gradient(135deg,#A78BFA15,#60A5FA15)",
            color:expanded&&diag?T.green:T.purple,
            border:`1px solid ${expanded&&diag?T.greenSoft:T.purple+"30"}`,
            borderRadius:8,padding:"6px 14px",fontFamily:sans,fontSize:11,cursor:loading?"wait":"pointer",
            fontWeight:600,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",
          }}>
            {loading?(<><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",border:`2px solid ${T.purple}`,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>Analyzing...</>):diag?(expanded?"Hide Fix":"Show Fix"):"🔍 Diagnose"}
          </button>
        </div>
      </div>

      {expanded&&(loading||diag)&&(
        <div style={{marginTop:12,background:T.bg,border:`1px solid ${T.borderBright}`,borderRadius:10,overflow:"hidden"}}>
          {loading?(
            <div style={{padding:24,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:T.purple,boxShadow:`0 0 12px ${T.purple}`,animation:"pulse 1.5s infinite"}}/>
              <span style={{fontFamily:sans,fontSize:12,color:T.textDim}}>AI analyzing error pattern...</span>
            </div>
          ):p?(
            <div>
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,background:`${T.red}08`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:15}}>🔍</span>
                  <span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:T.red,letterSpacing:1}}>DIAGNOSIS</span>
                </div>
                <div style={{fontFamily:sans,fontSize:13,color:T.text,lineHeight:1.7}}>{p.dx}</div>
              </div>
              {p.steps.length>0&&(
                <div style={{padding:"14px 18px",background:`${T.green}06`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:15}}>🔧</span>
                    <span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:T.green,letterSpacing:1}}>HOW TO FIX</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {p.steps.map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                        <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:T.greenDim,border:`1px solid ${T.greenSoft}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:10,color:T.green,fontWeight:700}}>{i+1}</div>
                        <span style={{fontFamily:sans,fontSize:13,color:T.textDim,lineHeight:1.7,paddingTop:3}}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ):<div style={{padding:16}}><pre style={{fontFamily:sans,fontSize:12,color:T.textDim,whiteSpace:"pre-wrap",margin:0}}>{diag}</pre></div>}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════
function Card({title,children,style:s}) {
  return (<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:18,...s}}>
    {title&&<h3 style={{fontFamily:sans,fontSize:11,fontWeight:600,color:T.textMuted,margin:"0 0 14px",letterSpacing:0.5,textTransform:"uppercase"}}>{title}</h3>}
    {children}
  </div>);
}

function BigStat({label,value,sub,color,icon,highlight}) {
  // Parse value for animation
  const isPercentage = typeof value === "string" && value.endsWith("%");
  const isDuration = typeof value === "string" && (value.includes("m") || value.includes("s") || value.includes("h"));
  const isDollar = typeof value === "string" && value.startsWith("$");
  const rawNum = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  const canAnimate = !isNaN(rawNum) && isFinite(rawNum) && !isDuration;

  return (
    <div style={{background:T.surface,border:`1px solid ${highlight?`${T.red}40`:T.border}`,borderRadius:12,padding:16,position:"relative",overflow:"hidden"}}>
      {highlight&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:T.redGrad}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginBottom:6,fontWeight:500,letterSpacing:0.5}}>{label}</div>
          <div style={{fontFamily:mono,fontSize:26,fontWeight:700,color,lineHeight:1}}>
            {canAnimate ? (
              <AnimatedNum value={rawNum} prefix={isDollar?"$":""} suffix={isPercentage?"%":""} decimals={isPercentage?1:0} />
            ) : value}
          </div>
          {sub&&<div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginTop:4}}>{sub}</div>}
        </div>
        {icon&&<span style={{fontSize:20,opacity:0.6}}>{icon}</span>}
      </div>
    </div>
  );
}

function Metric({label,value,total,sub,color}) {
  return (<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
    <span style={{fontFamily:sans,fontSize:12,color:T.textDim}}>{label}</span>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontFamily:mono,fontSize:13,fontWeight:700,color}}>{value}</span>
      {total&&<span style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>/ {total}</span>}
      {sub&&<span style={{fontFamily:sans,fontSize:10,color:T.textMuted}}>({sub})</span>}
    </div>
  </div>);
}

function KPICard({label,value,source,sourceColor,sourceIcon,color,icon,highlight}) {
  const rawNum = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  const isPercentage = typeof value === "string" && value.includes("%");
  const isDollar = typeof value === "string" && value.startsWith("$");
  const canAnimate = !isNaN(rawNum) && isFinite(rawNum) && typeof value !== "undefined" && value !== "—";

  return (
    <div style={{background:T.surface,border:`1px solid ${highlight?`${T.red}40`:T.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden"}}>
      {highlight&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:T.redGrad}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{fontFamily:sans,fontSize:10,color:T.textMuted,fontWeight:500,letterSpacing:0.3}}>{label}</div>
        {icon&&<span style={{fontSize:16,opacity:0.5}}>{icon}</span>}
      </div>
      <div style={{fontFamily:mono,fontSize:22,fontWeight:700,color,lineHeight:1,marginBottom:10}}>
        {canAnimate?<AnimatedNum value={rawNum} prefix={isDollar?"$":""} suffix={isPercentage?"%":""} decimals={isPercentage?1:0}/>:value}
      </div>
      {/* Source attribution badge */}
      <div style={{display:"flex",alignItems:"center",gap:5,background:`${sourceColor}10`,padding:"4px 8px",borderRadius:8,border:`1px solid ${sourceColor}20`,width:"fit-content"}}>
        <span style={{fontSize:10}}>{sourceIcon}</span>
        <span style={{fontFamily:sans,fontSize:9,color:sourceColor,fontWeight:600}}>{source}</span>
      </div>
    </div>
  );
}

function StatusBadge({status}) {
  const c=status==="success"?T.green:T.red;
  const bg=status==="success"?T.greenDim:T.redDim;
  return <span style={{fontFamily:sans,fontSize:10,color:c,background:bg,padding:"3px 10px",borderRadius:12,display:"inline-flex",alignItems:"center",gap:5,fontWeight:500,border:`1px solid ${status==="success"?T.greenSoft:T.redSoft}`}}><span style={{width:5,height:5,borderRadius:"50%",background:c}}/>{status}</span>;
}

function EmptyState({emoji,text,btn,color,onClick}) {
  return (<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:48,textAlign:"center"}}>
    <div style={{fontSize:36,marginBottom:12}}>{emoji}</div>
    <p style={{fontFamily:sans,fontSize:13,color:T.textDim,marginBottom:16}}>{text}</p>
    <button onClick={onClick} style={{background:color,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontFamily:sans,fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:`0 2px 12px ${color}30`}}>{btn}</button>
  </div>);
}

function LoadingCard({color,text}) {
  return (<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:48,textAlign:"center"}}>
    <div style={{width:10,height:10,borderRadius:"50%",background:color,margin:"0 auto 12px",boxShadow:`0 0 16px ${color}`,animation:"pulse 1.5s infinite"}}/>
    <p style={{fontFamily:sans,fontSize:12,color:T.textDim}}>{text}</p>
    <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}`}</style>
  </div>);
}

// ─── Utilities ───
function fmt(ms){if(!ms||ms<0)return "—";if(ms<1000)return `${ms}ms`;if(ms<60000)return `${(ms/1000).toFixed(1)}s`;if(ms<3600000)return `${Math.floor(ms/60000)}m ${Math.floor((ms%60000)/1000)}s`;return `${Math.floor(ms/3600000)}h ${Math.floor((ms%3600000)/60000)}m`;}
function timeAgo(d){if(!d)return "—";const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return "just now";if(s<3600)return `${Math.floor(s/60)}m ago`;if(s<86400)return `${Math.floor(s/3600)}h ago`;return `${Math.floor(s/86400)}d ago`;}
function rateC(r){const n=Number(r);return n>=80?T.green:n>=50?T.amber:T.red;}
function genHeatmap(){const d=[];const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];days.forEach((day,di)=>{for(let h=0;h<24;h++){const pk=[9,10,11,14,15,16].includes(h);const b=pk&&di<5?5+Math.floor(Math.random()*12):Math.floor(Math.random()*3);d.push({day,hour:h,total:b,failures:Math.floor(b*0.2),di,h});}});return d;}

const inputS={background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",color:T.text,fontFamily:sans,fontSize:12,outline:"none",minWidth:140,transition:"border-color 0.2s"};
const thS={textAlign:"left",padding:"8px 10px",fontFamily:sans,fontSize:10,color:T.textMuted,fontWeight:600,letterSpacing:0.5,borderBottom:`1px solid ${T.border}`,textTransform:"uppercase"};
const tdS={padding:"10px 10px",fontSize:12,color:T.text,fontFamily:sans};
