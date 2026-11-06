// rubberhose.js: 1930s black-and-white rubber-hose cartoon (黑白橡皮管卡通), one of bb-video's visual styles (style notes in styles/rubberhose/STYLE.md). Load after promo.js.
// One frame: grey watercolour washes and pen work behind inked cel characters (black, white and five greys, nothing else); everything is drawn on twos and its ink line boils from drawing to
// drawing (seeded); the picture sits in a worn projected print: heavy grain, lamp flicker, dust, hairs, scratches running down the reel, a splice bump on every cut, a rounded Academy gate.
// The cast is made of things that come alive: white gloves, pie-cut eyes, rubber-hose limbs with no elbows, big shoes; everything bounces to the band, on the beat.
//
//   const G = PROMO.rubberhose(F, { seed, boil: 1, drawings: 15, film: true, gate: true, academy: false, cover: true, colors, fonts, captions, flat })
//   Logical units: the frame's short side is 720 (16:9 = 1280 × 720, 9:16 = 720 × 1280; academy: true = a 960 × 720 gate pillarboxed in the wide frame). y grows downward.
//   SHOTS   G.shot(a, b, (u, t) => { … })  immediate mode: called once per drawing, u = seconds into the shot; draw back to front with G.lib. A cut (and a splice bump) at a.
//           G.pause(a, b) a dead hold: lines stop boiling, the band stops · G.still(a, b) only the lines · G.iris(at, { out, dur, x, y }) · G.top(fn, a, b) over every shot, screen units
//   LIB     const { camPush, pop, bgAt, rays, wallClock, alarm, cuckoo, grandfather, pocket, wristwatch, machine, master, numeral, janitor, jp, mopTool, bucket, K, E, hit, … } = G.lib
//           CAMERA camPush(x, y, zoom, rot, shakeX, shakeY) … pop()   PLATES bgAt(name, x, y, zoom, rot, shakeX, shakeY) → [x, y, zoom] actually used (a plate always covers the frame)
//                  plates: stage factory hall wall floor run tower platform   LIVE rays(cx, cy, u, { n, spin }) the sunburst behind a title, spotlights(cx, cy, b)
//           CAST   wallClock alarm cuckoo grandfather pocket wristwatch machine master numeral (x, y, scale, state, id) · janitor(x, y, s, jp({ …pose }), face, id); the state fields in STYLE.md §9
//           PROPS  mopTool bucket waterBlob gear musicNote star burst puff sweat speed coil dizzy shadow ringWaves
//           INK    S F L SC union hose hoseS glove shoe eye mouth spl pEll pRR pQuad pCub pLine text(Latin title lettering)  (every line a filled, swelling brush polygon)
//   TEXT    G.write(text, { x, y, size, at, until, color, edge, pop, wrap, align, tilt, sag, kind }) · G.title(lines, o) · G.card({ x, y, w, title, lines, at, until, hot })  DOM: the checks see them
//   INFO    G.steps({ items, T, until }) · G.versus({ cols, T, until }) · G.columns({ items, ats, until, hot, unit }) a bar chart of rubber pillars, an alarm clock riding each one up
//   Sounds the film emits (styles/rubberhose/sound.js): boing, whack, slide, pop, tick, tock, chime, ring, cuckoo, ratchet, rattle, crash, boom, block.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('rubberhose.js 要在 promo.js 之后加载', 'rubberhose.js must load after promo.js'));
/* ============================================================
   INK ENGINE - every line on screen is a filled brush-pen polygon
   whose width swells and thins, drawn anew for each drawing.
   ============================================================ */
let W=1280,H=720,RS=1.5;const TAU=Math.PI*2,PI=Math.PI;
const INK='#0f0e0c',PAPER='#f3f0e6',G1='#d6d3c9',G2='#a8a59c',G3='#7a776f',G4='#4c4a44',G5='#2a2824';
const {sin,cos,abs,min,max,floor,ceil,sqrt,pow,exp,atan2,hypot,round}=Math;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,u)=>a+(b-a)*u, frac=v=>v-floor(v);
const seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const sm=u=>u*u*(3-2*u), lin=u=>u, eOut=u=>1-(1-u)*(1-u), eIn=u=>u*u, hd=u=>u>=1?1:0;
const eBack=u=>{const v=u-1;return 1+v*v*(3.2*v+2.2)};
const eEl=u=>u<=0?0:u>=1?1:1-exp(-6*u)*cos(u*14);
const bump=u=>sin(clamp(u,0,1)*PI);
function hash(n){const s=sin(n*127.1+311.7)*43758.5453;return s-floor(s)}
function vnoise(x,s){const i=floor(x),f=x-i,u=f*f*(3-2*f);return hash(i+s*57.31)*(1-u)+hash(i+1+s*57.31)*u}
function lerpv(a,b,u){if(typeof a==='number')return a+(b-a)*u;const o={};for(const k in a){const va=a[k],vb=b[k];o[k]=(vb===undefined)?va:(typeof va==='number'?va+(vb-va)*u:(Array.isArray(va)?va.map((x,i)=>x+(vb[i]-x)*u):va))}return o}
function K(t,keys){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++){if(t<keys[i][0]){const a=keys[i-1],b=keys[i],e=b[2]||sm;return lerpv(a[1],b[1],e((t-a[0])/(b[0]-a[0])))}}return keys[keys.length-1][1]}

let C=null,BOIL=0,AMP=.62,LW=1,SD=0,XF=[];const XS=[];
const seed=n=>{SD=n*1000};
const push=()=>{XS.push(XF.length,LW)}, pop=()=>{LW=XS.pop();XF.length=XS.pop()};
const tr=(x,y)=>{XF.push([1,0,0,1,x,y])};
const rot=a=>{const c=cos(a),s=sin(a);XF.push([c,s,-s,c,0,0])};
const scl=(x,y=x)=>{XF.push([x,0,0,y,0,0]);LW*=sqrt(abs(x*y))};
const warp=fn=>{XF.push(fn)};
let OX=0,OY=0;
function tp(x,y){for(let i=XF.length-1;i>=0;i--){const m=XF[i];if(typeof m==='function'){const r=m(x,y);x=r[0];y=r[1]}else{const nx=m[0]*x+m[2]*y+m[4];y=m[1]*x+m[3]*y+m[5];x=nx}}OX=x;OY=y}

function hw(pts,closed){
  const n=pts.length/2|0,out=new Array(n*2),s=SD*1.337,b=BOIL*7.77;
  const amp=AMP*min(1,.3+LW*.7);
  for(let i=0;i<n;i++){
    tp(pts[2*i],pts[2*i+1]);
    const u=i*.31;
    let dx=(vnoise(u,s+b)-.5)*2*amp+(vnoise(u*.5,s)-.5)*amp*1.4;
    let dy=(vnoise(u,s+b+9.1)-.5)*2*amp+(vnoise(u*.5,s+3.3)-.5)*amp*1.4;
    if(closed){const m=min(1,min(i,n-1-i)/3);dx*=m;dy*=m}
    out[2*i]=OX+dx;out[2*i+1]=OY+dy;
  }
  return out;
}
function poly(wp,col){C.fillStyle=col;C.beginPath();C.moveTo(wp[0],wp[1]);for(let i=2;i<wp.length;i+=2)C.lineTo(wp[i],wp[i+1]);C.closePath();C.fill()}
function inkW(wp,w,col,o){
  const n=wp.length/2|0;if(n<2)return;
  const closed=o&&o.closed,taper=o&&o.taper!=null?o.taper:(closed?0:.8);
  const wid=max(.65,w*(LW*.82+.18)),lx=new Array(n),ly=new Array(n),rx=new Array(n),ry=new Array(n);
  for(let i=0;i<n;i++){
    const ia=closed?(i-1+n)%n:max(0,i-1),ib=closed?(i+1)%n:min(n-1,i+1);
    let tx=wp[2*ib]-wp[2*ia],ty=wp[2*ib+1]-wp[2*ia+1];const l=hypot(tx,ty)||1;tx/=l;ty/=l;
    const nx=-ty,ny=tx,t=n>1?i/(n-1):0;
    let th=1+.26*abs(nx*.62+ny*.78)-.13+.34*(vnoise(i*.23,SD*.77+.5)-.5);
    if(!closed&&taper>0){const e=min(1,min(t,1-t)/.16);th*=(1-taper)+taper*(.18+.82*e)}
    const hwid=wid*.5*th;
    lx[i]=wp[2*i]+nx*hwid;ly[i]=wp[2*i+1]+ny*hwid;rx[i]=wp[2*i]-nx*hwid;ry[i]=wp[2*i+1]-ny*hwid;
  }
  C.fillStyle=col;C.beginPath();C.moveTo(lx[0],ly[0]);for(let i=1;i<n;i++)C.lineTo(lx[i],ly[i]);
  if(closed){C.closePath();C.moveTo(rx[n-1],ry[n-1]);for(let i=n-2;i>=0;i--)C.lineTo(rx[i],ry[i]);C.closePath()}
  else{for(let i=n-1;i>=0;i--)C.lineTo(rx[i],ry[i]);C.closePath()}
  C.fill();
  if(o&&o.cap){const r=wid*.5;C.beginPath();C.arc(wp[0],wp[1],r,0,TAU);C.moveTo(wp[2*n-2]+r,wp[2*n-1]);C.arc(wp[2*n-2],wp[2*n-1],r,0,TAU);C.fill()}
}
function L(pts,w=2.2,col=INK,o=null){SD++;inkW(hw(pts,!!(o&&o.closed)),w,col,o)}
function F(pts,col){SD++;poly(hw(pts,true),col)}
function S(pts,fill,w=2.4,col=INK){SD++;const wp=hw(pts,true);poly(wp,fill);if(w>0)inkW(wp,w,col,{closed:true})}
function SC(pts,fill,inner,w=2.4,col=INK){SD++;const wp=hw(pts,true),sd=SD;poly(wp,fill);C.save();C.beginPath();C.moveTo(wp[0],wp[1]);for(let i=2;i<wp.length;i+=2)C.lineTo(wp[i],wp[i+1]);C.closePath();C.clip();inner();C.restore();SD=sd;if(w>0)inkW(wp,w,col,{closed:true})}
function union(parts,fill,w=2.2){const ws=[];for(const p of parts){SD++;const wp=hw(p,true);ws.push(wp);inkW(wp,w*1.9,INK,{closed:true})}for(const wp of ws)poly(wp,fill)}

/* --- path builders: flat [x,y,...] --- */
function pLine(x0,y0,x1,y1,n=6){const o=[];for(let i=0;i<=n;i++){const u=i/n;o.push(x0+(x1-x0)*u,y0+(y1-y0)*u)}return o}
function pQuad(x0,y0,cx,cy,x1,y1,n=12){const o=[];for(let i=0;i<=n;i++){const u=i/n,v=1-u;o.push(v*v*x0+2*u*v*cx+u*u*x1,v*v*y0+2*u*v*cy+u*u*y1)}return o}
function pCub(x0,y0,a,b,c,d,x1,y1,n=14){const o=[];for(let i=0;i<=n;i++){const u=i/n,v=1-u;o.push(v*v*v*x0+3*v*v*u*a+3*v*u*u*c+u*u*u*x1,v*v*v*y0+3*v*v*u*b+3*v*u*u*d+u*u*u*y1)}return o}
function pEll(cx,cy,rx,ry=rx,a0=0,a1=TAU,n=0,r=0){const full=abs(a1-a0)>=TAU-1e-6;if(!n)n=max(10,ceil(max(abs(rx),abs(ry))*abs(a1-a0)/9));n=min(n,64);const o=[],cr=cos(r),sr=sin(r);for(let i=0;i<(full?n:n+1);i++){const a=a0+(a1-a0)*i/n,x=cos(a)*rx,y=sin(a)*ry;o.push(cx+x*cr-y*sr,cy+x*sr+y*cr)}return o}
function pRR(x,y,w,h,r=4,step=16){const o=[];const seg_=(ax,ay,bx,by)=>{const n=max(1,ceil(hypot(bx-ax,by-ay)/step));for(let i=0;i<n;i++){const u=i/n;o.push(ax+(bx-ax)*u,ay+(by-ay)*u)}};const arc=(cx,cy,a0)=>{for(let i=0;i<4;i++){const a=a0+PI/2*i/4;o.push(cx+cos(a)*r,cy+sin(a)*r)}};seg_(x+r,y,x+w-r,y);arc(x+w-r,y+r,-PI/2);seg_(x+w,y+r,x+w,y+h-r);arc(x+w-r,y+h-r,0);seg_(x+w-r,y+h,x+r,y+h);arc(x+r,y+h-r,PI/2);seg_(x,y+h-r,x,y+r);arc(x+r,y+r,PI);return o}
function spl(p,closed=true,sg=6){const n=p.length/2|0,o=[],g=i=>closed?(i+n)%n:clamp(i,0,n-1);const end=closed?n:n-1;for(let i=0;i<end;i++){const a=g(i-1),b=g(i),c=g(i+1),d=g(i+2);for(let k=0;k<sg;k++){const u=k/sg,u2=u*u,u3=u2*u;for(let e=0;e<2;e++){const p0=p[2*a+e],p1=p[2*b+e],p2=p[2*c+e],p3=p[2*d+e];o.push(.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u2+(-p0+3*p1-3*p2+p3)*u3))}}}if(!closed)o.push(p[2*n-2],p[2*n-1]);return o}
function capPts(x0,y0,x1,y1,r0,r1=r0){const a=atan2(y1-y0,x1-x0);return [...pEll(x1,y1,r1,r1,a-PI/2,a+PI/2,6),...pEll(x0,y0,r0,r0,a+PI/2,a+3*PI/2,6)]}
function gearPts(r,t,a=0,d=.17){const o=[];for(let i=0;i<t;i++){const b=a+i/t*TAU,w=TAU/t;for(const [f,R] of [[0,r*(1-d)],[.22,r*(1-d)],[.3,r],[.55,r],[.63,r*(1-d)]])o.push(cos(b+w*f)*R,sin(b+w*f)*R)}return o}
function off(p,x,y){const o=new Array(p.length);for(let i=0;i<p.length;i+=2){o[i]=p[i]+x;o[i+1]=p[i+1]+y}return o}

/* --- anatomy of the rubber hose --- */
function hose(x0,y0,x1,y1,b=0,w=5,col=INK){const dx=x1-x0,dy=y1-y0,l=hypot(dx,dy)||1,mx=(x0+x1)/2-dy/l*b,my=(y0+y1)/2+dx/l*b;L(pQuad(x0,y0,mx,my,x1,y1,12),w,col,{taper:.08,cap:true})}
function hoseS(x0,y0,x1,y1,b=0,w=5,col=INK){const dx=x1-x0,dy=y1-y0,l=hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;L(pCub(x0,y0,x0+dx*.33+nx*b,y0+dy*.33+ny*b,x0+dx*.66-nx*b,y0+dy*.66-ny*b,x1,y1,16),w,col,{taper:.08,cap:true})}
function glove(x,y,a,k=0,s=1,flip=1){push();tr(x,y);rot(a);scl(s,s*flip);k=round(k);const pr=[];
  if(k===1){pr.push(pEll(4,0,10.5,9.5),capPts(2,-9,0,-12,3.4,3.4));pr.push(pEll(11,-5,4,4),pEll(12,0.5,4,4),pEll(11,6,4,4))}
  else if(k===2){pr.push(pEll(3,0,9,9),capPts(5,-3,26,-5,3.4,3),capPts(0,-7,4,-14,3.2,3),pEll(10,3,4.4,4.4),pEll(8,7,4,4))}
  else if(k===3){pr.push(pEll(2,0,9.5,9));pr.push(spl([6,-7,14,-9,17,-4,14,-1,9,-3],true,3),spl([7,-1,16,-1,18,4,14,6,9,3],true,3),spl([5,5,13,6,14,11,9,12,4,9],true,3),capPts(-3,-7,6,-12,3.3,3))}
  else{pr.push(pEll(1,0,9,9.5),capPts(4,-7,18,-13,3.5,3.1),capPts(6,-1,23,-2,3.6,3.2),capPts(4,5,19,10,3.5,3.1),capPts(-3,-8,1,-17,3.3,3))}
  union(pr,PAPER,1.3);
  L(pLine(-2,-4,3,-3.4,2),1.2);L(pLine(-2,0,3.4,0,2),1.2);L(pLine(-2,4,3,3.4,2),1.2);
  S(pEll(-10,0,3.8,8.8),PAPER,1.6);pop()}
function shoe(x,y,a=0,s=1,dir=1){push();tr(x,y);rot(a);scl(s*dir,s);
  S(spl([-11,-1,-11,-10,-3,-13,5,-10,10,-16,21,-16,28,-8,26,0,8,1],true,5),INK,1.4);
  F(pEll(18,-10,5,2.8,0,TAU,10,-.3),PAPER);
  L(pLine(-10,1,26,1,5),1.4,G2,{taper:.2});pop()}
function piePupil(x,y,rx,ry,wa=-1,ww=.44,col=INK){const p=[x+cos(wa)*rx*.12,y+sin(wa)*ry*.12];const n=18;for(let k=0;k<=n;k++){const a=wa+ww+(TAU-2*ww)*k/n;p.push(x+cos(a)*rx,y+sin(a)*ry)}F(p,col)}
function eye(x,y,rx,ry,lx=0,ly=0,open=1,o=null){
  if(open<.14){L(pQuad(x-rx,y,x,y+ry*.42,x+rx,y,6),2.2);return}
  const ry2=ry*open;if(!(o&&o.noWhite))S(pEll(x,y,rx,ry2),PAPER,o&&o.w||2);
  const pr=(o&&o.pupil)||.62,px=x+lx*rx*(1-pr)*.92,py=y+ly*ry2*(1-pr)*.92;
  piePupil(px,py,rx*pr,ry2*min(.85,pr*1.12),-1.05+lx*.5,.43);
}
function mouth(x,y,w,h,sm_=0,o=null){const top=pQuad(x-w,y,x,y+sm_,x+w,y,10),bot=pQuad(x+w,y,x,y+sm_+h*2,x-w,y,12);const pts=[...top,...bot.slice(2,-2)];
  if(h<.8){L(top,2.2);return}
  SC(pts,INK,()=>{if(o&&o.tongue!==0)F(pEll(x,y+sm_+h*1.15,w*.5,h*.62,0,TAU,14),G3);if(o&&o.teeth){const t=[...pQuad(x-w,y,x,y+sm_,x+w,y,10),...pQuad(x+w,y+h*.34,x,y+sm_+h*.34,x-w,y+h*.34,10)];F(t,PAPER)}},2);
  if(o&&o.dimple){L(pQuad(x-w-3,y-5,x-w-6,y,x-w-1,y+4,4),1.6);L(pQuad(x+w+3,y-5,x+w+6,y,x+w+1,y+4,4),1.6)}}
function star(x,y,r,a=0,fill=PAPER,w=1.5){const p=[];for(let i=0;i<10;i++){const R=i%2?r*.42:r,b=a+i/10*TAU;p.push(x+cos(b)*R,y+sin(b)*R)}S(p,fill,w)}
function burst(x,y,r,n=12,a=0,fill=PAPER,w=2.4,inner=.55){const p=[];for(let i=0;i<n*2;i++){const R=(i%2?r*inner:r)*(1+.18*(hash(i*3.1+x)-.5)),b=a+i/(n*2)*TAU;p.push(x+cos(b)*R,y+sin(b)*R)}S(p,fill,w)}
function puff(x,y,r,fill=PAPER,sd=1){const pr=[];for(let i=0;i<6;i++){const a=i/6*TAU+sd,R=r*.65;pr.push(pEll(x+cos(a)*R,y+sin(a)*R*.7,r*(.45+.18*hash(sd+i))))}pr.push(pEll(x,y,r*.7));union(pr,fill,1.2)}
function sweat(x,y,a=0,s=1){push();tr(x,y);rot(a);scl(s);S(spl([0,-6,3.6,2,0,5,-3.6,2],true,4),PAPER,1.3);pop()}
function speed(x0,y0,x1,y1,n=3,sp=10,w=1.7,col=INK){const dx=x1-x0,dy=y1-y0,l=hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;for(let i=0;i<n;i++){const o=(i-(n-1)/2)*sp,k=.7+.3*hash(i*7.7+BOIL*1.3);L(pLine(x0+nx*o,y0+ny*o,x0+nx*o+dx*k,y0+ny*o+dy*k,4),w,col)}}
function coil(x0,y0,x1,y1,c=8,r=9,w=2.4,col=INK){const p=[];const n=c*8,dx=x1-x0,dy=y1-y0,l=hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;for(let i=0;i<=n;i++){const u=i/n,a=u*c*TAU,e=r*(u<.03||u>.97?.2:1);p.push(x0+dx*u+nx*sin(a)*e+dx/l*cos(a)*r*.22,y0+dy*u+ny*sin(a)*e+dy/l*cos(a)*r*.22)}L(p,w,col,{taper:.1})}
function gear(x,y,r,t,a,fill=G3,w=1.8){push();tr(x,y);S(gearPts(r,t,a),fill,w);S(pEll(0,0,r*.28),INK,1);if(r>26){for(let i=0;i<4;i++){const b=a+i/4*TAU;L(pLine(cos(b)*r*.3,sin(b)*r*.3,cos(b)*r*.72,sin(b)*r*.72,3),2.2)}L(pEll(0,0,r*.72,r*.72),1.2,INK,{closed:true})}pop()}
function musicNote(x,y,s=1,a=0,dbl=0){push();tr(x,y);rot(a);scl(s);F(pEll(-6,10,6.4,4.6,0,TAU,12,-.35),INK);L(pLine(0,8,0,-16,3),2,INK,{taper:.1});if(dbl){F(pEll(14,6,6.4,4.6,0,TAU,12,-.35),INK);L(pLine(20,4,20,-20,3),2,INK,{taper:.1});L(pLine(0,-16,20,-20,3),4,INK,{taper:0})}else L(pQuad(0,-16,12,-11,10,-1,6),3,INK,{taper:.7});pop()}
function ringWaves(x,y,r,a0,a1,n=3,sp=14,w=2){for(let i=0;i<n;i++)L(pEll(x,y,r+i*sp,r+i*sp,a0,a1,16),w)}

/* --- hand-cut title lettering --- */
const GL={A:[[0,1,.5,0,1,1],[.2,.64,.8,.64]],B:[[0,0,0,1],'s',[0,0,.72,.04,.76,.26,.5,.47,0,.48],'s',[0,.48,.8,.55,.84,.8,.6,.98,0,1]],C:['s',[.92,.18,.6,0,.2,.1,.02,.5,.2,.9,.6,1,.92,.82]],D:[[0,0,0,1],'s',[0,0,.6,.05,.95,.5,.6,.95,0,1]],E:[[.85,0,0,0,0,1,.85,1],[0,.48,.68,.48]],F:[[.85,0,0,0,0,1],[0,.48,.68,.48]],G:['s',[.92,.18,.6,0,.2,.1,.02,.5,.2,.9,.6,1,.92,.82],[.92,.82,.92,.55,.55,.55]],H:[[0,0,0,1],[.9,0,.9,1],[0,.48,.9,.48]],I:[[.3,0,.3,1]],J:['s',[.7,0,.7,.75,.5,1,.2,.95,.05,.75]],K:[[0,0,0,1],[.85,0,0,.58],[.25,.4,.9,1]],L:[[0,0,0,1,.8,1]],M:[[0,1,0,0,.5,.62,1,0,1,1]],N:[[0,1,0,0,.9,1,.9,0]],O:['s',[.5,0,.08,.2,.02,.6,.3,.98,.7,.98,.98,.6,.92,.2,.5,0]],P:[[0,0,0,1],'s',[0,0,.7,.03,.82,.28,.6,.5,0,.54]],Q:['s',[.5,0,.08,.2,.02,.6,.3,.98,.7,.98,.98,.6,.92,.2,.5,0],[.58,.72,1,1.05]],R:[[0,0,0,1],'s',[0,0,.7,.03,.82,.28,.6,.5,0,.54],[.34,.54,.9,1]],S:['s',[.85,.15,.5,0,.1,.12,.15,.38,.5,.5,.85,.62,.88,.88,.5,1,.08,.85]],T:[[0,0,1,0],[.5,0,.5,1]],U:['s',[0,0,0,.6,.2,.95,.5,1,.8,.95,1,.6,1,0]],V:[[0,0,.5,1,1,0]],W:[[0,0,.25,1,.5,.35,.75,1,1,0]],X:[[0,0,.95,1],[.95,0,0,1]],Y:[[0,0,.5,.5,1,0],[.5,.5,.5,1]],Z:[[0,0,.9,0,0,1,.95,1]],
 0:['s',[.5,0,.1,.2,.05,.6,.3,.98,.7,.98,.95,.6,.9,.2,.5,0]],1:[[.15,.22,.5,0,.5,1],[.15,1,.85,1]],2:['s',[.1,.25,.45,0,.85,.2,.7,.55,.05,1],[.05,1,.92,1]],3:['s',[.1,.12,.5,0,.85,.2,.45,.48],'s',[.45,.48,.9,.7,.55,1,.08,.88]],4:[[.7,1,.7,0,0,.7,.95,.7]],5:[[.85,0,.2,0,.12,.45],'s',[.12,.45,.55,.38,.9,.68,.55,1,.1,.88]],6:['s',[.8,.05,.35,.1,.08,.6,.4,1,.85,.75,.55,.45,.12,.62]],7:[[.05,0,.92,0,.35,1]],8:['s',[.5,.48,.14,.25,.5,0,.86,.25,.5,.48,.05,.75,.5,1,.95,.75,.5,.48]],9:['s',[.2,.95,.65,.9,.92,.4,.6,0,.15,.25,.45,.55,.88,.38]],'&':['s',[.95,1,.3,.35,.35,.05,.65,.1,.6,.35,.05,.65,.2,1,.65,.9,.95,.55]],'-':[[.1,.5,.8,.5]],'.':[[.3,.95,.32,1]],'!':[[.3,0,.3,.68],[.3,.95,.3,1]],"'":[[.3,0,.3,.22]]};
const GC={};
function glyph(ch){if(GC[ch])return GC[ch];const g=GL[ch];if(!g)return GC[ch]=[];const out=[];for(let i=0;i<g.length;i++){if(g[i]==='s'){out.push(spl(g[++i],false,5))}else{const p=g[i],q=[];for(let k=0;k<p.length-2;k+=2){const n=3;for(let j=0;j<n;j++){const u=j/n;q.push(p[k]+(p[k+2]-p[k])*u,p[k+1]+(p[k+3]-p[k+1])*u)}}q.push(p[p.length-2],p[p.length-1]);out.push(q)}}return GC[ch]=out}
function drawGlyph(ch,x,y,sx,sy,w,col){for(const p of glyph(ch)){const q=new Array(p.length);for(let i=0;i<p.length;i+=2){q[i]=x+p[i]*sx;q[i+1]=y+p[i+1]*sy}L(q,w,col,{taper:.05,cap:true})}}
function text(s,x,y,size,o={}){const adv=size*(o.track||.84),sx=size*(o.wide||.62),sy=size;const tot=[...s].reduce((a,c)=>a+(c==='I'||c==='.'||c==="'"?adv*.55:c===' '?adv*.6:(c==='M'||c==='W')?adv*1.1:adv),0);let cx=x-tot/2;const layers=o.layers||[[o.w||size*.13,o.col||INK,0,0]];const fn=o.fn;let i=0;for(const c of s){const a=(c==='I'||c==='.'||c==="'"?adv*.55:c===' '?adv*.6:(c==='M'||c==='W')?adv*1.1:adv);if(c!==' '){const off_=fn?fn(i):[0,0,1,0];const sd=SD;push();tr(cx+a/2-sx*.4+off_[0]+sx*.4,y+off_[1]);if(off_[3])rot(off_[3]);scl(off_[2]);for(const ly of layers){SD=sd;drawGlyph(c,-sx*.45+ly[2],-sy/2+ly[3],sx,sy,ly[0],ly[1])}pop()}cx+=a;i++}}

/* ============================================================
   THE PLAYERS - model sheets in code
   ============================================================ */
const NOST={};
function clockHand(len,a,w=4,bend=0,col=INK,tail=.18){push();rot(a);
  const b=bend,p=[-w*.5,len*tail, -w*.42+b*.25,-len*.3, -w*.3+b*.7,-len*.68, -w*1.3+b,-len*.72, b,-len, w*1.3+b,-len*.72, w*.3+b*.7,-len*.68, w*.42+b*.25,-len*.3, w*.5,len*tail];
  S(spl(p,true,2),col,0);pop()}
function dial(r,o={}){
  S(pEll(0,0,r,r,0,TAU,max(18,r*.9|0)),o.fill||PAPER,o.lw||2);
  if(r>30)L(pEll(0,0,r*.93,r*.93,0,TAU,max(18,r*.8|0)),.9,INK,{closed:true});
  const nk=o.num||'t',mir=o.mirror?-1:1;
  for(let i=1;i<=12;i++){
    if(o.skip&&o.skip[i])continue;
    const a=i/12*TAU*mir,sx=sin(a),cy=-cos(a);
    if(nk==='t'){const q=i%3===0?.78:.86;L(pLine(sx*r*q,cy*r*q,sx*r*.94,cy*r*.94,1),i%3===0?2.2:1.2,INK,{taper:0})}
    else{push();const R=r*.79;tr(sx*R,cy*R);
      if(nk==='r'){rot(a);const P=o.pop&&o.pop[0]===i?o.pop[1]:0;if(P)scl(1+P*.7);text(['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][i],0,0,r*.14,{w:r*.028,track:.66,wide:.5})}
      else{if(o.mirror)scl(-1,1);text(String(i),0,0,r*.2,{w:r*.038,track:.7,wide:.55})}
      pop()}
  }
}
function faceFeat(r,st){
  const a=st.a||0;if(a<=.02)return;
  const sc=a<1?eBack(a):1,eo=(st.eo==null?1:st.eo);
  const ex=r*.37,ey=-r*.2+(st.ey||0),rx=r*.215*sc,ry=r*.31*sc;
  eye(-ex,ey,rx,ry,st.lx||0,st.ly||0,eo,{pupil:.64,w:r>30?2:1.4});
  eye(ex,ey,rx,ry,st.lx||0,st.ly||0,st.eo2==null?eo:st.eo2,{pupil:.64,w:r>30?2:1.4});
  if(st.brow!=null&&r>16){const b=st.brow*r*.14;L(pQuad(-ex-rx,ey-ry-3-b*.2,-ex,ey-ry-7-b,-ex+rx,ey-ry-1+b*.5,5),2.4);L(pQuad(ex-rx,ey-ry-1+b*.5,ex,ey-ry-7-b,ex+rx,ey-ry-3-b*.2,5),2.4)}
  const mo=st.mo||0,mw=r*(st.mw||.46)*sc,smile=(st.sm==null?.6:st.sm)*r*.17;
  if(mo>.04)mouth(0,r*.3,mw,r*.34*mo,smile,{tongue:1,teeth:st.teeth});
  else L(pQuad(-mw,r*.36,0,r*.36+smile*1.4,mw,r*.36,8),r>30?2.4:1.6);
}
/* -- rubber arm helper: st arm = [x,y,bend,kind] -- */
function arm(sx,sy,def,a,w,hs,flip=1,alive=1){const t=a||def;const ex=sx+(t[0]-sx)*alive,ey=sy+(t[1]-sy)*alive;hose(sx,sy,ex,ey,t[2]||0,w);const ang=atan2(ey-sy,ex-sx)+(t[4]||0);glove(ex,ey,ang,t[3]||0,hs,flip)}

/* ---------- GRANDFATHER: lanky and elegant ---------- */
function grandfather(x,y,s,st=NOST,id=1){seed(100+id);const a=st.a||0,lift=a*(st.lift==null?64:st.lift);
  push();tr(x+(st.jx||0),y+(st.hop||0));rot(st.lean||0);scl(s*(st.sx||1),s*(st.sq||1));
  const hip=st.hip||0,bend=st.bend||0,hx=hip*22;
  if(a>.02){const kL=st.kL||0,kR=st.kR||0;
    const lx=-18+hx-kL*92+(st.fL||0),ly=-kL*(lift+222),rx=18+hx+kR*92+(st.fR||0),ry=-kR*(lift+222);
    hoseS(-14+hx,-lift+2,lx,ly,-6-kL*8,5.5);shoe(lx,ly,kL*1.15,1.05,-1);
    hoseS(14+hx,-lift+2,rx,ry,6+kR*8,5.5);shoe(rx,ry,kR*1.2,1.05,1)}
  push();tr(0,-lift);
  warp((px,py)=>{const v=clamp(-py/300,-.2,1.3);return [px+bend*v*v*70+hip*(1-v)*(1-v)*22,py]});
  if(a>.02)arm(-40,-172,[-58,-104,10,0],st.al,5,1.05,1,a);
  S(pRR(-40,-30,80,30,3),INK,2);L(pLine(-34,-8,34,-8,5),1.1,G2);
  S(pRR(-31,-214,62,186,2),INK,2);
  L(pRR(-25,-207,50,172,3),1,G3,{closed:true});
  S(pRR(-20,-192,40,128,3),G4,1.2);
  const pa=st.pend||0;L(pLine(0,-192,sin(pa)*104,-192+cos(pa)*104,6),2.4,PAPER,{taper:0});
  S(pEll(sin(pa)*104,-192+cos(pa)*104,13),PAPER,1.8);
  S(pRR(-40,-294,80,84,3),INK,2);
  const hl=st.hood||0;push();if(hl){tr(0,-hl*26);rot(hl*.2)}
  S(spl([-44,-286,-30,-306,-12,-310,0,-324,12,-310,30,-306,44,-286,0,-292],true,4),INK,2);
  S(pEll(0,-330,4.5),PAPER,1.2);L(pQuad(-34,-290,0,-312,34,-290,8),1.2,G2);pop();
  push();tr(0,-252);dial(33,{num:st.num||'t'});
  if(st.blur)bladeBlur(27,st.blur);else{clockHand(19,st.h||0,3.2,st.hb||0);clockHand(27,st.m||0,2.4,st.mb||0)}
  F(pEll(0,0,2.5),INK);faceFeat(33,st);pop();
  if(a>.02)arm(40,-172,[58,-104,-10,0],st.ar,5,1.05,-1,a);
  pop();pop()}
function bladeBlur(r,v){for(let i=0;i<3;i++){const b=BOIL*2.3+i*2.1;L(pEll(0,0,r*(.5+i*.22),r*(.5+i*.22),b,b+2.6,10),3.4-i*.6,G3)}}

/* ---------- WALL CLOCK: flappy ---------- */
function wallClock(x,y,s,st=NOST,id=1){seed(200+id);const a=st.a||0;
  push();tr(x+(st.jx||0),y+(st.hop||0));rot(st.lean||0);scl(s*(st.sx||1),s*(st.sq||1));
  if(a>.02){const f=st.legs;if(f){hose(-12,80,f[0],f[1],-5,4);shoe(f[0],f[1],0,.8,-1);hose(12,80,f[2],f[3],5,4);shoe(f[2],f[3],0,.8,1)}
    arm(-46,4,[-68,30,-12,0],st.al,4.6,1,1,a);arm(46,4,[68,30,12,0],st.ar,4.6,1,-1,a)}
  S(pRR(-22,34,44,52,4),INK,2);S(pRR(-15,44,30,36,2),G4,1);const pa=st.pend||0;
  L(pLine(0,44,sin(pa)*30,44+cos(pa)*30,3),1.8,PAPER,{taper:0});S(pEll(sin(pa)*30,44+cos(pa)*30,6.5),PAPER,1.2);
  const oc=[];for(let i=0;i<8;i++){const b=PI/8+i/8*TAU,R=52;oc.push(cos(b)*R,sin(b)*R);const c=PI/8+(i+.5)/8*TAU;oc.push(cos(c)*R*.965,sin(c)*R*.965)}
  S(oc,INK,2);
  dial(42,{num:st.num||'t',mirror:st.mirror,skip:st.skip});
  if(st.blur)bladeBlur(34,st.blur);else{clockHand(24,st.h||0,3.6,st.hb||0);if(!st.noM)clockHand(34,st.m||0,2.6,st.mb||0)}
  F(pEll(0,0,3),INK);faceFeat(42,st);
  pop()}

/* ---------- CUCKOO: twitchy, mischievous ---------- */
function cuckooBird(x,y,a,s,st){push();tr(x,y);rot(a);scl(s);
  const o=st.bo||0;
  S(spl([-15,6,-13,-8,0,-13,14,-7,16,6,4,12],true,4),INK,1.6);
  push();tr(-11,1);rot(sin(BOIL*2.1)*.5);S(spl([0,-3,-13,-7,-11,3,0,4],true,3),G3,1.2);pop();
  S(pEll(6,-12,10.5,9.5),INK,1.6);
  S(pEll(10,-14,5,6),PAPER,1.2);piePupil(11+(st.blx||0)*2,-13,2.8,4,-1,.5);
  L(pLine(1,-24,4,-20,1),1.8);L(pLine(6,-26,6.5,-21,1),1.8);
  S([15,-14-o*3.5,30,-11-o*4,16,-10],G1,1.2);S([15,-10+o*1,27,-3+o*5,15,-6+o*4],G1,1.2);
  pop()}
function cuckoo(x,y,s,st=NOST,id=1){seed(300+id);const a=st.a||0;
  push();tr(x+(st.jx||0),y+(st.hop||0));rot(st.lean||0);scl(s*(st.sx||1),s*(st.sq||1));
  const sw=st.sw||0;for(const sd of [-1,1]){const cx=sd*17,cy=52,l=56+sd*8+sin(sw*2)*5,ex=cx+sin(sw*sd)*14,ey=cy+l;
    L(pLine(cx,cy,ex,ey,6),1.3);S(spl([ex-6,ey,ex-7,ey+11,ex,ey+23,ex+7,ey+11,ex+6,ey],true,3),INK,1.3);for(let i=1;i<4;i++)L(pLine(ex-5,ey+i*5,ex+5,ey+i*5,2),.9,G2)}
  if(a>.02){arm(-40,18,[-58,44,-9,0],st.al,3.6,.8,1,a);arm(40,18,[58,44,9,0],st.ar,3.6,.8,-1,a)}
  S(pRR(-36,-30,72,84,3),G5,2);
  for(let i=0;i<3;i++)L(pLine(-30,14+i*12,30,14+i*12,4),.9,G3);
  S([-50,-20,0,-68,50,-20,42,-14,0,-52,-42,-14],INK,2);
  S([-33,-22,0,-55,33,-22],G4,1.5);
  const ext=st.bird||0,bx=(st.bda==null?-.7:st.bda);
  const doorOpen=min(1,ext*5);
  S(pRR(-9,-48,18,22,2),INK,1.2);
  if(doorOpen>.05){const dd=9+doorOpen*10;S([-9-dd*.9,-49,-9,-48,-9,-26,-9-dd*.9,-28],G3,1.4);S([9,-48,9+dd*.9,-49,9+dd*.9,-28,9,-26],G3,1.4)}else{S(pRR(-8,-47,16,20,2),G3,1.2);F(pEll(4,-37,1.3),INK)}
  push();tr(0,4);dial(24,{num:'t',lw:1.6});clockHand(14,st.h||0,2.6);clockHand(20,st.m||0,2);F(pEll(0,0,2),INK);faceFeat(24,st);pop();
  if(ext>.02){const L_=ext*(st.bl||62),ex=sin(bx)*L_,ey=-38-cos(bx)*L_;coil(0,-38,ex,ey,5,4+ext*2,1.6);cuckooBird(ex,ey,bx*.45,st.bs||1.25,st)}
  pop()}

/* ---------- ALARM: nervous, explosive ---------- */
function alarm(x,y,s,st=NOST,id=1){seed(400+id);const a=st.a||0,inf=st.inf||1,lift=a*14;
  push();tr(x+(st.jx||0),y+(st.hop||0));rot(st.lean||0);scl(s*(st.sx||1),s*(st.sq||1));
  const R=30*inf,cy=-R-8-lift;
  if(a>.02){const L0=st.legL||[-18,0],L1=st.legR||[18,0];hose(-12,cy+R*.82,L0[0],L0[1],-3,3.8);shoe(L0[0],L0[1],0,.72,-1);hose(12,cy+R*.82,L1[0],L1[1],3,3.8);shoe(L1[0],L1[1],0,.72,1)}
  else{L(pLine(-16,cy+R*.86,-20,0,2),3.4);L(pLine(16,cy+R*.86,20,0,2),3.4)}
  const j=st.ring?sin(BOIL*2.7)*.4:0;
  for(const sd of [-1,1]){push();tr(sd*R*.62,cy-R*.84);rot(sd*.5+j*sd*.3);S([...pEll(0,0,R*.4,R*.4,PI,TAU,8),R*.4,3,-R*.4,3],G2,1.8);pop()}
  L(pQuad(-R*.25,cy-R*1.28,0,cy-R*1.55,R*.25,cy-R*1.28,6),2.5);
  push();tr(0,cy-R*1.08);rot(j);L(pLine(0,8,0,-10,2),2);F(pEll(0,-11,2.6),INK);pop();
  if(a>.02){arm(-R*.98,cy+R*.15,[-R-16,cy+R*.5,-6,0],st.al,3.4,.72,1,a);arm(R*.98,cy+R*.15,[R+16,cy+R*.5,6,0],st.ar,3.4,.72,-1,a)}
  S(pEll(0,cy,R,R,0,TAU,26),INK,2);
  push();tr(0,cy);dial(R*.84,{num:st.num||'t',lw:1.6});clockHand(R*.45,st.h||0,2.6);clockHand(R*.68,st.m||0,2);F(pEll(0,0,2),INK);faceFeat(R*.84,st);pop();
  pop()}

/* ---------- POCKET WATCH: tiny, quick, synchronized ---------- */
function pocket(x,y,s,st=NOST,id=1){seed(500+id);const a=st.a==null?1:st.a,lift=a*12;
  push();tr(x+(st.jx||0),y+(st.hop||0));rot(st.lean||0);scl(s*(st.sx||1),s*(st.sq||1));
  const R=18,cy=-R-4-lift;
  if(a>.02){const f0=st.fL||[-8,0],f1=st.fR||[8,0];hose(-6,cy+R*.86,f0[0],f0[1],-2,2.6);shoe(f0[0],f0[1],0,.48,-1);hose(6,cy+R*.86,f1[0],f1[1],2,2.6);shoe(f1[0],f1[1],0,.48,1);
    arm(-R*.94,cy+2,[-R-9,cy+10,-3,0],st.al,2.4,.48,1,a);arm(R*.94,cy+2,[R+9,cy+10,3,0],st.ar,2.4,.48,-1,a)}
  L(pEll(0,cy-R-7,4.4,4.4),1.7,INK,{closed:true});S(pRR(-2.8,cy-R-4,5.6,5,1),G3,1.1);
  S(pEll(0,cy,R,R,0,TAU,20),INK,1.6);
  push();tr(0,cy);S(pEll(0,0,R*.85,R*.85,0,TAU,18),PAPER,1);clockHand(R*.42,st.h||0,1.7);clockHand(R*.62,st.m||0,1.3);faceFeat(R*.85,st);pop();
  pop()}

/* ---------- WRISTWATCH: the instigator ---------- */
function wristwatch(x,y,s,st=NOST,id=1){seed(600+id);push();tr(x,y+(st.hop||0));rot(st.lean||0);scl(s);
  S(spl([-20,-8,-48,-12,-74,-2,-73,8,-47,3,-20,8],true,4),INK,1.5);S(spl([20,-8,44,-6,66,4,66,14,42,6,20,8],true,4),INK,1.5);
  for(let i=0;i<3;i++)S(pEll(-52+i*-7,-2+i*1,1.3),PAPER,0);S(pRR(54,2,6,10,1),G3,1);
  S(pRR(-24,-20,48,40,9),INK,1.7);
  S(pRR(-19,-15,38,30,6),PAPER,1);
  for(let i=0;i<12;i++){const a=i/12*TAU;L(pLine(sin(a)*14,-cos(a)*11,sin(a)*16,-cos(a)*13,1),.8,INK,{taper:0})}
  clockHand(7,.9,1.6);clockHand(11,-.3,1.2);push();rot(st.sec||0);L(pLine(0,2,0,-12,2),.8,INK,{taper:0});pop();F(pEll(0,0,1.4),INK);
  S(pRR(24,-3,4,6,1),G3,.9);
  if((st.a||0)>0)faceFeat(14,{a:st.a,lx:st.lx,ly:st.ly,mo:0,sm:st.sm,mw:.5,ey:-1});
  pop()}

/* ---------- FACTORY TIMING MACHINE ---------- */
function machine(x,y,s,st=NOST,id=1){seed(700+id);const a=st.a||0;
  push();tr(x+(st.jx||0),y+(st.hop||0));scl(s*(st.sx||1),s*(st.sq||1));
  const pu=st.piston||0;
  S(pRR(-70,-250,140,250,4),G5,2.4);S(pRR(-76,-22,152,22,2),INK,2);S(pRR(-60,-300,28,60,2),G4,2);S(pRR(-66,-308,40,10,2),INK,2);
  for(let i=0;i<5;i++)F(pEll(-62,-230+i*48,2.2),G2),F(pEll(62,-230+i*48,2.2),G2);
  push();tr(0,-172);S(pEll(0,0,56,56,0,TAU,26),INK,2);dial(47,{num:'t'});clockHand(26,st.h||0,3.8);clockHand(36,st.m||0,2.8);F(pEll(0,0,3),INK);faceFeat(47,st);pop();
  S(pRR(-52,-108,104,80,3),G4,1.8);
  gear(-22,-68,23,10,st.g||0,G2,1.3);gear(20,-62,17,8,-(st.g||0)*1.3+.2,G1,1.2);
  L(pLine(52,-90,86,-90+pu*-34,3),5);S(pEll(90,-92+pu*-36,10),INK,1.6);
  S(pRR(30,-246,26,22,3),PAPER,1.4);L(pLine(43,-235,43+sin(st.m||0)*9,-235-cos(st.m||0)*9,1),1.2);
  if(st.puff){const p=st.puff;for(let i=0;i<3;i++){const u=frac(p+i/3);puff(-46+u*18,-315-u*54,5+u*11,G1,i+1)}}
  pop()}

/* ---------- THE MASTER CLOCK: theatrical showman ---------- */
function windKey(x,y,s,a,fill=G1){push();tr(x,y);rot(a);scl(s);
  union([capPts(-6,-46,-6,46,10,10).map((v,i)=>v),pEll(-34,-56,32,22,0,TAU,16,-.15),pEll(34,-56,32,22,0,TAU,16,.15)],fill,1.6);
  F(pEll(-34,-56,14,9,0,TAU,12,-.15),INK);F(pEll(34,-56,14,9,0,TAU,12,.15),INK);
  L(pLine(-13,-30,13,-30,2),1.6);L(pLine(-13,10,13,10,2),1.6);pop()}
function master(x,y,s,st=NOST,id=77){seed(100000+id);const a=st.a||0,arms=st.al||st.ar;
  push();tr(x+(st.jx||0),y+(st.jy||0));scl(s*(st.sx||1),s*(st.sq||1));
  const bend=st.bend||0,wv=st.wave||0,wt=st.wt||0;
  warp((px,py)=>{const v=clamp(-py/640,-.1,1.25);return [px+bend*v*v*100+wv*sin(v*7+wt)*16*v,py]});
  if(st.keyOn!==0){L(pLine(182,-190,200,-190,2),11,G3,{taper:0});windKey(204,-190,st.keyS||.62,st.key||0)}
  S(pRR(-226,-62,452,62,5),G5,3);S(pRR(-200,-92,400,34,4),G4,2.4);
  S(pRR(-182,-535,364,445,4),INK,3);
  for(const sd of [-1,1]){S(pRR(sd*166-15,-525,30,430,4),G4,1.8);for(let i=0;i<4;i++)L(pLine(sd*166-8+i*5,-510,sd*166-8+i*5,-108,8),.9,G2);S(pRR(sd*166-21,-540,42,18,3),G3,1.8);S(pRR(sd*166-21,-108,42,16,3),G3,1.8)}
  S(pRR(-72,-232,144,134,5),G5,2.2);
  const pa=st.pend||0;L(pLine(0,-232,sin(pa)*112,-232+cos(pa)*112,6),5,PAPER,{taper:0});S(pEll(sin(pa)*112,-232+cos(pa)*112,22),PAPER,2.2);L(pEll(sin(pa)*112,-232+cos(pa)*112,14,14),1,INK,{closed:true});
  for(const sd of [-1,1]){S(pEll(sd*110,-160,29),G5,2);gear(sd*110,-160,23,9,(st.g||0)*sd,G2,1.4)}
  S(spl([-218,-530,-180,-600,-90,-612,0,-648,90,-612,180,-600,218,-530,0,-540],true,7),INK,3);
  L(pQuad(-168,-560,0,-640,168,-560,14),1.8,G2);
  S(pEll(-196,-556,10),G4,1.6);S(pEll(196,-556,10),G4,1.6);
  /* bell */
  push();tr(0,-652);const bs=st.bell||0;L(pQuad(-34,0,0,-66,34,0,10),5);push();rot(bs);S([...pEll(0,-22,28,26,PI,TAU,10),36,-16,40,-6,-40,-6,-36,-16],G1,2.4);F(pEll(sin(bs*-3)*6,0,6),INK);L(pQuad(-14,-30,-18,-20,-22,-14,3),1.2);pop();pop();
  /* dial */
  push();tr(0,-385);
  S(pEll(0,0,168,168,0,TAU,36),G4,3);for(let i=0;i<24;i++){const b=i/24*TAU;F(pEll(cos(b)*159,sin(b)*159,2.4),G1)}
  S(pEll(0,0,152,152,0,TAU,36),INK,2);
  dial(148,{num:'r',pop:st.pop,lw:2});
  L(pEll(0,0,84,84,0,TAU,24),.9,G2,{closed:true});
  const sc=st.eyeS==null?(a<1?eBack(a):1):st.eyeS,mo=st.mo||0;
  if(a>.02){const eo=st.eo==null?1:st.eo,e2=st.eo2==null?eo:st.eo2;
    const ey=-38+(st.ey||0);
    eye(-56,ey,33*sc,46*sc,st.lx||0,st.ly||0,eo,{pupil:.62,w:2.6});eye(56,ey,33*sc,46*sc,st.lx||0,st.ly||0,e2,{pupil:.62,w:2.6});
    if(st.brow!=null){const b=st.brow;L(pQuad(-92,ey-48-b*2,-56,ey-62-b*14+(st.bcock||0)*-10,-20,ey-42+b*6,8),6);L(pQuad(20,ey-42+b*6,56,ey-62-b*14+(st.bcock||0)*12,92,ey-48-b*2,8),6)}
  }
  clockHand(68,st.h||0,10,st.hb||0);clockHand(104,st.m||0,7,st.mb||0);F(pEll(0,0,7),INK);F(pEll(0,0,2.6),PAPER);
  if(a>.02){const mw=st.mw==null?60:st.mw,gr=st.sm==null?1:st.sm;
    if(mo>.03)mouth(0,48,mw,46*mo,gr*30,{teeth:st.teeth!==0,tongue:1,dimple:1});
    else if(mw>2){L(pQuad(-mw,58,0,58+gr*22,mw,58,10),3.4);L(pQuad(-mw-5,50,-mw-9,58,-mw-2,64,3),2);L(pQuad(mw+5,50,mw+9,58,mw+2,64,3),2)}
  }
  pop();
  if(arms&&a>.02){const A=st.al||[-280,-250,30,0],B=st.ar||[280,-250,-30,0];
    hoseS(-178,-320,A[0],A[1],A[2]||30,13);glove(A[0],A[1],atan2(A[1]+320,A[0]+178),A[3]||0,3,1);
    hoseS(178,-320,B[0],B[1],B[2]||-30,13);const ang=atan2(B[1]+320,B[0]-178);
    if(st.baton!=null){push();tr(B[0],B[1]);rot(st.baton);clockHand(150,0,10);pop()}
    glove(B[0],B[1],ang,B[3]==null?3:B[3],3,-1)}
  pop()}

/* ---------- THE FLYING NUMERALS ---------- */
function numeral(x,y,ch,s,st=NOST,id=1){seed(800+id);push();tr(x,y);rot(st.lean||0);scl(s*(st.sx||1),s*(st.sq||1));
  const f=st.leg==null?0:st.leg;
  if(st.legs!==0){const lx=-9+sin(f)*7,ly=-abs(cos(f))*5*(st.lk||1),rx=9-sin(f)*7,ry=-abs(sin(f))*5*(st.lk||1);hose(-5,-22,lx,ly,-2,2.8);shoe(lx,ly,0,.52,-1);hose(5,-22,rx,ry,2,2.8);shoe(rx,ry,0,.52,1)}
  const sd=SD;text(ch,0,-48,52,{layers:[[11.5,INK,0,0],[6.2,PAPER,0,0]],wide:.68});SD=sd+20;
  eye(-6,-54,4.8,6.6,st.lx||0,st.ly||0,st.eo==null?1:st.eo,{w:1.3,pupil:.7});eye(6,-54,4.8,6.6,st.lx||0,st.ly||0,st.eo==null?1:st.eo,{w:1.3,pupil:.7});
  if(st.mo)F(pEll(0,-41,4,3+st.mo*3,0,TAU,10),INK);
  pop()}

/* ---------- THE JANITOR ---------- */
const J0={sq:1,sx:1,lean:0,bx:0,by:0,hx:0,hy:0,tilt:0,turn:0,eo:1,lx:0,ly:0,brow:0,mo:0,smile:0,cap:0,capr:0,hair:0,ton:0,
 lax:-40,lay:-20,lab:8,rax:40,ray:-20,rab:-8,llx:-15,lly:0,llb:-3,lla:0,rlx:15,rly:0,rlb:3,rla:0,lhk:0,rhk:0,acc:0,lift:0};
const jp=o=>Object.assign({},J0,o);
function jHead(p){const tn=p.turn*9;
  S(pEll(-24+tn*.3,2,6,8,0,TAU,10),PAPER,1.9);S(pEll(24+tn*.3,2,6,8,0,TAU,10),PAPER,1.9);
  S(spl([-22,-14,-25,6,-18,22,0,28,18,22,25,6,22,-14,0,-25],true,5),PAPER,2.3);
  push();tr(p.capr*6,-19-p.cap);rot(p.capr);
  S(spl([-27,0,-24,-16,-2,-25,22,-20,29,-3,2,3],true,5),INK,1.5);L(pQuad(-14,-20,-6,-8,-12,-1,3),1,G2);L(pQuad(8,-23,12,-10,6,0,3),1,G2);
  const bd=p.turn>=0?1:-1;S(spl([bd*6,-1,bd*30,-4,bd*40,2,bd*26,6],true,3),G4,1.5);pop();
  const eo_=p.eo,ex=9.6,by_=-7;
  for(const sd of [-1,1]){
    const X=sd*ex+tn;
    if(eo_<.16)L(pQuad(X-6,by_,X,by_+4,X+6,by_,4),2.2);
    else{piePupil(X+p.lx*2.2,by_+p.ly*2,5.8,10.5*min(1.15,eo_),-1.05+p.lx*.6,.62);if(eo_<.75)L(pLine(X-7,by_-10.5*eo_,X+7,by_-10.5*eo_,2),2.2)}
    L(pQuad(X-6,-20-p.brow*5+sd*1.5,X,-23-p.brow*6,X+6,-20-p.brow*5-sd*1.5,3),2.4,p.cap>7?INK:PAPER);
  }
  if(p.mo>.06){mouth(tn*.8,20,10+p.mo*4,9*p.mo+1,p.smile*5,{tongue:1})}
  S(spl([tn,11,tn-9,12,tn-24,20,tn-19,27,tn-7,21,tn,19,tn+7,21,tn+19,27,tn+24,20,tn+9,12],true,3),INK,1);
  if(p.ton>.05){S(spl([tn-5,24,tn-6,24+p.ton*15,tn,28+p.ton*18,tn+6,24+p.ton*15,tn+5,24],true,4),G2,1.5);L(pLine(tn,26,tn,26+p.ton*12,2),.9)}
  S(pEll(tn*1.3,8,10,7.6,0,TAU,16),G1,2);L(pQuad(tn*1.3-5,4,tn*1.3-3,2,tn*1.3,3,3),1.1);
  if(p.hair>.05)for(let i=-2;i<=2;i++)L(pQuad(i*7,-18,i*9,-24-p.hair*12,i*12,-28-p.hair*20,5),2.3,INK,{taper:.7});
}
function janitor(x,y,s,p,face=1,id=1){seed(9000+id);
  push();tr(x,y);scl(s*face,s);
  const hipx=p.bx,hipy=p.by-34;
  hoseS(-11+hipx,hipy,p.llx,p.lly,p.llb,4.6);shoe(p.llx,p.lly,p.lla,.86,-1);
  hoseS(11+hipx,hipy,p.rlx,p.rly,p.rlb,4.6);shoe(p.rlx,p.rly,p.rla,.86,1);
  push();tr(hipx,hipy);rot(p.lean);scl(p.sx,p.sq);
  hoseS(-24,-40,p.lax,p.lay,p.lab,4.4);glove(p.lax,p.lay,atan2(p.lay+40,p.lax+24),p.lhk,.92,1);
  if(p.acc>.01){S(spl([-20,-52,-27,-34,-25,8,0,12,25,8,27,-34,20,-52],true,5),PAPER,2.2);for(let i=0;i<7;i++){const yy=-48+i*9,zz=i%2?10:-10;L(pQuad(-26,yy,0,yy+zz*.6,26,yy,6),2.2)}}
  else{
    S(spl([-18,-56,-27,-40,-24,-30,0,-26,24,-30,27,-40,18,-56,0,-60],true,4),PAPER,2.2);
    L(pQuad(-6,-58,-1,-52,0,-48,3),1.1);L(pQuad(6,-58,1,-52,0,-48,3),1.1);
    S(spl([-23,-30,-32,-10,-27,6,0,13,27,6,32,-10,23,-30,12,-31,11,-44,-11,-44,-12,-31],true,4),INK,1.6);
    L(pLine(-10,-44,-17,-56,2),3.2);L(pLine(10,-44,17,-56,2),3.2);
    F(pEll(-8,-38,1.9),PAPER);F(pEll(8,-38,1.9),PAPER);
    S(pRR(-22,-8,15,14,1,8),G3,1);L(pLine(-22,-1,-7,-1,2),.8,INK);L(pLine(-15,-8,-15,6,2),.8,INK);
    L(pQuad(6,-18,14,-12,22,-18,4),1.1,G2);
  }
  push();tr(p.hx,-88+p.hy);rot(p.tilt);jHead(p);pop();
  hoseS(24,-40,p.rax,p.ray,p.rab,4.4);glove(p.rax,p.ray,atan2(p.ray+40,p.rax-24),p.rhk,.92,-1);
  pop();pop()}
function mopTool(hx,hy,x1,y1,s=1,sw=0){L(pLine(hx,hy,x1,y1,8),3.4*s,G5,{taper:.05});const a=atan2(y1-hy,x1-hx);for(let i=-4;i<=4;i++){const b=a+i*.2,l=20*s;L(pQuad(x1,y1,x1+cos(b)*l*.6+sw*3,y1+sin(b)*l*.6,x1+cos(b)*l+i*5*s+sw*6,y1+sin(b)*l+1,5),3.8*s,i%2?G1:PAPER,{taper:.3});}L(pLine(x1-cos(a+PI/2)*9*s,y1-sin(a+PI/2)*9*s,x1+cos(a+PI/2)*9*s,y1+sin(a+PI/2)*9*s,2),4.5*s,INK,{taper:0})}
function bucket(x,y,s=1,a=0,o={}){push();tr(x,y);rot(a);scl(s);
  L(pQuad(-23,-36,0,-62-(o.h||0),23,-36,8),1.8);
  S([-24,-38,24,-38,19,0,-19,0],G2,2.2);L(pLine(-23,-27,23,-27,4),1.1);L(pLine(-20,-6,20,-6,4),1.1);L(pLine(-10,-36,-8,-2,3),1.8,G1,{taper:.5});
  S(pEll(0,-38,24,5.4,0,TAU,16),o.empty?INK:G4,2);pop()}
function waterBlob(x,y,r,a=0,st=1){push();tr(x,y);rot(a);scl(st,1/st);S(spl([0,-r*1.25,r*.8,-r*.2,r*.62,r*.72,-r*.62,r*.72,-r*.8,-r*.2],true,4),G1,1.5);L(pQuad(-r*.3,r*.28,0,r*.5,r*.3,r*.3,3),.8);pop()}
function dizzy(x,y,r,t,s=1){for(let i=0;i<4;i++){const a=t*7+i/4*TAU;star(x+cos(a)*r,y+sin(a)*r*.33,5.5*s,a,i%2?PAPER:G1,1.1)}}
function shadow(x,y,rx,alpha=.35){C.fillStyle=`rgba(10,9,8,${alpha})`;tp(x,y);const X=OX,Y=OY;const sc=LW;C.beginPath();C.ellipse(X,Y,abs(rx)*sc,abs(rx)*.17*sc,0,0,TAU);C.fill()}

/* ============================================================
   BACKGROUND DEPARTMENT - gray watercolor washes & pen work
   ============================================================ */
const BG={};
const tv=(v,a=1)=>{const n=clamp(v,0,1);const r=n*255+3|0,g=n*252+2|0,b=n*243|0;return `rgba(${r},${g},${b},${a})`};
let PR=null,prn=12345;
const rnd=()=>{prn=(prn*16807)%2147483647;return prn/2147483647};
function washRect(x,y,w,h,v0,v1=v0,vert=true){const g=vert?C.createLinearGradient(0,y,0,y+h):C.createLinearGradient(x,0,x+w,0);g.addColorStop(0,tv(v0));g.addColorStop(1,tv(v1));C.fillStyle=g;C.fillRect(x,y,w,h)}
function mottle(x,y,w,h,n,r0,r1,dv,a=.05){for(let i=0;i<n;i++){const cx=x+rnd()*w,cy=y+rnd()*h,r=r0+rnd()*(r1-r0),v=rnd()<.5?dv:1-dv;const g=C.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,tv(v,a*(.5+rnd())));g.addColorStop(.7,tv(v,a*.4));g.addColorStop(1,tv(v,0));C.fillStyle=g;C.fillRect(cx-r,cy-r,r*2,r*2)}}
function brush(x0,y0,x1,y1,wd,v,a=.2,br=9){const dx=x1-x0,dy=y1-y0,l=hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;C.lineCap='round';for(let i=0;i<br;i++){const o=(i/(br-1)-.5)*wd,st=rnd()*.15,en=1-rnd()*.15;C.strokeStyle=tv(v,a*(.4+rnd()*.8));C.lineWidth=wd/br*(.7+rnd()*.9);C.beginPath();C.moveTo(x0+dx*st+nx*o,y0+dy*st+ny*o);C.quadraticCurveTo(x0+dx*.5+nx*(o+rnd()*3-1.5),y0+dy*.5+ny*(o+rnd()*3-1.5),x0+dx*en+nx*o,y0+dy*en+ny*o);C.stroke()}}
function fillPoly(p,v,a=1){C.fillStyle=typeof v==='string'?v:tv(v,a);C.beginPath();C.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)C.lineTo(p[i],p[i+1]);C.closePath();C.fill()}
function clipPoly(p,fn){C.save();C.beginPath();C.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)C.lineTo(p[i],p[i+1]);C.closePath();C.clip();fn();C.restore()}
function bricks(x,y,w,h,bw,bh,v,a=.35){C.lineWidth=1;for(let r=0,yy=y;yy<y+h;yy+=bh,r++){for(let xx=x-(r%2?bw/2:0);xx<x+w;xx+=bw){if(rnd()<.2){C.fillStyle=tv(rnd()<.5?.2:.75,.08+rnd()*.08);C.fillRect(xx+1,yy+1,bw-2,bh-2)}C.strokeStyle=tv(v,a*(.5+rnd()));C.beginPath();C.moveTo(xx+rnd()*2,yy);C.lineTo(xx+bw+rnd()*2,yy+rnd()-.5);C.moveTo(xx,yy);C.lineTo(xx+rnd(),yy+bh);C.stroke()}}}
function floorboards(x,y,w,h,vx,vy,n,v0,v1){washRect(x,y,w,h,v0,v1);mottle(x,y,w,h,30,50,160,.15,.05);C.strokeStyle=tv(.1,.55);for(let i=-n;i<=n*2;i++){const bx=x+i/n*w;C.lineWidth=1+rnd()*.9;C.beginPath();C.moveTo(lerp(vx,bx,(y-vy)/(y+h-vy)),y);C.lineTo(bx,y+h);C.stroke()}C.strokeStyle=tv(.1,.25);let yy=y+6,st=7;while(yy<y+h){C.lineWidth=.8;C.beginPath();C.moveTo(x,yy);C.lineTo(x+w,yy);C.stroke();yy+=st;st*=1.28}}
/* plates are registered here and painted the first time a shot needs them, at the film's resolution */
const PLATE={};
function makeBG(name,w,h,ox,oy,fn){PLATE[name]={w,h,ox,oy,fn};delete BG[name]}
function need(name){if(BG[name])return BG[name];const p=PLATE[name];if(!p)throw new Error("rubberhose: no plate "+name+" ("+Object.keys(PLATE).join(", ")+")");const c=document.createElement("canvas");c.width=p.w*RS|0;c.height=p.h*RS|0;const x=c.getContext("2d");x.scale(RS,RS);x.translate(-p.ox,-p.oy);const sv=[C,XF,LW,BOIL,AMP,SD,XS.length];C=x;XF=[];LW=1;BOIL=0;AMP=.9;SD=name.length*777;prn=12345+name.length*7919;p.fn(p.w,p.h);[C,XF,LW,BOIL,AMP,SD]=sv;XS.length=sv[6];return BG[name]={c,w:p.w,h:p.h,ox:p.ox,oy:p.oy}}
function moonWindow(x,y,w,h,moon){S([...pLine(x,y+h,x,y+w*.5,4),...pEll(x+w/2,y+w*.5,w/2,w/2,PI,TAU,12),...pLine(x+w,y+w*.5,x+w,y+h,4),...pLine(x+w,y+h,x,y+h,3)],G2,4);clipPoly([x,y+h,x,y+w*.5,x+w/2,y-2,x+w,y+w*.5,x+w,y+h],()=>{washRect(x,y,w,h,.62,.82);mottle(x,y,w,h,8,20,60,.95,.12);if(moon){C.fillStyle=tv(.98);C.beginPath();C.arc(x+w*.62,y+w*.56,w*.21,0,TAU);C.fill();C.fillStyle=tv(.72);C.beginPath();C.arc(x+w*.53,y+w*.5,w*.17,0,TAU);C.fill()}});for(let i=1;i<3;i++)L(pLine(x+w*i/3,y+w*.15,x+w*i/3,y+h,6),2.2,G5);for(let i=1;i<5;i++)L(pLine(x,y+w*.3+(h-w*.3)*i/5,x+w,y+w*.3+(h-w*.3)*i/5,5),2,G5)}
function shaft(p,a=.1){const g=C.createLinearGradient(p[0],p[1],p[6]||p[4],p[7]||p[5]);g.addColorStop(0,tv(.95,a));g.addColorStop(1,tv(.95,0));C.fillStyle=g;C.beginPath();C.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)C.lineTo(p[i],p[i+1]);C.closePath();C.fill()}
function miniClockShelf(x0,x1,y,s,seed_){L(pLine(x0,y,x1,y,8),4,G5,{taper:0});for(let x=x0+18*s;x<x1-10;x+=(38+hash(x+seed_)*12)*s){const k=hash(x*3.3+seed_),r=(10+k*7)*s;if(k<.4){S(pRR(x-r*.9,y-r*2.5,r*1.8,r*2.5,2),G5,1.2);S(pEll(x,y-r*1.5,r*.7),G1,1)}else if(k<.75){S(pEll(x,y-r,r),G5,1.2);S(pEll(x,y-r,r*.74),G1,.9);L(pLine(x,y-r,x+r*.4,y-r-r*.3,1),1)}else{S([x-r,y,x-r,y-r*1.4,x,y-r*2.3,x+r,y-r*1.4,x+r,y],G5,1.2);S(pEll(x,y-r*.8,r*.5),G1,.9)}}}
function beamSet(w,vx){fillPoly([0,-70,w,-70,w,40,0,40],.13);mottle(0,-70,w,110,16,30,80,.3,.05);for(let i=0;i<=8;i++){const x=i/8*w;L(pLine(x,-70,lerp(vx,x,.68),40,4),6,'#1a1916');}L(pLine(0,40,w,40,10),5,'#1a1916',{taper:0})}

function buildBGs(){
 /* THE FACTORY FLOOR, wide */
 makeBG('factory',1400,860,0,-70,(w)=>{const vx=700,vy=300;
  washRect(0,-70,1400,560,.3,.52);mottle(0,-70,1400,560,50,50,190,.12,.06);
  bricks(0,40,1400,450,46,18,.14,.3);mottle(0,40,1400,450,30,60,160,.75,.06);
  moonWindow(235,70,140,290,false);moonWindow(1025,70,140,290,true);moonWindow(625,50,150,250,false);
  /* side walls raked in hard perspective */
  fillPoly([0,-70,200,40,200,490,0,650],.25);clipPoly([0,-70,200,40,200,490,0,650],()=>{mottle(0,-70,200,720,12,50,130,.1,.08);for(let i=0;i<6;i++)brush(0,80+i*90,200,110+i*65,14,.08,.12)});
  fillPoly([1400,-70,1200,40,1200,490,1400,650],.25);clipPoly([1400,-70,1200,40,1200,490,1400,650],()=>{mottle(1200,-70,200,720,12,50,130,.1,.08);for(let i=0;i<6;i++)brush(1400,80+i*90,1200,110+i*65,14,.08,.12)});
  L(pLine(200,40,200,490,10),4,G5);L(pLine(1200,40,1200,490,10),4,G5);
  for(let i=0;i<3;i++){const yy=120+i*120;miniClockShelf(20,185,yy+i*10,.9-.0*i,i+2);miniClockShelf(1215,1380,yy+i*10,.9,i+9)}
  miniClockShelf(210,560,395,.62,3);miniClockShelf(840,1190,395,.62,4);
  /* gears on the back wall */
  gear(470,160,70,14,.2,G4,2.4);gear(558,216,44,10,.5,G3,2);gear(930,150,74,14,.1,G4,2.4);gear(840,214,40,10,.3,G3,2);
  /* moon shafts */
  shaft([240,300,370,300,560,620,300,620],.12);shaft([1030,300,1160,300,1090,620,810,620],.14);
  /* floor */
  fillPoly([200,490,1200,490,1400,650,1400,800,0,800,0,650],.5);
  clipPoly([200,490,1200,490,1500,800,-100,800],()=>{floorboards(-100,490,1600,310,vx,vy,22,.4,.6);
    const gl=C.createRadialGradient(700,620,20,700,620,540);gl.addColorStop(0,tv(.9,.2));gl.addColorStop(1,tv(.9,0));C.fillStyle=gl;C.fillRect(0,490,1400,310);
    shaft([300,490,560,490,640,800,120,800],.1);shaft([830,490,1100,490,1270,800,760,800],.1)});
  fillPoly([0,650,200,490,-40,800],.3,.8);fillPoly([1400,650,1200,490,1440,800],.3,.8);
  L(pLine(200,490,1200,490,20),4.5,G5,{taper:0});L(pLine(200,490,0,650,8),4,G5);L(pLine(1200,490,1400,650,8),4,G5);
  /* platform with the ladder */
  S(pRR(838,385,158,14,2,14),G4,2.6);L(pLine(960,399,960,492,6),6,G5,{taper:0});L(pLine(850,399,850,492,6),6,G5,{taper:0});L(pLine(850,410,960,470,6),3.5,G5);L(pLine(960,410,850,470,6),3.5,G5);
  L(pLine(975,385,975,496,8),4,G5,{taper:0});L(pLine(1002,385,1002,496,8),4,G5,{taper:0});for(let y=397;y<495;y+=16)L(pLine(975,y,1002,y,2),3,G5,{taper:0});
  /* overhead shafting, belts, lamps */
  beamSet(1400,vx);
  L(pLine(0,62,1400,62,20),7,'#191815',{taper:0});
  for(const x of [150,440,960,1260]){gear(x,62,26,10,x,G4,1.8);L(pLine(x-20,70,x-40,300,6),3,G5);L(pLine(x+20,70,x+40,300,6),3,G5)}
  for(const x of [330,1070]){L(pLine(x,40,x,110,4),2,G5);S([x-18,126,x-6,110,x+6,110,x+18,126],G4,1.6)}
  C.fillStyle=tv(.6,.05);C.fillRect(0,-70,1400,860);
 });
 /* AT THE FOOT OF THE MASTER CLOCK */
 makeBG('hall',1100,780,-70,-30,()=>{
  washRect(-70,-30,1100,690,.36,.58);mottle(-70,-30,1100,690,34,60,190,.14,.06);bricks(-70,-30,1100,690,58,23,.16,.28);mottle(-70,-30,1100,690,24,60,170,.8,.07);
  gear(80,160,120,18,.3,G4,2.6);gear(232,282,66,12,.5,G3,2.2);gear(860,120,132,18,.2,G4,2.6);gear(760,300,56,10,.4,G3,2.2);
  for(const x of [50,900])L(pLine(x,-30,x,640,10),9,G4,{taper:0});
  shaft([-70,80,110,60,410,660,20,660],.16);shaft([790,60,1030,100,840,660,540,660],.12);
  S(pRR(-70,520,1100,14,1,20),G4,2);
  clipPoly([-70,640,1030,640,1030,780,-70,780],()=>{floorboards(-70,640,1100,140,480,270,14,.4,.64);const gl=C.createRadialGradient(400,690,10,400,690,430);gl.addColorStop(0,tv(.9,.25));gl.addColorStop(1,tv(.9,0));C.fillStyle=gl;C.fillRect(-70,640,1100,140)});
  L(pLine(-70,640,1030,640,20),4.5,G5,{taper:0});
 });
 /* BRICK WALL for rows of clocks */
 makeBG('wall',1200,800,-120,-40,()=>{
  washRect(-120,-40,1200,620,.44,.64);mottle(-120,-40,1200,620,34,60,180,.15,.07);bricks(-120,-40,1200,620,62,24,.18,.32);mottle(-120,-40,1200,620,22,60,180,.85,.07);
  S(pRR(-120,560,1200,22,2,20),G4,2.4);S(pRR(-120,582,1200,40,1,20),G3,1.6);
  L(pLine(-120,72,1080,72,20),4,G4,{taper:0});
  clipPoly([-120,622,1080,622,1080,760,-120,760],()=>{floorboards(-120,622,1200,140,480,300,16,.42,.64)});
  L(pLine(-120,622,1080,622,20),4.5,G5,{taper:0});
  const gl=C.createRadialGradient(480,300,60,480,300,620);gl.addColorStop(0,tv(.95,.14));gl.addColorStop(1,tv(.95,0));C.fillStyle=gl;C.fillRect(-120,-40,1200,800);
 });
 /* FLOOR CLOSE-UP */
 makeBG('floor',1100,840,-70,-60,()=>{floorboards(-70,-60,1100,840,480,-600,9,.52,.7);mottle(-70,-60,1100,840,40,60,180,.15,.07);
  for(let i=0;i<14;i++){const x=rnd()*1000-20,y=rnd()*720;C.strokeStyle=tv(.12,.25);C.lineWidth=1;C.beginPath();C.moveTo(x,y);C.quadraticCurveTo(x+8,y+40,x-5,y+90);C.stroke()}
  const g=C.createRadialGradient(480,410,80,480,410,520);g.addColorStop(0,tv(.95,.26));g.addColorStop(1,tv(.1,.26));C.fillStyle=g;C.fillRect(-70,-60,1100,840);});
 /* CONVEYOR RUN - seamless repeating panorama */
 makeBG('run',1600,720,0,0,()=>{
  washRect(0,0,1600,520,.36,.56);mottle(0,0,1600,520,40,50,170,.14,.06);bricks(0,0,1600,520,50,20,.17,.26);
  for(let i=0;i<4;i++){const x=i*400;moonWindow(x+220,50,100,190,i%2===0);gear(x+100,120,64,12,i,G4,2.2);gear(x+176,178,38,10,i+1,G3,1.8);L(pLine(x+370,0,x+370,520,10),8,G4,{taper:0});miniClockShelf(x+20,x+200,300,.8,i);miniClockShelf(x+205,x+365,352,.75,i+5);}
  shaft([200,240,330,240,520,520,300,520],.13);shaft([1000,240,1130,240,1320,520,1100,520],.13);
  S(pRR(-10,516,1620,10,1,20),G4,2);
  clipPoly([0,526,1600,526,1600,720,0,720],()=>{floorboards(0,526,1600,194,800,260,28,.42,.56)});
 });
 /* THE LONG WAY UP - floor to rafters */
 makeBG('tower',1000,2000,-20,-300,()=>{
  washRect(-20,-300,1000,2000,.2,.54);mottle(-20,-300,1000,2000,70,60,200,.1,.06);bricks(-20,500,1000,1100,56,22,.14,.26);
  for(const y of [1100,720]){gear(150,y,90,16,y,G4,2.4);gear(820,y-60,110,18,y*.3,G4,2.4)}
  for(let y=380;y>-220;y-=170){S(pRR(-40,y,1040,40,2,24),G5,3);for(let i=0;i<7;i++)L(pLine(i*160-20,y+40,i*160+60,y+150,6),9,G5,{taper:0})}
  L(pLine(120,-300,120,1500,14),12,G5,{taper:0});L(pLine(860,-300,860,1500,14),12,G5,{taper:0});
  moonWindow(380,500,200,420,true);
  for(let i=0;i<36;i++){const x=rnd()*960,y=-290+rnd()*560;C.fillStyle=tv(.9,.5);C.beginPath();C.arc(x,y,1+rnd()*1.5,0,TAU);C.fill()}
  clipPoly([-20,1500,980,1500,980,1700,-20,1700],()=>{floorboards(-20,1500,1000,200,480,1150,18,.42,.62)});
  L(pLine(-20,1500,980,1500,20),4.5,G5,{taper:0});
 });
 /* UP ON THE PLATFORM */
 makeBG('platform',1100,900,-70,-90,()=>{
  washRect(-70,-90,1100,900,.3,.48);mottle(-70,-90,1100,900,40,60,190,.1,.07);bricks(-70,-90,1100,900,60,24,.13,.28);
  gear(760,180,110,16,.3,G4,2.4);gear(140,120,90,14,.6,G4,2.2);
  S(pRR(-70,540,1100,28,2,20),G3,3);for(let i=0;i<6;i++){L(pLine(i*200-40,568,i*200+60,810,6),8,G5,{taper:0});L(pLine(i*200+60,568,i*200-40,810,6),8,G5,{taper:0})}
 });
}
buildBGs();

/* ============================================================
   THE STAGE - a vaudeville stage for titles, words and end cards
   ============================================================ */
function curtain(x0,x1,y0,y1,dir,folds){const w=(x1-x0)/folds;for(let i=0;i<folds;i++){const x=x0+i*w,sw=(hash(i*3.7+dir)-.5)*w*.18,g=C.createLinearGradient(x,0,x+w,0);g.addColorStop(0,tv(.1));g.addColorStop(.35,tv(.42));g.addColorStop(.55,tv(.3));g.addColorStop(1,tv(.08));C.fillStyle=g;C.beginPath();C.moveTo(x,y0);C.lineTo(x+w,y0);C.quadraticCurveTo(x+w+sw,(y0+y1)/2,x+w+sw*1.6,y1);C.lineTo(x+sw*1.6,y1);C.quadraticCurveTo(x+sw,(y0+y1)/2,x,y0);C.closePath();C.fill();L(pQuad(x+w*.36,y0+20,x+w*.36+sw,(y0+y1)/2,x+w*.36+sw*1.6,y1,10),1.6,G5,{taper:.5})}
  mottle(x0,y0,x1-x0,y1-y0,18,40,140,.1,.05)}
makeBG('stage',1800,1500,-260,-390,()=>{
  washRect(-260,-390,1800,1500,.16,.3);mottle(-260,-390,1800,1500,40,80,240,.08,.06);
  /* backdrop: a pale wash lit from the front, a big soft spot in the middle */
  washRect(160,-60,960,900,.5,.66);mottle(160,-60,960,900,30,60,200,.9,.07);
  const sp=C.createRadialGradient(640,470,40,640,470,520);sp.addColorStop(0,tv(.97,.55));sp.addColorStop(1,tv(.97,0));C.fillStyle=sp;C.fillRect(160,-60,960,900);
  for(let i=0;i<9;i++)brush(170+i*110,-60,190+i*110,840,22,.3,.05);
  /* the main curtains, gathered to the sides */
  curtain(-260,300,-390,860,1,6);curtain(980,1540,-390,860,2,6);
  for(const [x,d] of [[300,1],[980,-1]]){L(pQuad(x,-80,x+d*44,260,x,860,12),3.6,G5,{taper:.3});S(pRR(x-(d>0?36:0)-6,330,42,26,6),G3,2.2);L(pLine(x-(d>0?40:-4),343,x+(d>0?4:40),343,4),1.4,G5)}
  /* the valance: a swagged pelmet with a fringe */
  fillPoly([-260,-390,1540,-390,1540,-130,-260,-130],.12);
  for(let i=0;i<8;i++){const x=-260+i*225;S([...pEll(x+112,-150,112,64,0,PI,16),x+224,-150,x,-150],G4,2.6);L(pQuad(x+20,-140,x+112,-100,x+204,-140,10),1.4,G2);for(let k=0;k<18;k++){const fx=x+8+k*12.4,fy=-150+sin((fx-x)/224*PI)*64;L(pLine(fx,fy,fx+1,fy+16,2),1.6,G2,{taper:.4})}}
  /* proscenium edges and the floor */
  for(const x of [140,1140])L(pLine(x,-130,x,860,12),7,G5,{taper:0});
  clipPoly([-260,860,1540,860,1540,1110,-260,1110],()=>{floorboards(-260,860,1800,250,640,520,26,.38,.56);const gl=C.createRadialGradient(640,880,20,640,880,640);gl.addColorStop(0,tv(.95,.3));gl.addColorStop(1,tv(.95,0));C.fillStyle=gl;C.fillRect(-260,860,1800,250)});
  L(pLine(-260,860,1540,860,24),4.5,G5,{taper:0});
  /* footlights along the lip of the stage */
  fillPoly([-260,1040,1540,1040,1540,1110,-260,1110],.1);
  for(let x=-220;x<1540;x+=86){const g=C.createRadialGradient(x,1040,4,x,1040,90);g.addColorStop(0,tv(.98,.35));g.addColorStop(1,tv(.98,0));C.fillStyle=g;C.fillRect(x-90,950,180,100);S([...pEll(x,1040,22,16,PI,TAU,10),x+22,1040,x-22,1040],G1,2)}
  L(pLine(-260,1040,1540,1040,24),5,G5,{taper:0});
});

/* ============================================================
   CAMERA, PLATES, LIVE PIECES
   ============================================================ */
const camPush=(x,y,z=1,r=0,sx=0,sy=0)=>{push();tr(W/2+sx,H/2+sy);if(r)rot(r);scl(z);tr(-x,-y)};
/* bgAt(name, x, y, zoom, rot, sx, sy): the plate centred on (x, y) in its own units. A plate always covers the frame: if the framing would show its edge, it zooms / slides in just enough.
   Returns the [x, y, zoom] it used, so the camera can follow: const v = bgAt('wall', 480, 360, 1); camPush(...v); … pop() */
let COVER=true;
function bgAt(n,x,y,z=1,r=0,sx=0,sy=0){const b=need(n);if(!COVER){C.save();C.translate(W/2+sx,H/2+sy);if(r)C.rotate(r);C.scale(z,z);C.translate(-x,-y);C.drawImage(b.c,b.ox,b.oy,b.w,b.h);C.restore();return [x,y,z,r,sx,sy]}const pad=r?.06:0,zz=max(z,(W/b.w)*(1+pad),(H/b.h)*(1+pad)),hw_=W/2/zz,hh_=H/2/zz;x=clamp(x,b.ox+hw_,b.ox+b.w-hw_);y=clamp(y,b.oy+hh_,b.oy+b.h-hh_);
  C.save();C.translate(W/2+sx,H/2+sy);if(r)C.rotate(r);C.scale(zz,zz);C.translate(-x,-y);C.drawImage(b.c,b.ox,b.oy,b.w,b.h);C.restore();return [x,y,zz,r,sx,sy]}
const veil=(col,a)=>{C.fillStyle=col;C.globalAlpha=a;C.fillRect(0,0,W,H);C.globalAlpha=1};
const shake=(t,a,sd=1)=>[(vnoise(t*31,sd)-.5)*2*a,(vnoise(t*37,sd+4)-.5)*2*a];
const E=(dt,f=2,d=3)=>(dt<0?0:exp(-d*dt)*cos(TAU*f*dt));   // a damped spring: 1 at the hit, ringing down
const dec=(dt,d=3)=>(dt<0?0:exp(-d*dt));
/* an elastic value: rest 1, slammed to lo at t0, rings back (2 drawings held on the hit) */
const hit=(t,t0,lo=.6,f=2.2,d=3,hold=.13)=>(t<t0?1:1-(1-lo)*exp(-d*max(0,t-t0-hold))*cos(TAU*f*max(0,t-t0-hold)));
const pulse=b=>exp(-frac(b)*5);
/* the sunburst behind a title card: wedges that tick round a notch per drawing, a pale ring */
function rays(cx,cy,u,o={}){C.fillStyle=tv(o.v??.72);C.fillRect(0,0,W,H);seed(50);const n=o.n??16,rr=floor(u*12)/12*(o.spin??.12),R=hypot(W,H);for(let i=0;i<n;i++){const a=i/n*TAU+rr,d=TAU/(n*4);F([cx,cy,cx+cos(a-d)*R,cy+sin(a-d)*R,cx+cos(a+d)*R,cy+sin(a+d)*R],G3)}if(o.ring!==0)S(pEll(cx,cy,o.ring??190,o.ring??190,0,TAU,30),G1,3.4)}
function spotlights(cx,cy,b,o={}){C.save();C.globalCompositeOperation='lighter';const n=o.n??4;for(let i=0;i<n;i++){const a=sin(b*PI/4+i*1.7)*.4,x0=lerp(W*.09,W*.91,n>1?i/(n-1):.5),l=H*1.15;C.fillStyle=`rgba(255,250,235,${o.a??.075})`;C.beginPath();C.moveTo(x0-12,-10);C.lineTo(x0+12,-10);C.lineTo(x0+sin(a)*l+150,l);C.lineTo(x0+sin(a)*l-150,l);C.closePath();C.fill()}C.restore()}
/* impact: lines bursting out of a spot, a white star on the hit */
function hitLines(x,y,R,sd=120){seed(sd);for(let i=0;i<14;i++){const a=i/14*TAU+hash(i)*.3,r0=R*(1.1+hash(i*3)*.2),r1=R*(1.9+hash(i*5)*1.3);L(pLine(x+cos(a)*r0,y+sin(a)*r0,x+cos(a)*r1,y+sin(a)*r1,3),6,i%2?PAPER:INK)}}
function impactStar(x,y,r,a=0){burst(x,y,r*1.28,16,a+.1,INK,2.4,.62);burst(x,y,r,14,a,PAPER,2.2,.56)}

  const PE = P.E, set = P.set, el = P.el;
  const Ms = (z, e) => M(z, e);
  const f1 = (n) => Math.round(n * 10) / 10;
  const FONTS = { display: '"Luckiest Guy", "ZCOOL KuaiLe", "Noto Sans SC", sans-serif', body: '"Luckiest Guy", "ZCOOL KuaiLe", "Noto Sans SC", sans-serif' };
  const LIB = { camPush, bgAt, need, BG, veil, shake, E, dec, hit, pulse, K, seg, sm, lin, eOut, eIn, eBack, eEl, hd, bump, lerp, lerpv, clamp, frac, hash, vnoise, sin, cos, abs, min, max, floor, ceil, sqrt, pow, exp, atan2, hypot, round, TAU, PI,
    push, pop, tr, rot, scl, warp, seed, S, F, L, SC, union, poly, pLine, pQuad, pCub, pEll, pRR, spl, off, capPts, gearPts, hose, hoseS, glove, shoe, piePupil, eye, mouth, star, burst, puff, sweat, speed, coil, gear, musicNote, ringWaves, text, glyph,
    clockHand, dial, faceFeat, arm, bladeBlur, grandfather, wallClock, cuckooBird, cuckoo, alarm, pocket, wristwatch, machine, windKey, master, numeral, J0, jp, jHead, janitor, mopTool, bucket, waterBlob, dizzy, shadow,
    rays, spotlights, hitLines, impactStar, tv, rnd, washRect, mottle, brush, fillPoly, clipPoly, bricks, floorboards, moonWindow, shaft, miniClockShelf,
    INK, PAPER, G1, G2, G3, G4, G5, ctx: () => C, n: () => BOIL, setBoil: (v) => { BOIL = v; } };

  // ---------- the film ----------
  P.rubberhose = function (FM, opt = {}) {
    const PT = FM.portrait, ACADEMY = !!opt.academy && !PT, FLAT = !!opt.flat;
    /* the logical page is 720 on its short side (portrait: 720 wide); opt.academy pillarboxes a 4:3 gate inside a wide frame */
    const pxH = FM.H, pxW = ACADEMY ? Math.round((FM.H * 4) / 3) : FM.W;
    RS = min(pxW, pxH) / 720; W = pxW / RS; H = pxH / RS;
    for (const k in BG) delete BG[k];
    COVER = opt.cover !== false;   // cover: false = plates drawn exactly where asked, edges and all (the reference film's original framing)
    const GX = (FM.W - pxW) / 2;
    const FPSD = opt.drawings ?? 15, BOILON = (opt.boil ?? 1) > 0, AMP0 = 0.62 * (opt.boil ?? 1);
    const Q = (t) => floor(t * FPSD + 1e-6) / FPSD;
    const SEED = (() => { let h = 2166136261; for (const c of String(opt.seed ?? 'rubberhose')) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; })();
    const COL = { ink: INK, paper: PAPER, g1: G1, g2: G2, g3: G3, g4: G4, g5: G5, ...(opt.colors || {}) };
    const FONT = { ...FONTS, ...(opt.fonts || {}) };
    FM.blurBase(1);   // on twos with a grain of its own: motion blur would only average the grain away
    const G = { F: FM, W, H, RS, colors: COL, fonts: FONT, portrait: PT, L: (a, b) => (PT && b !== undefined ? b : a), lib: LIB, n: () => BOIL, Q };

    /* the projector: weave, lamp flicker, heavy grain, dust, hairs, scratches running down the reel, a splice bump on each cut, the rounded gate. Seeded: every render is the same. */
    const seeded = (s) => { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    const grains = []; const R0 = seeded(SEED ^ 0x51);
    const grainOf = () => { if (!grains.length) for (let k = 0; k < 4; k++) { const c = mk(320, 320), x = c.getContext('2d'), im = x.createImageData(320, 320); for (let i = 0; i < im.data.length; i += 4) { const v = ((R0() + R0()) / 2) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); grains.push(c); } return grains; };
    const vignette = (w0, h0) => { const v = mk(w0, h0), x = v.getContext('2d'), g = x.createRadialGradient(w0 / 2, h0 / 2, min(w0, h0) * 0.32, w0 / 2, h0 / 2, max(w0, h0) * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(6,5,3,.16)'); g.addColorStop(1, 'rgba(4,3,2,.62)'); x.fillStyle = g; x.fillRect(0, 0, w0, h0); if (opt.gate !== false) { x.fillStyle = '#000'; const R = 37 * RS, e = 4 * RS, w = w0, h = h0; x.beginPath(); x.rect(0, 0, w, h); x.moveTo(R, e); x.lineTo(w - R, e); x.quadraticCurveTo(w - e, e, w - e, R); x.lineTo(w - e, h - R); x.quadraticCurveTo(w - e, h - e, w - R, h - e); x.lineTo(R, h - e); x.quadraticCurveTo(e, h - e, e, h - R); x.lineTo(e, R); x.quadraticCurveTo(e, e, R, e); x.closePath(); x.fill('evenodd'); } return v; };
    let VIG = null;
    /* dust, hairs, scratches: never two frames the same */
    const wear = (D, f, vw, vh, k = 1) => {
      for (let i = 0; i < 5; i++) { const h = hash(f * 11.3 + i * 7.7); if (h < 0.42 * k) { const x = hash(f + i * 3.1) * vw, y = hash(f * 2 + i * 5.9) * vh, r = (0.6 + hash(f * 3 + i) * 2.1) * RS / 1.25; D.fillStyle = h < 0.26 ? 'rgba(8,7,6,.78)' : 'rgba(250,246,232,.72)'; D.beginPath(); D.ellipse(x, y, r, r * (0.5 + hash(i + f)), hash(i * f), 0, TAU); D.fill(); } }
      if (hash(f * 0.73) < 0.07 * k) { const x = hash(f * 4.1) * vw, y = hash(f * 6.2) * vh, a = hash(f * 7.7) * TAU, l = (16 + hash(f * 8.1) * 56) * RS / 1.25; D.strokeStyle = hash(f) < 0.6 ? 'rgba(10,8,6,.7)' : 'rgba(250,246,232,.55)'; D.lineWidth = 0.9 * RS / 1.25; D.beginPath(); D.moveTo(x, y); D.bezierCurveTo(x + cos(a) * l * 0.3 + 8, y + sin(a) * l * 0.3, x + cos(a) * l * 0.7 - 8, y + sin(a) * l * 0.7 + 6, x + cos(a) * l, y + sin(a) * l); D.stroke(); }
      const sc = floor(f / 34); for (let j = 0; j < 2; j++) { if (hash(sc * 3.3 + j) < 0.5 * k) { const x = hash(sc * 1.9 + j * 7) * vw + (hash(f * 1.1 + j) - 0.5) * 3.5; D.fillStyle = j ? 'rgba(255,250,235,.11)' : 'rgba(10,8,6,.15)'; D.fillRect(x, 0, (1 + hash(f + j) * 0.8) * RS / 1.25, vh); } }
      if (hash(f * 0.37) < 0.018 * k) { D.fillStyle = 'rgba(255,250,235,.09)'; D.fillRect(0, hash(f * 2.2) * vh, vw, (3 + hash(f * 1.2) * 5) * RS / 1.25); }
    };

    G.ctx2 = () => C;
    const shots = [], over = [], stills = [], irises = [], lc = new Map(); let curLayer = null;
    /* G.shot(a, b, (u, t) => …): everything between a and b is drawn by your function, called once per drawing with seconds into the shot and film time. A cut at a. */
    G.shot = (a, b, fn, o = {}) => { shots.push({ a, b, fn, o }); shots.sort((p, q) => p.a - q.a); if (a > 0 && o.cut !== false) FM.cut(a); return G; };
    /* G.still(a, b): the lines stop boiling (nobody breathes) */
    G.still = (a, b) => { stills.push([a, b]); return G; };
    /* G.pause(a, b, { energy, name, hit, stop }): the held beat: the lines stop boiling, the band stops dead (stop: true = it sags to a stop like tape winding down first) and comes back at b. Sound effects still play. */
    G.pause = (a, b, o = {}) => { G.still(a, b); FM.section(b, o.energy ?? 3, { name: o.name ?? 'drop', hit: o.hit !== false, gap: b - a, hush: true, ...(o.stop ? { stop: b - a } : {}) }); return G; };
    /* G.iris(at, { out: true|false, dur, x, y }): the iris closing to black (out) or opening from it, x / y logical */
    G.iris = (at, o = {}) => { const dur = o.dur ?? 0.7; irises.push({ at, dur, out: o.out !== false, x: o.x ?? W / 2, y: o.y ?? H / 2 }); FM.transition(at, at + dur); if (o.sfx !== false) FM.sfx(at, 'slide', 0.45, { dur, dir: o.out !== false ? -1 : 1 }); return G; };
    /* G.top((u, t) => …, a, b): drawn over the shots in the same frame, no camera (screen units) */
    G.top = (fn, a = 0, b = 1e9) => { (curLayer ? lcOf(curLayer).items : over).push({ fn, a, b }); return G; };
    const cl01 = (v) => clamp(v, 0, 1);
    const irisDraw = (t) => { for (const r of irises) { if (t < r.at) continue; let q = (t - r.at) / r.dur; if (r.out) { if (t > r.at + r.dur) { const nx = irises.find((z) => !z.out && z.at >= r.at + r.dur); if (!nx || t < nx.at) { C.fillStyle = '#000'; C.fillRect(0, 0, W, H); } continue; } q = cl01(q) ** 3; } else { if (t > r.at + r.dur) continue; q = (1 - cl01(q)) ** 3; } const far = hypot(max(r.x, W - r.x), max(r.y, H - r.y)) + 4, rad = far * (1 - q); C.fillStyle = '#000'; C.beginPath(); C.rect(0, 0, W, H); C.moveTo(r.x + rad, r.y); C.arc(r.x, r.y, max(0.01, rad), 0, TAU, true); C.fill('evenodd'); } };
    const isStill = (t) => stills.some(([a, b]) => t >= a && t < b);
    const beginDrawing = (ctx, n, t) => { C = ctx; XF = []; XS.length = 0; LW = 1; SD = 0; BOIL = isStill(t) ? 4242 : (BOILON ? n : 0); AMP = AMP0; };
    const reset = () => { XF = []; XS.length = 0; LW = 1; };
    const lcOf = (layer) => { if (!lc.has(layer)) { const c = el('canvas', `left:${GX}px;top:0;width:${pxW}px;height:${pxH}px;z-index:1;pointer-events:none`, layer); c.width = pxW; c.height = pxH; c.dataset.motion = 'skip'; const x = c.getContext('2d'); x.scale(RS, RS); lc.set(layer, { x, items: [], last: -1 }); } return lc.get(layer); };
    G.into = (layer, fn) => { const prev = curLayer; curLayer = layer; if (layer) lcOf(layer); try { return fn(); } finally { curLayer = prev; } };
    G.draw = (fn, a = 0, b = 1e9) => { if (curLayer) lcOf(curLayer).items.push({ fn, a, b }); else over.push({ fn, a, b }); return G; };

    if (!FLAT) {
      const view = el('canvas', `left:${GX}px;top:0;width:${pxW}px;height:${pxH}px;z-index:1;pointer-events:none`, FM.layer('', 1)); view.width = pxW; view.height = pxH; view.dataset.motion = 'skip';
      const D = view.getContext('2d'), buf = mk(pxW, pxH), BX = buf.getContext('2d'); BX.scale(RS, RS); G.ctx = BX;
      const hal = mk(pxW / 5, pxH / 5), HX = hal.getContext('2d'); let last = -1;
      FM.add((t) => {
        const n = floor(t * FPSD + 1e-6), tq = n / FPSD;
        if (n !== last) { last = n; beginDrawing(BX, n, tq); BX.fillStyle = '#000'; BX.fillRect(0, 0, W, H); const s = shots.filter((x) => tq >= x.a && tq < x.b).pop(); if (s) { s.fn(tq - s.a, tq); reset(); } for (const it of over) if (tq >= it.a && tq < it.b) { it.fn(tq - it.a, tq); reset(); } irisDraw(tq); HX.filter = 'contrast(1.3)'; HX.drawImage(buf, 0, 0, hal.width, hal.height); HX.filter = 'none'; }
        if (opt.film === false) { D.drawImage(buf, 0, 0); return; }
        const f = round(t * 24), wx = (vnoise(f * 0.42, 1) - 0.5) * 2.6 + (hash(f * 1.17) - 0.5) * 0.5, wy = (vnoise(f * 0.31, 2) - 0.5) * 3.2 + (hash(f * 2.3) - 0.5) * 0.7;
        D.globalCompositeOperation = 'source-over'; D.globalAlpha = 1; D.filter = 'grayscale(1)'; D.drawImage(buf, wx * RS - 3, wy * RS - 3, pxW + 6, pxH + 6); D.filter = 'none';
        D.globalCompositeOperation = 'screen'; D.globalAlpha = 0.11; D.drawImage(hal, 0, 0, pxW, pxH);
        const fl = (vnoise(f * 0.9, 5) - 0.5) * 0.1 + (hash(f * 3.7) - 0.5) * 0.045; D.globalCompositeOperation = 'source-over'; D.globalAlpha = 1; D.fillStyle = fl > 0 ? `rgba(0,0,0,${fl})` : `rgba(255,250,235,${-fl * 0.8})`; D.fillRect(0, 0, pxW, pxH);
        if (!isStill(t) && shots.some((s) => s.a > 0 && s.o.cut !== false && t >= s.a && t - s.a < 1 / 24)) { D.fillStyle = 'rgba(255,252,240,.12)'; D.fillRect(0, 0, pxW, pxH); }   // the splice bump
        const gr = grainOf(), ox = (hash(f * 5.3) * 320) | 0, oy = (hash(f * 9.1) * 320) | 0; D.save(); D.globalCompositeOperation = 'overlay'; D.globalAlpha = 0.34; D.translate(ox, oy); D.fillStyle = D.createPattern(gr[f % 4], 'repeat'); D.fillRect(-ox, -oy, pxW, pxH); D.restore();
        D.globalAlpha = 1; D.globalCompositeOperation = 'source-over'; wear(D, f, pxW, pxH); VIG ??= vignette(pxW, pxH); D.drawImage(VIG, 0, 0);
      });
      if (GX > 0) FM.stage.style.background = '#000';
    } else {
      /* quick version: every scene layer owns a canvas; a grain sheet, a flicker veil and the wear float over all of them */
      const fg = FM.layer('pointer-events:none;mix-blend-mode:overlay;opacity:.3', 96), fc = el('canvas', 'left:0;top:0;width:100%;height:100%', fg); fc.width = FM.W; fc.height = FM.H; fc.dataset.motion = 'skip'; const fx = fc.getContext('2d');
      const wl = FM.layer('pointer-events:none', 97), wc = el('canvas', 'left:0;top:0;width:100%;height:100%', wl); wc.width = FM.W; wc.height = FM.H; wc.dataset.motion = 'skip'; const wx = wc.getContext('2d');
      FM.late((t) => {
        const n = floor(t * FPSD + 1e-6), tq = n / FPSD;
        for (const [layer, L_] of lc) { if (layer.style.display === 'none' || L_.last === n) continue; L_.last = n; beginDrawing(L_.x, n, tq); C.clearRect(0, 0, W, H); for (const it of L_.items) { if (tq >= it.a && tq < it.b) { it.fn(tq - it.a, tq); reset(); } } }
        if (opt.film === false) return;
        const f = round(t * 24), gr = grainOf(), ox = (hash(f * 5.3) * 320) | 0, oy = (hash(f * 9.1) * 320) | 0; fx.save(); fx.clearRect(0, 0, FM.W, FM.H); fx.translate(ox, oy); fx.fillStyle = fx.createPattern(gr[f % 4], 'repeat'); fx.fillRect(-ox, -oy, FM.W, FM.H); fx.restore();
        wx.clearRect(0, 0, FM.W, FM.H); const fl = (vnoise(f * 0.9, 5) - 0.5) * 0.08 + (hash(f * 3.7) - 0.5) * 0.03; wx.fillStyle = fl > 0 ? `rgba(0,0,0,${fl})` : `rgba(255,250,235,${-fl * 0.7})`; wx.fillRect(0, 0, FM.W, FM.H); wear(wx, f, FM.W, FM.H, 0.7); VIG ??= vignette(FM.W, FM.H); wx.drawImage(VIG, 0, 0);
      });
    }

    /* ---------- lettering ---------- */
    const toPx = (v) => v * RS;
    const inkCss = (size, col, edge = COL.ink) => `color:${col};-webkit-text-stroke:${f1(size * 0.1)}px ${edge};paint-order:stroke fill;text-shadow:${f1(size * 0.05)}px ${f1(size * 0.07)}px 0 ${edge}`;
    let twl = null;
    /* G.write(text, { x, y, size, at, until, color, edge, align, wrap, pop, kind, parent, noFact }): hand-lettered title type (DOM, logical units), white with an ink edge by default.
       Lands with a squash and stretch, on twos. pop: letter by letter, each one hopping in. */
    G.write = (txt, o = {}) => {
      const a = o.at ?? 0, until = o.until ?? 1e9, size = toPx(o.size ?? 54), col = o.color ?? COL.paper, edge = o.edge ?? (col === COL.ink ? COL.paper : COL.ink), parent = o.parent ?? (twl ??= FM.layer('pointer-events:none', 40));
      const wrapW = o.wrap ? toPx(o.wrap) : null, align = o.align ?? 'center', x0 = GX + toPx(typeof o.x === 'function' ? 0 : (o.x ?? W / 2)), y0 = toPx(typeof o.y === 'function' ? 0 : (o.y ?? H / 2));
      const box = el('div', `left:${f1(x0)}px;top:${f1(y0)}px;width:0;height:0;display:none;z-index:${o.z ?? 5}`, parent);
      const pos = align === 'left' ? 'left:0' : align === 'right' ? 'right:0' : 'left:0;transform:translate(-50%,0)';
      const sp = el('div', `${pos};top:0;${wrapW ? `width:${f1(wrapW)}px` : 'white-space:nowrap'};text-align:${align};font:400 ${f1(size)}px/1.16 ${FONT.display};letter-spacing:.02em;${inkCss(size, col, edge)}`, box);
      const chars = o.pop ? [...String(txt)].map((c) => { const s = el('span', `position:relative;display:inline-block;${c === ' ' ? 'width:.34em;' : ''}`, sp); s.textContent = c; return s; }) : null;
      if (!chars) sp.textContent = txt;
      if (!o.noText) FM.text(sp, o.kind ?? (size > toPx(60) ? 'headline' : 'label'), String(txt), a, until, { noFact: o.noFact, overlap: o.overlap });
      let my = null;
      FM.add((t) => {
        const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return; const n = floor(t * FPSD + 1e-6), tq = n / FPSD; my ??= -sp.offsetHeight / 2;
        const xp = typeof o.x === 'function' ? GX + toPx(o.x(tq)) : x0, yp = typeof o.y === 'function' ? toPx(o.y(tq)) : y0, q = tq - a, out = until - tq;
        const wob = BOILON && o.boil !== false && !isStill(tq) ? (hash(n * 3.1 + a) - 0.5) * 0.01 : 0, tilt = (o.tilt ?? 0) + wob;
        const land = chars ? 1 : (q < 0.32 ? 1 + E(q, 3.1, 7) * -0.7 : 1), sy = land, sx = chars ? 1 : 1 / pow(max(0.2, land), 0.6), ex = o.exit !== false && out < 0.14 ? out / 0.14 : 1;
        set(box, { transform: `translate(${f1(xp - x0)}px,${f1(yp - y0 + my)}px) rotate(${tilt.toFixed(4)}rad) scale(${(sx * ex).toFixed(3)},${(sy * ex).toFixed(3)})`, transformOrigin: '0 50%' });
        if (chars) chars.forEach((s, i) => { const d = q - i * (o.every ?? 0.05), sag = o.sag ? o.sag(i, t) : null, v = d < 0 ? 0 : d < 0.34 ? 1 + E(d, 3, 6) * -0.9 : 1, hop = o.bounce ? -abs(sin((tq * (o.bounce || 2) + i * 0.25) * PI)) * toPx(6) : 0; set(s, { transform: `translate(${sag ? f1(sag[0] * RS) : 0}px,${f1((d < 0.16 ? (1 - min(1, d / 0.16)) * -toPx(40) : 0) + (sag ? sag[1] * RS : 0) + hop)}px) rotate(${(sag ? sag[2] : (hash(i * 7.3) - 0.5) * 0.07).toFixed(3)}rad) scale(${max(0.01, 2 - v).toFixed(3)},${max(0.01, v).toFixed(3)})`, opacity: d < 0 ? '0' : '1' }); });
      });
      FM.appear && FM.appear(a); FM.appear && until < 1e8 && FM.appear(until);
      return { el: sp, box, at: a, until };
    };
    /* G.title(lines, o): the main title; each { text, x, y, size, color } pops letter by letter and keeps bouncing to the band */
    G.title = (lines, o = {}) => lines.map((l, i) => G.write(l.text, { pop: true, bounce: 2, kind: 'headline', at: (o.at ?? 0.3) + i * (o.gap ?? 0.5), until: o.until, ...l }));
    /* G.card({ x, y, w, h, at, until, title, lines, hot, tilt }): a white show card with an ink edge and a hard ink shadow, bouncing in (DOM). hot: inverted, ink with white letters. */
    G.card = (o = {}) => {
      const a = o.at ?? 0, until = o.until ?? 1e9, wPx = toPx(o.w ?? 420), hPx = o.h ? toPx(o.h) : null, parent = o.parent ?? (twl ??= FM.layer('pointer-events:none', 40)), hot = !!o.hot, fg = hot ? COL.paper : COL.ink, bgc = hot ? COL.ink : COL.paper;
      const box = el('div', `left:${f1(GX + toPx(o.x ?? W / 2) - wPx / 2)}px;top:${f1(toPx(o.y ?? H / 2) - (hPx ? hPx / 2 : 0))}px;width:${f1(wPx)}px;${hPx ? `height:${f1(hPx)}px;` : ''}box-sizing:border-box;background:${bgc};border:${f1(toPx(3.6))}px solid ${COL.ink};outline:${f1(toPx(2))}px solid ${COL.paper};border-radius:${f1(toPx(18))}px;box-shadow:${f1(toPx(8))}px ${f1(toPx(10))}px 0 ${COL.ink};padding:${f1(toPx(16))}px ${f1(toPx(20))}px;color:${fg};font:400 ${f1(toPx(o.body ?? 26))}px/1.28 ${FONT.body};display:none;z-index:${o.z ?? 4}`, parent);
      if (o.title) { const t0 = el('div', `position:relative;font:400 ${f1(toPx(o.size ?? 38))}px/1.12 ${FONT.display};color:${fg}`, box); t0.textContent = o.title; FM.text(t0, 'label', o.title, a, until); }
      (o.lines || []).forEach((li, k) => { const d = el('div', `position:relative;margin-top:${f1(toPx(7))}px`, box); d.textContent = li; FM.text(d, 'label', li, o.ats ? o.ats[k] ?? a : a, until); });
      FM.add((t) => { const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return; const tq = Q(t), q = tq - a, out = until - tq, v = q < 0.36 ? 1 + E(q, 2.8, 6.5) * -0.8 : 1, ex = out < 0.14 ? out / 0.14 : 1; set(box, { transform: `rotate(${((o.tilt ?? 0) + (BOILON && !isStill(tq) ? (hash(floor(t * FPSD) * 1.7 + a) - 0.5) * 0.006 : 0)).toFixed(4)}rad) scale(${((1 / pow(max(0.2, v), 0.5)) * ex).toFixed(3)},${(v * ex).toFixed(3)})` }); });
      if (o.sfx !== false) FM.sfx(a, 'pop', 0.5);
      return { el: box, at: a, until };
    };

    /* ---------- telling information: show cards that bounce in, rubber pillars that spring up to their value ---------- */
    /* G.steps({ items: [{ text, note, hot }], T, until, x, y, w }): one show card per step along a line; hot steps are inverted. Returns their centres. */
    G.steps = (o) => { const n = o.items.length, cols = PT ? 1 : n, cw = (o.w ?? W * 0.9) / cols, x0 = o.x ?? W * 0.05, y0 = o.y ?? H * 0.42, rh = 150; return o.items.map((it, i) => { const cx = x0 + cw * ((PT ? 0 : i) + 0.5), cy = y0 + (PT ? (i - (n - 1) / 2) * rh : (i % 2 ? 26 : -26)); G.card({ x: cx, y: cy, w: min(cw * 0.92, PT ? W * 0.84 : 420), title: it.text, lines: it.note ? [it.note] : [], at: o.T[i], until: o.until, hot: it.hot, tilt: (i % 2 ? 1 : -1) * 0.02, parent: o.parent, sfx: false }); FM.sfx(o.T[i], 'boing', 0.34); return { x: cx, y: cy }; }); };
    /* G.versus({ cols: [{ title, points, hot }], T, until }): two cards side by side; the winner inverted. */
    G.versus = (o) => { const n = o.cols.length, cw = (o.w ?? W * 0.86) / (PT ? 1 : n), x0 = o.x ?? W * 0.07; return o.cols.map((c, i) => { const cx = PT ? W / 2 : x0 + cw * (i + 0.5), cy = PT ? H * (0.3 + i * 0.3) : (o.y ?? H * 0.48); G.card({ x: cx, y: cy, w: min(cw * 0.92, 520), title: c.title, lines: (c.points || []).map((p) => (p && typeof p === 'object' ? p.text : String(p))), at: o.T[i], until: o.until, hot: c.hot, tilt: (i % 2 ? 1 : -1) * 0.022, parent: o.parent }); return { x: cx, y: cy }; }); };
    /* G.columns({ items: [[label, value], …], hot: [i], ats, until, x, y, w, h, unit }): rubber pillars spring up to their values and overshoot, an alarm clock riding each one up; draws on top of the running shot */
    G.columns = (o) => {
      const n = o.items.length, top = max(...o.items.map((i) => i[1])), base = o.y ?? H * 0.84, wd = o.w ?? W * 0.8, x0 = o.x ?? W * 0.1, maxH = o.h ?? H * 0.5, parent = o.parent, cw = min(120, (wd / n) * 0.52);
      const pos = o.items.map((it, i) => ({ x: x0 + (wd * (i + 0.5)) / n, y: base - (maxH * it[1]) / top }));
      G.draw((u, t) => { o.items.forEach((it, i) => { const a = o.ats[i]; if (t < a) return; const dt = t - a, hot = (o.hot || []).includes(i), h = max(4, ((maxH * it[1]) / top) * (1 - E(dt, 1.8, 3.6))), x = pos[i].x, sq = 1 + 0.12 * E(dt - 0.3, 2.6, 4); seed(900 + i); shadow(x, base + 2, cw * 0.7, 0.3); S(spl([x - cw / 2, base, x - cw / 2 * sq, base - h * 0.5, x - cw / 2, base - h, x + cw / 2, base - h, x + cw / 2 * sq, base - h * 0.5, x + cw / 2, base], true, 5), hot ? G5 : G1, 2.6); L(pLine(x - cw * 0.22, base - h + 10, x - cw * 0.22, base - 10, 4), 2, hot ? G3 : PAPER, { taper: 0.3 }); const b = (t - a) * 2; alarm(x, base - h, 0.95, { a: 1, hop: -abs(sin(b * PI)) * 10, sq: 1 - 0.08 * pulse(b), sx: 1 + 0.08 * pulse(b), ring: dt < 0.9 ? 1 : 0, mo: dt < 0.9 ? 0.7 : 0.4, sm: 1, lx: sin(b * PI / 2) * 0.6, brow: 0.6, al: [-46, -54 - abs(sin(b * PI)) * 14, -6, 0], ar: [46, -54 - abs(sin(b * PI)) * 14, 6, 0] }, i); }); }, o.ats[0] - 0.1, o.until ?? 1e9);
      o.items.forEach((it, i) => { const hot = (o.hot || []).includes(i); G.write(`${it[0]}`, { x: pos[i].x, y: base + 30, size: 26, at: o.ats[i], until: o.until, kind: 'label', parent, noFact: o.noFact }); G.write(`${it[1]}${o.unit ?? ''}`, { x: pos[i].x, y: pos[i].y - 104, size: hot ? 52 : 40, color: hot ? COL.ink : COL.paper, at: o.ats[i] + 0.25, until: o.until, kind: 'label', parent, noFact: o.noFact }); FM.sfx(o.ats[i], 'boing', 0.4); FM.sfx(o.ats[i] + 0.2, 'ring', 0.25, { dur: 0.5 }); });
      return pos;
    };
    /* sound cues that pair with the cartoon verbs */
    G.bonk = (at, gain = 0.8) => { FM.sfx(at, 'whack', gain); FM.sfx(at + 0.04, 'boing', gain * 0.7); return G; };

    /* captions: white lettering with an ink edge, low in the frame, like an intertitle line */
    if (!FLAT && FM.T && FM.voiced && !FM.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(FM.T, co.max ?? (PT ? 13 : 22)), size = FM.px(co.size ?? 46);
      const box = el('div', `left:0;right:0;top:${co.top ?? (PT ? FM.H * 0.77 : FM.H * 0.885)}px;text-align:center;z-index:880;pointer-events:none;display:none`, FM.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${FM.W * 0.86}px;font:400 ${f1(size)}px/1.3 ${FONT.body};${inkCss(size * 0.9, COL.paper)}`, box);
      FM.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { FM.appear(c.start); FM.appear(c.end); }
      FM.caps = segs;
    }
    /* the canvas is invisible to the DOM motion sheet: a running shot is action */
    FM.prep(() => { for (const s of shots) if (!s.o.quiet) { const sts = stills.filter(([a, b]) => a < s.b && b > s.a); let p = s.a; for (const [a, b] of sts) { if (a > p) FM.live(p, a); p = max(p, b); } if (p < s.b) FM.live(p, s.b); } });
    /* ---------- checks ---------- */
    FM.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: round(t * 10) / 10, src: '', what, msg });
      if (!BOILON) add(0, Ms('线条不抖', 'no line boil'), Ms('boil: 0 关掉了线条抖动：停住的画面像印出来的图，失去手绘感（一段戏要定住时用 G.pause）', 'boil: 0 turns the line boil off: held drawings look printed (use G.pause for a held beat)'));
      if (FLAT) return out;
      if (!shots.length && !over.length) add(0, Ms('没有镜头', 'no shots'), Ms('没有 G.shot：画面是黑的', 'no G.shot: the frame is black'));
      let e = 0; for (const s of shots) { if (s.a > e + 0.05 && !irises.some((r) => r.at <= e + 0.05 && r.at + r.dur >= e - 1)) add(e, Ms('黑屏', 'black gap'), Ms(`${e.toFixed(1)}–${s.a.toFixed(1)} 秒没有镜头，是黑的`, `${e.toFixed(1)}–${s.a.toFixed(1)}s has no shot: black`)); e = max(e, s.b); if (s.b - s.a > 16) add(s.a, Ms('镜头太长', 'long shot'), Ms(`镜头 ${s.a.toFixed(1)} 秒起长 ${(s.b - s.a).toFixed(1)} 秒：这种卡通靠一个接一个的小笑点推着走，换一个景别`, `the shot at ${s.a.toFixed(1)}s runs ${(s.b - s.a).toFixed(1)}s: these cartoons move gag to gag, change the framing`)); }
      if (FM.duration > 20 && !stills.length) add(0, Ms('没有定格', 'no held beat'), Ms('整片没有 G.pause：乐队戛然而止、全场冻住的那一下是这种片子最响的笑点（§5）', 'no G.pause in the whole film: the band stopping dead and everything freezing is the biggest laugh these films have (§5)'));
      return out;
    });
    return P.infoKit ? P.infoKit(G, { steps: 'flow', versus: 'compare', columns: 'chart', card: 'illustration' }) : G;
  };
})();
