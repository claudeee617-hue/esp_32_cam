(() => {
"use strict";
const $ = id => document.getElementById(id);
const KEY = "sentinel-virtual-lab-v1";
const fresh = () => ({
 device:"ESP32-MAIN-01", zone:"Zone Alpha",
 sensors:[["Zone motion","⌖"],["Entry contact","⇥"],["Window contact","▱"]].map(x=>({name:x[0],icon:x[1],online:true,active:false})),
 outputs:[["Status beacon","◉"],["Audible alert indicator","◖"],["Remote notification flag","⌁"]].map(x=>({name:x[0],icon:x[1],active:false})),
 camera:true,overlays:true,running:true,auto:true,speed:1,scenario:"normal",
 started:Date.now(),events:[],samples:[],shots:[],lastShot:null,heartbeat:0
});
const clean = (v,f) => typeof v==="string" ? (v.replace(/[<>]/g,"").trim().slice(0,32)||f) : f;
function load(){
 try{
  const x=JSON.parse(localStorage.getItem(KEY)||"null"),s=fresh();
  if(!x||x.version!==1)return s;
  s.device=clean(x.device,s.device);s.zone=clean(x.zone,s.zone);
  s.sensors=s.sensors.map((d,i)=>({...d,name:clean(x.sensors?.[i]?.name,d.name),online:x.sensors?.[i]?.online!==false,active:x.sensors?.[i]?.active===true}));
  s.outputs=s.outputs.map((d,i)=>({...d,name:clean(x.outputs?.[i]?.name,d.name),active:x.outputs?.[i]?.active===true}));
  ["camera","overlays","running","auto"].forEach(k=>{s[k]=x[k]!==false;});
  s.speed=[1,2,4].includes(+x.speed)?+x.speed:1;s.started=+x.started||Date.now();
  s.events=Array.isArray(x.events)?x.events.slice(0,150):[];
  s.samples=Array.isArray(x.samples)?x.samples.slice(-60):[];
  s.shots=Array.isArray(x.shots)?x.shots.slice(0,12):[];
  s.lastShot=x.lastShot||null;s.heartbeat=+x.heartbeat||0;
  return s;
 }catch{return fresh();}
}
let state=load(),view="overview",scenarioRun=0,toastTimer,pausedElapsed=0;
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,...state}));}catch{toast("Browser storage unavailable; session may not persist.");}}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function time(v){return new Date(v||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});}
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),2600);}
function active(){return state.sensors.filter(x=>x.online&&x.active).length;}
function online(){return state.sensors.filter(x=>x.online).length;}
function health(){return Math.max(0,100-(3-online())*22-(!state.camera?18:0)-(!state.running?8:0));}
function log(type,title,detail,severity){
 severity=severity||"info";
 state.events.unshift({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),type,title,detail,severity,at:new Date().toISOString()});
 state.events=state.events.slice(0,150);events();activity();metrics();save();
}
function navigate(v){
 if(!$("view-"+v))return;view=v;
 document.querySelectorAll(".page-view").forEach(e=>e.classList.toggle("active",e.id==="view-"+v));
 document.querySelectorAll(".nav-item").forEach(e=>e.classList.toggle("active",e.dataset.view===v));
 const t={overview:"Overview",lab:"Virtual Hardware",camera:"Camera Lab",analytics:"Analytics",events:"Event History",settings:"Configuration"}[v];
 $("crumb-title").textContent=t;document.title="Sentinel Lab — "+t;
 if(v==="analytics")drawChart();if(v==="camera")drawCameras();window.scrollTo({top:0,behavior:"smooth"});
}
function channel(i,on){
 const s=state.sensors[i];if(!s||!s.online)return;s.active=on;
 log(on?"SENSOR_ACTIVE":"SENSOR_CLEAR",s.name+(on?" triggered":" returned to normal"),"Virtual input "+(i+1)+" · ESP32 emulator",on?"warning":"info");
 if(active()>=2){state.outputs[0].active=true;state.outputs[2].active=true;log("MULTI_SENSOR_CORRELATION","Multi-sensor activity correlated",active()+" virtual inputs active; simulated operator-review alert generated.","alert");}
 else if(!active())state.outputs.forEach(o=>o.active=false);
 render();
}
function output(i,on){state.outputs[i].active=on;log("VIRTUAL_OUTPUT_CHANGED",state.outputs[i].name+(on?" enabled":" cleared"),"Visual indicator only; no physical actuator is connected.","system");render();}
function renderChannels(){
 $("overview-sensors").innerHTML=state.sensors.map((s,i)=>'<div class="mini-channel"><span class="channel-icon">'+s.icon+'</span><div class="channel-copy"><b>'+esc(s.name)+'</b><small>Virtual input · CH-'+(i+1)+'</small></div><span class="state-pill '+(!s.online?"fault":s.active?"on":"")+'">'+(!s.online?"FAULT":s.active?"TRIGGERED":"CLEAR")+'</span></div>').join("");
 $("overview-outputs").innerHTML=state.outputs.map((o,i)=>'<div class="mini-channel"><span class="channel-icon">'+o.icon+'</span><div class="channel-copy"><b>'+esc(o.name)+'</b><small>Indicator · OUT-'+(i+1)+'</small></div><span class="state-pill '+(o.active?"on":"")+'">'+(o.active?"ON · SIM":"OFF")+'</span></div>').join("");
 $("sensor-controls").innerHTML=state.sensors.map((s,i)=>'<div class="control-row"><span class="channel-icon">'+s.icon+'</span><div class="channel-copy"><input class="inline-name" data-kind="sensor" data-index="'+i+'" value="'+esc(s.name)+'" maxlength="32"><small>Input channel '+(i+1)+' · virtual GPIO</small></div><span class="state-pill '+(!s.online?"fault":s.active?"on":"")+'">'+(!s.online?"FAULT":s.active?"HIGH":"LOW")+'</span><label class="control-switch"><input type="checkbox" data-sensor="'+i+'" '+(s.active?"checked":"")+' '+(!s.online?"disabled":"")+'><i class="switch"></i></label></div>').join("");
 $("output-controls").innerHTML=state.outputs.map((o,i)=>'<div class="control-row"><span class="channel-icon">'+o.icon+'</span><div class="channel-copy"><input class="inline-name" data-kind="output" data-index="'+i+'" value="'+esc(o.name)+'" maxlength="32"><small>Output indicator '+(i+1)+' · simulation only</small></div><span class="state-pill '+(o.active?"on":"")+'">'+(o.active?"ACTIVE":"IDLE")+'</span><label class="control-switch"><input type="checkbox" data-output="'+i+'" '+(o.active?"checked":"")+'><i class="switch"></i></label></div>').join("");
 document.querySelectorAll("[data-sensor]").forEach(e=>e.addEventListener("change",()=>channel(+e.dataset.sensor,e.checked)));
 document.querySelectorAll("[data-output]").forEach(e=>e.addEventListener("change",()=>output(+e.dataset.output,e.checked)));
 document.querySelectorAll(".inline-name").forEach(e=>e.addEventListener("change",()=>{const a=e.dataset.kind==="sensor"?state.sensors:state.outputs,i=+e.dataset.index;a[i].name=clean(e.value,a[i].name);save();renderChannels();}));
}
function activity(){
 const a=state.events.slice(0,6);
 $("activity-stream").innerHTML=a.length?a.map(e=>'<div class="activity-item"><span class="activity-icon '+(e.severity==="alert"?"alert":e.severity==="warning"?"warn":"")+'">'+(e.severity==="alert"?"!":e.severity==="warning"?"⌖":"·")+'</span><div class="activity-copy"><b>'+esc(e.title)+'</b><small>'+esc(e.detail)+'</small></div><span class="activity-time">'+time(e.at)+'</span></div>').join(""):'<div class="empty-state">No activity recorded.</div>';
}
function events(){
 const f=$("event-filter")?.value||"all";
 const a=state.events.filter(e=>f==="all"||(f==="alert"?["alert","warning"].includes(e.severity):f==="system"?e.severity==="system"||e.type.includes("SCENARIO"):e.type.includes("SENSOR")||e.type.includes("MOTION")||e.type.includes("ENTRY")));
 $("history-count").textContent=a.length+" record"+(a.length===1?"":"s");
 $("full-event-list").innerHTML=a.length?a.map(e=>'<div class="history-row"><span class="history-time">'+time(e.at)+'</span><div class="history-message"><b>'+esc(e.title)+'</b><small>'+esc(e.detail)+' · '+esc(e.type)+'</small></div><span class="severity '+(e.severity==="alert"?"alert":e.severity==="warning"?"warning":"")+'">'+e.severity.toUpperCase()+'</span></div>').join(""):'<div class="empty-state">No events match this filter.</div>';
}
function metrics(){
 const h=health();
 $("health-value").innerHTML=h+'<span class="unit">%</span>';$("health-caption").textContent=h===100?"All virtual services nominal":h>=70?"One or more services degraded":"Multiple services degraded";
 $("sensor-value").innerHTML=online()+'<span class="unit">/ 3</span>';$("sensor-caption").textContent=online()===3?"All channels connected":(3-online())+" channel unavailable";
 $("event-value").textContent=state.events.length;$("event-caption").textContent=state.events.some(e=>e.severity==="alert")?"Includes virtual alert events":"No critical demo alert";
 $("analytics-events").textContent=state.events.length;$("analytics-alerts").textContent=state.events.filter(e=>["alert","warning"].includes(e.severity)).length;$("analytics-captures").textContent=state.shots.length;$("analytics-health").textContent=h+"%";
 $("engine-state").textContent=state.running?"RUNNING":"PAUSED";$("pause-btn").textContent=state.running?"Ⅱ":"▶";$("pause-btn").title=state.running?"Pause simulation":"Resume simulation";
}
function cameraState(){
 const off=!state.camera,m=active()>0;
 ["camera-status","camera-lab-status"].forEach(id=>{const e=$(id);e.classList.toggle("bad",off);e.classList.toggle("good",!off);e.innerHTML="<i></i> "+(off?"OFFLINE · SIMULATED":"ONLINE · SIMULATED");});
 ["camera-offline","camera-offline-large"].forEach(id=>$(id).classList.toggle("hidden",!off));
 ["detection-box","detection-box-large"].forEach(id=>$(id).classList.toggle("hidden",off||!m||!state.overlays));
 $("camera-detection").textContent=off?"Feed unavailable":m?"Virtual motion flagged":"No motion detected";
 $("camera-info-link").textContent=off?"OFFLINE":"ONLINE";$("camera-info-motion").textContent=m?"MOTION":"CLEAR";
 $("last-capture").textContent=state.lastShot?time(state.lastShot):"Not captured";
}
function shots(){
 $("snapshots").innerHTML=state.shots.length?state.shots.map(s=>'<div class="snapshot-card"><div class="snapshot-preview">◉ SIM FRAME #'+s.n+'</div><div class="snapshot-meta"><b>'+esc(s.zone)+'</b>'+time(s.at)+' · '+(s.motion?"Motion flag":"Clear scene")+'</div></div>').join(""):'<div class="empty-state">No simulated frames captured yet.</div>';
}
function render(){renderChannels();activity();events();cameraState();shots();metrics();if(view==="analytics")drawChart();drawCameras();save();}
function preset(name){
 const run=++scenarioRun;state.scenario=name;$("scenario-select").value=name;
 if(name==="normal"){state.sensors.forEach(s=>{s.active=false;s.online=true;});state.outputs.forEach(o=>o.active=false);state.camera=true;log("SCENARIO_NORMAL","Normal operation scenario started","All virtual subsystems healthy and idle.","system");render();toast("Normal operation scenario is running.");return;}
 if(name==="fault"){state.sensors.forEach(s=>{s.active=false;s.online=true;});state.sensors[1].online=false;state.outputs.forEach(o=>o.active=false);state.camera=true;log("SENSOR_FAULT","Entry contact sensor fault","Virtual input 2 stopped reporting. Health score reduced.","warning");render();return;}
 if(name==="camera"){state.sensors.forEach(s=>{s.active=false;s.online=true;});state.outputs.forEach(o=>o.active=false);state.camera=false;log("CAMERA_LINK_LOST","Camera link failure simulated","Generated camera panel displays an offline state.","warning");render();return;}
 state.sensors.forEach(s=>{s.active=false;s.online=true;});state.outputs.forEach(o=>o.active=false);state.camera=true;
 log("SCENARIO_STARTED",name==="night"?"Night activity scenario started":"Perimeter intrusion scenario started","Fictional sequence replayed by the browser simulator.","system");render();
 const steps=name==="night"?[[450,()=>{state.sensors[2].active=true;log("NIGHT_ACTIVITY","Window-zone activity detected","Simulated low-light activity in the protected zone.","warning");}],[1400,()=>{state.outputs[0].active=true;log("CAMERA_VERIFICATION","Low-light scene verification","Virtual camera scene flagged for operator review.","info");}],[2400,()=>{state.outputs[2].active=true;log("REMOTE_ALERT_QUEUED","Demo notification queued","Local-only notification indicator raised.","alert");}]]:[[400,()=>{state.sensors[0].active=true;log("MOTION_DETECTED","Zone motion detected","Virtual motion sensor changed state.","warning");}],[1150,()=>{state.sensors[1].active=true;log("ENTRY_CONTACT","Entry contact changed state","Second simulated input joined the sequence.","warning");}],[1950,()=>log("CAMERA_VERIFICATION","Camera verification completed","Generated scene marked for operator review; confidence is illustrative.","info")],[2650,()=>{state.outputs.forEach(o=>o.active=true);log("SIMULATED_INTRUSION","Intrusion scenario flagged","Multi-sensor correlation raised a virtual alert. No real alarm or actuator activated.","alert");}]];
 steps.forEach(pair=>setTimeout(()=>{if(run!==scenarioRun)return;pair[1]();render();},pair[0]));toast("Demo sequence is replaying.");
}
function drawScene(c,t){
 if(!c)return;const x=c.getContext("2d");if(!x)return;const w=c.width,h=c.height,m=active()>0,z=t/1000,g=x.createLinearGradient(0,0,0,h);
 g.addColorStop(0,"#0b1b2a");g.addColorStop(.62,"#132a32");g.addColorStop(1,"#07121c");x.fillStyle=g;x.fillRect(0,0,w,h);
 x.fillStyle="#142b34";x.fillRect(0,h*.48,w,h*.52);x.fillStyle="#1a3440";x.fillRect(w*.04,h*.22,w*.25,h*.35);x.fillRect(w*.72,h*.15,w*.23,h*.42);
 x.fillStyle="#263f48";x.fillRect(w*.36,h*.2,w*.24,h*.37);x.fillStyle="#0b1924";x.fillRect(w*.43,h*.24,w*.12,h*.33);x.strokeStyle="#3a5b60";
 for(let i=0;i<=12;i++){let q=i*w/12;x.beginPath();x.moveTo(q,h*.48);x.lineTo(w*.5+(q-w*.5)*1.9,h);x.stroke();}
 for(let i=0;i<6;i++){let q=h*(.54+i*.09);x.beginPath();x.moveTo(0,q);x.lineTo(w,q);x.stroke();}
 const px=w*(.56+Math.sin(z*.65)*.035),py=h*.57+Math.sin(z*1.15)*h*.008;x.fillStyle=m?"#d3b77a":"#9cb5a8";x.beginPath();x.arc(px,py-h*.105,h*.025,0,Math.PI*2);x.fill();
 x.strokeStyle=x.fillStyle;x.lineWidth=Math.max(4,w*.009);x.lineCap="round";x.beginPath();x.moveTo(px,py-h*.075);x.lineTo(px,py+h*.045);x.moveTo(px,py-h*.04);x.lineTo(px-w*.035,py+h*.005);x.moveTo(px,py-h*.04);x.lineTo(px+w*.034,py+h*.005);x.moveTo(px,py+h*.045);x.lineTo(px-w*.022,py+h*.12);x.moveTo(px,py+h*.045);x.lineTo(px+w*.025,py+h*.12);x.stroke();
 if(m&&state.overlays){x.strokeStyle="#f1bd63";x.lineWidth=2;x.setLineDash([7,5]);x.strokeRect(px-w*.065,py-h*.16,w*.13,h*.31);x.setLineDash([]);x.fillStyle="#f1bd63";x.font=Math.max(10,w*.018)+"px monospace";x.fillText("MOTION TRACK",px-w*.065,py-h*.18);}
 if(state.overlays){x.strokeStyle="#57d8cf";x.globalAlpha=.22;for(let q=0;q<w;q+=w/18){x.beginPath();x.moveTo(q,0);x.lineTo(q,h);x.stroke();}x.globalAlpha=1;x.fillStyle="#a6d8c8";x.font=Math.max(9,w*.012)+"px monospace";x.fillText("SIM CAM 01 | "+time(),15,h-15);x.fillText("GENERATED SCENE",w*.72,h-15);}
}
function drawCameras(){const t=Date.now();drawScene($("camera-canvas"),t);drawScene($("camera-canvas-large"),t);$("camera-time").textContent=time();$("camera-time-large").textContent=time();}
function drawChart(){
 const c=$("activity-chart");if(!c)return;const x=c.getContext("2d"),w=c.width,h=c.height,p=34;x.clearRect(0,0,w,h);x.fillStyle="#0b1523";x.fillRect(0,0,w,h);x.strokeStyle="#203149";
 for(let i=0;i<5;i++){const y=p+i*(h-p*1.6)/4;x.beginPath();x.moveTo(p,y);x.lineTo(w-10,y);x.stroke();}
 const d=state.samples.slice(-60),colors=["#5cdbec","#f3bd63","#a99bff"];
 d.forEach((a,j)=>a.forEach((v,k)=>{const xx=p+(w-p-18)*(j/Math.max(1,d.length-1)),yy=h-p-(v?(h-p*1.6)*.85:0);x.fillStyle=colors[k];x.beginPath();x.arc(xx,yy,3.5,0,Math.PI*2);x.fill();if(j){const prev=d[j-1][k],px=p+(w-p-18)*((j-1)/Math.max(1,d.length-1)),py=h-p-(prev?(h-p*1.6)*.85:0);x.strokeStyle=colors[k];x.beginPath();x.moveTo(px,py);x.lineTo(xx,yy);x.stroke();}}));
 const ct=[state.events.filter(e=>e.type.includes("MOTION")).length,state.events.filter(e=>e.type.includes("ENTRY")).length,state.events.filter(e=>e.type.includes("WINDOW")).length],names=["Motion / zone events","Entry contact events","Window zone events","Other system events"];
 $("event-breakdown").innerHTML=names.map((n,i)=>{const v=i===3?Math.max(0,state.events.length-ct.reduce((a,b)=>a+b,0)):ct[i],pct=state.events.length?Math.round(v/state.events.length*100):0;return '<div class="breakdown-row"><span>'+n+'</span><b>'+v+' · '+pct+'%</b><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div></div>';}).join("");
}
function capture(){
 if(!state.camera){toast("Camera is offline in this scenario.");return;}
 const s={n:state.shots.length+1,at:new Date().toISOString(),zone:state.zone,motion:active()>0};state.shots.unshift(s);state.shots=state.shots.slice(0,12);state.lastShot=s.at;
 log("CAMERA_SNAPSHOT","Simulated camera frame captured",state.zone+" · "+(s.motion?"Motion flag present":"No motion flag")+". Demo metadata only, not a photograph.","info");render();toast("Simulated frame metadata captured locally.");
}
function download(name,type,body){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);toast("Export prepared: "+name);}
function csv(){const r=[["timestamp","event_type","title","detail","severity"],...state.events.slice().reverse().map(e=>[e.at,e.type,e.title,e.detail,e.severity])];download("sentinel-simulated-events.csv","text/csv;charset=utf-8",r.map(a=>a.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"));}
function jsonExport(){download("sentinel-simulation-session.json","application/json",JSON.stringify({exported_at:new Date().toISOString(),mode:"SIMULATED_ONLY",device:state.device,zone:state.zone,sensors:state.sensors,outputs:state.outputs,camera_online:state.camera,events:state.events,samples:state.samples,snapshots:state.shots},null,2));}
function settingsInit(){$("device-name").value=state.device;$("zone-name").value=state.zone;$("simulation-speed").value=String(state.speed);$("auto-telemetry").checked=state.auto;$("setting-overlays").checked=state.overlays;}
function settingsSave(){state.device=clean($("device-name").value,"ESP32-MAIN-01");state.zone=clean($("zone-name").value,"Zone Alpha");state.speed=+$("simulation-speed").value;state.auto=$("auto-telemetry").checked;state.overlays=$("setting-overlays").checked;log("CONFIGURATION_SAVED","Virtual lab configuration saved",state.device+" · "+state.zone+" · "+state.speed+"× speed","system");render();toast("Configuration saved in this browser.");}
function resetBoard(){scenarioRun++;state.sensors.forEach(s=>{s.active=false;s.online=true;});state.outputs.forEach(o=>o.active=false);state.camera=true;state.scenario="normal";$("scenario-select").value="normal";log("BOARD_RESET","Virtual controller reset","All virtual channels returned to nominal state.","system");render();toast("Virtual board reset. No physical equipment touched.");}
function tick(){
 $("clock").textContent=time();const n=Math.max(0,Math.floor((Date.now()-state.started)/1000));
 $("uptime-value").textContent=n<3600?String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"):String(Math.floor(n/3600)).padStart(2,"0")+":"+String(Math.floor(n%3600/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
 drawCameras();if(!state.running)return;state.heartbeat+=state.speed;
 if(state.auto&&state.heartbeat>=10){state.heartbeat=0;state.samples.push(state.sensors.map(s=>s.online&&s.active?1:0));state.samples=state.samples.slice(-60);log("VIRTUAL_HEARTBEAT","Virtual device heartbeat",state.device+" · "+online()+"/3 channels online · browser generated","system");if(view==="analytics")drawChart();}else save();
}
function init(){
 document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
 document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.nav)));
 $("pause-btn").addEventListener("click",()=>{state.running=!state.running;if(!state.running)pausedElapsed=Date.now()-state.started;else if(pausedElapsed)state.started=Date.now()-pausedElapsed;log(state.running?"SIMULATION_RESUMED":"SIMULATION_PAUSED",state.running?"Simulation resumed":"Simulation paused","Browser simulation clock state changed.","system");render();});
 $("run-scenario").addEventListener("click",()=>preset($("scenario-select").value));
 document.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click",()=>{preset(b.dataset.preset);navigate("overview");}));
 $("reset-lab").addEventListener("click",resetBoard);$("capture-frame").addEventListener("click",capture);
 $("camera-toggle").addEventListener("click",()=>{state.camera=!state.camera;log(state.camera?"CAMERA_LINK_RESTORED":"CAMERA_LINK_LOST",state.camera?"Virtual camera link restored":"Virtual camera link unavailable","Camera emulator state changed.","warning");render();});
 $("overlay-toggle").addEventListener("click",()=>{state.overlays=!state.overlays;$("setting-overlays").checked=state.overlays;render();});
 $("event-filter").addEventListener("change",events);$("export-csv").addEventListener("click",csv);$("export-json").addEventListener("click",jsonExport);
 $("clear-events").addEventListener("click",()=>{state.events=[];render();toast("Event history cleared.");});
 $("save-settings").addEventListener("click",settingsSave);
 $("reset-all").addEventListener("click",()=>{if(!confirm("Reset virtual sensors, events, snapshots and preferences?"))return;scenarioRun++;state=fresh();localStorage.removeItem(KEY);settingsInit();log("SIMULATOR_RESET","Virtual lab reset to defaults","New browser simulation session started.","system");render();toast("All simulation data reset.");});
 $("ribbon-help").addEventListener("click",()=>toast("This digital twin generates sensor states, camera artwork, events and charts locally. It never connects to physical hardware."));
 settingsInit();
 if(!state.events.length){log("SIMULATOR_READY","Virtual security lab initialized","No board, sensor, camera, webcam or Cloudflare credentials required.","system");log("VIRTUAL_DEVICE_ONLINE","ESP32 controller emulator online",state.device+" · three virtual input channels initialized.","system");log("CAMERA_EMULATOR_READY","ESP32-CAM emulator ready","Generated scene renderer initialized. No real camera feed is present.","system");}
 state.samples.push(state.sensors.map(s=>s.active?1:0));render();tick();setInterval(tick,1000);
 if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
init();
})();