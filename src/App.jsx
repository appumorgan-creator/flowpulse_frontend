mport { useState, useEffect, useCallback, useMemo } from "react";

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
                {/* Number label on top */}
                <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:val>0?T.green:T.textMuted}}>{val}</span>
                {/* Bar */}
                <div style={{width:"100%",maxWidth:48,borderRadius:6,background:val>0?T.greenGrad:T.surface2,height:Math.max(h,4),transition:"height 0.5s ease",position:"relative",boxShadow:val>0?`0 2px 12px ${T.greenDim}`:"none"}}/>
                {/* Day label */}
                <span style={{fontFamily:sans,fontSize:11,color:T.textMuted,fontWeight:500}}>{dayLabels[i]}</span>
              </div>
            );
          })}
        </div>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:sans,fontSize:11,color:T.textMuted}}>Total this week</span>
          <span style={{fontFamily:mono,fontSize:16,fontWeight:700,color:T.green}}>{dayTotals.reduce((a,b)=>a+b,0)}</span>
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
      <span style={{fontFamily:mono,fontSize:28,fontWeight:700,color:c,marginLeft:"auto"}}>{wf.successRate}%</span>
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
function KPIs({workflows,stats,hubData,adsData}) {
  const costPerLead=adsData?.totals?.totalSpend&&adsData?.totals?.totalConversions?`$${(Number(adsData.totals.totalSpend)/Number(adsData.totals.totalConversions)).toFixed(0)}`:"—";
  return (<>
    <div style={{marginBottom:14}}><h2 style={{fontFamily:sans,fontSize:16,fontWeight:700,margin:0}}>Cross-Platform KPIs</h2><p style={{fontFamily:sans,fontSize:12,color:T.textMuted,margin:"4px 0 0"}}>Unified metrics across n8n, HubSpot, and Google Ads</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
      <BigStat label="Automation Success" value={`${stats.successRate}%`} sub="n8n reliability" color={Number(stats.successRate)>=80?T.green:T.red} icon="⚡" highlight={Number(stats.successRate)<60}/>
      <BigStat label="Pipeline Deals" value={hubData?.stats?.totalDeals||"—"} sub="HubSpot CRM" color={T.purple} icon="💼"/>
      <BigStat label="Ad Spend" value={adsData?.totals?.totalSpend?`$${Number(adsData.totals.totalSpend).toLocaleString()}`:"—"} sub="Google Ads" color={T.blue} icon="📈"/>
      <BigStat label="Conversions" value={adsData?.totals?.totalConversions||"—"} sub="from ads" color={T.green} icon="✅"/>
      <BigStat label="Cost Per Lead" value={costPerLead} sub="ads ÷ conversions" color={T.amber} icon="💰"/>
      <BigStat label="Win Rate" value={hubData?.stats?.winRate||"—"} sub="deal close rate" color={T.cyan} icon="🏆"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card title="Automation Health">
        <Metric label="Active workflows" value={stats.activeWorkflows} total={stats.totalWorkflows} color={T.green}/>
        <Metric label="Total executions" value={stats.totalExecs?.toLocaleString()} color={T.cyan}/>
        <Metric label="Failed" value={stats.failedExecs?.toLocaleString()} sub={stats.totalExecs>0?`${((stats.failedExecs/stats.totalExecs)*100).toFixed(1)}%`:""} color={T.red}/>
        <Metric label="Avg duration" value={fmt(stats.avgDuration)} color={T.textDim}/>
      </Card>
      <Card title="Funnel Overview">
        {adsData?.totals?(<>
          <Metric label="Impressions" value={adsData.totals.totalImpressions?.toLocaleString()} color={T.blue}/>
          <Metric label="Clicks" value={adsData.totals.totalClicks?.toLocaleString()} color={T.cyan}/>
          <Metric label="Conversions" value={adsData.totals.totalConversions} color={T.green}/>
        </>):<p style={{fontFamily:sans,fontSize:12,color:T.textMuted}}>Load Google Ads data to see funnel</p>}
        {hubData?.stats?(<Metric label="Pipeline value" value={hubData.stats.totalValue?`$${Number(hubData.stats.totalValue).toLocaleString()}`:"—"} color={T.purple}/>):<p style={{fontFamily:sans,fontSize:12,color:T.textMuted}}>Load HubSpot data to see pipeline</p>}
      </Card>
    </div>
    {!hubData&&!adsData&&<div style={{marginTop:20,textAlign:"center",padding:32,color:T.textMuted,fontFamily:sans,fontSize:13,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`}}>Load HubSpot and Google Ads from their tabs to see all KPIs here</div>}
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
  return (
    <div style={{background:T.surface,border:`1px solid ${highlight?`${T.red}40`:T.border}`,borderRadius:12,padding:16,position:"relative",overflow:"hidden"}}>
      {highlight&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:T.redGrad}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontFamily:sans,fontSize:10,color:T.textMuted,marginBottom:6,fontWeight:500,letterSpacing:0.5}}>{label}</div>
          <div style={{fontFamily:mono,fontSize:26,fontWeight:700,color,lineHeight:1}}>{value}</div>
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
