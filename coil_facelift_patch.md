# COIL · Star Rush — visual facelift patch

Drop-in replacements for your existing single-file build. Each block says exactly which function to swap. **Physics is untouched** — `pl.r` (collision = 8) stays the same; the player just *renders* ~30% bigger. The headline goal was "more contrast / crisper colors," so the core moves are: trim the muddy additive glow washes, add white-hot cores + a crisp rim + a consistent gloss highlight, give the void a readable churning crest, push danger-red to the screen edges instead of the center, and add a pulsing reticle on the orb you're about to land on.

Note: your `suggestion_graphics.md` kept saying "lava" but the live game is a cosmic *void*, so I treated the threat-edge ideas as a glowing void crest rather than literally adding lava.

---

## 1. Trim the additive washes (two one-line edits)

In `Cosmos.drawNebula`, the per-blob alpha:

```js
// was: ctx.globalAlpha=0.10;
ctx.globalAlpha=0.058;
```

In `drawSpotlights`, the beam alpha:

```js
// was: ctx.globalAlpha=0.06;
ctx.globalAlpha=0.035;
```

These two additive layers were the main thing flattening contrast. Pulling them down lets the saturated orbs/player read crisply.

---

## 2. `drawBG` — adds a vertical contrast scrim (replace whole function)

Darkens the central playfield band so glowing elements pop, while leaving top/bottom (bg detail + void) alone.

```js
function drawBG(){
  const h=G.height||0;
  let z0=ZONES[0],z1=ZONES[0],tt=0;
  for(let i=0;i<ZONES.length;i++){ if(h>=ZONES[i].from){ z0=ZONES[i]; z1=ZONES[Math.min(i+1,ZONES.length-1)];
    const span=(z1.from-z0.from)||1; tt=clamp((h-z0.from)/span,0,1); } }
  const mix=(a,b)=>{ const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);
    const r=Math.round(lerp((pa>>16)&255,(pb>>16)&255,tt)), g=Math.round(lerp((pa>>8)&255,(pb>>8)&255,tt)), bl=Math.round(lerp(pa&255,pb&255,tt));
    return `rgb(${r},${g},${bl})`; };
  const wld=world();
  const bg0=wld.bg||z0.bg, bg1=wld.alt||z1.bg;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,mix(bg0[0],bg1[0])); g.addColorStop(.5,mix(bg0[1],bg1[1])); g.addColorStop(1,mix(bg0[2],bg1[2]));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const cam=G.cameraY||0;
  Cosmos.drawNebula(cam);
  drawSpotlights(scene==='play'?G.t:(homeT||0));
  // far star layer (parallax)
  ctx.fillStyle='#aab8ff';
  for(const st of STARS){ const yy=(((st.y*H + cam*st.d)%H)+H)%H; ctx.globalAlpha=st.a; ctx.fillRect(st.x*W,yy,st.s,st.s); }
  // near twinkle layer
  const tt2=(scene==='play'?G.t:(homeT||0));
  ctx.save(); ctx.fillStyle='#dfe7ff'; ctx.shadowColor='#bcd2ff'; ctx.shadowBlur=glowFX(6);
  for(const st of STARS2){ const yy=(((st.y*H + cam*st.d)%H)+H)%H;
    const tw=0.55+0.45*Math.sin(tt2*st.ts+st.tw); ctx.globalAlpha=st.a*tw;
    ctx.beginPath(); ctx.arc(st.x*W,yy,st.s*(0.6+tw*0.5),0,TAU); ctx.fill(); }
  ctx.restore();
  Cosmos.drawShooters();
  ctx.globalAlpha=1;
  // CONTRAST SCRIM — darken the central band so gameplay glow reads crisp
  const sg=ctx.createLinearGradient(0,0,0,H);
  sg.addColorStop(0,'rgba(2,1,8,0)'); sg.addColorStop(0.5,'rgba(2,1,8,0.22)'); sg.addColorStop(1,'rgba(2,1,8,0)');
  ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
}
```

---

## 3. Next-target reticle (new function + 3 tiny hooks)

### 3a. Add this new function right after `perfectHi()`:

```js
// Simulates the launch arc and returns the first node it would reach, so the
// renderer can highlight "where you're about to go". Read-only; physics-pure.
function predictTargetNode(){
  const pl=G.player; if(!pl.latched) return null;
  const tx=-Math.sin(pl.ang)*pl.dir, ty=Math.cos(pl.ang)*pl.dir;
  let x=pl.wx,y=pl.wy,vx=tx*LAUNCH,vy=ty*LAUNCH; const dt=1/60, pad=curCatchPad();
  for(let i=0;i<80;i++){
    vy-=G_FALL*dt; x+=vx*dt; y+=vy*dt;
    if(x<pl.r){x=pl.r;vx=Math.abs(vx)*WALL_BOUNCE;} if(x>W-pl.r){x=W-pl.r;vx=-Math.abs(vx)*WALL_BOUNCE;}
    for(const n of G.nodes){
      if(n.type==='spike'||n.type==='spent') continue;
      if(n===pl.node || n===pl.lastReleased) continue;
      if(Math.hypot(x-n.wx,y-n.wy)<n.r+pl.r+pad) return n;
    }
    if(y<G.voidY) break;
  }
  return null;
}
```

### 3b. In `resetRun`, add one line near the other `G.` resets:

```js
G.targetNode=null;
```

### 3c. In `update()`, inside the `if(pl.latched){ … }` branch, after `pl.face=lerp(...)`, add:

```js
G.targetNode=predictTargetNode();
```

…and at the very top of the matching `else {` (the airborne branch), add:

```js
G.targetNode=null;
```

The reticle itself is drawn in `drawNode` below.

---

## 4. `drawNode` — halo trim + crisp rim + target reticle (replace whole function)

```js
function drawNode(n){
  const x=n.wx, y=sY(n.wy), sk=skin();
  if(n.type==='spent') return;
  if(y<-60||y>H+60) return;
  if(n.type==='spike'){
    ctx.save(); ctx.translate(x,y); ctx.rotate(G.t*1.5);
    ctx.fillStyle='#ff3b5c'; ctx.shadowColor='#ff3b5c'; ctx.shadowBlur=glowFX(14);
    ctx.beginPath(); for(let i=0;i<8;i++){const a=i/8*TAU,rr2=i%2?n.r:n.r*0.5; ctx.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);} ctx.closePath(); ctx.fill();
    ctx.rotate(-G.t*3); ctx.fillStyle='#ffd0d8'; ctx.shadowBlur=glowFX(8);
    ctx.beginPath(); ctx.arc(0,0,n.r*0.28,0,TAU); ctx.fill();
    ctx.restore(); return;
  }
  const bonus=n.type==='bonus';
  const active = G.player && G.player.latched && G.player.node===n;
  const target = G.targetNode===n && !active;
  const meta=nodeMeta(n,sk);
  const col = meta.c;
  const pulse = Number.isFinite(n.pulse)?n.pulse:0;
  const baseR = Number.isFinite(n.r)?Math.max(1,n.r):18;
  const pr = baseR*(1+Math.sin(G.t*2+pulse)*0.06) * (active?1.06:1);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(pr)||pr<=0) return;
  // softer, tighter halo (was pr*2.4 @ .14) — trimmed so the node core reads crisp
  if(FX!=='low'){ ctx.save(); ctx.globalCompositeOperation='lighter';
    const hg=ctx.createRadialGradient(x,y,pr*0.6,x,y,pr*2.0);
    hg.addColorStop(0, bonus?'rgba(255,210,74,0.26)': active?'rgba(255,255,255,0.20)':hexA(col,0.10));
    hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(x,y,pr*2.0,0,TAU); ctx.fill(); ctx.restore(); }
  if(bonus){ ctx.save(); ctx.translate(x,y); ctx.rotate(G.t*2);
    ctx.strokeStyle='#fff3b0'; ctx.globalAlpha=.7; ctx.lineWidth=2; ctx.setLineDash([4,8]);
    ctx.beginPath(); ctx.arc(0,0,n.r+9,0,TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#fff7d6'; ctx.shadowColor='#ffd24a'; ctx.shadowBlur=glowFX(8); ctx.globalAlpha=1;
    for(let k=0;k<3;k++){ const a=k/3*TAU; ctx.beginPath(); ctx.arc(Math.cos(a)*(n.r+9),Math.sin(a)*(n.r+9),2.2,0,TAU); ctx.fill(); }
    ctx.restore(); }
  ctx.save(); ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=glowFX(bonus?22:active?20:16);
  ctx.beginPath(); ctx.arc(x,y,pr,0,TAU); ctx.fill();
  // crisp definition rim — the single biggest contrast win for the orbs
  ctx.shadowBlur=0; ctx.lineWidth=1.5; ctx.globalAlpha=active?0.8:0.5; ctx.strokeStyle='#ffffff';
  ctx.beginPath(); ctx.arc(x,y,pr-0.75,0,TAU); ctx.stroke(); ctx.globalAlpha=1;
  if(!bonus && FX!=='low'){ ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=1.5; ctx.globalAlpha=.5;
    ctx.beginPath(); ctx.arc(x,y,pr*0.55,G.t*2+pulse, G.t*2+pulse+Math.PI*1.3); ctx.stroke(); ctx.globalAlpha=1; }
  if(meta.glyph){ ctx.save(); ctx.font="800 13px 'Sora'"; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#07101d'; ctx.shadowBlur=0; ctx.fillText(meta.glyph,x,y+0.5); ctx.restore(); }
  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x-pr*0.3,y-pr*0.3,pr*0.28,0,TAU); ctx.fill();
  ctx.restore();
  // NEXT-TARGET RETICLE — pulsing ring + 4 rotating ticks on the orb your launch is aimed at
  if(target){
    ctx.save(); ctx.translate(x,y);
    const pp=0.6+Math.sin(G.t*7)*0.4, rr4=pr+7+pp*3;
    ctx.strokeStyle='#bffff0'; ctx.shadowColor='#2ff3e0'; ctx.shadowBlur=glowFX(10);
    ctx.globalAlpha=0.5+pp*0.4; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,rr4,0,TAU); ctx.stroke();
    ctx.globalAlpha=0.85;
    for(let k=0;k<4;k++){ const a=k/4*TAU + G.t*0.6;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*(rr4+2),Math.sin(a)*(rr4+2)); ctx.lineTo(Math.cos(a)*(rr4+6),Math.sin(a)*(rr4+6)); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha=1;
  }
}
```

---

## 5. `drawPlayer` — bigger lovable mascot, white-hot core, gloss, expressions (replace whole function)

Renders at `PR = pl.r*1.3` for all visuals (hitbox stays `pl.r`). Adds a white-hot inner core, a consistent top-left gloss, and face expressions: **excited** during Frenzy, **scared** near the void, **happy** in the perfect window, **focused** otherwise. Every trail style, the latched rings, shield, flames, zap and orbiting sparkles are preserved.

```js
function drawPlayer(){
  const pl=G.player, x=pl.wx, y=sY(pl.wy), sk=skin();
  const PR = pl.r * 1.3;                 // RENDER scale — hitbox (pl.r) is unchanged
  const pHi=perfectHi();
  const inPerfect = pl.latched && pl.charge>=PERFECT_LO && pl.charge<=pHi;
  const frenzy = G.frenzyT>0;
  const closeness=clamp(1-(pl.wy-G.voidY)/240,0,1);
  const scared = closeness>0.4 && !G.dead;

  // living aura
  if(FX!=='low' && !G.dead){
    const m=G.mult||1; const pulse=0.6+Math.sin(G.t*6)*0.4;
    const auraR=PR*(2.0+m*0.12)+Math.sin(G.t*3)*3;
    const ac0 = inPerfect ? '#ffffff' : (frenzy?'#ffd24a':sk.c);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const ag=ctx.createRadialGradient(x,y,PR*0.4,x,y,auraR);
    ag.addColorStop(0, hexA(ac0, 0.30+Math.min(m,9)*0.02)); ag.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=0.6*pulse; ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(x,y,auraR,0,TAU); ctx.fill();
    ctx.restore(); ctx.globalAlpha=1;
  }

  // trail (per-skin style) — widths scaled to PR
  if(!pl.latched && pl.trail.length>1){
    ctx.save(); ctx.lineCap='round';
    const tr=trail(); const style = tr.style || sk.trail || 'line'; const trailCol=tr.c||sk.c, trailTint=tr.t||sk.t;
    if(style==='line' || style==='comet'){
      ctx.strokeStyle=trailCol; if(style==='comet'){ ctx.shadowColor=trailCol; ctx.shadowBlur=glowFX(10); }
      for(let i=1;i<pl.trail.length;i++){ const a=i/pl.trail.length;
        ctx.globalAlpha=a*(style==='comet'?0.7:0.5); ctx.lineWidth=a*PR*(style==='comet'?1.7:1.3);
        ctx.beginPath(); ctx.moveTo(pl.trail[i-1].x,sY(pl.trail[i-1].y)); ctx.lineTo(pl.trail[i].x,sY(pl.trail[i].y)); ctx.stroke(); }
    } else if(style==='dots'){
      ctx.fillStyle=trailCol; ctx.shadowColor=trailCol; ctx.shadowBlur=glowFX(6);
      for(let i=0;i<pl.trail.length;i++){ const a=(i+1)/pl.trail.length;
        ctx.globalAlpha=a*0.7; const sz=a*PR*0.5+1;
        ctx.beginPath(); ctx.arc(pl.trail[i].x, sY(pl.trail[i].y), sz, 0, TAU); ctx.fill(); }
    } else if(style==='sparkle'){
      ctx.fillStyle=trailTint; ctx.shadowColor=trailTint; ctx.shadowBlur=glowFX(8);
      for(let i=0;i<pl.trail.length;i++){ const a=(i+1)/pl.trail.length;
        ctx.globalAlpha=a*0.8; const sz=a*5+1; const rot=G.t*4+i;
        const tx=pl.trail[i].x, ty=sY(pl.trail[i].y);
        ctx.save(); ctx.translate(tx,ty); ctx.rotate(rot);
        ctx.beginPath();
        for(let k=0;k<4;k++){ const ang=k/4*TAU; ctx.lineTo(Math.cos(ang)*sz,Math.sin(ang)*sz);
          ctx.lineTo(Math.cos(ang+Math.PI/4)*sz*0.35,Math.sin(ang+Math.PI/4)*sz*0.35); }
        ctx.closePath(); ctx.fill(); ctx.restore(); }
    } else if(style==='bubbles'){
      ctx.fillStyle=trailCol; ctx.shadowColor=trailCol; ctx.shadowBlur=glowFX(7);
      for(let i=0;i<pl.trail.length;i++){ const a=(i+1)/pl.trail.length; ctx.globalAlpha=a*0.55; ctx.beginPath(); ctx.arc(pl.trail[i].x, sY(pl.trail[i].y), 2+a*4, 0, TAU); ctx.strokeStyle=trailTint; ctx.lineWidth=1.2; ctx.stroke(); }
    } else if(style==='hearts' || style==='notes'){
      ctx.fillStyle=trailCol; ctx.shadowColor=trailCol; ctx.shadowBlur=glowFX(8); ctx.font="800 12px 'Sora'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      for(let i=0;i<pl.trail.length;i+=2){ const a=(i+1)/pl.trail.length; ctx.globalAlpha=a*0.72; ctx.fillText(style==='hearts'?'\u2665':'\u266a', pl.trail[i].x, sY(pl.trail[i].y)); }
    } else if(style==='rainbow'){
      for(let i=1;i<pl.trail.length;i++){ const a=i/pl.trail.length;
        ctx.strokeStyle=`hsl(${(G.t*120+i*18)%360},90%,65%)`;
        ctx.globalAlpha=a*0.6; ctx.lineWidth=a*PR*1.4;
        ctx.beginPath(); ctx.moveTo(pl.trail[i-1].x,sY(pl.trail[i-1].y)); ctx.lineTo(pl.trail[i].x,sY(pl.trail[i].y)); ctx.stroke(); }
    }
    ctx.restore(); ctx.globalAlpha=1;
  }

  // latched: tether + charge ring + perfect telegraph
  if(pl.latched){
    const n=pl.node, ch=pl.charge, pLo=PERFECT_LO, a0=-Math.PI/2, RR=15;
    const nx=n.wx, ny=sY(n.wy);
    ctx.save(); const beamCol = inPerfect?'#ffffff':sk.c;
    ctx.strokeStyle=beamCol; ctx.globalAlpha=.5; ctx.lineWidth=inPerfect?3:2;
    ctx.shadowColor=beamCol; ctx.shadowBlur=glowFX(inPerfect?12:6);
    ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(x,y); ctx.stroke();
    if(FX!=='low'){ ctx.shadowBlur=0; ctx.fillStyle=beamCol; ctx.globalAlpha=.85;
      for(let i=0;i<3;i++){ const tp=((G.t*1.5+i/3)%1); const bx=lerp(nx,x,tp), by=lerp(ny,y,tp);
        ctx.beginPath(); ctx.arc(bx,by,inPerfect?2.4:1.8,0,TAU); ctx.fill(); } }
    ctx.restore(); ctx.globalAlpha=1;
    if(inPerfect && FX!=='low'){ const pr2=PR+10+Math.sin(G.t*16)*3;
      ctx.save(); ctx.strokeStyle='#ffffff'; ctx.globalAlpha=0.5+Math.sin(G.t*16)*0.3; ctx.lineWidth=2;
      ctx.shadowColor='#fff'; ctx.shadowBlur=glowFX(14);
      ctx.beginPath(); ctx.arc(x,y,pr2,0,TAU); ctx.stroke(); ctx.restore(); ctx.globalAlpha=1; }
    ctx.save(); ctx.translate(x,y);
    ctx.strokeStyle='rgba(255,255,255,.13)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,RR,0,TAU); ctx.stroke();
    ctx.strokeStyle = inPerfect ? 'rgba(255,255,255,.95)' : 'rgba(159,255,242,.55)';
    ctx.lineWidth = inPerfect ? 5 : 4; if(inPerfect){ctx.shadowColor='#fff';ctx.shadowBlur=glowFX(12);}
    ctx.beginPath(); ctx.arc(0,0,RR, a0+pLo*TAU, a0+pHi*TAU); ctx.stroke(); ctx.shadowBlur=0;
    let cc = inPerfect ? '#ffffff' : sk.t;
    ctx.strokeStyle=cc; ctx.shadowColor=cc; ctx.shadowBlur=glowFX(inPerfect?16:6); ctx.lineWidth=3.5;
    ctx.beginPath(); ctx.arc(0,0,RR, a0, a0+ch*TAU); ctx.stroke();
    const ma=a0+ch*TAU; ctx.fillStyle=cc; ctx.shadowBlur=glowFX(8);
    ctx.beginPath(); ctx.arc(Math.cos(ma)*RR, Math.sin(ma)*RR, inPerfect?4:3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  if(G.shield){ ctx.save(); ctx.strokeStyle='#9ffff2'; ctx.globalAlpha=.6+Math.sin(G.t*6)*.2; ctx.lineWidth=2.5;
    ctx.shadowColor='#9ffff2'; ctx.shadowBlur=glowFX(12); ctx.beginPath(); ctx.arc(x,y,PR+8,0,TAU); ctx.stroke(); ctx.restore(); }

  if(G.mult>=4 && !G.dead){ const flames=Math.min(8,G.mult); const fc = G.mult>=8?'#ff4d8d':G.mult>=6?'#ffb020':'#ffd24a';
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<flames;i++){ const a=G.t*5 + i/flames*TAU; const rr3=PR+10+Math.sin(G.t*8+i)*3;
      ctx.globalAlpha=0.5; ctx.fillStyle=fc; ctx.shadowColor=fc; ctx.shadowBlur=glowFX(8);
      ctx.beginPath(); ctx.arc(x+Math.cos(a)*rr3, y+Math.sin(a)*rr3, 3, 0, TAU); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha=1; }

  if(G.invuln>0 && Math.sin(G.t*40)<0){ /* blink */ }
  else {
    if(pl.zap>0){ ctx.save(); ctx.translate(x,y); ctx.strokeStyle='#fff'; ctx.globalAlpha=clamp(pl.zap/0.25,0,1); ctx.lineWidth=2; ctx.shadowColor='#fff'; ctx.shadowBlur=glowFX(12);
      const z=lerp(PR+4,PR+16,1-pl.zap/0.25); for(let i=0;i<6;i++){const a=i/6*TAU+G.t; ctx.beginPath(); ctx.moveTo(Math.cos(a)*(PR+2),Math.sin(a)*(PR+2)); ctx.lineTo(Math.cos(a)*z,Math.sin(a)*z); ctx.stroke();} ctx.restore(); }

    const sp=pl.latched?0:Math.hypot(pl.vx,pl.vy);
    const stretch=clamp(sp/1400,0,.5);
    const bodyCol = frenzy ? '#ffe9a8' : sk.c;           // body brightens during Frenzy
    const glow=inPerfect?28:frenzy?24:18;

    // orbiting sparkle points
    if(FX!=='low'){
      ctx.save(); ctx.translate(x,y);
      const sparkRot=G.t*1.4*(pl.latched?1:0.4);
      const sparkR=PR+5+Math.sin(G.t*4)*1.2;
      ctx.fillStyle=sk.t; ctx.shadowColor=sk.t; ctx.shadowBlur=glowFX(6);
      for(let k=0;k<4;k++){ const a=sparkRot+k/4*TAU;
        const tw=0.6+0.4*Math.sin(G.t*6+k*1.5); ctx.globalAlpha=tw;
        ctx.beginPath(); ctx.arc(Math.cos(a)*sparkR,Math.sin(a)*sparkR,1.6+tw*0.6,0,TAU); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha=1;
    }

    // body (rotated for squash-stretch)
    ctx.save(); ctx.translate(x,y); ctx.rotate(pl.face);
    ctx.fillStyle=bodyCol; ctx.shadowColor=bodyCol; ctx.shadowBlur=glowFX(glow);
    ctx.beginPath(); ctx.ellipse(0,0,PR*(1+stretch),PR*(1-stretch*0.6),0,0,TAU); ctx.fill();
    ctx.shadowBlur=0;
    drawCreatureFeatures(sk, PR, stretch, inPerfect, scared);
    ctx.restore();

    // white-hot inner core — crispness
    ctx.save(); ctx.translate(x,y); ctx.globalCompositeOperation='lighter';
    const cg=ctx.createRadialGradient(0,0,0,0,0,PR*0.9);
    cg.addColorStop(0,'rgba(255,255,255,0.9)'); cg.addColorStop(0.5,hexA(sk.t,0.35)); cg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,0,PR*0.9,0,TAU); ctx.fill();
    ctx.restore();

    // glossy top-left highlight (consistent light source, screen space)
    ctx.save(); ctx.translate(x,y); ctx.globalAlpha=0.85; ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.ellipse(-PR*0.34,-PR*0.36,PR*0.40,PR*0.26,-0.5,0,TAU); ctx.fill();
    ctx.restore(); ctx.globalAlpha=1;

    // FACE — eyes + expression, oriented to travel direction (+x = forward)
    ctx.save(); ctx.translate(x,y); ctx.rotate(pl.face);
    const eFwd=PR*0.16, eSide=PR*0.42;
    const eyeR=PR*((scared||frenzy)?0.34:0.30);
    const pupil=eyeR*(scared?0.35:frenzy?0.62:0.55);
    for(const o of [-1,1]){
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(eFwd, o*eSide, eyeR, 0, TAU); ctx.fill();
      ctx.fillStyle='#0a0720'; ctx.beginPath(); ctx.arc(eFwd+eyeR*0.45, o*eSide, pupil, 0, TAU); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(eFwd+eyeR*0.2, o*eSide-eyeR*0.3, pupil*0.5, 0, TAU); ctx.fill();
    }
    // mouth: priority frenzy > scared > happy > focused
    ctx.strokeStyle='#0a0720'; ctx.lineWidth=Math.max(1.6,PR*0.1); ctx.lineCap='round';
    const mFwd=PR*0.5, mW=PR*0.28;
    if(frenzy){ ctx.fillStyle='#3a0d22'; ctx.beginPath(); ctx.ellipse(mFwd,0,PR*0.22,PR*0.30,0,0,TAU); ctx.fill(); }
    else if(scared){ ctx.beginPath(); ctx.moveTo(mFwd,-mW*0.7); ctx.quadraticCurveTo(mFwd-PR*0.18,0,mFwd,mW*0.7); ctx.stroke(); }
    else if(inPerfect){ ctx.beginPath(); ctx.moveTo(mFwd-PR*0.05,-mW); ctx.quadraticCurveTo(mFwd+PR*0.28,0,mFwd-PR*0.05,mW); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(mFwd,-mW*0.4); ctx.lineTo(mFwd,mW*0.4); ctx.stroke(); }
    ctx.restore();
  }
}
```

---

## 6. `drawVoid` — churning, readable threat crest (replace whole function)

```js
function drawVoid(){
  const vy=sY(G.voidY), vc=(world().void||'#ff3b5c'), t=G.t||0;
  if(vy>=H+40) return;
  // deeper body fill
  const g=ctx.createLinearGradient(0,vy-50,0,H);
  g.addColorStop(0,hexA(vc,0)); g.addColorStop(.35,hexA(vc,.30)); g.addColorStop(1,hexA(vc,.95));
  ctx.fillStyle=g; ctx.fillRect(0,vy-50,W,H-(vy-50)+50);
  const seg=10;
  const wave=i=>Math.sin(t*3 + i*0.9)*5 + Math.sin(t*5.3 + i*2.1)*3;
  // churning filled crest above the line — a "devouring" edge
  ctx.save(); ctx.beginPath(); ctx.moveTo(0,H);
  for(let i=0;i<=seg;i++) ctx.lineTo(i/seg*W, vy+wave(i));
  ctx.lineTo(W,H); ctx.closePath(); ctx.fillStyle=hexA(vc,.5); ctx.fill(); ctx.restore();
  // crisp bright white crest line (the readable threat boundary)
  ctx.save(); ctx.lineWidth=2.5; ctx.strokeStyle='#fff'; ctx.shadowColor=vc; ctx.shadowBlur=glowFX(16);
  ctx.beginPath(); for(let i=0;i<=seg;i++){ const px=i/seg*W; i===0?ctx.moveTo(px,vy+wave(i)):ctx.lineTo(px,vy+wave(i)); } ctx.stroke();
  // tinted underline for thickness
  ctx.lineWidth=1.2; ctx.globalAlpha=.8; ctx.strokeStyle=vc; ctx.beginPath();
  for(let i=0;i<=seg;i++){ const px=i/seg*W; i===0?ctx.moveTo(px,vy+wave(i)+3):ctx.lineTo(px,vy+wave(i)+3); } ctx.stroke();
  ctx.restore(); ctx.globalAlpha=1;
  // rising glint/ember specks near the crest (procedural, FX-gated)
  if(FX!=='low'){ ctx.save(); ctx.fillStyle='#fff'; ctx.shadowColor=vc; ctx.shadowBlur=glowFX(8);
    const n=FX==='high'?7:4;
    for(let i=0;i<n;i++){ const ph=(t*0.5 + i*0.37)%1; const px=(i*97.3)%W; const ey=vy - ph*46;
      ctx.globalAlpha=(1-ph)*0.8; const sz=1.6+(1-ph)*1.6;
      ctx.beginPath(); ctx.arc(px,ey,sz,0,TAU); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha=1; }
}
```

---

## 7. Danger-red to the edges (small edit inside `renderPlay`)

Find the closeness danger overlay in `renderPlay` — the block that builds a `createRadialGradient(W/2,H/2, H*0.3, …, H*0.7)` red wash centered on screen. Replace its gradient with this edge-weighted version so the center stays crisp and the red hugs the borders as the void rises:

```js
const closeness=clamp(1-(G.player.wy-G.voidY)/240,0,1);
if(closeness>0.05){ ctx.save();
  const a=closeness*0.6*(0.7+Math.sin(G.t*8)*0.3);
  const vc=world().void||'#ff3b5c';
  const g=ctx.createRadialGradient(W/2,H*0.5,Math.min(W,H)*0.32, W/2,H*0.5,Math.max(W,H)*0.72);
  g.addColorStop(0,hexA(vc,0)); g.addColorStop(0.6,hexA(vc,0)); g.addColorStop(1,hexA(vc,a));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore();
}
```

---

That's the whole facelift. If you'd rather I just regenerate the complete single file, paste the original COIL HTML back in (the whole thing, or from the `for(const n of G.nodes)` loop in `renderPlay` to the end is enough) and I'll fold all of this in and hand you one drop-in file.
