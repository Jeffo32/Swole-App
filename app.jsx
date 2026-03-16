const { useState, useEffect, useRef, useCallback } = React;

const MODES = [
  { id:"bulk",   label:"BULK",   sub:"GET SWOLE",  bg:"#030a03", cardBg:"rgba(74,222,128,0.04)",  border:"#0a1e0a", accent:"#4ade80", surplus:400,  pMult:2.2, cMult:4.5, fMult:1.0 },
  { id:"shred",  label:"SHRED",  sub:"GET RIPPED", bg:"#00080e", cardBg:"rgba(56,189,248,0.04)",  border:"#001828", accent:"#38bdf8", surplus:-500, pMult:2.6, cMult:2.0, fMult:0.8 },
  { id:"recomp", label:"RECOMP", sub:"GET LEAN",   bg:"#080600", cardBg:"rgba(250,204,21,0.04)",  border:"#1e1800", accent:"#facc15", surplus:0,    pMult:2.4, cMult:3.0, fMult:0.9 },
];
const ACTIVITY = [
  { id:"sed",     label:"🛋 Sedentary", mult:1.2   },
  { id:"light",   label:"🚶 Light",     mult:1.375 },
  { id:"mod",     label:"🏃 Moderate",  mult:1.55  },
  { id:"active",  label:"💪 Active",    mult:1.725 },
  { id:"athlete", label:"🔥 Athlete",   mult:1.9   },
];
const VERDICTS = {
  bulk:   ["Built for the platform. Now go lift.","Every calorie is a brick. Build the wall.","Mass is built in the kitchen. Fill that plate."],
  shred:  ["Ice cold discipline. Lock in.","Deficit is temporary. Results aren't.","Cut season activated. No excuses."],
  recomp: ["Slow grind. Trust the process.","The long game always wins.","Patience is a superpower."],
};
const DAYS = ["M","T","W","T","F","S","S"];
const MC = {
  bulk:   {p:"#4ade80",c:"#38bdf8",f:"#facc15"},
  shred:  {p:"#38bdf8",c:"#4ade80",f:"#facc15"},
  recomp: {p:"#facc15",c:"#4ade80",f:"#38bdf8"},
};

function useAnimatedValue(target) {
  const ref = useRef(target);
  const [, tick] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const run = () => {
      const d = target - ref.current;
      if (Math.abs(d) < 0.5) { ref.current = target; tick(n=>n+1); return; }
      ref.current += d * 0.18;
      tick(n=>n+1);
      raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return ref.current;
}

function AnimNum({ value, decimals=0 }) {
  const v = useAnimatedValue(value);
  return React.createElement('span', null, v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g,","));
}

function Slider({ label, value, min, max, step=1, onChange, unit="", color }) {
  const trackRef = useRef(null);
  const pct = ((value-min)/(max-min))*100;
  const calc = useCallback(e => {
    const r = trackRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(min, Math.min(max, Math.round((min + Math.max(0,Math.min(1,(cx-r.left)/r.width))*(max-min))/step)*step));
  }, [min,max,step]);
  const onDown = useCallback(e => {
    e.preventDefault(); onChange(calc(e));
    const mv = e => { e.preventDefault(); onChange(calc(e)); };
    const up = () => { window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); window.removeEventListener("touchmove",mv); window.removeEventListener("touchend",up); };
    window.addEventListener("mousemove",mv,{passive:false}); window.addEventListener("mouseup",up);
    window.addEventListener("touchmove",mv,{passive:false}); window.addEventListener("touchend",up);
  }, [calc,onChange]);
  return (
    <div style={{marginBottom:18,userSelect:"none"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:color+"77",textTransform:"uppercase",letterSpacing:2}}>{label}</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#fff",fontWeight:600}}>{value}{unit}</span>
      </div>
      <div ref={trackRef} onMouseDown={onDown} onTouchStart={onDown} style={{position:"relative",height:20,cursor:"pointer",display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",left:0,right:0,height:4,borderRadius:2,background:color+"18"}}/>
        <div style={{position:"absolute",left:0,width:`${pct}%`,height:4,borderRadius:2,background:`linear-gradient(to right,${color}44,${color})`}}/>
        <div style={{position:"absolute",left:`${pct}%`,transform:"translateX(-50%)",width:14,height:14,borderRadius:"50%",background:color,border:"2px solid #080808",boxShadow:`0 0 8px ${color}99`}}/>
      </div>
    </div>
  );
}

function MacroRing({ pPct, cPct, fPct, pColor, cColor, fColor, accent }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const TAU = Math.PI*2, STEPS = 64;
    const cx = W/2, cy = H/2+4;
    const rx = W*0.31, ry = rx*0.34;
    const ri = rx*0.54, riy = ry*0.54;
    const dp = 14;
    const segs = [{pct:pPct/100,color:pColor},{pct:cPct/100,color:cColor},{pct:fPct/100,color:fColor}];
    const po  = a => [cx+Math.cos(a)*rx,  cy+Math.sin(a)*ry];
    const pii = a => [cx+Math.cos(a)*ri,  cy+Math.sin(a)*riy];
    const h2  = n => Math.round(Math.max(0,Math.min(1,n))*255).toString(16).padStart(2,"0");

    const frame = ts => {
      ctx.clearRect(0,0,W,H);
      const rot = (ts*0.00020) % TAU;
      const angs = [];
      let a = rot - Math.PI/2;
      segs.forEach(s => { angs.push({s:a, e:a+s.pct*TAU, col:s.color}); a+=s.pct*TAU; });

      // shadow
      const sg = ctx.createRadialGradient(cx,cy+dp+2,ri*0.2,cx,cy+dp+2,rx*1.3);
      sg.addColorStop(0,"rgba(0,0,0,0.6)"); sg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.ellipse(cx,cy+dp+2,rx*1.2,ry*1.2,0,0,TAU); ctx.fillStyle=sg; ctx.fill();

      // back face
      angs.forEach(({s,e,col}) => {
        ctx.beginPath(); ctx.ellipse(cx,cy+dp,rx,ry,0,s,e); ctx.ellipse(cx,cy+dp,ri,riy,0,e,s,true); ctx.closePath();
        ctx.fillStyle=col+"22"; ctx.fill();
      });

      // outer wall
      angs.forEach(({s,e,col}) => {
        const sw=e-s;
        for(let i=0;i<STEPS;i++){
          const a1=s+sw*i/STEPS,a2=s+sw*(i+1)/STEPS,am=(a1+a2)/2;
          const sh=Math.max(0.1,(Math.sin(am-rot+Math.PI*0.5)+1)/2);
          const [x1,y1]=po(a1),[x2,y2]=po(a2);
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x2,y2+dp); ctx.lineTo(x1,y1+dp); ctx.closePath();
          ctx.fillStyle=col+h2(sh*0.92); ctx.fill();
        }
      });

      // inner wall
      angs.forEach(({s,e,col}) => {
        const sw=e-s;
        for(let i=0;i<STEPS;i++){
          const a1=s+sw*i/STEPS,a2=s+sw*(i+1)/STEPS,am=(a1+a2)/2;
          const sh=Math.max(0.04,(Math.sin(am-rot+Math.PI*0.5)+1)/2*0.32);
          const [x1,y1]=pii(a1),[x2,y2]=pii(a2);
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x2,y2+dp); ctx.lineTo(x1,y1+dp); ctx.closePath();
          ctx.fillStyle=col+h2(sh*0.7); ctx.fill();
        }
      });

      // top face
      angs.forEach(({s,e,col}) => {
        ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,s,e); ctx.ellipse(cx,cy,ri,riy,0,e,s,true); ctx.closePath();
        const g=ctx.createLinearGradient(cx-rx,cy-ry*1.1,cx+rx,cy+ry);
        g.addColorStop(0,col+"ff"); g.addColorStop(0.4,col+"ee"); g.addColorStop(0.75,col+"bb"); g.addColorStop(1,col+"77");
        ctx.fillStyle=g; ctx.fill();
        // highlight strip
        ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,s,e); ctx.ellipse(cx,cy,rx*0.87,ry*0.87,0,e,s,true); ctx.closePath();
        const hi=ctx.createLinearGradient(cx,cy-ry*1.2,cx,cy+ry*0.2);
        hi.addColorStop(0,"rgba(255,255,255,0.22)"); hi.addColorStop(1,"rgba(255,255,255,0)");
        ctx.fillStyle=hi; ctx.fill();
      });

      // glow dividers
      angs.forEach(({s,col}) => {
        const [xo,yo]=po(s),[xi,yi]=pii(s);
        ctx.beginPath(); ctx.moveTo(xo,yo); ctx.lineTo(xi,yi);
        ctx.strokeStyle=col+"55"; ctx.lineWidth=3.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xo,yo); ctx.lineTo(xi,yi);
        ctx.strokeStyle="#000000bb"; ctx.lineWidth=1.2; ctx.stroke();
      });

      // outer glow rim
      angs.forEach(({s,e,col}) => {
        ctx.beginPath(); ctx.ellipse(cx,cy,rx+2,ry+1.2,0,s,e); ctx.ellipse(cx,cy,rx,ry,0,e,s,true); ctx.closePath();
        ctx.fillStyle=col+"33"; ctx.fill();
      });

      // dark inner hole
      ctx.beginPath(); ctx.ellipse(cx,cy,ri,riy,0,0,TAU);
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fill();
      ctx.strokeStyle=accent+"44"; ctx.lineWidth=1; ctx.stroke();

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pPct,cPct,fPct,pColor,cColor,fColor,accent]);

  return React.createElement('canvas', {
    ref: canvasRef, width: 280, height: 150,
    style: {width:"100%",maxWidth:280,display:"block",margin:"0 auto"}
  });
}

function getTrainDays(mode, act) {
  const b = {sed:3,light:3,mod:4,active:5,athlete:6};
  return mode==="shred" ? Math.min(b[act]+1,6) : b[act];
}

function App() {
  const [mode,     setMode]     = useState("bulk");
  const [age,      setAge]      = useState(28);
  const [weight,   setWeight]   = useState(82);
  const [height,   setHeight]   = useState(178);
  const [sex,      setSex]      = useState("male");
  const [activity, setActivity] = useState("mod");
  const [goalWt,   setGoalWt]   = useState(90);

  const m   = MODES.find(x=>x.id===mode);
  const act = ACTIVITY.find(x=>x.id===activity);
  const mc  = MC[mode];

  const bmr    = sex==="male" ? 10*weight+6.25*height-5*age+5 : 10*weight+6.25*height-5*age-161;
  const tdee   = Math.round(bmr*act.mult);
  const target = tdee+m.surplus;
  const protein= Math.round(weight*m.pMult);
  const fat    = Math.round(weight*m.fMult);
  const carbs  = Math.max(0,Math.round((target-protein*4-fat*9)/4));
  const water  = Math.round((weight*0.033+(activity==="athlete"?.5:activity==="active"?.3:0))*10)/10;
  const trainD = getTrainDays(mode,activity);
  const restD  = 7-trainD;
  const wkRate = mode==="bulk"?.25:mode==="shred"?.5:.15;
  const wkGoal = Math.abs(goalWt-weight)>0 ? Math.round(Math.abs(goalWt-weight)/wkRate) : 0;
  const pat    = Array.from({length:7},(_,i)=>i<trainD);
  const verdict= VERDICTS[mode][Math.floor(Math.abs(target)/700)%VERDICTS[mode].length];

  const tot  = protein*4+carbs*4+fat*9;
  const pPct = Math.round((protein*4/tot)*100);
  const cPct = Math.round((carbs*4/tot)*100);
  const fPct = 100-pPct-cPct;

  const switchMode = id => { setMode(id); setGoalWt(id==="bulk"?weight+8:id==="shred"?Math.max(weight-8,40):weight); };
  const card = { background:m.cardBg, border:`1px solid ${m.border}`, borderRadius:14, padding:20 };

  return (
    <div style={{minHeight:"100vh",background:m.bg,padding:"24px 16px 48px",fontFamily:"'DM Sans',sans-serif",transition:"background 0.4s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box} ::-webkit-scrollbar{display:none} input,select,textarea{font-size:16px!important}
      `}</style>

      <div style={{maxWidth:880,margin:"0 auto"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent,letterSpacing:4,textTransform:"uppercase",marginBottom:6}}>Calorie & Training</div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(44px,9vw,80px)",color:"#fff",margin:0,lineHeight:0.9,letterSpacing:2}}>
            SWOLE OR <span style={{color:m.accent,transition:"color 0.3s"}}>{mode==="bulk"?"SWOLE":mode==="shred"?"SHREDDED":"RECOMPED"}</span>
          </h1>
          <div style={{width:36,height:1,background:m.accent,margin:"12px auto 0",transition:"background 0.3s"}}/>
        </div>

        {/* Mode tabs */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
          {MODES.map(mo=>(
            <button key={mo.id} onClick={()=>switchMode(mo.id)} style={{
              flex:1,maxWidth:140,padding:"8px 6px 7px",borderRadius:9,
              border:mode===mo.id?`1px solid ${mo.accent}`:"1px solid #1a1a1a",
              background:mode===mo.id?`${mo.accent}18`:"transparent",
              color:mode===mo.id?mo.accent:"#2a2a2a",
              fontFamily:"'Bebas Neue',sans-serif",fontSize:16,cursor:"pointer",transition:"all 0.2s",letterSpacing:2,lineHeight:1.1
            }}>
              {mo.label}
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:1,opacity:0.6,marginTop:1}}>{mo.sub}</div>
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14,marginBottom:14}}>

          {/* Controls */}
          <div style={{...card}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>Your Profile</div>

            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent+"77",textTransform:"uppercase",letterSpacing:2,marginBottom:7}}>Sex</div>
              <div style={{display:"flex",gap:7}}>
                {["male","female"].map(s=>(
                  <button key={s} onClick={()=>setSex(s)} style={{
                    flex:1,padding:"7px",borderRadius:7,
                    border:sex===s?`1px solid ${m.accent}`:"1px solid #1a1a1a",
                    background:sex===s?`${m.accent}15`:"transparent",
                    color:sex===s?m.accent:"#2a2a2a",
                    fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",transition:"all 0.2s",letterSpacing:1
                  }}>{s==="male"?"♂ Male":"♀ Female"}</button>
                ))}
              </div>
            </div>

            <Slider label="Age"    value={age}    min={16} max={70}  onChange={setAge}    unit=" yrs" color={m.accent}/>
            <Slider label="Weight" value={weight} min={40} max={180} onChange={setWeight} unit=" kg"  color={m.accent}/>
            <Slider label="Height" value={height} min={140} max={220} onChange={setHeight} unit=" cm" color={m.accent}/>

            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent+"77",textTransform:"uppercase",letterSpacing:2,marginBottom:7}}>Activity Level</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {ACTIVITY.map(a=>(
                  <button key={a.id} onClick={()=>setActivity(a.id)} style={{
                    padding:"7px 11px",borderRadius:7,
                    border:activity===a.id?`1px solid ${m.accent}`:"1px solid #1a1a1a",
                    background:activity===a.id?`${m.accent}12`:"transparent",
                    color:activity===a.id?m.accent:"#2a2a2a",
                    fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",transition:"all 0.2s",textAlign:"left",letterSpacing:0.5
                  }}>{a.label}</button>
                ))}
              </div>
            </div>

            <div style={{padding:"11px 14px",background:`${m.accent}0a`,border:`1px solid ${m.accent}25`,borderRadius:9}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent+"77",letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Maintenance (TDEE)</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,color:m.accent}}>
                {tdee.toLocaleString()} <span style={{fontSize:11,color:m.accent+"55"}}>kcal/day</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Calorie hero */}
            <div style={{background:`linear-gradient(135deg,${m.accent}12 0%,${m.bg} 100%)`,border:`1px solid ${m.accent}35`,borderRadius:14,padding:22,textAlign:"center",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:100,height:100,borderRadius:"50%",background:`radial-gradient(circle,${m.accent}18 0%,transparent 70%)`}}/>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>Daily Calories</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(52px,11vw,84px)",color:"#fff",lineHeight:1}}>
                <AnimNum value={target}/>
              </div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:m.accent,letterSpacing:3,marginBottom:8}}>KCAL / DAY</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:m.accent+"55",marginBottom:12}}>
                {m.surplus>0?`+${m.surplus}`:m.surplus===0?"±0":m.surplus} vs maintenance
              </div>
              <div style={{padding:"9px 13px",borderRadius:8,border:`1px solid ${m.accent}25`,background:`${m.accent}0a`}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:m.accent,letterSpacing:0.5,lineHeight:1.5}}>{verdict}</div>
              </div>
            </div>

            {/* Macro ring */}
            <div style={{...card}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>Macros</div>
              <MacroRing pPct={pPct} cPct={cPct} fPct={fPct} pColor={mc.p} cColor={mc.c} fColor={mc.f} accent={m.accent}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
                {[{l:"Protein",v:protein,p:pPct,c:mc.p},{l:"Carbs",v:carbs,p:cPct,c:mc.c},{l:"Fat",v:fat,p:fPct,c:mc.f}].map(x=>(
                  <div key={x.l} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${m.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:"#fff",lineHeight:1}}><AnimNum value={x.v}/></div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:x.c,letterSpacing:1,textTransform:"uppercase",marginTop:2}}>{x.l}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:x.c+"55",marginTop:1}}>{x.p}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:18}}>

          <div style={{...card}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:m.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Training Schedule</div>
            <div style={{display:"flex",gap:4,marginBottom:9}}>
              {DAYS.map((d,i)=>(
                <div key={i} style={{flex:1,aspectRatio:"1",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                  background:pat[i]?`${m.accent}20`:"rgba(255,255,255,0.02)",
                  border:pat[i]?`1px solid ${m.accent}50`:`1px solid ${m.border}`,
                  fontFamily:"'DM Mono',monospace",fontSize:9,color:pat[i]?m.accent:"#2a2a2a"
                }}>{d}</div>
              ))}
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:m.accent+"55"}}>
              <span style={{color:m.accent}}>{trainD} training</span> · {restD} rest
            </div>
          </div>

          <div style={{...card}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#38bdf8",letterSpacing:3,textTransform:"uppercase",marginBottom:9}}>Daily Water</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:50,color:"#fff",lineHeight:1,marginBottom:4}}>
              <AnimNum value={water} decimals={1}/><span style={{fontSize:18,color:"#38bdf8"}}> L</span>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#38bdf877"}}>≈ {Math.round(water*1000/250)} glasses/day</div>
          </div>

          <div style={{...card}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#facc15",letterSpacing:3,textTransform:"uppercase",marginBottom:9}}>Time to Goal</div>
            <Slider label="Target weight" value={goalWt} min={40} max={180} onChange={setGoalWt} unit=" kg" color="#facc15"/>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:46,color:"#fff",lineHeight:1,marginBottom:4}}>
              <AnimNum value={wkGoal}/><span style={{fontSize:16,color:"#facc15"}}> wks</span>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#facc1555"}}>
              {Math.abs(goalWt-weight)>0?`${mode==="bulk"?"+":"-"}${Math.abs(goalWt-weight)}kg at ${wkRate}kg/wk`:"Already at goal"}
            </div>
          </div>
        </div>

        <div style={{textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#1a1a1a",letterSpacing:1}}>
          Mifflin-St Jeor BMR · Not medical advice
        </div>
      </div>
    </div>
  );
}
