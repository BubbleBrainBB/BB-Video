// goldenage.js: golden-age American theatrical cartoon (美式黄金卡通), one of bb-video's visual styles (style notes in styles/goldenage/STYLE.md). Load after promo.js.
// One frame: a painted gouache world (deep Technicolor-rich night blues, warm yellow windows, Art Deco towers, brickwork, paper tooth) behind inked cel characters with hard
// cel shadows; everything is drawn on twos (15 drawings a second at 30 fps) and its ink line boils from drawing to drawing (seeded); the picture sits in a projected print: gate weave,
// lamp breath, fine colour grain, dust, a little halation, a rounded gate. Things obey cartoon physics: squash and stretch, anticipation, impact frames, elastic recovery, dead-still comic holds.
//
//   const G = PROMO.goldenage(F, { seed, boil: 1, drawings: 15, film: true, gate: true, academy: false, accent, colors, fonts, captions, flat })
//   Logical units: the frame's short side is 720 (16:9 = 1280 × 720, 9:16 = 720 × 1280; academy: true = a 960 × 720 gate pillarboxed in the wide frame). y grows downward.
//   SHOTS   G.shot(a, b, (u, t) => { … })  immediate mode: called once per drawing, u = seconds into the shot; draw back to front with G.lib. A cut at a. Same t, same picture.
//           G.pause(a, b) a comic hold: lines stop boiling, music drops out · G.still(a, b) only the lines · G.iris(at, { out, dur, x, y }) the iris closing / opening · G.top(fn, a, b) on top of every shot, screen units
//   LIB     const { camPush, pop, bg, skyline, drawTower, towerTop, moon, wk, wp, runP, frontRun, lamp, cab, wtower, hangSign, ladder, dust, debris, impactFrame, hitLines, speedLines, K, E, hit, … } = G.lib
//           CAMERA camPush(x, y, zoom, rot, shakeX, shakeY) … pop()   PLATES bg(name, x, y, scale): sky skyHi far mid nearRow cl1–4 avenue hill down roofs site stoops (BG.avenue.P(X, Y, Z) → [x, y, scale])
//           TOWERS drawTower(kind, x, baseY, s, { sq, sk, bul, bv, bend, bk, rip, rp, rattle, lean }, { ink, hz }): hotel broad slab spire zig pyr mastb lowa, painted once, bent as rubber
//           BALL   moon(x, y, R, { sx, sy, sa, yaw, pitch, roll, flat, eo, eo2, lx, ly, pr, brow, bang, mo, mw, sm, teeth, wince, dizzy, cl, glow, erx, ery })
//           WORKER wk(x, y, s, wp({ …pose }), dir, id)  poses: runP(phase, k, extra) frontRun(phase, extra); the fields in WK below
//           INK    S F L SC cel tube limb spl pEll pRR pQuad pLine …  (every line a filled, swelling brush polygon)
//   TEXT    G.write(text, { x, y, size, at, until, color, pop, wrap, align, tilt, sag, kind }) · G.title(lines, o) · G.card({ x, y, w, title, lines, at, until, fill })  DOM: the checks see them
//   INFO    G.steps({ items, T, until }) · G.versus({ cols, T, until }) · G.towers({ items, ats, until, hot, unit }) a bar chart of skyscrapers springing up
//   Sounds the film emits (styles/goldenage/sound.js): boing, whack, slide, zip, squeak, tink, pop, swish, crash, ratchet, tick, gulp, hit, thud.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('goldenage.js 要在 promo.js 之后加载', 'goldenage.js must load after promo.js'));
/* ============================================================
   INK ENGINE - every line on screen is a filled brush-pen polygon
   whose width swells and thins, drawn anew for each drawing.
   ============================================================ */
let W=1280,H=720,RS=1.5,AMP_BASE=.5;const SF=1.3,TAU=Math.PI*2,PI=Math.PI;
const INK='#1a111d',PAPER='#fdf7e4',G1='#d9d3c6',G2='#a9a29c',G3='#7b7480',G4='#4c4658',G5='#2a2534';
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

/* --- hand-cut title lettering (Latin and digits; use G.write for everything else) --- */
const GL={A:[[0,1,.5,0,1,1],[.2,.64,.8,.64]],B:[[0,0,0,1],'s',[0,0,.72,.04,.76,.26,.5,.47,0,.48],'s',[0,.48,.8,.55,.84,.8,.6,.98,0,1]],C:['s',[.92,.18,.6,0,.2,.1,.02,.5,.2,.9,.6,1,.92,.82]],D:[[0,0,0,1],'s',[0,0,.6,.05,.95,.5,.6,.95,0,1]],E:[[.85,0,0,0,0,1,.85,1],[0,.48,.68,.48]],F:[[.85,0,0,0,0,1],[0,.48,.68,.48]],G:['s',[.92,.18,.6,0,.2,.1,.02,.5,.2,.9,.6,1,.92,.82],[.92,.82,.92,.55,.55,.55]],H:[[0,0,0,1],[.9,0,.9,1],[0,.48,.9,.48]],I:[[.3,0,.3,1]],J:['s',[.7,0,.7,.75,.5,1,.2,.95,.05,.75]],K:[[0,0,0,1],[.85,0,0,.58],[.25,.4,.9,1]],L:[[0,0,0,1,.8,1]],M:[[0,1,0,0,.5,.62,1,0,1,1]],N:[[0,1,0,0,.9,1,.9,0]],O:['s',[.5,0,.08,.2,.02,.6,.3,.98,.7,.98,.98,.6,.92,.2,.5,0]],P:[[0,0,0,1],'s',[0,0,.7,.03,.82,.28,.6,.5,0,.54]],Q:['s',[.5,0,.08,.2,.02,.6,.3,.98,.7,.98,.98,.6,.92,.2,.5,0],[.58,.72,1,1.05]],R:[[0,0,0,1],'s',[0,0,.7,.03,.82,.28,.6,.5,0,.54],[.34,.54,.9,1]],S:['s',[.85,.15,.5,0,.1,.12,.15,.38,.5,.5,.85,.62,.88,.88,.5,1,.08,.85]],T:[[0,0,1,0],[.5,0,.5,1]],U:['s',[0,0,0,.6,.2,.95,.5,1,.8,.95,1,.6,1,0]],V:[[0,0,.5,1,1,0]],W:[[0,0,.25,1,.5,.35,.75,1,1,0]],X:[[0,0,.95,1],[.95,0,0,1]],Y:[[0,0,.5,.5,1,0],[.5,.5,.5,1]],Z:[[0,0,.9,0,0,1,.95,1]],
 0:['s',[.5,0,.1,.2,.05,.6,.3,.98,.7,.98,.95,.6,.9,.2,.5,0]],1:[[.15,.22,.5,0,.5,1],[.15,1,.85,1]],2:['s',[.1,.25,.45,0,.85,.2,.7,.55,.05,1],[.05,1,.92,1]],3:['s',[.1,.12,.5,0,.85,.2,.45,.48],'s',[.45,.48,.9,.7,.55,1,.08,.88]],4:[[.7,1,.7,0,0,.7,.95,.7]],5:[[.85,0,.2,0,.12,.45],'s',[.12,.45,.55,.38,.9,.68,.55,1,.1,.88]],6:['s',[.8,.05,.35,.1,.08,.6,.4,1,.85,.75,.55,.45,.12,.62]],7:[[.05,0,.92,0,.35,1]],8:['s',[.5,.48,.14,.25,.5,0,.86,.25,.5,.48,.05,.75,.5,1,.95,.75,.5,.48]],9:['s',[.2,.95,.65,.9,.92,.4,.6,0,.15,.25,.45,.55,.88,.38]],'&':['s',[.95,1,.3,.35,.35,.05,.65,.1,.6,.35,.05,.65,.2,1,.65,.9,.95,.55]],'-':[[.1,.5,.8,.5]],'.':[[.3,.95,.32,1]],'!':[[.3,0,.3,.68],[.3,.95,.3,1]],"'":[[.3,0,.3,.22]]};
const GC={};
function glyph(ch){if(GC[ch])return GC[ch];const g=GL[ch];if(!g)return GC[ch]=[];const out=[];for(let i=0;i<g.length;i++){if(g[i]==='s'){out.push(spl(g[++i],false,5))}else{const p=g[i],q=[];for(let k=0;k<p.length-2;k+=2){const n=3;for(let j=0;j<n;j++){const u=j/n;q.push(p[k]+(p[k+2]-p[k])*u,p[k+1]+(p[k+3]-p[k+1])*u)}}q.push(p[p.length-2],p[p.length-1]);out.push(q)}}return GC[ch]=out}
function drawGlyph(ch,x,y,sx,sy,w,col){for(const p of glyph(ch)){const q=new Array(p.length);for(let i=0;i<p.length;i+=2){q[i]=x+p[i]*sx;q[i+1]=y+p[i+1]*sy}L(q,w,col,{taper:.05,cap:true})}}
function text(s,x,y,size,o={}){const adv=size*(o.track||.84),sx=size*(o.wide||.62),sy=size;const tot=[...s].reduce((a,c)=>a+(c==='I'||c==='.'||c==="'"?adv*.55:c===' '?adv*.6:(c==='M'||c==='W')?adv*1.1:adv),0);let cx=x-tot/2;const layers=o.layers||[[o.w||size*.13,o.col||INK,0,0]];const fn=o.fn;let i=0;for(const c of s){const a=(c==='I'||c==='.'||c==="'"?adv*.55:c===' '?adv*.6:(c==='M'||c==='W')?adv*1.1:adv);if(c!==' '){const off_=fn?fn(i):[0,0,1,0];const sd=SD;push();tr(cx+a/2-sx*.4+off_[0]+sx*.4,y+off_[1]);if(off_[3])rot(off_[3]);scl(off_[2]);for(const ly of layers){SD=sd;drawGlyph(c,-sx*.45+ly[2],-sy/2+ly[3],sx,sy,ly[0],ly[1])}pop()}cx+=a;i++}}

/* --- additions for colour work --- */
/* rubber tube: filled, inked, width runs w0..w1 along a quadratic */
function tube(x0,y0,cx,cy,x1,y1,w0,w1,fill,lw=1.9,n=9){const l=[],r=[];for(let i=0;i<=n;i++){const u=i/n,v=1-u,x=v*v*x0+2*u*v*cx+u*u*x1,y=v*v*y0+2*u*v*cy+u*u*y1,tx=2*v*(cx-x0)+2*u*(x1-cx),ty=2*v*(cy-y0)+2*u*(y1-cy),d=hypot(tx,ty)||1,w=lerp(w0,w1,u)*.5;l.push(x-ty/d*w,y+tx/d*w);r.push(x+ty/d*w,y-tx/d*w)}const p=[...l];for(let i=r.length-2;i>=0;i-=2)p.push(r[i],r[i+1]);S(p,fill,lw);return p}
function limb(x0,y0,x1,y1,b,w0,w1,fill,lw=1.9){const dx=x1-x0,dy=y1-y0,d=hypot(dx,dy)||1;return tube(x0,y0,(x0+x1)/2-dy/d*b,(y0+y1)/2+dx/d*b,x1,y1,w0,w1,fill,lw)}
/* cel: base colour with a hard shadow shape cut by shifting the outline */
function cel(p,base,shade,dx,dy,lw=2.1,col=INK){SD++;const wp=hw(p,true),sd=SD;poly(wp,shade);C.save();C.beginPath();C.moveTo(wp[0],wp[1]);for(let i=2;i<wp.length;i+=2)C.lineTo(wp[i],wp[i+1]);C.closePath();C.clip();const ws=hw(off(p,dx,dy),true);poly(ws,base);C.restore();SD=sd+1;if(lw>0)inkW(wp,lw,col,{closed:true})}
/* probing the transform stack: lets painted sprites ride the same camera as the ink */
function xfMat(){tp(0,0);const e=OX,f=OY;tp(1,0);const a=OX-e,b=OY-f;tp(0,1);return [a,b,OX-e,OY-f,e,f]}
function xfDraw(img,x,y,w,h,alpha=1,comp=null){const m=xfMat();C.save();C.transform(m[0],m[1],m[2],m[3],m[4],m[5]);if(alpha<1)C.globalAlpha=alpha;if(comp)C.globalCompositeOperation=comp;C.drawImage(img,x,y,w,h);C.restore()}
function eye40(x,y,rx,ry,lx=0,ly=0,open=1,o={}){const lw=o.w||1.7;if(open<.1){L(pQuad(x-rx,y+ry*.1,x,y+ry*.1+ry*(o.cl||.34),x+rx,y+ry*.1,14),lw*1.2);return}S(pEll(x,y,rx,ry,0,TAU,30),o.white||PAPER,lw);const pr=o.p||.42,prx=rx*pr,pry=ry*pr,px=x+lx*(rx-prx)*.86,py=y+ly*(ry-pry)*.86;F(pEll(px,py,prx,pry,0,TAU,20),o.pc||INK);if(pr>.2&&o.hl!==0)F(pEll(px-prx*.3,py-pry*.38,prx*.3,pry*.3,0,TAU,6),PAPER);if(open<.98){const top=y-ry-1,cut=y-ry+2*ry*(1-open),lid=[...pEll(x,y,rx+.5,ry+.5,PI,TAU,10),...pQuad(x+rx+.5,y,x+rx,cut,x,cut,3),...pQuad(x,cut,x-rx,cut,x-rx-.5,y,3)];S(lid,o.lid||'#e8b48c',lw)}}
function mouth40(x,y,w,h,smile=0,o={}){const lw=o.lw||1.9;if(h<.8){L(pQuad(x-w,y-smile*.2,x,y+smile,x+w,y-smile*.2,8),lw*1.15);if(o.dim){L(pQuad(x-w-2.4,y-smile*.2-3,x-w-3.6,y-smile*.2,x-w-1,y-smile*.2+3,3),lw*.8);L(pQuad(x+w+2.4,y-smile*.2-3,x+w+3.6,y-smile*.2,x+w+1,y-smile*.2+3,3),lw*.8)}return}const top=pQuad(x-w,y,x,y+smile,x+w,y,20),bot=pQuad(x+w,y,x,y+smile+h*2,x-w,y,24),pts=[...top,...bot.slice(2,-2)];SC(pts,o.in||'#6a1420',()=>{if(o.tongue!==0)F(pEll(x,y+smile+h*1.35,w*.58,h*.72,0,TAU,14),o.tc||'#e86a72');if(o.teeth){const k=typeof o.teeth==='number'?o.teeth:.34;F([...pQuad(x-w,y,x,y+smile,x+w,y,20),...pQuad(x+w,y+h*k,x,y+smile+h*k,x-w,y+h*k,20)],PAPER)}},lw)}

/* ============================================================
   BACKGROUND DEPARTMENT - gouache night, Art Deco towers, brickwork.
   Everything is laid in with hand-cut shapes and dry-brush, then
   settled into paper grain so no edge or flat stays mathematical.
   ============================================================ */
const BG={},TW={};
const hex=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
const cmix=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
const css=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
let prn=12345;const rnd=()=>{prn=(prn*16807)%2147483647;return prn/2147483647},rs=n=>{prn=(n*7919+13)%2147483647||7},rr=(a,b)=>a+(b-a)*rnd();
const NIGHT={t:hex('#060a2c'),u:hex('#0e1c5c'),m:hex('#1b3a8c'),l:hex('#3a5aa8'),h:hex('#8a6ca6'),a:hex('#e8976a')};
const LITS=['#ffd766','#ffbe45','#fff0a6','#f79a35','#ffe184','#ffc95a'].map(hex);
const MOONT=hex('#a9c0ef'),WARM=hex('#ff9c50');
function wash(x,y,w,h,stops,vert=true){const g=vert?C.createLinearGradient(0,y,0,y+h):C.createLinearGradient(x,0,x+w,0);for(const s of stops)g.addColorStop(s[0],css(s[1],s[2]==null?1:s[2]));C.fillStyle=g;C.fillRect(x,y,w,h)}
function blot(x,y,w,h,n,r0,r1,col,a=.08){for(let i=0;i<n;i++){const cx=x+rnd()*w,cy=y+rnd()*h,r=rr(r0,r1),g=C.createRadialGradient(cx,cy,0,cx,cy,r),k=a*rr(.4,1.3);g.addColorStop(0,css(col,k));g.addColorStop(.72,css(col,k*.55));g.addColorStop(1,css(col,0));C.fillStyle=g;C.fillRect(cx-r,cy-r,r*2,r*2)}}
function drag(x0,y0,x1,y1,wd,col,a=.2,br=9){const dx=x1-x0,dy=y1-y0,l=hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;C.lineCap='round';for(let i=0;i<br;i++){const o=(i/(br-1||1)-.5)*wd,st=rnd()*.18,en=1-rnd()*.18;C.strokeStyle=css(col,a*rr(.3,1.2));C.lineWidth=wd/br*rr(.5,1.3);C.beginPath();C.moveTo(x0+dx*st+nx*o,y0+dy*st+ny*o);C.quadraticCurveTo(x0+dx*.5+nx*(o+rr(-2,2)),y0+dy*.5+ny*(o+rr(-2,2)),x0+dx*en+nx*o,y0+dy*en+ny*o);C.stroke()}}
function drybrush(x,y,w,h,n,col,a=.1,ang=0,len=60,wd=12){for(let i=0;i<n;i++){const cx=x+rnd()*w,cy=y+rnd()*h,an=ang+rr(-.15,.15),l=len*rr(.5,1.4);drag(cx-cos(an)*l/2,cy-sin(an)*l/2,cx+cos(an)*l/2,cy+sin(an)*l/2,wd*rr(.5,1.2),col,a,5)}}
function cut(x,y,w,h,col,j=.7){C.fillStyle=Array.isArray(col)?css(col):col;C.beginPath();const n=max(1,ceil(w/34)),m=max(1,ceil(h/34));C.moveTo(x+rr(-j,j),y+rr(-j,j));for(let i=1;i<=n;i++)C.lineTo(x+w*i/n,y+rr(-j,j));for(let i=1;i<=m;i++)C.lineTo(x+w+rr(-j,j),y+h*i/m);for(let i=n-1;i>=0;i--)C.lineTo(x+w*i/n,y+h+rr(-j,j));for(let i=m-1;i>0;i--)C.lineTo(x+rr(-j,j),y+h*i/m);C.closePath();C.fill()}
function pgon(p,col,a=1){C.fillStyle=typeof col==='string'||col instanceof CanvasGradient?col:css(col,a);C.beginPath();C.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)C.lineTo(p[i],p[i+1]);C.closePath();C.fill()}
function clip(p,fn){C.save();C.beginPath();C.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)C.lineTo(p[i],p[i+1]);C.closePath();C.clip();fn();C.restore()}
function pline(x0,y0,x1,y1,col,lw=1){C.strokeStyle=typeof col==='string'?col:css(col);C.lineWidth=lw;C.beginPath();C.moveTo(x0,y0);C.lineTo(x1+rr(-.4,.4),y1+rr(-.4,.4));C.stroke()}
/* paper: blotchy pigment settle + tooth, applied to the finished painting */
let NZ=null;const NS=512;
function buildNoise(){NZ=new Float32Array(NS*NS);const g=(s,a)=>{const n=NS/s|0,q=new Float32Array(n*n);for(let i=0;i<n*n;i++)q[i]=rnd()-.5;for(let y=0;y<NS;y++)for(let x=0;x<NS;x++){const fx=x/s,fy=y/s,ix=fx|0,iy=fy|0,ux=fx-ix,uy=fy-iy,sx=ux*ux*(3-2*ux),sy=uy*uy*(3-2*uy),a0=q[(iy%n)*n+ix%n],b0=q[(iy%n)*n+(ix+1)%n],c0=q[((iy+1)%n)*n+ix%n],d0=q[((iy+1)%n)*n+(ix+1)%n];NZ[y*NS+x]+=a*(a0+(b0-a0)*sx+(c0-a0)*sy+(a0-b0-c0+d0)*sx*sy)}};rs(77);g(64,.5);g(16,.3);g(4,.34);for(let i=0;i<NS*NS;i++)NZ[i]+=(rnd()-.5)*.26}
function paperize(c,amt=.16){const x=c.getContext('2d'),w=c.width,h=c.height,im=x.getImageData(0,0,w,h),d=im.data;for(let j=0,i=0;j<h;j++){const row=(j%NS)*NS;for(let k=0;k<w;k++,i+=4){if(d[i+3]===0)continue;const n=NZ[row+k%NS]*amt,m=1+n;d[i]=d[i]*(m+n*.25);d[i+1]=d[i+1]*m;d[i+2]=d[i+2]*(m-n*.2)}}x.putImageData(im,0,0)}
const stash=()=>({C,XF,XS:XS.slice(),LW,BOIL,AMP,SD});const unstash=s=>{C=s.C;XF=s.XF;XS.length=0;XS.push(...s.XS);LW=s.LW;BOIL=s.BOIL;AMP=s.AMP;SD=s.SD};
function makeBG(name,w,h,ox,oy,fn,amt=.17){const c=document.createElement('canvas');c.width=w*RS|0;c.height=h*RS|0;const x=c.getContext('2d');x.scale(RS,RS);x.translate(-ox,-oy);const saved=stash();C=x;XF=[];XS.length=0;LW=1;BOIL=0;AMP=.8;SD=name.length*777;rs(name.length*31+w);fn(w,h);unstash(saved);if(amt)paperize(c,amt);BG[name]={c,w,h,ox,oy}}
const PLATES={},TOWERS={};const need=n=>{if(!BG[n]){if(!PLATES[n])throw new Error(M('goldenage 没有这张绘景：'+n,'goldenage has no plate: '+n));PLATES[n]()}return BG[n]};
function bg(n,x=0,y=0,s=1,a=1,comp=null){const b=need(n);push();tr(x,y);xfDraw(b.c,b.ox*s,b.oy*s,b.w*s,b.h*s,a,comp);pop()}
/* window-glow stamp */
let GLOW=null;function buildGlow(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,214,120,.7)');g.addColorStop(.35,'rgba(255,170,70,.22)');g.addColorStop(1,'rgba(255,140,40,0)');x.fillStyle=g;x.fillRect(0,0,64,64);GLOW=c}
function winPaint(x,y,w,h,lit,lc,fx){if(lit){cut(x,y,w,h,lc,.35);if(fx<.2)cut(x,y,w,h*rr(.3,.6),cmix(lc,hex('#a8541c'),.75),.3);else if(fx<.3){C.fillStyle='rgba(60,25,30,.8)';C.beginPath();C.ellipse(x+w*.5,y+h*.72,w*.2,h*.3,0,0,TAU);C.fill()}if(w>6)pline(x+w/2,y,x+w/2,y+h,css(hex('#7a3c1c'),.6),.6);if(h>9)pline(x,y+h*.5,x+w,y+h*.5,css(hex('#7a3c1c'),.5),.5)}else{cut(x,y,w,h,'#1a2354',.35);if(fx<.4){pgon([x+1,y+h-1,x+1,y+h*.3,x+w*.5,y+1,x+w*.8,y+1],css(MOONT,.22))}}}
/* ---- a tower is painted once, then bent as rubber at show time ---- */
function towerSprite(name,o){const stashed=stash();const wide=o.tiers.reduce((a,t)=>max(a,t[0]),0),pad=38,tot=o.tiers.reduce((a,t)=>a+t[1],0),crown=o.ch||0,Ht=tot+crown,cw=wide+pad*2;rs(o.seed||name.length*17);
  const c=document.createElement('canvas'),R_=RS*SF;c.width=cw*R_|0;c.height=(Ht+pad)*R_|0;const x=c.getContext('2d');x.scale(R_,R_);x.translate(cw/2,Ht+pad);C=x;XF=[];XS.length=0;LW=1;BOIL=0;AMP=.45;SD=o.seed*50;
  const pal=o.pal,grad=x.createLinearGradient(0,-Ht,0,0);grad.addColorStop(0,css(cmix(pal.wall,MOONT,.5)));grad.addColorStop(.4,css(cmix(pal.wall,MOONT,.14)));grad.addColorStop(.86,css(pal.wall));grad.addColorStop(1,css(cmix(pal.wall,WARM,.34)));
  const sgrad=x.createLinearGradient(0,-Ht,0,0);sgrad.addColorStop(0,css(cmix(pal.shade,MOONT,.14)));sgrad.addColorStop(1,css(cmix(pal.shade,WARM,.16)));
  const win=[],sil={l:[],r:[]};let yb=0;const dark=cmix(pal.shade,hex('#07081e'),.45);
  o.tiers.forEach((t,ti)=>{const w=t[0],h=t[1],to=t[2]||{},xL=-w/2,yT=yb-h,sw=w*(to.side==null?.16:to.side),fw=w-sw;
    sil.l.push(xL,yb,xL,yT);sil.r.push(w/2,yb,w/2,yT);
    /* walls */
    cut(xL,yT,fw,h,grad,.5);cut(xL+fw-.5,yT,sw+.5,h,sgrad,.5);
    C.save();C.beginPath();C.rect(xL,yT,w,h);C.clip();
    blot(xL,yT,w,h,h*w/5200+3,14,60,cmix(pal.wall,hex('#160b24'),.7),.13);blot(xL,yT,w,h,h*w/9000+2,14,50,cmix(pal.wall,PAPERC,.6),.08);
    if(to.brick!==0){C.lineWidth=.45;const bh=4.2,bw=9;for(let r=0,yy=yT;yy<yb;yy+=bh,r++){C.strokeStyle=css(dark,.16+.1*rnd());C.beginPath();C.moveTo(xL,yy+rr(-.2,.2));C.lineTo(xL+w,yy+rr(-.2,.2));C.stroke();if(r%2)for(let xx=xL+(r%4===1?0:bw/2);xx<xL+w;xx+=bw){if(rnd()<.65){C.beginPath();C.moveTo(xx,yy);C.lineTo(xx,yy+bh);C.stroke()}if(rnd()<.05){C.fillStyle=css(rnd()<.5?dark:pal.trim,.14);C.fillRect(xx,yy,bw,bh)}}}}
    /* bays and windows */
    const bay=to.bay||24,bays=max(1,round((fw-8)/bay)),bw=(fw-8)/bays,rh=to.rh||21,rows=floor((h-(to.top==null?16:to.top)-8)/rh),wy0=yT+(to.top==null?16:to.top),lz=hash(o.seed+ti);
    for(let r=0;r<rows;r++){const yy=wy0+r*rh,lv=vnoise(r*.34,o.seed+ti);C.fillStyle=css(cmix(pal.wall,dark,.36),.42);C.fillRect(xL,yy-rh*.2,fw,rh*.1);C.fillStyle=css(cmix(pal.trim,MOONT,.2),.16);C.fillRect(xL,yy-rh*.12,fw,1);
      if(to.chev&&r%2===1){C.strokeStyle=css(pal.trim,.5);C.lineWidth=.9;C.beginPath();for(let i=0;i<=bays*2;i++){const px=xL+4+i*bw/2,py=yy-3.2+(i%2?-2.4:0);i?C.lineTo(px,py):C.moveTo(px,py)}C.stroke()}
      for(let b=0;b<bays;b++){const wx=xL+4+b*bw+bw*.24,ww=bw*.52,wh=rh*(to.wh||.54),n=hash(floor(b/2)*5.3+floor(r/3)*11.7+o.seed+ti*3),lit=hash(b*3.1+r*7.7+ti+o.seed*.3)<.1+n*(1.1-(o.dark||.72)),lc=LITS[hash(b*5+r*9+ti)*LITS.length|0],fx=hash(b*1.3+r*2.7+o.seed);
        winPaint(wx,yy,ww,wh,lit,lc,fx);pline(wx-.5,yy+wh+.6,wx+ww+.5,yy+wh+.6,css(cmix(pal.trim,MOONT,.3),.55),.8);win.push(wx,yy,ww,wh,lit?1:0,LITS.indexOf(lc))}}
    /* piers in relief */
    for(let b=0;b<=bays;b++){const px=xL+4+b*bw-1.6;if(b%(to.pier||1)===0){C.fillStyle=css(cmix(pal.wall,MOONT,.26),.85);C.fillRect(px-1.6,yT+4,3.2,h-4);C.fillStyle=css(dark,.5);C.fillRect(px+1.6,yT+4,1.5,h-4)}}
    /* side-plane slits */
    const sb=max(1,floor(sw/11));for(let r=0;r<rows;r++)for(let b=0;b<sb;b++){const wx=xL+fw+3+b*(sw-4)/sb,ww=(sw-4)/sb-3.5,yy=wy0+r*rh,lit=hash(b*3.3+r*5.1+ti+o.seed)>.74;cut(wx,yy,ww,rh*.56,lit?cmix(LITS[1],hex('#a24a1a'),.25):cmix(pal.shade,hex('#05061c'),.55),.25)}
    C.fillStyle=css(dark,.55);C.fillRect(xL+fw-1,yT,2,h);C.restore();
    /* cornice: stepped band, zigzag, sunburst */
    cut(xL-2.5,yT-2,w+5,8,cmix(pal.trim,MOONT,.26),.3);cut(xL+fw,yT-2,sw+2.5,8,cmix(pal.trim,hex('#0a0a2a'),.55),.3);pline(xL-2.5,yT+6,xL+w+2.5,yT+6,css(dark,.9),1.2);
    C.strokeStyle=css(dark,.8);C.lineWidth=.8;C.beginPath();for(let i=0;i<fw/5;i++){const px=xL+i*5;i?C.lineTo(px,yT+1+(i%2?3:0)):C.moveTo(px,yT+1)}C.stroke();
    if(to.fan&&w>70){const f=[0,yT-1];for(let k=0;k<=8;k++){const a=PI+k/8*PI;f.push(cos(a)*to.fan-w*.06,yT-1+sin(a)*to.fan*.8)}pgon(f,cmix(pal.trim,MOONT,.2));C.strokeStyle=css(dark,.8);C.lineWidth=.8;for(let k=1;k<8;k++){const a=PI+k/8*PI;C.beginPath();C.moveTo(-w*.06,yT-1);C.lineTo(cos(a)*to.fan-w*.06,yT-1+sin(a)*to.fan*.8);C.stroke()}}
    if(to.fins){for(let k=-2;k<=2;k++){const px=-w*.08+k*w*.13;pgon([px-3,yT,px+3,yT,px,yT-to.fins*(1-abs(k)*.22)],cmix(pal.trim,MOONT,.2))}}
    if(to.eagle&&ti>0){for(const q of [-1,1]){const ex=q*w/2;pgon([ex,yT-1,ex+q*14,yT-5,ex+q*18,yT-14,ex+q*8,yT-12,ex,yT-18],cmix(pal.trim,MOONT,.14));pline(ex,yT-1,ex+q*16,yT-6,css(dark,.9),1)}}
    yb=yT});
  /* glow pass over lit windows */
  x.globalCompositeOperation='lighter';for(let i=0;i<win.length;i+=6)if(win[i+4]&&rnd()<.75){const s=win[i+2]*2.6;x.drawImage(GLOW,win[i]+win[i+2]/2-s/2,win[i+1]+win[i+3]/2-s/2,s,s)}x.globalCompositeOperation='source-over';
  /* crown */
  const top=yb,topW=o.tiers[o.tiers.length-1][0];let crownPts=[-topW/2,top,topW/2,top];
  if(o.crown==='spire'){const st=7;crownPts=[];for(let k=0;k<st;k++){const u=k/st,bw=topW*(1-u*.92),bh=crown*.62/st,yy=top-u*crown*.62,arc=[];for(let i=0;i<=14;i++){const a=PI+i/14*PI;arc.push(cos(a)*bw/2,yy+sin(a)*bh*2.2)}const steel=cmix(hex('#d8dcea'),hex('#6b7596'),u*.25+(k%2)*.14);pgon([...arc,bw/2,yy+2,-bw/2,yy+2],steel);C.strokeStyle=css(hex('#23284a'),.85);C.lineWidth=1;C.beginPath();C.moveTo(arc[0],arc[1]);for(let i=2;i<arc.length;i+=2)C.lineTo(arc[i],arc[i+1]);C.stroke();
      clip([...arc,bw/2,yy+2,-bw/2,yy+2],()=>{C.fillStyle=css(hex('#3a4068'),.5);C.fillRect(bw*.14,yy-bh*2.4,bw,bh*2.6)});
      for(let i=1;i<14;i+=2){const a=PI+i/14*PI,px=cos(a)*bw*.41,py=yy+sin(a)*bh*1.65,s=max(2,bw*.05);pgon([px-s*.6,py+s*.7,px+s*.6,py+s*.7,px+cos(a)*s*.2,py-s*1.05],hash(i+k)>.3?LITS[(i+k)%6]:hex('#2a2f58'))}}
    pgon([-3.5,top-crown*.6,3.5,top-crown*.6,0,top-crown],hex('#e4e8f2'));pgon([0,top-crown*.6,3.5,top-crown*.6,0,top-crown],hex('#7b84a8'));
    crownPts=[-topW/2,top,-topW*.36,top-crown*.2,-topW*.2,top-crown*.42,-4,top-crown*.6,0,top-crown,4,top-crown*.6,topW*.2,top-crown*.42,topW*.36,top-crown*.2,topW/2,top]}
  else if(o.crown==='pyr'){const g=x.createLinearGradient(-topW/2,0,topW/2,0);g.addColorStop(0,'#ffe07a');g.addColorStop(.55,'#e0a12e');g.addColorStop(1,'#7c4a18');pgon([-topW/2,top,0,top-crown,topW/2,top],g);C.strokeStyle='rgba(90,50,10,.7)';C.lineWidth=.8;for(let k=1;k<7;k++){const u=k/7;C.beginPath();C.moveTo(-topW/2*(1-u),top-crown*u);C.lineTo(topW/2*(1-u),top-crown*u);C.stroke()}crownPts=[-topW/2,top,0,top-crown,topW/2,top]}
  else if(o.crown==='mast'){cut(-topW*.26,top-crown*.46,topW*.52,crown*.46,cmix(hex('#c8d0e8'),pal.wall,.3),.4);for(let k=0;k<3;k++)for(let i=-1;i<=1;i++)cut(i*topW*.14-3,top-crown*.42+k*crown*.13,5,crown*.08,k%2?LITS[0]:hex('#20285a'),.3);cut(-topW*.26,top-crown*.46,topW*.52,3,hex('#e8ecf6'),.2);pgon([-topW*.14,top-crown*.46,topW*.14,top-crown*.46,topW*.05,top-crown*.72,-topW*.05,top-crown*.72],hex('#b7c0dc'));pgon([-1.8,top-crown*.72,1.8,top-crown*.72,0,top-crown],hex('#e6e8f2'));crownPts=[-topW*.26,top,-topW*.26,top-crown*.46,-topW*.05,top-crown*.72,0,top-crown,topW*.05,top-crown*.72,topW*.26,top-crown*.46,topW*.26,top]}
  else if(o.crown==='flat'){cut(-topW/2+4,top-7,topW-8,7,cmix(pal.shade,hex('#07081e'),.3),.4)}
  unstash(stashed);paperize(c,.14);
  const silh=[...sil.l,...(o.crown==='flat'?[]:crownPts.slice(0)),...(()=>{const q=[];for(let i=sil.r.length-2;i>=0;i-=2)q.push(sil.r[i],sil.r[i+1]);return q})()];
  const sd2=[];for(let i=0;i<silh.length-2;i+=2){const ax=silh[i],ay=silh[i+1],bx=silh[i+2],by=silh[i+3],n=max(1,ceil(hypot(bx-ax,by-ay)/38));for(let k=0;k<n;k++)sd2.push(ax+(bx-ax)*k/n,ay+(by-ay)*k/n)}sd2.push(silh[silh.length-2],silh[silh.length-1]);
  TW[name]={c,cw,pad,H:Ht,topY:top,topW,crown,win,sil:sd2,tot,wide}}
const PAPERC=hex('#f3e9cc');
/* elastic show-time bend: a spine carries the painted strips */
const SPN=48,SPx=new Float32Array(SPN+1),SPy=new Float32Array(SPN+1),SPa=new Float32Array(SPN+1),SPw=new Float32Array(SPN+1);
function spine(t,x,y,s,d){const H_=t.H;let px=x,py=y;const dv=1/SPN,sq=d.sq==null?1:d.sq,sk=d.sk||1.6,bend=d.bend||0,bk=d.bk||1.5,bul=d.bul||0,bv=d.bv==null?.75:d.bv,rip=d.rip||0,rp=d.rp||0,lean=d.lean||0;
  for(let i=0;i<=SPN;i++){const v=i*dv,ls=max(.16,1-(1-sq)*(.3+.7*pow(v,sk)*(sk+1))),a=lean+bend*pow(v,bk)+rip*sin(v*8-rp)*(.35+v);
    const vb=(v-bv)/.3;SPx[i]=px;SPy[i]=py;SPa[i]=a;SPw[i]=max(.2,1+bul*exp(-vb*vb)+(d.sx||0));const ds=H_*dv*ls*s*(d.ht??1);px+=sin(a)*ds;py-=cos(a)*ds}
  return {x:SPx[SPN],y:SPy[SPN],a:SPa[SPN]}}
function spW(t,s){return (lx,ly)=>{const v=clamp(-ly/t.H,0,1)*SPN,i=min(SPN-1,v|0),f=v-i,px=lerp(SPx[i],SPx[i+1],f),py=lerp(SPy[i],SPy[i+1],f),a=lerp(SPa[i],SPa[i+1],f),w=lerp(SPw[i],SPw[i+1],f),e=max(0,-ly-t.H)*s,sx=lx*w*s;return [px+cos(a)*sx+sin(a)*e,py+sin(a)*sx-cos(a)*e]}}
const T_=n=>{if(!TW[n]){if(!TOWERS[n])throw new Error(M('goldenage 没有这种楼：'+n,'goldenage has no tower: '+n));towerSprite(n,TOWERS[n])}return TW[n]};
function towerHz(t){if(t.hz)return t.hz;const c=document.createElement('canvas');c.width=t.c.width;c.height=t.c.height;const x=c.getContext('2d');x.drawImage(t.c,0,0);x.globalCompositeOperation='source-atop';const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'rgba(44,56,130,.56)');g.addColorStop(1,'rgba(90,60,120,.5)');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);return t.hz=c}
function drawTower(n,x,y,s,d={},o={}){const t=T_(n);const R_=RS*SF,m=xfMat();if(o.ink===0&&!d.sq&&!d.bend&&!d.rattle){push();tr(x,y);xfDraw(o.hz?towerHz(t):t.c,-t.cw*s/2,-(t.H+t.pad)*s,t.cw*s,(t.H+t.pad)*s);pop();return}
  spine(t,x,y,s,d);C.save();C.transform(m[0],m[1],m[2],m[3],m[4],m[5]);
  const wS=t.cw,iw=t.c.width,base=t.c.height-t.pad*R_*.0;
  const rows=SPN,hPx=t.H*R_/rows;
  for(let i=0;i<rows;i++){const ax=SPx[i],ay=SPy[i],bx=SPx[i+1],by=SPy[i+1],a=(SPa[i]+SPa[i+1])/2,ww=(SPw[i]+SPw[i+1])/2,l=hypot(bx-ax,by-ay);
    const sy=(t.H+t.pad)*R_-(i+1)*hPx;C.save();C.translate(ax,ay);C.rotate(a);C.drawImage(t.c,0,sy-1,iw,hPx+1.6,-wS*ww*s/2,-l-.7*s/R_,wS*ww*s,l+1.6*s/R_);C.restore()}
  C.restore();
  /* pad: the top of the sprite above H (flag-poles etc) is not used */
  if(o.ink!==0){push();warp(spW(t,s));seed(n.length*91);L(t.sil,o.iw||1.9,o.ic||'#120c24',{closed:false,taper:.1});pop()}
  /* rattling lights ride the bent spine */
  if(d.rattle>0){const w=spW(t,s),A=d.rattle,w0=t.win;const co=K0=>0;for(let i=0;i<w0.length;i+=6){const k=hash(i*1.31+BOIL*.77);if(k>A*.6)continue;const lit=w0[i+4],lc=LITS[max(0,w0[i+5])],jx=(hash(i+BOIL)-.5)*3*A,jy=(hash(i*2+BOIL)-.5)*3*A,on=hash(i*.7+floor(BOIL/2))>.45;const q=[w0[i]+jx,w0[i+1]+jy,w0[i]+w0[i+2]+jx,w0[i+1]+jy,w0[i]+w0[i+2]+jx,w0[i+1]+w0[i+3]+jy,w0[i]+jx,w0[i+1]+w0[i+3]+jy];push();warp(w);const fc=on?(lit?'#fff4b8':'#ffcf60'):'#141c48';SD++;poly(hw(q,true),fc);pop()}}
  return {x:SPx[SPN],y:SPy[SPN],a:SPa[SPN]}}
function towerTop(n,x,y,s,d={}){const t=T_(n);spine(t,x,y,s,d);return spW(t,s)(0,-t.tot)}
/* ---- skyline strips ---- */
function skyline(name,w,h,o){makeBG(name,w,h,0,0,()=>{const base=h;const top=hex(o.top),bot=hex(o.bot);let x=-30;while(x<w+30){const bw=rr(o.minW,o.maxW),cl=.5+.5*sin(x*.006+o.seed)*sin(x*.0023+o.seed*2),bh=lerp(o.minH,o.maxH,pow(rnd(),1.4)*(.45+.55*cl));const g=C.createLinearGradient(0,base-bh,0,base);const jit=rr(-.08,.08);g.addColorStop(0,css(cmix(top,MOONT,.08+jit)));g.addColorStop(.75,css(cmix(top,bot,.4)));g.addColorStop(1,css(bot));
      const cx=x+bw/2,kind=rnd();const p=[];const yT=base-bh;
      if(kind<.3){const s1=bw*.72,s2=bw*.44,h1=bh*.14,h2=bh*.1;p.push(x,base,x,yT+h1+h2,cx-s1/2,yT+h1+h2,cx-s1/2,yT+h2,cx-s2/2,yT+h2,cx-s2/2,yT,cx+s2/2,yT,cx+s2/2,yT+h2,cx+s1/2,yT+h2,cx+s1/2,yT+h1+h2,x+bw,yT+h1+h2,x+bw,base)}
      else if(kind<.45){p.push(x,base,x,yT+bh*.16,cx-bw*.2,yT+bh*.1,cx-2,yT-bh*.2,cx+2,yT-bh*.2,cx+bw*.2,yT+bh*.1,x+bw,yT+bh*.16,x+bw,base)}
      else if(kind<.58){p.push(x,base,x,yT+bh*.06,cx,yT-bh*.08,x+bw,yT+bh*.06,x+bw,base)}
      else if(kind<.68){p.push(x,base,x,yT+10,cx-bw*.14,yT+10,cx-bw*.14,yT,cx+bw*.14,yT,cx+bw*.14,yT+10,x+bw,yT+10,x+bw,base)}
      else p.push(x,base,x,yT,x+bw,yT,x+bw,base);
      pgon(p,g);
      clip(p,()=>{cut(x+bw*.78,yT-bh*.3,bw*.3,bh*1.4,css(hex(o.sh||'#0a0a2e'),.32),.5);C.fillStyle=css(cmix(top,MOONT,.5),.28);C.fillRect(x,yT-bh*.3,1.4,bh*1.3);
        const gw=o.gw,gh=o.gh,k=o.lit*rr(.5,1.4);for(let yy=yT+4;yy<base-2;yy+=gh){const lv=vnoise(yy*.02,x);for(let xx=x+2;xx<x+bw*.8;xx+=gw){const l=hash(xx*.71+yy*1.3);if(l<k*(.5+lv)){C.fillStyle=css(LITS[(l*57|0)%6],o.wa||.92);C.fillRect(xx,yy,gw*.55,gh*.5)}else if(o.dim&&l>.82){C.fillStyle=css(hex('#0a103a'),.5);C.fillRect(xx,yy,gw*.55,gh*.5)}}}});
      x+=bw+rr(-8,o.gap||8)}
    const g=C.createLinearGradient(0,base-h*.5,0,base);g.addColorStop(0,'rgba(255,150,80,0)');g.addColorStop(1,css(WARM,o.haze));C.fillStyle=g;C.globalCompositeOperation='source-atop';C.fillRect(0,0,w,h);C.globalCompositeOperation='source-over'},.12)}
/* ---- clouds: layered gouache puffs with a moonlit top edge ---- */
function cloudSprite(name,w,h,o={}){makeBG(name,w,h,0,0,()=>{const n=o.n||30,dk=hex(o.dk||'#1c2360'),md=hex(o.md||'#343a80'),lt=hex(o.lt||'#6f74b8'),rim=hex(o.rim||'#cfc8de');const pf=[],pk=[rr(.28,.4),rr(.58,.72)];for(let i=0;i<n;i++){const u=.06+.88*(i+rnd())/n,e=max(exp(-pow((u-pk[0])/.2,2)),.8*exp(-pow((u-pk[1])/.17,2)),.26);pf.push([w*u,h*(.68-.5*e*rr(.25,1)),h*(.06+.15*e*rr(.5,1.15))])}pf.sort((a,b)=>a[1]-b[1]);
    /* each puff is painted on its own: a lit crescent on the moon side, shadow turned away */
    C.fillStyle=css(dk);C.beginPath();C.ellipse(w/2,h*.66,w*.46,h*.11,0,0,TAU);C.fill();
    for(const p of pf){const[x,y,r]=p;C.fillStyle=css(lt);C.beginPath();C.ellipse(x,y,r*1.25,r,0,0,TAU);C.fill();C.fillStyle=css(rim,.55);C.beginPath();C.ellipse(x-r*.08,y-r*.06,r*1.2,r*.95,0,0,TAU);C.fill();C.fillStyle=css(lt);C.beginPath();C.ellipse(x+r*.05,y+r*.1,r*1.18,r*.92,0,0,TAU);C.fill();C.fillStyle=css(md);C.beginPath();C.ellipse(x+r*.2,y+r*.26,r*1.1,r*.84,0,0,TAU);C.fill()}
    C.globalCompositeOperation='source-atop';const sg=C.createLinearGradient(0,h*.2,0,h*.78);sg.addColorStop(0,css(dk,0));sg.addColorStop(1,css(dk,.92));C.fillStyle=sg;C.fillRect(0,0,w,h);
    drybrush(0,h*.1,w,h*.7,28,dk,.13,.05,w*.16,9);drybrush(0,0,w,h*.5,12,rim,.05,0,w*.12,7);
    C.globalCompositeOperation='destination-out';const g=C.createLinearGradient(0,h*.6,0,h*.84);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');C.fillStyle=g;C.fillRect(0,h*.6,w,h*.4);for(let i=0;i<20;i++){drag(rnd()*w-60,h*.72+rnd()*h*.1,rnd()*w+60,h*.72+rnd()*h*.1,rr(5,14),[0,0,0],.5,5)}C.globalCompositeOperation='source-over'},.1)}
function fourStar(x,y,r,col='#fff6d0',a=1){C.fillStyle=css(hex(col),a);C.beginPath();C.moveTo(x,y-r);C.quadraticCurveTo(x,y,x+r*.7,y);C.quadraticCurveTo(x,y,x,y+r);C.quadraticCurveTo(x,y,x-r*.7,y);C.quadraticCurveTo(x,y,x,y-r);C.fill()}
/* ---- facade walls (brownstone & loft) ---- */
function facade(x,y,w,h,pal,o={}){const g=C.createLinearGradient(0,y,0,y+h);g.addColorStop(0,css(cmix(pal.wall,MOONT,.26)));g.addColorStop(.7,css(pal.wall));g.addColorStop(1,css(cmix(pal.wall,WARM,.3)));cut(x,y,w,h,g,.7);C.save();C.beginPath();C.rect(x,y,w,h);C.clip();const dark=cmix(pal.shade,hex('#07081e'),.4);blot(x,y,w,h,w*h/70000+4,20,70,dark,.14);blot(x,y,w,h,w*h/90000+3,20,70,pal.trim,.08);C.lineWidth=.5;for(let yy=y,r=0;yy<y+h;yy+=5.5,r++){C.strokeStyle=css(dark,.12+.1*rnd());C.beginPath();C.moveTo(x,yy+rr(-.3,.3));C.lineTo(x+w,yy+rr(-.3,.3));C.stroke();for(let xx=x+(r%2?5:0);xx<x+w;xx+=11){if(rnd()<.75){C.beginPath();C.moveTo(xx,yy);C.lineTo(xx,yy+5.5);C.stroke()}if(rnd()<.07){C.fillStyle=css(rnd()<.5?dark:pal.trim,.18);C.fillRect(xx,yy,11,5.5)}}}
  const bx=o.bay||44,rh=o.rh||58,bays=floor((w-10)/bx),off_=(w-bays*bx)/2;for(let r=0;r*rh<h-30;r++){if(r%3===2){cut(x,y+18+r*rh-8,w,4,cmix(pal.trim,dark,.2),.4)}for(let b=0;b<bays;b++){const wx=x+off_+b*bx+bx*.26,ww=bx*.48,yy=y+18+r*rh,wh=rh*.54,n=hash(b*7.7+r*3.3+x*.13),lit=n<(o.lit||.3),lc=LITS[(n*97|0)%6];cut(wx-2.5,yy-2.5,ww+5,wh+5,cmix(pal.trim,dark,.3),.4);winPaint(wx,yy,ww,wh,lit,lc,hash(b+r+x));if(lit){const s=ww*2.8;C.globalCompositeOperation='lighter';C.drawImage(GLOW,wx+ww/2-s/2,yy+wh/2-s/2,s,s);C.globalCompositeOperation='source-over'}cut(wx-4,yy+wh+1,ww+8,4,cmix(pal.trim,MOONT,.24),.4);pgon([wx-4,yy-3,wx+ww/2,yy-9,wx+ww+4,yy-3],cmix(pal.trim,MOONT,.16))}}
  C.restore()}
const PALS={brick:{wall:hex('#8c3f35'),shade:hex('#3b1d3a'),trim:hex('#c9a06c')},lime:{wall:hex('#a79a8c'),shade:hex('#3e3a62'),trim:hex('#e6d7ac')},rose:{wall:hex('#a2607a'),shade:hex('#3c2458'),trim:hex('#f0c98e')},teal:{wall:hex('#3f7b86'),shade:hex('#122a55'),trim:hex('#d6c98e')},ochre:{wall:hex('#b98a4a'),shade:hex('#472c48'),trim:hex('#f3dc9c')},plum:{wall:hex('#6b4a8c'),shade:hex('#201a50'),trim:hex('#e0c47c')},slate:{wall:hex('#5c6c9c'),shade:hex('#1a2055'),trim:hex('#dcd6b4')},brown:{wall:hex('#6e4030'),shade:hex('#2c1a34'),trim:hex('#b98e60')}};
/* ---- one-point street: the avenue, seen from the gutter ---- */
function street3(name,vx,vy,o){const PW=W+200,PH=max(H+140,860);makeBG(name,PW,PH,-100,-70,()=>{const f=o.f||560,cam=o.cam||.52,slope=o.slope||0,a=o.a||1.5;const P=(X,Y,Z)=>[vx+X*f/Z,vy+(cam-Y-slope*(Z-1))*f/Z];
    /* sky + far towers down the slot */
    wash(-100,-70,PW,PH,[[0,NIGHT.t],[.25,NIGHT.u],[.5,NIGHT.l],[.72,NIGHT.h],[1,NIGHT.a]]);rs(5);for(let i=0;i<90;i++)fourStar(rr(-100,PW-100),rr(-70,vy+100),rr(.5,1.7),'#fff6d0',rr(.4,.9));blot(-100,-70,PW,600,14,70,200,NIGHT.m,.1);
    /* road */
    const R0=P(-a,0,.36),R1=P(a,0,.36),Rv=P(0,0,60);pgon([R0[0],R0[1],Rv[0],Rv[1],R1[0],R1[1]],hex('#2d2c4e'));const rg=C.createLinearGradient(0,Rv[1],0,H+80);rg.addColorStop(0,css(hex('#e0905c'),.8));rg.addColorStop(.25,css(hex('#50406a'),.7));rg.addColorStop(1,css(hex('#1f1f3e'),.2));pgon([R0[0],R0[1],Rv[0],Rv[1],R1[0],R1[1]],rg);
    for(let z=.4;z<40;z*=1.1){const p=P(-a,0,z),q=P(a,0,z);pline(p[0],p[1],q[0],q[1],css(hex('#14142c'),.26),max(.3,1.4/z))}
    for(let z=.45;z<40;z*=1.34){const p0=P(-.03,0,z),p1=P(.03,0,z),p2=P(.03,0,z*1.14),p3=P(-.03,0,z*1.14);pgon([...p0,...p1,...p2,...p3],hex('#e9d9a6'),.7)}
    for(const X of [-.72,-.56,.56,.72]){const p=P(X,0,.4),q=P(X,0,40);pline(p[0],p[1],q[0],q[1],css(hex('#a9a4c8'),.5),1.3)}
    rs(9);for(let z=.42;z<7;z*=1.045){const n_=ceil(12/z);for(let k=0;k<n_;k++){const xx=-a+(k+(floor(z*40)%2?.5:0))/n_*2*a,p=P(xx,0,z),q=P(xx,0,z*1.03);pline(p[0],p[1],q[0],q[1],css(hex('#14142c'),.2),max(.3,1.1/z))}}for(let i=0;i<120;i++){const z=rr(.42,8),xx=rr(-a,a),p=P(xx,0,z);C.fillStyle=css(hex('#0c0c20'),.16);C.beginPath();C.ellipse(p[0],p[1],rr(10,50)/z,rr(2,6)/z,0,0,TAU);C.fill()}
    /* lamp pools on the road */
    C.globalCompositeOperation='lighter';for(let z=1.3;z<30;z*=1.5)for(const s of [-1,1]){const p=P(s*(a-.2),0,z),r=190/z;const g=C.createRadialGradient(p[0],p[1],0,p[0],p[1],r);g.addColorStop(0,'rgba(255,190,110,.32)');g.addColorStop(1,'rgba(255,170,90,0)');C.fillStyle=g;C.save();C.translate(p[0],p[1]);C.scale(1.5,.4);C.translate(-p[0],-p[1]);C.fillRect(p[0]-r,p[1]-r,r*2,r*2);C.restore()}C.globalCompositeOperation='source-over';
    /* walls: far to near */
    const pals=[PALS.brick,PALS.brown,PALS.ochre,PALS.rose,PALS.teal,PALS.lime,PALS.plum,PALS.brick,PALS.slate,PALS.ochre,PALS.brown];
    const sides=[-1,1];for(const s of sides){const X=s*(a+.42);let zs=[];let z=.3;let i=s<0?0:3;while(z<46){const nz=z*(1.28+.34*hash(i*3.1+s));zs.push([z,nz,pals[i%pals.length],(o.bH||4)*(.5+1.5*hash(i*5.7+s*2))]);z=nz;i++}
      for(const [z0,z1,pal,hh] of zs.reverse()){
        const hh2=hh*(z0<2?1.6:1);const n=[...P(X,0,z0),...P(X,hh2,z0),...P(X,hh2,z1),...P(X,0,z1)];const g=C.createLinearGradient(0,P(X,hh2,z0)[1],0,P(X,0,z0)[1]);g.addColorStop(0,css(cmix(pal.wall,MOONT,.16)));g.addColorStop(.6,css(cmix(pal.wall,pal.shade,.22)));g.addColorStop(1,css(cmix(pal.wall,WARM,.3)));pgon(n,g);
        /* face toward the street end */
        const e=[...P(X,0,z1),...P(X,hh2,z1),...P(X+s*2.2,hh2,z1),...P(X+s*2.2,0,z1)];
        clip(n,()=>{const nb=max(2,round((z1-z0)*(z0<3?4.5:1.6))),nr=max(3,round(hh2*4.4));for(let r=0;r<nr;r++){for(let b=0;b<nb;b++){const u0=(b+.28)/nb,u1=(b+.68)/nb,zA=1/lerp(1/z0,1/z1,u0),zB=1/lerp(1/z0,1/z1,u1),yA=(r+.3)/nr*hh2,yB=(r+.68)/nr*hh2,h_=hash(b*7.1+r*3.3+z0*9),lit=h_<.34,lc=LITS[(h_*91|0)%6];const q=[...P(X,yA,zA),...P(X,yB,zA),...P(X,yB,zB),...P(X,yA,zB)];pgon(q,lit?lc:hex('#151d4a'));if(lit&&z0<6){C.globalCompositeOperation='lighter';const c0=P(X,(yA+yB)/2,(zA+zB)/2),ss=36/z0;C.drawImage(GLOW,c0[0]-ss/2,c0[1]-ss/2,ss,ss);C.globalCompositeOperation='source-over'}if(z0<5){const k=[...P(X,yA-.02,zA),...P(X,yA,zB)];pline(k[0],k[1],k[2],k[3],css(pal.trim,.7),max(.5,2/z0))}}}
          if(z0<4){C.lineWidth=.5;for(let r=0;r<hh2*14;r++){const k=[...P(X,r/14,z0),...P(X,r/14,z1)];pline(k[0],k[1],k[2],k[3],css(pal.shade,.22),.5)}}
          blot(min(n[0],n[6])-4,min(n[3],n[5])-4,abs(n[6]-n[0])+8,abs(n[1]-n[3])+8,6,20,80,pal.shade,.14)});
        /* cornice & storefront */
        const c1=[...P(X,hh2,z0),...P(X,hh2+.09/(1),z0),...P(X,hh2+.09,z1),...P(X,hh2,z1)];pgon(c1,cmix(pal.trim,MOONT,.2));
        const st0=[...P(X,0,z0),...P(X,.34,z0),...P(X,.34,z1),...P(X,0,z1)];pgon(st0,hex('#231838'));const sN=max(1,round((z1-z0)*1.2));for(let k=0;k<sN;k++){const u0=(k+.08)/sN,u1=(k+.9)/sN,zA=1/lerp(1/z0,1/z1,u0),zB=1/lerp(1/z0,1/z1,u1);pgon([...P(X,.08,zA),...P(X,.26,zA),...P(X,.26,zB),...P(X,.08,zB)],hash(k+z0)<.7?hex('#e8a84a'):hex('#b8552e'))}
        pgon([...P(X,.34,z0),...P(X,.43,z0),...P(X+(-s)*.3,.34,z0),...P(X+(-s)*.3,.34,z1),...P(X,.43,z1)],hash(z0)>.5?hex('#b83a34'):hex('#2c6f6a'))}
      /* sidewalk */
      const sw=[...P(s*a,0,.36),...P(X,0,.36),...P(X,0,50),...P(s*a,0,50)];pgon(sw,hex('#5b5478'));clip(sw,()=>{const g=C.createLinearGradient(0,vy,0,H+80);g.addColorStop(0,css(WARM,.5));g.addColorStop(.3,css(WARM,.2));g.addColorStop(1,css(hex('#100f28'),.25));C.fillStyle=g;C.fillRect(-100,-70,PW,PH);for(let z=.4;z<40;z*=1.08){const p=P(s*a,0,z),q=P(X,0,z);pline(p[0],p[1],q[0],q[1],css(hex('#1a1832'),.3),max(.3,1/z))}});const cb=[...P(s*a,0,.36),...P(s*a,0,50)];pline(cb[0],cb[1],cb[2],cb[3],css(hex('#d9d2e6'),.8),2.4)}
    C.globalCompositeOperation='multiply';C.fillStyle='#b4b4dc';C.fillRect(-100,-70,PW,PH);C.globalCompositeOperation='source-over';
    /* warm haze down the slot */
    C.globalCompositeOperation='lighter';const vg=P(0,0,40);const g=C.createRadialGradient(vg[0],vg[1],0,vg[0],vg[1],320);g.addColorStop(0,'rgba(255,170,100,.55)');g.addColorStop(1,'rgba(255,120,60,0)');C.fillStyle=g;C.fillRect(vg[0]-330,vg[1]-330,660,660);C.globalCompositeOperation='source-over'},.14);BG[name].P=(X,Y,Z)=>{const f=o.f||560,cam=o.cam||.52,slope=o.slope||0;return [vx+X*f/Z,vy+(cam-Y-slope*(Z-1))*f/Z,f/Z]}}

/* ============================================================
   THE PLAYERS - model sheets in code
   ============================================================ */
const M_B='#f8cf5c',M_L='#ffeb9e',M_S='#d9942e',M_D='#b8741f',M_I='#4a2508',M_T='#c98a28';
let MG=null,MTX=null;
function buildMoonArt(){let c=document.createElement('canvas');c.width=c.height=256;let x=c.getContext('2d'),g=x.createRadialGradient(128,128,50,128,128,128);g.addColorStop(0,'rgba(255,214,110,.5)');g.addColorStop(.42,'rgba(255,186,70,.2)');g.addColorStop(.7,'rgba(240,130,60,.05)');g.addColorStop(1,'rgba(200,100,60,0)');x.fillStyle=g;x.fillRect(0,0,256,256);MG=c;
  c=document.createElement('canvas');c.width=c.height=420;x=c.getContext('2d');const s=C;C=x;rs(911);x.clearRect(0,0,420,420);blot(0,0,420,420,46,20,80,hex('#c47c1e'),.12);blot(0,0,420,420,34,16,70,hex('#fff0ae'),.13);drybrush(0,0,420,420,70,hex('#b06a18'),.09,.5,70,10);drybrush(0,0,420,420,50,hex('#fff4c0'),.08,-.3,60,8);C=s;MTX=c}
function moonGlow(x,y,R,a=1){push();tr(x,y);xfDraw(MG,-R*2.5,-R*2.5,R*5,R*5,a*min(1,150/R),'screen');pop()}
const CRT=[];(()=>{const add=(lon,lat,r)=>{const a=lon*PI/180,b=lat*PI/180;CRT.push([sin(a)*cos(b),sin(b),cos(a)*cos(b),r])};[[62,-46,.2],[-64,-52,.14],[74,18,.13],[-76,20,.17],[42,62,.1],[-30,70,.13],[8,-74,.11],[120,20,.26],[160,-30,.2],[-140,40,.24],[-110,-30,.16],[180,50,.17],[130,-65,.14],[-170,-20,.13],[60,75,.09],[-60,-15,.07],[58,-8,.07]].forEach(a=>add(...a))})();
function mkQ(yaw,pitch,roll){const cy=cos(yaw),sy=sin(yaw),cp=cos(pitch),sp=sin(pitch),cr=cos(roll),sr=sin(roll);return (x,y,z)=>{let a=x*cy+z*sy,c=-x*sy+z*cy,b=y*cp-c*sp,d=y*sp+c*cp;return [a*cr-b*sr,a*sr+b*cr,d]}}
function moon(x,y,R,st={}){seed(4400);const sx=st.sx||1,sy=st.sy||1,sa=st.sa||0,Q=mkQ(st.yaw||0,st.pitch||0,st.roll||0);
  if(st.glow!==0)moonGlow(x,y,R*(1+abs(sx-1)*.3),st.glow||.9);
  push();tr(x,y);if(sa)rot(sa);if(sx!==1||sy!==1)scl(sx,sy);if(sa)rot(-sa);
  if(st.flat!=null){const fl=st.flat;warp((a,b)=>[a,b>fl?fl+(b-fl)*.08:b])}
  const disc=pEll(0,0,R,R,0,TAU,60),lw=clamp(R*.026,1.6,5);
  SC(disc,M_S,()=>{F(off(disc,-R*.09,-R*.12),M_B);F(pEll(-R*.28,-R*.34,R*.62,R*.54,0,TAU,30,-.4),M_L);
    const m=xfMat();C.save();C.transform(m[0],m[1],m[2],m[3],m[4],m[5]);C.drawImage(MTX,-R,-R,R*2,R*2);C.restore();
    for(const c of CRT){const q=Q(c[0],c[1],c[2]);if(q[2]<.03)continue;const up=abs(c[1])>.9?[1,0,0]:[0,1,0],e1=[up[1]*c[2]-up[2]*c[1],up[2]*c[0]-up[0]*c[2],up[0]*c[1]-up[1]*c[0]],l=hypot(e1[0],e1[1],e1[2]);e1[0]/=l;e1[1]/=l;e1[2]/=l;const e2=[c[1]*e1[2]-c[2]*e1[1],c[2]*e1[0]-c[0]*e1[2],c[0]*e1[1]-c[1]*e1[0]],cr=cos(c[3]),sr=sin(c[3]),mk=(k,dx=0,dy=0)=>{const p=[];for(let i=0;i<16;i++){const a=i/16*TAU,ca=cos(a)*sr*k,sa2=sin(a)*sr*k,P=Q(c[0]*cr+e1[0]*ca+e2[0]*sa2,c[1]*cr+e1[1]*ca+e2[1]*sa2,c[2]*cr+e1[2]*ca+e2[2]*sa2);p.push(P[0]*R+dx,P[1]*R+dy)}return p};const o=mk(1);F(o,M_T);clipIn(o,()=>{F(mk(1,R*c[3]*.26,R*c[3]*.32),M_S==null?M_T:'#e7b44a')});L(o,lw*.5,'#a8681a',{closed:true})}
  },lw,M_I);
  const fz=Q(0,0,1)[2];
  if(fz>.05){const sk=R/100;push();warp((u,v)=>{let a=u/100,b=v/100,r2=a*a+b*b;if(r2>.985){const r=sqrt(r2);a*=.992/r;b*=.992/r;r2=.985}const q=Q(a,b,sqrt(1-r2));let X=q[0],Y=q[1];if(q[2]<0){const r=hypot(X,Y)||1;X/=r;Y/=r}return [X*R,Y*R]});LW*=sk;moonFace(st);pop()}
  pop()}
function clipIn(p,fn){const wp=[];for(let i=0;i<p.length;i+=2){tp(p[i],p[i+1]);wp.push(OX,OY)}C.save();C.beginPath();C.moveTo(wp[0],wp[1]);for(let i=2;i<wp.length;i+=2)C.lineTo(wp[i],wp[i+1]);C.closePath();C.clip();fn();C.restore()}
function moonFace(st){const eo=st.eo==null?1:st.eo,eo2=st.eo2==null?eo:st.eo2,lx=st.lx||0,ly=st.ly||0,brow=st.brow||0,ban=st.bang||0,mo=st.mo||0,mw=st.mw||30,smi=st.sm==null?10:st.sm,ex=st.ex==null?27:st.ex,ey=-18,erx=st.erx||17,ery=st.ery||23;const ink=M_I;
  F(pEll(-53,18,17,12,0,TAU,30),'rgba(240,110,60,.3)');F(pEll(53,18,17,12,0,TAU,30),'rgba(240,110,60,.3)');
  if(st.wince){for(const q of [-1,1]){L(pLine(q*(ex-16),ey-10,q*(ex+12),ey,3),4.6,ink);L(pLine(q*(ex-16),ey+10,q*(ex+12),ey,3),4.6,ink)}}
  else if(st.dizzy){for(const q of [-1,1]){S(pEll(q*ex,ey,erx,ery,0,TAU,18),PAPER,2.8);const p=[];const n=24;for(let i=0;i<n;i++){const a=i/n*TAU*2.4+st.dizzy*q,r=i/n;p.push(q*ex+cos(a)*erx*.8*r,ey+sin(a)*ery*.8*r)}L(p,2.4,INK,{taper:.2})}}
  else{const o={p:st.pr||.4,w:2.8,lid:M_B,cl:st.cl==null?.42:st.cl};eye40(-ex,ey,erx,ery,lx,ly,eo,o);eye40(ex,ey,erx,ery,lx,ly,eo2,o)}
  const by=ey-ery-7-brow*10;L(pQuad(-ex-16,by+6-ban*6,-ex,by-4,-ex+15,by+6+ban*8,6),6,'#8a5416',{taper:.6});L(pQuad(ex-15,by+6+ban*8,ex,by-4,ex+16,by+6-ban*6,6),6,'#8a5416',{taper:.6});
  F(pEll(0,8,15,11,0,TAU,24),'#efb244');F(pEll(-3,4,6,3.4,0,TAU,10),'#ffeeb4');L(pQuad(-15,9,-4,21,12,12,10),3.2,ink,{taper:.7});
  mouth40(0,38+(st.my||0),mw,mo*30,smi,{teeth:st.teeth,lw:3,in:'#5c1416',dim:st.dim==null?1:st.dim});
  L(pQuad(-13,60+mo*40,0,65+mo*40,13,60+mo*40,5),2.6,'#a8681a')}
/* --- the maintenance worker: consistent from a speck to a close-up --- */
const WC={red:'#dc4a2c',redS:'#92232c',skin:'#f8cda2',skinS:'#d4916e',nose:'#ee6f58',noseS:'#b6403e',cap:'#ece6d2',capS:'#a9afc8',stripe:'#3e5aa6',bill:'#27285a',boot:'#2b2233',bootL:'#73688a',star:'#ffcf3e',belt:'#5a3218',bib:'#ef6a42'};
const WK={by:36,lean:0,arc:0,sq:1,sx:1,tilt:0,hsx:1,hsy:1,nx:0,ny:0,turn:.35,eo:1,eo2:-1,lx:.2,ly:0,brow:0,bang:0,mo:0,mw:9,sm:3,teeth:0,dim:0,capy:0,capr:0,capOn:1,lax:-24,lay:18,lab:6,lhk:0,lhr:0,rax:24,ray:18,rab:-6,rhk:0,rhr:0,lfx:-11,lfy:0,lfa:0,lfb:5,lfd:1,rfx:11,rfy:0,rfa:0,rfb:-5,rfd:1,rag:0,fl:0,sweat:0,smear:0,wr:0,tongue:0,pant:0};
const wp=o=>Object.assign({},WK,o);
function wboot(x,y,a,d,s=1){push();tr(x,y);rot(a);scl(d*s,s);S(spl([-9,-10,3,-13,9,-9,24,-11,33,-5,31,1,14,3,-9,2,-12,-3],true,4),WC.boot,1.8);F(pEll(24,-6.5,4.6,2.6,0,TAU,8,-.2),WC.bootL);L(pLine(-10,1.5,31,1.5,4),1.9,'#0c0912',{taper:.1});pop()}
function wrag(x,y,a,s=1,fl=0){push();tr(x,y);rot(a);scl(s);const f=sin(fl)*5,g=sin(fl+1.4)*5;const p=spl([-3,-6,14,-11+f*.3,31,-9+f,42,-5+g,40,6+g,27,9+f,12,8,-2,5],true,3);SC(p,'#fbf0c8',()=>{for(let i=0;i<5;i++)L(pLine(4+i*8,-16,6+i*8,14,3),1.4,'#d6604a',{taper:0});L(pLine(-4,-1+f*.1,44,1+g*.3,4),1.3,'#d6604a',{taper:0})},1.5);pop()}
function wcap(x,y,a,s,turn=.35,tick=0){push();tr(x,y);rot(a);scl(s);const tx=turn;
  const cr=spl([-23,0,-27,-11,-20,-23,-5,-28,12,-27,24,-20,27,-9,23,0,0,3],true,4);
  SC(cr,WC.cap,()=>{for(let i=-5;i<=5;i++){L(pQuad(i*5.6-1,3,i*7.4+tx*2,-13,i*4+tx*4,-30,5),1.9,WC.stripe,{taper:0})}F([...pQuad(23,4,28,-14,8,-30,6),...pLine(40,-30,40,6,2)],'rgba(40,40,110,.18)')},2);
  L(pQuad(-23,0,0,4,23,0,8),2.6,'#1b1b44',{taper:.1});
  const bx=tx*22;S(spl([bx-22,0,bx-10,-1,bx+8,-3,bx+25,0,bx+28,6,bx+10,7,bx-14,5],true,3),WC.bill,1.8);
  push();tr(tx*15,-15);star(0,0,6.4,-PI/2+sin(tick)*.1,WC.star,1.2);pop();pop()}
function wk(x,y,s,p,dir=1,id=1){seed(7000+id);const q=p;
  push();tr(x,y);scl(s*dir,s);const lx_=-3.6*dir;
  const hx=q.hipx||0,hy=-q.by,tl=30*q.sq,cx=hx+sin(q.lean)*tl,cy=hy-cos(q.lean)*tl,mx=(hx+cx)/2+cos(q.lean)*q.arc,my=(hy+cy)/2+sin(q.lean)*q.arc,nX=cos(q.lean),nY=sin(q.lean);
  const sLx=cx-nX*12*q.sx,sLy=cy-nY*12*q.sx+3,sRx=cx+nX*12*q.sx,sRy=cy+nY*12*q.sx+3;
  const hip1x=hx-nX*8*q.sx,hip1y=hy-nY*8*q.sx,hip2x=hx+nX*8*q.sx,hip2y=hy+nY*8*q.sx;
  /* far arm, far leg */
  const lhx=sLx+q.lax,lhy=sLy+q.lay;limb(sLx,sLy,lhx,lhy,q.lab,7,6.4,WC.redS);
  glove(lhx,lhy,atan2(lhy-sLy,lhx-sLx)+q.lhr,q.lhk,.72,1);
  limb(hip1x,hip1y,q.lfx,q.lfy-7,q.lfb,14,12,WC.redS);wboot(q.lfx,q.lfy,q.lfa,q.lfd,.86);
  if(q.smear){for(let i=1;i<4;i++){const a=q.smear*i;L(pQuad(hip2x,hip2y,q.rfx-a*.6,q.rfy-14,q.rfx-a,q.rfy-8,6),3,'rgba(26,17,29,.7)',{taper:.7})}}
  limb(hip2x,hip2y,q.rfx,q.rfy-7,q.rfb,15,12.5,WC.red);wboot(q.rfx,q.rfy,q.rfa,q.rfd,.9);
  /* rag in the back pocket, wrench on the belt */
  if(!q.rag){const bx=hx-nX*16,by_=hy-nY*16;wrag(bx,by_,2.2+sin(q.fl)*.2,.42,q.fl)}
  /* torso */
  const bw=(u)=>u<.5?lerp(25,27,u*2):lerp(27,19,(u-.5)*2),tp_=[];const n=7,lft=[],rgt=[];for(let i=0;i<=n;i++){const u=i/n,v=1-u,X=v*v*hx+2*u*v*mx+u*u*cx,Y=v*v*hy+2*u*v*my+u*u*cy,w=bw(u)*q.sx;lft.push(X-nX*w,Y-nY*w);rgt.push(X+nX*w,Y+nY*w)}
  const crot=[hx-nX*14*q.sx,hy-nY*14*q.sx+6,hx,hy+10,hx+nX*14*q.sx,hy+nY*14*q.sx+6];
  const ts=[...lft,...(()=>{const a=[];for(let i=rgt.length-2;i>=0;i-=2)a.push(rgt[i],rgt[i+1]);return a})(),...crot.slice(4),...crot.slice(2,4),...crot.slice(0,2)];
  const tsS=spl(ts,true,2);cel(tsS,WC.red,WC.redS,lx_*1.3,-2.5,2.1);
  /* bib, straps, belt */
  const bibx=cx*.86+hx*.14,biby=cy*.74+hy*.26;S(pRR(bibx-10+q.turn*7,biby-7,20,18,4,6),WC.bib,1.5);L(pLine(bibx-8+q.turn*7,biby-6,sLx+3,sLy-3,2),2,INK);L(pLine(bibx+8+q.turn*7,biby-6,sRx-3,sRy-3,2),2,INK);F(pEll(bibx-6+q.turn*7,biby-3,1.6,1.6,0,TAU,6),WC.star);F(pEll(bibx+6+q.turn*7,biby-3,1.6,1.6,0,TAU,6),WC.star);
  L(pQuad(hx-nX*24*q.sx,hy-nY*24*q.sx-3,hx+nX*q.arc,hy+3,hx+nX*24*q.sx,hy+nY*24*q.sx-3,6),4.5,WC.belt,{taper:0});
  /* head */
  const hdx=cx+sin(q.lean)*23+q.nx,hdy=cy-cos(q.lean)*23+q.ny;
  push();tr(hdx,hdy);rot(q.lean*.45+q.tilt);scl(q.hsx,q.hsy);wkhead(q);pop();
  /* near arm */
  const rhx=sRx+q.rax,rhy=sRy+q.ray;limb(sRx,sRy,rhx,rhy,q.rab,8,7,WC.red);
  if(q.rag){wrag(rhx+cos(q.rhr)*3,rhy+sin(q.rhr)*3,atan2(rhy-sRy,rhx-sRx)+q.rhr,.74,q.fl)}
  glove(rhx,rhy,atan2(rhy-sRy,rhx-sRx)+q.rhr,q.rhk,.78,1);
  if(q.wr){wrench(rhx,rhy,q.wr,.8)}
  if(q.sweat){const k=q.sweat;for(let i=0;i<3;i++){const a=-PI/2+(i-1)*.8+sin(k*3+i)*.1,d=34+frac(k+i*.3)*28;sweat(hdx+cos(a)*d,hdy-6+sin(a)*d,a+PI/2,.9)}}
  pop()}
function wkhead(q){const t=q.turn,sd=7777;SD=sd;const lx_=-3*(1);
  const hd=spl([-20,-14,-11,-23,8,-24,20,-15,25,2,20,16,6,22,-8,22,-21,15,-25,2],true,4);
  /* ears */
  if(t<.75)S(pEll(-25+t*3,3,6.4,8,0,TAU,10),WC.skin,1.8);if(t>-.75)S(pEll(25+t*3,3,6.4,8,0,TAU,10),WC.skin,1.8);
  cel(hd,WC.skin,WC.skinS,-3.4,-2.4,2.1);
  const fx=t*11,ey=-3.5,gap=9.2*(1-abs(t)*.14),ery=10.5,erx=8.4;
  eye40(fx-gap,ey,erx*(1-max(0,t)*.26),ery,q.lx,q.ly,q.eo,{p:.36,w:1.8,lid:WC.skin});
  eye40(fx+gap,ey,erx*(1+min(0,t)*.26),ery,q.lx,q.ly,q.eo2<0?q.eo:q.eo2,{p:.36,w:1.8,lid:WC.skin});
  const bY=ey-ery-3-q.brow*5;L(pQuad(fx-gap-8,bY+2-q.bang*4,fx-gap,bY-2,fx-gap+7,bY+2+q.bang*5,4),2.6,'#44251a',{taper:.5});L(pQuad(fx+gap-7,bY+2+q.bang*5,fx+gap,bY-2,fx+gap+8,bY+2-q.bang*4,4),2.6,'#44251a',{taper:.5});
  mouth40(fx*1.08,15.5,q.mw,q.mo*13,q.sm,{teeth:q.teeth,lw:1.8,dim:q.dim});
  if(q.tongue){const lg=q.tongue*22;S(spl([fx-5,15,fx-6,18+lg*.7,fx,20+lg,fx+6,18+lg*.7,fx+5,15],true,3),'#ec6f78',1.5)}
  const nx=fx*1.5;cel(pEll(nx,6.5,10,8,0,TAU,16),WC.nose,WC.noseS,-1.8,-1.6,1.9);F(pEll(nx-3.2,3.8,2.6,1.7,0,TAU,6),'#ffd5c0');
  if(q.capOn>.5){wcap(0+q.capx0,-22-q.capy,q.capr,1,t,0)}}
WK.capx0=0;
function wrench(x,y,a,s){push();tr(x,y);rot(a);scl(s);S(spl([-5,-46,5,-46,6,8,-6,8],true,2),'#aab2c8',1.8);S([-14,-52,-5,-44,5,-44,14,-52,16,-68,6,-70,6,-58,-6,-58,-6,-70,-16,-68],'#c8d0e0',1.8);S(pEll(0,12,9,9,0,TAU,12),'#aab2c8',1.8);F(pEll(0,12,3.4,3.4,0,TAU,8),INK);pop()}
/* --- hardware --- */
const WOOD='#d7a35a',WOODS='#8f5a2a';
function ladder(x0,y0,x1,y1,w,sp,b=0,lw=1.8){const dx=x1-x0,dy=y1-y0,l=hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,mx=(x0+x1)/2+nx*b,my=(y0+y1)/2+ny*b,rw=max(1.4,w*.13);const pt=(u,o)=>{const v=1-u;return [v*v*x0+2*u*v*mx+u*u*x1+nx*o,v*v*y0+2*u*v*my+u*u*y1+ny*o]};const N=max(3,l/sp|0);const rail=o=>{const a=[];for(let i=0;i<=34;i++){const q=pt(i/34,o);a.push(q[0],q[1])}return a};
  for(let i=0;i<=N;i++){const u=i/N,a=pt(u,-w/2),c=pt(u,w/2);L([a[0],a[1],(a[0]+c[0])/2,(a[1]+c[1])/2,c[0],c[1]],rw*1.05,lw<1?WOODS:'#3a2010',{taper:0});if(lw>=1.2)L([a[0],a[1],(a[0]+c[0])/2,(a[1]+c[1])/2,c[0],c[1]],rw*.55,WOOD,{taper:0})}
  for(const o of [-w/2,w/2]){const r=rail(o);L(r,rw*1.5,'#3a2010',{taper:0});L(r,rw*.82,o<0?WOOD:'#b9823f',{taper:0})}}
function bracket(x,y,s,sw=0){push();tr(x,y);rot(sw);scl(s);const dk='#2e3050',md='#5d6494',lt='#8f97c4';S(spl([-20,-560,8,-560,12,-120,20,-52,24,-20,22,10,-12,14,-22,-14,-20,-56,-26,-140],true,3),md,2.2);F(spl([-18,-558,-10,-558,-12,-120,-6,-40,-16,-10,-20,-40,-23,-130],true,3),lt);for(let i=0;i<9;i++){F(pEll(-6,-120-i*48,3.4,3.4,0,TAU,8),dk);F(pEll(-7,-121-i*48,1.4,1.4,0,TAU,6),lt)}S(pEll(2,-2,9,9,0,TAU,14),'#14142c',2);pop()}
/* brass screw seen from the side: head at the left, thread running right */
function screwSide(x,y,s,rot_,len,a=0,o={}){push();tr(x,y);rot(a);scl(s);const hw_=26,sh=11,Y=0;const body=[12,-sh,len,-sh+1,len+12,0,len,sh-1,12,sh];SC(body,'#e1b45a',()=>{for(let i=-1;i<len/9+2;i++){const X=12+i*9+frac(rot_)*9;L(pQuad(X-5,-sh,X+1,0,X+7,sh,5),2.2,'#8a5c1e',{taper:0})}F([12,-sh,len+14,-sh,len+14,-sh+5,12,-sh+5],'rgba(255,240,180,.4)');F([12,sh-4,len+14,sh-4,len+14,sh,12,sh],'rgba(110,60,20,.4)')},2);
  const hd=spl([-14,-hw_,8,-hw_+1,14,-hw_+8,14,hw_-8,8,hw_-1,-14,hw_,-20,hw_-8,-20,-hw_+8],true,3);cel(hd,'#f2c766','#a26d24',-3,-5,2.2);const sl=sin(rot_*TAU)*hw_*.82;F(pRR(-19.5,sl-3.4,6,6.8,1.4,4),'#3c2410');L(pQuad(-17,-hw_+6,-10,0,-16,-hw_*.3,3),2,'#fff0b0');pop()}
function wtower(x,y,s,o={}){seed(3100+(o.id||0));const r=o.r||0,sq=o.sq||1;push();tr(x,y);rot(r);scl(s*(1+(1-sq)*.5),s*sq);
  for(const X of [-34,-12,12,34])L(pLine(X,0,X*.86,-44,3),3,'#2a2030',{taper:0});L(pLine(-34,-8,30,-40,2),1.5,'#2a2030');L(pLine(34,-8,-30,-40,2),1.5,'#2a2030');L(pLine(-30,-24,30,-24,2),1.5,'#2a2030');
  const b=[-36,-44,-38,-90,-34,-112,34,-112,38,-90,36,-44,0,-40];SC(spl(b,true,3),'#8c5a38',()=>{for(let i=-5;i<=5;i++)L(pLine(i*7,-118,i*7,-36,2),1.1,'#3a2018',{taper:0});F([12,-120,50,-120,50,-30,14,-30],'rgba(24,12,50,.42)');F([-40,-118,-26,-118,-26,-30,-40,-30],'rgba(180,190,240,.2)');for(const Y of [-56,-78,-100])L(pQuad(-38,Y,0,Y+5,38,Y,6),2.2,'#2a2030',{taper:0})},2);
  S([-40,-110,0,-146,40,-110,0,-104],'#4a3a58',2);F([-38,-110,0,-144,-8,-108],'rgba(170,180,230,.32)');pop()}
function lamp(x,y,s,o={}){const tw=o.tw||0,lean=o.lean||0,h=o.h||170,on=o.on==null?1:o.on;seed(3300+(o.id||0));push();tr(x,y);scl(s);const pts=[],n=20;for(let i=0;i<=n;i++){const v=i/n;pts.push(sin(v*tw*5)*abs(tw)*17*sin(v*PI)*1.2+lean*v*v*h,-h*v+abs(tw)*v*8)}const r=[];const l=[];for(let i=0;i<=n;i++){const v=i/n,w=lerp(5.2,2.8,v);l.push(pts[2*i]-w,pts[2*i+1]);r.push(pts[2*i]+w,pts[2*i+1])}const b=[...l];for(let i=r.length-2;i>=0;i-=2)b.push(r[i],r[i+1]);S(b,'#23304e',1.6);S(pRR(-9,-14,18,14,3,5),'#23304e',1.6);const tx=pts[2*n],ty=pts[2*n+1];if(on){const m=xfMat();tp(tx,ty-14);const dx=OX,dy=OY,ss=hypot(m[0],m[1])*62;C.save();C.globalCompositeOperation='lighter';C.drawImage(GLOW,dx-ss,dy-ss,ss*2,ss*2);C.restore()}S(pEll(tx,ty-13,11,14,0,TAU,14),on?'#fff0b0':'#6a6a80',1.7);S([tx-8,ty-27,tx+8,ty-27,tx+2,ty-34,tx-2,ty-34],'#23304e',1.5);L(pLine(tx-12,ty-1,tx+12,ty-1,2),3,'#23304e',{taper:0});pop()}
function hangSign(x,y,s,sw,lit,word,col='#ff5a48',id=0){seed(3400+id);push();tr(x,y);scl(s);L(pLine(0,0,30,0,2),2.4,'#23304e',{taper:0});push();tr(26,0);rot(sw);L(pLine(-14,0,-14,16,1),1.5,'#23304e',{taper:0});L(pLine(14,0,14,16,1),1.5,'#23304e',{taper:0});S(pRR(-22,16,44,24+word.length*19,4,10),'#17204e',2);if(lit){const m=xfMat();tp(0,28+word.length*9);const ss=hypot(m[0],m[1])*(40+word.length*12);C.save();C.globalCompositeOperation='lighter';C.drawImage(GLOW,OX-ss,OY-ss,ss*2,ss*2);C.restore()}[...word].forEach((c,i)=>text(c,0,30+i*19,15,{w:2.6,col:lit?col:'#4a4a70',wide:.64,track:.9}));pop();pop()}
function ncat(x,y,s,st={},dir=1){seed(3500);const e=st.e==null?.1:st.e,st_=st.st||0,up=st.up||0;push();tr(x,y);scl(s*dir,s*(1+st_*.3));const k='#1b1730';S(spl([-30,0,-34,-16,-14,-26,12,-26-up*10,24,-12,26,0],true,3),k,1.5);L(pQuad(-30,-6,-52,-14+up*-20,-44,-34-up*16,6),5.4,k,{taper:.5});const hx=26,hy=-30-up*16;S(spl([hx-16,hy,hx-15,hy-14,hx-10,hy-22,hx-3,hy-14,hx+3,hy-14,hx+10,hy-22,hx+15,hy-14,hx+16,hy,hx,hy+14],true,3),k,1.5);if(e>.2){eye40(hx-6,hy-3,6,7*e,st.lx||0,st.ly||-1,1,{p:.34,w:1,hl:0,white:'#f4e27a'});eye40(hx+6,hy-3,6,7*e,st.lx||0,st.ly||-1,1,{p:.34,w:1,hl:0,white:'#f4e27a'})}else{L(pQuad(hx-11,hy-3,hx-6,hy,hx-2,hy-3,3),1.3,'#f4e27a');L(pQuad(hx+2,hy-3,hx+6,hy,hx+11,hy-3,3),1.3,'#f4e27a')}for(const Q of [-1,1])for(const dy of [-2,3])L(pLine(hx+Q*6,hy+5,hx+Q*24,hy+3+dy*1.6,2),.9,'#c9c0da');pop()}
function pigeon(x,y,s,st={},dir=1){seed(3600);const up=st.up||0;push();tr(x,y);scl(s*dir,s);S(spl([-13,-7,-3,-15,9,-12,14,-4,6,1,-6,1],true,3),'#6c7aa6',1.3);S(pEll(11,-16,6.4,6.4,0,TAU,10),'#6c7aa6',1.3);F(pEll(13,-17,1.6,2,0,TAU,6),INK);S([16,-17,23,-15,16,-13],'#e6a83a',.9);if(up){L(pQuad(-3,-12,-14,-26-up*8,-20,-12,4),4,'#515f8c',{taper:.5})}else L(pQuad(-3,-12,-12,-14,-14,-5,3),1.4,'#2a2d56');L(pLine(-2,1,-2,6,1),1.2,'#e6a83a');L(pLine(4,1,4,6,1),1.2,'#e6a83a');pop()}
function cab(x,y,s,st={}){seed(3700);push();tr(x,y+(st.hop||0)*s);rot(st.r||0);scl(s);const yl='#f4c332',ys='#b97e1e';
  F(pEll(0,2,60,6,0,TAU,14),'rgba(10,8,24,.46)');S(spl([-46,-60,-34,-92,34,-92,46,-60],true,3),'#c79a2a',2);S(spl([-38,-62,-28,-86,28,-86,38,-62],true,3),'#28345e',1.6);F([-20,-84,-6,-84,-22,-64,-34,-64],'rgba(200,220,255,.3)');
  cel(spl([-58,-14,-58,-44,-46,-62,46,-62,58,-44,58,-14,42,-8,-42,-8],true,4),yl,ys,-3,-5,2.2);for(let i=0;i<14;i++)for(let j=0;j<2;j++)if((i+j)%2===0)F(pRR(-52+i*7.5,-40+j*6,7.5,6,0,6),INK);F(pRR(-24,-26,48,8,2,6),'#3a3648');S(pEll(-44,-22,6,6,0,TAU,8),'#ff5a48',1.5);S(pEll(44,-22,6,6,0,TAU,8),'#ff5a48',1.5);
  for(const X of [-40,40])S(pRR(X-13,-12,26,16,6,6),'#16121e',1.8);S(pRR(-62,-10,124,7,3,8),'#c2c6d8',1.6);pop()}
/* steel lattice along a curve */
const STL='#f2a62c',STLS='#a65a1a';
function lattice(x0,y0,cx,cy,x1,y1,w0,w1,o={}){const n=o.n||16,pt=u=>{const v=1-u;const X=v*v*x0+2*u*v*cx+u*u*x1,Y=v*v*y0+2*u*v*cy+u*u*y1,tx=2*v*(cx-x0)+2*u*(x1-cx),ty=2*v*(cy-y0)+2*u*(y1-cy),d=hypot(tx,ty)||1;return [X,Y,-ty/d,tx/d]},A=[],B=[];for(let i=0;i<=n;i++){const u=i/n,p=pt(u),w=lerp(w0,w1,u)/2;A.push(p[0]+p[2]*w,p[1]+p[3]*w);B.push(p[0]-p[2]*w,p[1]-p[3]*w)}
  const br=(ax,ay,bx,by)=>{L([ax,ay,(ax+bx)/2,(ay+by)/2,bx,by],5,INK,{taper:0});L([ax,ay,(ax+bx)/2,(ay+by)/2,bx,by],2.6,STLS,{taper:0})};
  for(let i=0;i<n;i++){br(A[2*i],A[2*i+1],B[2*i],B[2*i+1]);if(i%2===0)br(A[2*i],A[2*i+1],B[2*i+2],B[2*i+3]);else br(B[2*i],B[2*i+1],A[2*i+2],A[2*i+3])}
  L(A,10,INK,{taper:0});L(B,10,INK,{taper:0});L(A,6,o.c||STL,{taper:0});L(B,6,o.c2||'#d27f24',{taper:0});
  if(o.rivets){for(let i=0;i<=n;i++){F(pEll(A[2*i],A[2*i+1],1.5,1.5,0,TAU,5),'#fff0b0')}}return {A,B}}
function puffCel(x,y,r,col='#d8cfc8',sh='#8f88a8',sd=1){const pr=[];for(let i=0;i<6;i++){const a=i/6*TAU+sd,R=r*.62;pr.push(pEll(x+cos(a)*R,y+sin(a)*R*.72,r*(.42+.2*hash(sd+i)),r*(.42+.2*hash(sd+i)),0,TAU,10))}pr.push(pEll(x,y,r*.72,r*.72,0,TAU,12));const ws=[];for(const p of pr){SD++;const wp=hw(p,true);ws.push(wp);inkW(wp,1.6,'#2a2240',{closed:true})}for(const wp of ws)poly(wp,col);F(pEll(x+r*.2,y+r*.26,r*.56,r*.34,0,TAU,10),sh)}
function dust(t,t0,x,y,n,sd,R=60,life=.9,col='#d8cfc8'){const u=(t-t0)/life;if(u<0||u>1)return;for(let i=0;i<n;i++){const a=PI+hash(i*3.1+sd)*PI*(1)-.0,sp=R*(.5+hash(i*5.1+sd)),X=x+cos(a)*sp*eOut(u)*1.6,Y=y+sin(a)*sp*eOut(u)*.5-10*u,r=(10+hash(i+sd)*16)*(.5+u*.9)*(1-u*u)*R/60;if(r>1)puffCel(X,Y,r,col,'#8f88a8',i+sd)}}
function debris(t,t0,x,y,n,sd,V=420,g=900,cols=['#8c3f35','#a79a8c','#5c6c9c','#ffd766']){const dt=t-t0;if(dt<0||dt>2.2)return;for(let i=0;i<n;i++){const a=-PI*(.12+.76*hash(i*2.3+sd)),v=V*(.45+hash(i*4.1+sd)*.8),X=x+cos(a)*v*dt,Y=y+sin(a)*v*dt+.5*g*dt*dt,r=dt*8*(hash(i+sd)-.5),s=3+hash(i*7+sd)*7,col=cols[i%cols.length],ca=cos(r),sa=sin(r),q=[X+(-s*ca+s*.6*sa),Y+(-s*sa-s*.6*ca),X+(s*ca+s*.6*sa),Y+(s*sa-s*.6*ca),X+(s*ca-s*.6*sa),Y+(s*sa+s*.6*ca),X+(-s*ca-s*.6*sa),Y+(-s*sa+s*.6*ca)];S(q,col,1.3)}}
function impactStar(x,y,r,a=0,fill='#fff6c8',ring='#ff9a3c'){burst(x,y,r*1.28,16,a+.1,ring,2.4,.62);burst(x,y,r,14,a,fill,2.2,.56)}
function bird3(x,y,s,fl){L(pQuad(x-10*s,y-sin(fl)*5*s,x-4*s,y-5*s,x,y,3),1.6,'#120c24');L(pQuad(x+10*s,y-sin(fl)*5*s,x+4*s,y-5*s,x,y,3),1.6,'#120c24')}

/* ============================================================
   THE SETS - every painted plate in the picture
   ============================================================ */
function paintSky(w,h,o={}){wash(0,0,w,h,[[0,NIGHT.t],[.34,NIGHT.u],[.62,NIGHT.m],[.82,NIGHT.l],[.93,NIGHT.h],[1,NIGHT.a]]);blot(0,0,w,h*.9,26,90,300,NIGHT.m,.16);blot(0,0,w,h*.8,20,70,260,NIGHT.t,.2);for(let i=0;i<46;i++){const y=rnd()*h*.9,x=rnd()*w;drag(x-rr(80,300),y+rr(-20,20),x+rr(80,300),y+rr(-20,20),rr(10,44),rnd()<.5?NIGHT.t:NIGHT.l,.06,7)}
  for(let i=0;i<(o.stars||420);i++){const x=rnd()*w,y=rnd()*h*.8,r=pow(rnd(),3)*2.2+.5;C.fillStyle=css(hex('#fff7d8'),rr(.35,.95));C.beginPath();C.arc(x,y,r*.6,0,TAU);C.fill();if(r>1.7)fourStar(x,y,r*3)}}
function roofDeck(x,y,w,pal,o={}){/* parapet lip, tar deck, facade below */
  const h=o.h||(1590-y);facade(x,y+10,w,h,pal,{bay:o.bay||54,rh:o.rh||68,lit:o.lit||.42});
  cut(x-5,y,w+10,14,cmix(pal.trim,MOONT,.22),.6);cut(x-5,y+11,w+10,4,cmix(pal.shade,hex('#06061c'),.4),.3);for(let i=0;i<w/14;i++){pgon([x+i*14,y+14,x+i*14+7,y+19,x+i*14+14,y+14],cmix(pal.trim,hex('#1a1034'),.34))}}
function chimney(x,y,w,h,pal){cut(x,y-h,w,h,cmix(pal.wall,hex('#201030'),.2),.6);C.save();C.beginPath();C.rect(x,y-h,w,h);C.clip();for(let yy=y-h,r=0;yy<y;yy+=6,r++){pline(x,yy,x+w,yy,css(hex('#1b0f28'),.42),.6);for(let xx=x+(r%2?6:0);xx<x+w;xx+=12)pline(xx,yy,xx,yy+6,css(hex('#1b0f28'),.42),.6)}C.fillStyle=css(hex('#0f0a2a'),.42);C.fillRect(x+w*.62,y-h,w*.4,h);C.fillStyle=css(MOONT,.25);C.fillRect(x,y-h,2,h);C.restore();cut(x-4,y-h-6,w+8,7,cmix(pal.trim,hex('#32284e'),.4),.4)}
function skylight(x,y,w,h){pgon([x,y,x+w*.14,y-h,x+w*.86,y-h,x+w,y],hex('#ffd98a'));for(let i=1;i<6;i++)pline(x+w*i/6,y,x+w*.14+w*.72*i/6,y-h,css(hex('#3a2838')),1.3);pline(x+w*.07,y-h/2,x+w*.93,y-h/2,css(hex('#3a2838')),1.3);C.strokeStyle=css(hex('#231828'));C.lineWidth=2;C.beginPath();C.moveTo(x,y);C.lineTo(x+w*.14,y-h);C.lineTo(x+w*.86,y-h);C.lineTo(x+w,y);C.stroke();C.globalCompositeOperation='lighter';C.drawImage(GLOW,x-w*.3,y-h-w*.5,w*1.6,w*1.3);C.globalCompositeOperation='source-over'}
const ROOFS=[{x:-300,x1:1120,y:560,pal:PALS.brick},{x:1520,x1:2360,y:600,pal:PALS.teal},{x:3120,x1:3560,y:690,pal:PALS.ochre},{x:4240,x1:5200,y:600,pal:PALS.plum}];

function defineSets(){
 /* --- towers --- */
 TOWERS.hotel={seed:11,pal:PALS.brick,crown:'flat',ch:8,dark:.74,tiers:[[300,190,{bay:30,rh:26,top:18}],[280,200,{bay:28,rh:24,chev:1}],[240,110,{bay:26,rh:22,fan:20}]]};
 TOWERS.broad={seed:23,pal:PALS.rose,crown:'flat',ch:8,dark:.72,tiers:[[360,150,{bay:30,rh:26}],[340,150,{bay:28,rh:24,chev:1,fan:22}],[280,80,{bay:26,rh:22}]]};
 TOWERS.slab={seed:37,pal:PALS.teal,crown:'mast',ch:150,dark:.7,tiers:[[260,300,{bay:24,rh:22}],[230,280,{bay:22,rh:20,chev:1}],[180,170,{bay:20,rh:19,fan:24,eagle:1}],[120,70,{bay:18,rh:18,eagle:1}]]};
 TOWERS.spire={seed:41,pal:PALS.lime,crown:'spire',ch:260,dark:.68,tiers:[[220,260,{bay:22,rh:20}],[190,230,{bay:20,rh:19,chev:1,eagle:1}],[150,150,{bay:18,rh:18,eagle:1}]]};
 TOWERS.zig={seed:53,pal:PALS.ochre,crown:'pyr',ch:80,dark:.7,tiers:[[420,130,{bay:28,rh:24,side:.12}],[350,110,{bay:26,rh:22,chev:1,side:.12}],[280,100,{bay:24,rh:22,fan:20,side:.14}],[210,90,{bay:22,rh:20,chev:1,eagle:1,side:.14}],[140,70,{bay:20,rh:19,eagle:1,side:.16}]]};
 TOWERS.pyr={seed:67,pal:PALS.plum,crown:'pyr',ch:100,dark:.68,tiers:[[240,330,{bay:24,rh:22}],[190,190,{bay:21,rh:20,chev:1,fan:18}],[130,90,{bay:19,rh:19,eagle:1}]]};
 TOWERS.mastb={seed:79,pal:PALS.slate,crown:'mast',ch:170,dark:.7,tiers:[[280,340,{bay:24,rh:21}],[230,300,{bay:22,rh:20,chev:1,eagle:1}],[160,220,{bay:20,rh:19,fan:26,eagle:1}]]};
 TOWERS.lowa={seed:83,pal:PALS.brown,crown:'flat',ch:8,dark:.76,tiers:[[260,230,{bay:30,rh:26}],[230,90,{bay:26,rh:24}]]};
 /* --- sky & skyline strips --- */
 PLATES.sky=()=>makeBG('sky',1800,1700,0,0,(w,h)=>paintSky(w,h));
 PLATES.skyHi=()=>makeBG('skyHi',1400,1000,0,0,(w,h)=>{wash(0,0,w,h,[[0,NIGHT.t],[.55,NIGHT.u],[1,NIGHT.m]]);blot(0,0,w,h,20,90,300,NIGHT.m,.14);blot(0,0,w,h,16,60,200,NIGHT.t,.2);for(let i=0;i<34;i++){const y=rnd()*h,x=rnd()*w;drag(x-rr(80,300),y,x+rr(80,300),y+rr(-20,20),rr(10,44),rnd()<.5?NIGHT.t:NIGHT.m,.08,7)}for(let i=0;i<330;i++){const x=rnd()*w,y=rnd()*h,r=pow(rnd(),3)*2.4+.5;C.fillStyle=css(hex('#fff7d8'),rr(.4,1));C.beginPath();C.arc(x,y,r*.6,0,TAU);C.fill();if(r>1.8)fourStar(x,y,r*3.2)}});
 PLATES.far=()=>skyline('far',3000,520,{seed:2,top:'#45508e',bot:'#7a5a8e',minW:46,maxW:120,minH:90,maxH:470,gw:7,gh:9,lit:.3,wa:.8,haze:.55,gap:4,sh:'#232a68'});
 PLATES.mid=()=>skyline('mid',3400,760,{seed:5,top:'#242c68',bot:'#3a2850',minW:70,maxW:170,minH:160,maxH:700,gw:10,gh:12,lit:.38,haze:.42,gap:6,sh:'#0a0c30',dim:1});
 PLATES.cl1=()=>cloudSprite('cl1',520,170,{n:18});PLATES.cl2=()=>cloudSprite('cl2',360,120,{n:13});PLATES.cl3=()=>cloudSprite('cl3',720,220,{n:24,dk:'#1a2158',md:'#343c84',lt:'#7d82c4',rim:'#c8c0d8'});PLATES.cl4=()=>cloudSprite('cl4',420,120,{n:14,dk:'#2c2f70',md:'#555aa0',lt:'#b0b0de',rim:'#f6e2b2'});
 /* --- avenue from the gutter, and the long hill --- */
 PLATES.avenue=()=>street3('avenue',W/2,H*.583,{f:560,cam:.3,bH:6.2});
 PLATES.hill=()=>street3('hill',W/2,H*.458,{f:540,cam:.3,bH:6.2,slope:.085});
 PLATES.nearRow=()=>skyline('nearRow',3800,460,{seed:9,top:'#1c1840',bot:'#2a1a34',minW:110,maxW:220,minH:170,maxH:400,gw:18,gh:22,lit:.3,haze:.5,gap:0,sh:'#080824'});
 /* --- straight down from the moon's perch --- */
 PLATES.down=()=>makeBG('down',W+200,H+140,-100,-70,()=>{const vx=W/2,vy=H/2,RK=max(W,H)/960;wash(-100,-70,W+200,H+140,[[0,hex('#2a2a58')],[1,hex('#1c1c44')]]);
   const pals=[PALS.brick,PALS.lime,PALS.rose,PALS.teal,PALS.ochre,PALS.plum,PALS.slate,PALS.brown];const N=9;
   /* streets glow up from the bottom of the shaft */
   const g=C.createRadialGradient(vx,vy,0,vx,vy,170);g.addColorStop(0,'#ffe4a0');g.addColorStop(.4,'#ff9f55');g.addColorStop(1,'rgba(200,80,70,0)');C.fillStyle=g;C.fillRect(vx-170,vy-170,340,340);
   const rays=[];for(let i=0;i<N;i++){const a=i/N*TAU+.2,w=TAU/N*.82;rays.push([a,w])}
   for(let i=0;i<N;i++){const [a,w]=rays[i],pal=pals[i%8],r0=rr(60,110),r1=rr(760,980)*RK,A0=a-w/2,A1=a+w/2,p=[vx+cos(A0)*r0,vy+sin(A0)*r0,vx+cos(A1)*r0,vy+sin(A1)*r0,vx+cos(A1)*r1,vy+sin(A1)*r1,vx+cos(A0)*r1,vy+sin(A0)*r1];const gg=C.createRadialGradient(vx,vy,r0,vx,vy,r1);gg.addColorStop(0,css(cmix(pal.wall,WARM,.5)));gg.addColorStop(.45,css(pal.wall));gg.addColorStop(1,css(cmix(pal.wall,MOONT,.42)));pgon(p,gg);
     clip(p,()=>{for(let c=0;c<10;c++){const b=A0+(c+.3)/10*w,b2=A0+(c+.72)/10*w;let r=r0;let k=0;while(r<r1){const rn=r*1.075;const lit=hash(c*3.1+k*1.7+i)<.46;pgon([vx+cos(b)*r,vy+sin(b)*r,vx+cos(b2)*r,vy+sin(b2)*r,vx+cos(b2)*rn*.985,vy+sin(b2)*rn*.985,vx+cos(b)*rn*.985,vy+sin(b)*rn*.985],lit?LITS[(c+k)%6]:hex('#141c48'));r=rn;k++}}blot(vx-900,vy-900,1800,1800,8,50,200,pal.shade,.2)});
     /* roof of each tower, tilting at us */
     const rA=r1*.78;for(const q of [0]){const T0=A0,T1=A1;pline(vx+cos(T0)*r0,vy+sin(T0)*r0,vx+cos(T0)*r1,vy+sin(T0)*r1,'#0c0c28',2.4)}}
 },.15);
 /* --- rooftop run: one long painted plate --- */
 PLATES.roofs=()=>makeBG('roofs',5500,1720,-300,-120,(w)=>{rs(101);const X0=-300;
   /* gap walls: deep street slots */
   for(const [a,b] of [[1120,1520],[2360,3120],[3560,4240]]){const g=C.createLinearGradient(0,760,0,1600);g.addColorStop(0,'rgba(20,20,70,0)');g.addColorStop(1,'rgba(14,8,28,.92)');C.fillStyle=g;C.fillRect(a,760,b-a,840)}
   for(const R of ROOFS){roofDeck(R.x,R.y,R.x1-R.x,R.pal,{lit:.3});}
   /* roofline furniture */
   chimney(120,560,54,96,PALS.brown);chimney(760,560,44,74,PALS.brown);skylight(420,560,130,46);chimney(1760,600,60,120,PALS.brick);skylight(2000,600,110,38);chimney(3300,690,50,88,PALS.brown);chimney(4500,600,60,100,PALS.brick);skylight(4800,600,140,50);
   for(const [x,y] of [[260,560],[640,560],[1900,600],[3430,690]]){L(pQuad(x,y,x-4,y-18,x+6,y-30,4),3,'#2a2848',{taper:.1});L(pQuad(x+6,y-30,x+18,y-34,x+20,y-24,3),3,'#2a2848',{taper:.1})}
 },.15);
 /* --- moon-side close plates: the sky behind the ladder --- */
 /* --- construction site --- */
 PLATES.site=()=>{need('sky');need('far');need('mid');return makeBG('site',1260,980,-150,-70,()=>{rs(211);C.drawImage(BG.sky.c,0,700*RS,1800*RS,800*RS,-150,-70,1260,620);C.drawImage(BG.far.c,600*RS,0,1400*RS,520*RS,-150,60,1500,520);C.drawImage(BG.mid.c,0,0,1500*RS,760*RS,-200,0,1500,720);
   /* half-built steel skeleton, tall behind */
   for(const [x0,cols,lvl] of [[440,5,9],[60,3,6]]){const cw=74,fh=62,y0=620;for(let l=0;l<=lvl;l++){const yy=y0-l*fh,cc=l===lvl?cols-2:cols;pline(x0,yy,x0+cc*cw,yy,css(hex('#3f2440'),.92),6);pline(x0,yy-2,x0+cc*cw,yy-2,css(hex('#7a4048'),.8),1.3)}for(let c=0;c<=cols;c++){const xx=x0+c*cw,topL=(c>=cols-1)?lvl-1:lvl+.6;pline(xx,y0,xx,y0-topL*fh,css(hex('#38203c'),.95),7);pline(xx-2,y0,xx-2,y0-topL*fh,css(hex('#7a4048'),.8),1.3);for(let l=0;l<lvl;l++){if(hash(c*3+l)<.5&&c<cols){pline(xx,y0-l*fh,xx+cw,y0-(l+1)*fh,css(hex('#3f2440'),.7),2)}}}}
   for(const [x,y] of [[500,250],[700,126]]){C.globalCompositeOperation='lighter';C.drawImage(GLOW,x-24,y-24,48,48);C.globalCompositeOperation='source-over'}
   /* yard */
   const g=C.createLinearGradient(0,600,0,910);g.addColorStop(0,'#6a4a50');g.addColorStop(.3,'#59405a');g.addColorStop(1,'#2d2240');C.fillStyle=g;C.fillRect(-150,600,1260,310);blot(-150,600,1260,310,60,30,120,hex('#22162f'),.2);blot(-150,600,1260,310,44,20,80,hex('#a07050'),.14);drybrush(-150,610,1260,300,110,hex('#1a1028'),.14,0,120,12);drybrush(-150,610,1260,300,80,hex('#b08868'),.1,0,90,7);
   /* board fence across the back, with posters */
   for(let i=0;i<46;i++){const x=-150+i*29;const hh=rr(158,176),col=cmix(hex('#7a5438'),hex('#5e3e36'),rnd());cut(x,622-hh,28,hh,col,.5);pline(x,622-hh,x,622,css(hex('#20102a')),1.3);pline(x+6,622-hh+rr(0,40),x+7,622-rr(10,50),css(hex('#311a22'),.5),.7);C.fillStyle=css(MOONT,.1);C.fillRect(x+1,622-hh,3,hh)}
   for(const [x,y,w,h,c] of [[-60,500,120,92,'#d8c49a'],[920,492,110,104,'#e0c8a2']]){cut(x,y,w,h,c,1);drybrush(x,y,w,h,8,hex('#7c5a44'),.2,0,60,6);}cut(-46,520,92,20,'#b83a34',.8);cut(-36,552,72,10,'#2c4a7a',.6);cut(930,510,90,24,'#2c6f6a',.8);cut(940,548,70,28,'#b83a34',.8);
   pline(-150,540,1110,540,css(hex('#3a2230')),5);pline(-150,600,1110,600,css(hex('#3a2230')),5);
   /* sand pile, pipe stacks, drums */
   pgon(spl([620,700,680,650,760,624,830,650,880,700],false,5),hex('#a07c52'));drybrush(650,640,220,60,12,hex('#6e4a44'),.22,.3,60,8);
   for(let i=0;i<5;i++)for(let j=0;j<=i;j++){const x=950+(i*14-j*28),y=690-(4-i)*25;C.fillStyle='#4a5070';C.beginPath();C.arc(x,y,13,0,TAU);C.fill();C.fillStyle='#14142c';C.beginPath();C.arc(x,y,8,0,TAU);C.fill()}
   for(const [x,y,c] of [[60,692,'#b83a34'],[100,700,'#2c6f6a']]){cut(x-16,y-44,32,44,c,.5);pline(x-16,y-30,x+16,y-30,'#14142c',2);pline(x-16,y-14,x+16,y-14,'#14142c',2);C.fillStyle=css(MOONT,.18);C.fillRect(x-14,y-44,5,44)}
   for(let i=0;i<7;i++){const x=-120+i*190,y=690+hash(i)*60;F(pEll(x,y,rr(12,26),rr(3,6),0,TAU,9),'#1e1630')}
 },.15)};
 /* --- tearing downhill, side-on: brownstones raked on the slope --- */
 PLATES.stoops=()=>makeBG('stoops',2200,900,0,0,(w,h)=>{rs(303);wash(0,0,w,h,[[0,NIGHT.u],[.5,NIGHT.l],[1,NIGHT.h]]);let x=0;const pl=[PALS.brown,PALS.brick,PALS.lime,PALS.rose,PALS.teal,PALS.ochre];let i=0;while(x<w){const bw=rr(190,300),bh=rr(520,760);facade(x,h-bh,bw,bh,pl[i%6],{bay:52,rh:74,lit:.46});cut(x-4,h-bh-8,bw+8,12,cmix(pl[i%6].trim,MOONT,.2),.6);for(let k=0;k<bw/12;k++)pgon([x+k*12,h-bh+4,x+k*12+6,h-bh+10,x+k*12+12,h-bh+4],cmix(pl[i%6].trim,hex('#1a1034'),.4));pline(x,h-bh,x,h,css(hex('#0c0a26'),.8),2.2);x+=bw;i++}},.14);
 PLATES.skyWide=()=>{need('sky');return makeBG('skyWide',1400,1100,0,0,(w,h)=>{C.drawImage(BG.sky.c,0,0,1800*RS,1700*RS,0,0,1400,1100)},0)};
}

defineSets();
  /* ---------- helpers the shots lean on ---------- */
  const camPush = (x, y, z = 1, r = 0, sx = 0, sy = 0) => { push(); tr(W / 2 + sx, H / 2 + sy); if (r) rot(r); scl(z); tr(-x, -y); };
  const veil = (col, a) => { C.fillStyle = col; C.globalAlpha = a; C.fillRect(0, 0, W, H); C.globalAlpha = 1; };
  const shk = (t, a, sd = 1) => [(vnoise(t * 31, sd) - 0.5) * 2 * a, (vnoise(t * 37, sd + 4) - 0.5) * 2 * a];
  const E = (dt, f = 2, d = 3) => (dt < 0 ? 0 : exp(-d * dt) * cos(TAU * f * dt));   // a damped spring: 1 at the hit, ringing down
  const dec = (dt, d = 3) => (dt < 0 ? 0 : exp(-d * dt));
  /* an elastic value: rest 1, slammed to lo at t0, rings back (2 drawings held on the hit) */
  const hit = (t, t0, lo = 0.6, f = 2.2, d = 3, hold = 0.13) => (t < t0 ? 1 : 1 - (1 - lo) * exp(-d * max(0, t - t0 - hold)) * cos(TAU * f * max(0, t - t0 - hold)));
  const xfFill = (w, h, col) => { const m = xfMat(); C.save(); C.transform(m[0], m[1], m[2], m[3], m[4], m[5]); C.fillStyle = col; C.fillRect(-1, -2, w + 2, h); C.restore(); };
  const fourStarW = (x, y, r, col = '#fffbe0', a = 1) => { const m = xfMat(); C.save(); C.transform(m[0], m[1], m[2], m[3], m[4], m[5]); fourStar(x, y, r, col, a); C.restore(); };
  const moonGlowSmall = (x, y, r, a) => { push(); tr(x, y); xfDraw(GLOW, -r, -r, r * 2, r * 2, a, 'lighter'); pop(); };
  const speedLines = (x, y, l, a, n = 4, sp = 9) => { const c = cos(a), s = sin(a); for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * sp, k = 0.6 + 0.4 * hash(i * 7.7 + BOIL * 1.3); L(pLine(x - s * o, y + c * o, x - s * o + c * l * k, y + c * o + s * l * k, 3), 2, 'rgba(250,245,225,.85)'); } };
  const ringBurst = (x, y, r) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; L(pLine(x + cos(a) * r * 0.7, y + sin(a) * r * 0.7, x + cos(a) * r * 1.2, y + sin(a) * r * 1.2, 2), 2.4, '#fff'); } };
  const hitLines = (x, y, R, sd = 120) => { seed(sd); for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + hash(i) * 0.3, r0 = R * (1.1 + hash(i * 3) * 0.2), r1 = R * (1.9 + hash(i * 5) * 1.3); L(pLine(x + cos(a) * r0, y + sin(a) * r0, x + cos(a) * r1, y + sin(a) * r1, 3), 7, i % 2 ? '#fff6c8' : '#ff9a3c'); } };
  /* the impact frame: one drawing of hot yellow, red and ink rays, the thing that hit in silhouette (hand it a draw function, or a flat pancake is drawn) */
  const impactFrame = (x, y, R, draw) => { C.fillStyle = '#ffe25a'; C.fillRect(0, 0, W, H); camPush(W / 2, H / 2, 1); seed((BOIL % 7) + 3); const far = max(W, H) * 1.2; for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU + hash(i) * 0.2, r0 = R * (0.9 + hash(i * 2) * 0.4), w = 0.02 + hash(i * 3) * 0.05; F([x + cos(a - w) * r0 * 1.8, y + sin(a - w) * r0 * 0.8, x + cos(a + w) * r0 * 1.8, y + sin(a + w) * r0 * 0.8, x + cos(a + w * 0.2) * far, y + sin(a + w * 0.2) * far, x + cos(a - w * 0.2) * far, y + sin(a - w * 0.2) * far], i % 3 ? '#e8381e' : INK); } if (draw) draw(); else S(pEll(x, y - R * 0.1, R * 1.72, R * 0.34, 0, TAU, 40), INK, 0); pop(); };
  /* a comet tail in screen light */
  const trail = (x, y0, y1, w, a = 1) => { tp(x, y0); const ax = OX, ay = OY; tp(x, y1); const bx = OX, by = OY; tp(x + w, y0); const sw = abs(OX - ax), g = C.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, `rgba(255,226,120,${0.55 * a})`); g.addColorStop(1, 'rgba(255,170,70,0)'); C.save(); C.globalCompositeOperation = 'screen'; C.fillStyle = g; C.beginPath(); C.moveTo(ax - sw, ay); C.lineTo(ax + sw, ay); C.lineTo(bx + sw * 0.12, by); C.lineTo(bx - sw * 0.12, by); C.closePath(); C.fill(); C.restore(); };
  const clipOutCircle = (cx, cy, R, fn) => { const w = []; for (const p of [[-3000, -3000], [5000, -3000], [5000, 5000], [-3000, 5000]]) { tp(p[0], p[1]); w.push(OX, OY); } C.save(); C.beginPath(); C.moveTo(w[0], w[1]); for (let i = 2; i < 8; i += 2) C.lineTo(w[i], w[i + 1]); C.closePath(); for (let i = 0; i <= 48; i++) { const a = (-i / 48) * TAU; tp(cx + cos(a) * R, cy + sin(a) * R); i ? C.lineTo(OX, OY) : C.moveTo(OX, OY); } C.closePath(); C.clip('evenodd'); fn(); C.restore(); };
  const clipEll = (cx, cy, R, fn) => clipIn(pEll(cx, cy, R, R, 0, TAU, 44), fn);
  /* the sky over the city, with drifting clouds and stars that breathe */
  const CLOUDS = [['cl3', -200, 120, 0.25, 5], ['cl1', 620, 350, 0.4, 9], ['cl2', 1040, 60, 0.3, 7], ['cl4', 180, 520, 0.5, 12], ['cl1', 1320, 430, 0.45, 10], ['cl2', -60, 300, 0.35, 8], ['cl3', 900, 660, 0.55, 13]];
  const clouds = (cx, cy, t, k = 1, yo = 0) => { for (const c of CLOUDS) { const span = 2600, x = ((c[1] + t * c[4] * k + cx * (1 - c[3]) + 900) % span + span) % span - 900, y = c[2] + cy * (1 - c[3]) + yo; bg(c[0], x, y); } };
  const twinkle = (cx, cy, t, f = 0.3, yo = 0) => { seed(21); const m = xfMat(); C.save(); C.transform(m[0], m[1], m[2], m[3], m[4], m[5]); for (let i = 0; i < 34; i++) { const x = hash(i * 3.3) * 1700 - 200 + cx * (1 - f), y = hash(i * 7.1) * 1000 - 200 + cy * (1 - f) + yo, k = 0.5 + 0.5 * sin(t * (1 + hash(i) * 3) + i * 2); if (k > 0.3) fourStar(x, y, (2 + hash(i * 9) * 5) * (0.5 + k * 0.7), '#fff6d0', 0.45 + k * 0.5); } C.restore(); };
  /* one call for the whole night: sky, stars, clouds, far and middle skyline, with parallax. Call inside a camera. */
  const skyline_ = (cx, cy, t, o = {}) => { const y1 = o.far ?? 640, y2 = o.mid ?? 960; bg('sky', cx * 0.9 - 1500, cy * 0.65 - 1000, 1.7); twinkle(cx, cy, t, 0.35); clouds(cx, cy, t, o.cw ?? 1, o.cy ?? 0); bg('far', cx * 0.7 - 1300, y1 - 520 + cy * 0.7); push(); tr(cx * 0.7 - 1300, y1 + cy * 0.7); xfFill(3000, 2400, '#3a2850'); pop(); bg('mid', cx * 0.4 - 1500, y2 - 760 + cy * 0.4); push(); tr(cx * 0.4 - 1500, y2 + cy * 0.4); xfFill(3400, 2400, '#30213f'); pop(); };
  const socket = (x, y, R, a = 1) => { push(); tr(x, y); F(pEll(0, 0, R, R, 0, TAU, 48), `rgba(6,10,44,${0.55 * a})`); L(pEll(0, 0, R + 2, R + 2, 0, TAU, 48), 1.6, `rgba(150,170,240,${0.28 * a})`, { closed: true }); pop(); };
  const theStar = (x, y, r, o = {}) => { seed(61); moonGlowSmall(x, y, r * 3.2, o.g == null ? 0.8 : o.g); star(x, y, r, o.a == null ? -PI / 2 : o.a, '#ffe98c', 1.6); F(pEll(x - r * 0.14, y - r * 0.2, r * 0.15, r * 0.15, 0, TAU, 6), '#fffdf0'); };
  /* poses */
  const runP = (ph, k = 1, ex = {}) => { const s = sin(ph), c = cos(ph), s2 = -s, c2 = -c; return wp(Object.assign({ lean: 0.34 * min(k, 1.3), turn: 0.86, by: 36 + abs(c) * 7 * k, sq: 1 + 0.04 * c * k, arc: 5 * k, rfx: 14 + s * 28 * k, rfy: -max(0, c) * 24 * k, rfa: -0.4 * s * k, rfb: -14 * k, lfx: 14 + s2 * 28 * k, lfy: -max(0, c2) * 24 * k, lfa: -0.4 * s2 * k, lfb: -14 * k, rax: 6 - s * 26 * k, ray: 8 - abs(s) * 12, rab: 14 * k, rhk: 1, lax: 4 + s * 26 * k, lay: 8 - abs(s) * 12, lab: 14 * k, lhk: 1, tilt: 0.04 * c, mo: 0.46, mw: 7, sm: -1, eo: 1, lx: 1, ly: 0, brow: 0.8, bang: 0.5, capy: 2.5 * abs(c), fl: ph * 1.3, smear: k > 1.2 ? 16 : 0 }, ex)); };
  const frontRun = (ph, ex = {}) => { const s = sin(ph), c = cos(ph); return wp(Object.assign({ turn: 0, lean: 0, by: 36 + abs(c) * 6, lfx: -13, lfy: -max(0, s) * 24, lfd: -1, rfx: 13, rfy: -max(0, -s) * 24, rfd: 1, lfb: 6, rfb: -6, lax: -26, lay: -4 + s * 20, lab: 10, lhk: 1, rax: 26, ray: -4 - s * 20, rab: -10, rhk: 1, mo: 0.8, mw: 10, sm: 0, brow: 1, bang: 0.5, eo: 1, lx: 0, ly: 0, tilt: 0.05 * s, sq: 1 + 0.03 * c, capy: 3 * abs(c), tongue: 0.3 }, ex)); };

  const PE = P.E, set = P.set, el = P.el, frameT = P.frameT;
  const Ms = (z, e) => M(z, e);
  const hexMix = (a, b, q) => css(cmix(hex(a), hex(b), q));
  const f1 = (n) => Math.round(n * 10) / 10;
  const FONTS = { display: '"Lilita One", "ZCOOL KuaiLe", "Noto Sans SC", sans-serif', body: '"Lilita One", "ZCOOL KuaiLe", "Noto Sans SC", sans-serif' };
  const units = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.55; };
  const LIB = { camPush, veil, shk, E, dec, hit, K, seg, sm, lin, eOut, eIn, eBack, eEl, bump, lerp, lerpv, clamp, frac, hash, vnoise, sin, cos, abs, min, max, floor, ceil, sqrt, pow, exp, atan2, hypot, round, TAU, PI,
    push, pop, tr, rot, scl, warp, seed, S, F, L, SC, cel, tube, limb, union, xfMat, xfDraw, xfFill, pLine, pQuad, pCub, pEll, pRR, spl, off, capPts, poly, hose, hoseS, glove, eye40, mouth40, star, burst, sweat, speed, coil, gear, musicNote, ringWaves, text, puff,
    bg, need, drawTower, towerTop, spine, spW, TW, BG, socket, clouds, twinkle, skyline: skyline_, fourStar: fourStarW, GLOW: () => GLOW,
    moon, moonGlow, moonGlowSmall, theStar, clipIn, clipEll, clipOutCircle, wk, wp, WK, WC, runP, frontRun, wcap, wrag, wrench, wboot, ladder, bracket, screwSide, wtower, lamp, hangSign, ncat, pigeon, cab, lattice, puffCel, dust, debris, impactStar, bird3, STL, STLS, ROOFS,
    speedLines, ringBurst, hitLines, impactFrame, trail, INK, PAPER, css, hex, cmix, NIGHT };

  // ---------- the film ----------
  P.goldenage = function (FM, opt = {}) {
    const PT = FM.portrait, ACADEMY = !!opt.academy && !PT, FLAT = !!opt.flat;
    /* the logical page is 720 on its short side (portrait: 720 wide); opt.academy pillarboxes a 4:3 gate inside a wide frame */
    const pxH = ACADEMY ? FM.H : FM.H, pxW = ACADEMY ? Math.round((FM.H * 4) / 3) : FM.W;
    RS = min(pxW, pxH) / 720; W = pxW / RS; H = pxH / RS;
    for (const k in BG) delete BG[k]; for (const k in TW) delete TW[k];
    prn = 12345; buildNoise(); buildGlow(); buildMoonArt();
    const GX = (FM.W - pxW) / 2;
    const FPSD = opt.drawings ?? 15, BOILON = (opt.boil ?? 1) > 0;
    AMP_BASE = 0.5 * (opt.boil ?? 1);
    const Q = (t) => floor(t * FPSD + 1e-6) / FPSD;
    const SEED = (() => { let h = 2166136261; for (const c of String(opt.seed ?? 'goldenage')) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; })();
    const COL = { ink: INK, cream: PAPER, gold: '#ffc93c', goldL: '#fff2ac', red: opt.accent || '#f0603a', redL: '#ffb18a', night: '#0e1c5c', ...(opt.colors || {}) };
    const FONT = { ...FONTS, ...(opt.fonts || {}) };
    FM.blurBase(1);   // on twos with a grain of its own: motion blur would only average the grain away
    const G = { F: FM, W, H, RS, colors: COL, fonts: FONT, portrait: PT, L: (a, b) => (PT && b !== undefined ? b : a), lib: LIB, n: () => BOIL, Q };

    /* the projector: weave, lamp breath, grain, dust, halation, the rounded gate. Seeded, so every render is the same. */
    const seeded = (s) => { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    const grains = []; const R0 = seeded(SEED ^ 0x51);
    const grainOf = (ctx) => { if (!grains.length) for (let k = 0; k < 4; k++) { const c = mk(320, 320), x = c.getContext('2d'), im = x.createImageData(320, 320); for (let i = 0; i < im.data.length; i += 4) { const n = ((R0() + R0()) / 2) * 255, dr = (R0() - 0.5) * 22, db = (R0() - 0.5) * 22; im.data[i] = n + dr; im.data[i + 1] = n; im.data[i + 2] = n + db; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); grains.push(c); } return grains; };
    const vignette = () => { const v = mk(pxW, pxH), x = v.getContext('2d'), g = x.createRadialGradient(pxW / 2, pxH / 2, min(pxW, pxH) * 0.42, pxW / 2, pxH / 2, max(pxW, pxH) * 0.72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(10,4,20,.1)'); g.addColorStop(1, 'rgba(6,2,14,.42)'); x.fillStyle = g; x.fillRect(0, 0, pxW, pxH); if (opt.gate !== false) { x.fillStyle = '#000'; const R = 30 * (RS / 1.25), w = pxW, h = pxH; x.beginPath(); x.rect(0, 0, w, h); x.moveTo(R, 3); x.lineTo(w - R, 3); x.quadraticCurveTo(w - 3, 3, w - 3, R); x.lineTo(w - 3, h - R); x.quadraticCurveTo(w - 3, h - 3, w - R, h - 3); x.lineTo(R, h - 3); x.quadraticCurveTo(3, h - 3, 3, h - R); x.lineTo(3, R); x.quadraticCurveTo(3, 3, R, 3); x.closePath(); x.fill('evenodd'); } return v; };
    let VIG = null;
    const specks = (D, f) => { for (let i = 0; i < 3; i++) { const h = hash(f * 11.3 + i * 7.7); if (h < 0.2) { const x = hash(f + i * 3.1) * pxW, y = hash(f * 2 + i * 5.9) * pxH, r = 0.5 + hash(f * 3 + i) * 1.5; D.fillStyle = h < 0.11 ? 'rgba(10,8,16,.6)' : 'rgba(255,250,235,.55)'; D.beginPath(); D.ellipse(x, y, r, r * (0.5 + hash(i + f)), hash(i * f), 0, TAU); D.fill(); } } };

    G.ctx2 = () => C;
    const shots = [], over = [], stills = [], irises = [], lc = new Map(); let curLayer = null;
    /* G.shot(a, b, (u, t) => …): everything between a and b is drawn by your function, called once per drawing with seconds into the shot and film time. A cut at a. */
    G.shot = (a, b, fn, o = {}) => { shots.push({ a, b, fn, o }); shots.sort((p, q) => p.a - q.a); if (a > 0 && o.cut !== false) FM.cut(a); return G; };
    /* G.still(a, b): the lines stop boiling (a comic hold: nobody breathes) */
    G.still = (a, b) => { stills.push([a, b]); return G; };
    /* G.pause(a, b, { energy, name, hit }): the whole joke of a held beat: the lines stop boiling, the music drops to nothing, and comes back at b as a new section. Sound effects still play. */
    G.pause = (a, b, o = {}) => { G.still(a, b); FM.section(b, o.energy ?? 3, { name: o.name ?? 'drop', hit: o.hit !== false, gap: b - a, hush: true }); return G; };
    /* G.iris(at, { out: true|false, dur, x, y }): the iris closing to black (out) or opening from it, x / y logical; the classic way in and out of a scene */
    G.iris = (at, o = {}) => { const dur = o.dur ?? 0.7; irises.push({ at, dur, out: o.out !== false, x: o.x ?? W / 2, y: o.y ?? H / 2 }); FM.transition(at, at + dur); if (o.sfx !== false) FM.sfx(at, 'slide', 0.5, { dur, dir: o.out !== false ? -1 : 1 }); return G; };
    /* G.top((u, t) => …, a, b): drawn over the shots in the same frame, no camera (screen units) */
    G.top = (fn, a = 0, b = 1e9) => { (curLayer ? lcOf(curLayer).items : over).push({ fn, a, b }); return G; };
    const irisDraw = (t) => { for (const r of irises) { if (t < r.at || t > r.at + r.dur + 1e6) continue; let q = (t - r.at) / r.dur; if (r.out) { if (t > r.at + r.dur) { const nx = irises.find((z) => !z.out && z.at >= r.at + r.dur); if (!nx || t < nx.at) { C.fillStyle = '#000'; C.fillRect(0, 0, W, H); } continue; } q = cl01(q) ** 3; } else { if (t > r.at + r.dur) continue; q = (1 - cl01(q)) ** 3; } const far = hypot(max(r.x, W - r.x), max(r.y, H - r.y)) + 4, rad = far * (1 - q); C.fillStyle = '#000'; C.beginPath(); C.rect(0, 0, W, H); C.moveTo(r.x + rad, r.y); C.arc(r.x, r.y, max(0.01, rad), 0, TAU, true); C.fill('evenodd'); } };
    const cl01 = (v) => clamp(v, 0, 1);
    const isStill = (t) => stills.some(([a, b]) => t >= a && t < b);
    const beginDrawing = (ctx, n, t) => { C = ctx; XF = []; XS.length = 0; LW = 1; SD = 0; BOIL = isStill(t) ? 4242 : (BOILON ? n : 0); AMP = AMP_BASE; };
    const lcOf = (layer) => { if (!lc.has(layer)) { const c = el('canvas', `left:${GX}px;top:0;width:${pxW}px;height:${pxH}px;z-index:1;pointer-events:none`, layer); c.width = pxW; c.height = pxH; c.dataset.motion = 'skip'; const x = c.getContext('2d'); x.scale(RS, RS); lc.set(layer, { x, items: [], last: -1 }); } return lc.get(layer); };
    G.into = (layer, fn) => { const prev = curLayer; curLayer = layer; if (layer) lcOf(layer); try { return fn(); } finally { curLayer = prev; } };
    G.draw = (fn, a = 0, b = 1e9) => { if (curLayer) lcOf(curLayer).items.push({ fn, a, b }); else over.push({ fn, a, b }); return G; };

    if (!FLAT) {
      const view = el('canvas', `left:${GX}px;top:0;width:${pxW}px;height:${pxH}px;z-index:1;pointer-events:none`, FM.layer('', 1)); view.width = pxW; view.height = pxH; view.dataset.motion = 'skip';
      const D = view.getContext('2d', { willReadFrequently: false }), buf = mk(pxW, pxH), BX = buf.getContext('2d'); BX.scale(RS, RS); G.ctx = BX;
      const hal = mk(pxW / 5, pxH / 5), HX = hal.getContext('2d'); let last = -1;
      FM.add((t) => {
        const n = floor(t * FPSD + 1e-6), tq = n / FPSD;
        if (n !== last) { last = n; beginDrawing(BX, n, tq); BX.fillStyle = '#000'; BX.fillRect(0, 0, W, H); const s = shots.filter((x) => tq >= x.a && tq < x.b).pop(); if (s) { s.fn(tq - s.a, tq); XF = []; XS.length = 0; LW = 1; } for (const it of over) if (tq >= it.a && tq < it.b) { it.fn(tq - it.a, tq); XF = []; XS.length = 0; LW = 1; } irisDraw(tq); HX.filter = 'brightness(1.15) saturate(1.3)'; HX.drawImage(buf, 0, 0, hal.width, hal.height); HX.filter = 'none'; }
        const f = round(t * 24), wx = opt.film === false ? 0 : (vnoise(f * 0.42, 1) - 0.5) * 1.5 + (hash(f * 1.17) - 0.5) * 0.3, wy = opt.film === false ? 0 : (vnoise(f * 0.31, 2) - 0.5) * 2 + (hash(f * 2.3) - 0.5) * 0.4;
        D.globalCompositeOperation = 'source-over'; D.globalAlpha = 1; D.filter = 'saturate(1.1) contrast(1.05)'; D.drawImage(buf, wx * RS - 3, wy * RS - 3, pxW + 6, pxH + 6); D.filter = 'none';
        if (opt.film === false) return;
        D.globalCompositeOperation = 'screen'; D.globalAlpha = 0.13; D.drawImage(hal, 0, 0, pxW, pxH);
        const fl = (vnoise(f * 0.9, 5) - 0.5) * 0.045 + (hash(f * 3.7) - 0.5) * 0.018; D.globalCompositeOperation = 'source-over'; D.globalAlpha = 1; D.fillStyle = fl > 0 ? `rgba(0,0,10,${fl})` : `rgba(255,244,215,${-fl * 0.7})`; D.fillRect(0, 0, pxW, pxH);
        const gr = grainOf(), ox = (hash(f * 5.3) * 320) | 0, oy = (hash(f * 9.1) * 320) | 0; D.save(); D.globalCompositeOperation = 'overlay'; D.globalAlpha = 0.17; D.translate(ox, oy); D.fillStyle = D.createPattern(gr[f % 4], 'repeat'); D.fillRect(-ox, -oy, pxW, pxH); D.restore();
        D.globalAlpha = 1; D.globalCompositeOperation = 'source-over'; specks(D, f); VIG ??= vignette(); D.drawImage(VIG, 0, 0);
      });
      if (GX > 0) FM.stage.style.background = '#000';
    } else {
      /* quick version: every scene layer owns a canvas, a film-grain sheet floats over all of them */
      const fg = FM.layer('pointer-events:none;mix-blend-mode:overlay;opacity:.17', 96), fc = el('canvas', 'left:0;top:0;width:100%;height:100%', fg); fc.width = FM.W; fc.height = FM.H; fc.dataset.motion = 'skip'; const fx = fc.getContext('2d');
      FM.late((t) => {
        const n = floor(t * FPSD + 1e-6), tq = n / FPSD;
        for (const [layer, L_] of lc) { if (layer.style.display === 'none' || L_.last === n) continue; L_.last = n; beginDrawing(L_.x, n, tq); C.clearRect(0, 0, W, H); for (const it of L_.items) { if (tq >= it.a && tq < it.b) { it.fn(tq - it.a, tq); XF = []; XS.length = 0; LW = 1; } } }
        const f = round(t * 24), gr = grainOf(), ox = (hash(f * 5.3) * 320) | 0, oy = (hash(f * 9.1) * 320) | 0; fx.save(); fx.clearRect(0, 0, FM.W, FM.H); fx.translate(ox, oy); fx.fillStyle = fx.createPattern(gr[f % 4], 'repeat'); fx.fillRect(-ox, -oy, FM.W, FM.H); fx.restore();
      });
    }

    /* ---------- lettering ---------- */
    const toPx = (v) => v * RS;
    const inkCss = (size, col) => `color:${col};-webkit-text-stroke:${f1(size * 0.09)}px ${COL.ink};paint-order:stroke fill;text-shadow:${f1(size * 0.05)}px ${f1(size * 0.07)}px 0 ${COL.ink}`;
    /* G.write(text, { x, y, size, at, until, color, align, wrap, pop, kind, parent, noFact }): hand-cut cartoon lettering (DOM, logical units). Lands with a squash and stretch, on twos. pop: letter by letter. */
    G.write = (txt, o = {}) => {
      const a = o.at ?? 0, until = o.until ?? 1e9, size = toPx(o.size ?? 54), col = o.color ?? COL.cream, parent = o.parent ?? (twl ??= FM.layer('pointer-events:none', 40));
      const wrapW = o.wrap ? toPx(o.wrap) : null, align = o.align ?? 'center', x0 = GX + toPx(typeof o.x === 'function' ? 0 : (o.x ?? W / 2)), y0 = toPx(typeof o.y === 'function' ? 0 : (o.y ?? H / 2));
      const box = el('div', `left:${f1(x0)}px;top:${f1(y0)}px;width:0;height:0;display:none;z-index:${o.z ?? 5}`, parent);
      const pos = align === 'left' ? 'left:0' : align === 'right' ? 'right:0' : 'left:0;transform:translate(-50%,0)';
      const sp = el('div', `${pos};top:0;${wrapW ? `width:${f1(wrapW)}px` : 'white-space:nowrap'};text-align:${align};font:400 ${f1(size)}px/1.14 ${FONT.display};letter-spacing:.015em;${inkCss(size, col)}`, box);
      const chars = o.pop ? [...String(txt)].map((c) => { const s = el('span', `position:relative;display:inline-block;${c === ' ' ? 'width:.34em;' : ''}`, sp); s.textContent = c; return s; }) : null;
      if (!chars) sp.textContent = txt;
      if (!o.noText) FM.text(sp, o.kind ?? (size > toPx(60) ? 'headline' : 'label'), String(txt), a, until, { noFact: o.noFact, overlap: o.overlap });
      const midY = () => -sp.offsetHeight / 2; let my = null;
      FM.add((t) => {
        const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return; const n = floor(t * FPSD + 1e-6), tq = n / FPSD; my ??= midY();
        const xp = typeof o.x === 'function' ? GX + toPx(o.x(tq)) : x0, yp = typeof o.y === 'function' ? toPx(o.y(tq)) : y0; const q = tq - a, out = until - tq;
        const wob = BOILON && o.boil !== false ? (hash(n * 3.1 + a) - 0.5) * 0.008 : 0, tilt = (o.tilt ?? 0) + wob;
        const land = chars ? 1 : (q < 0.32 ? 1 + E(q, 3.1, 7) * -0.7 : 1), sy = chars ? 1 : land, sx = chars ? 1 : 1 / pow(max(0.2, land), 0.6), ex = o.exit !== false && out < 0.14 ? out / 0.14 : 1;
        set(box, { transform: `translate(${f1(xp - x0)}px,${f1(yp - y0 + my)}px) rotate(${tilt.toFixed(4)}rad) scale(${(sx * ex).toFixed(3)},${(sy * ex).toFixed(3)})`, transformOrigin: '0 50%' });
        if (chars) chars.forEach((s, i) => { const d = q - i * (o.every ?? 0.05); const sag = o.sag ? o.sag(i, t) : null; const v = d < 0 ? 0 : d < 0.34 ? 1 + E(d, 3, 6) * -0.9 : 1; set(s, { transform: `translate(${sag ? f1(sag[0] * RS) : 0}px,${f1((1 - min(1, d / 0.16)) * -toPx(40) * (d < 0.16 ? 1 : 0) + (sag ? sag[1] * RS : 0))}px) rotate(${(sag ? sag[2] : (hash(i * 7.3) - 0.5) * 0.06).toFixed(3)}rad) scale(${max(0.01, 2 - v).toFixed(3)},${max(0.01, v).toFixed(3)})`, opacity: d < 0 ? '0' : '1' }); });
      });
      FM.appear && FM.appear(a); FM.appear && until < 1e8 && FM.appear(until);
      return { el: sp, box, at: a, until };
    };
    let twl = null;
    /* G.title(lines, o): the main title; each { text, x, y, size, color } pops letter by letter */
    G.title = (lines, o = {}) => lines.map((l, i) => G.write(l.text, { pop: true, kind: 'headline', at: (o.at ?? 0.3) + i * (o.gap ?? 0.5), until: o.until, ...l }));
    /* G.card({ x, y, w, h, at, until, title, lines, color, tilt }): an inked show card with a hard shadow, bouncing in (DOM). Holds words the voice doesn't say. */
    G.card = (o = {}) => {
      const a = o.at ?? 0, until = o.until ?? 1e9, wPx = toPx(o.w ?? 420), hPx = o.h ? toPx(o.h) : null, parent = o.parent ?? (twl ??= FM.layer('pointer-events:none', 40));
      const line = toPx(3.4), box = el('div', `left:${f1(GX + toPx(o.x ?? W / 2) - wPx / 2)}px;top:${f1(toPx(o.y ?? H / 2) - (hPx ? hPx / 2 : 0))}px;width:${f1(wPx)}px;${hPx ? `height:${f1(hPx)}px;` : ''}box-sizing:border-box;background:${o.fill ?? COL.cream};border:${f1(line)}px solid ${COL.ink};border-radius:${f1(toPx(16))}px;box-shadow:${f1(toPx(7))}px ${f1(toPx(9))}px 0 ${COL.ink};padding:${f1(toPx(16))}px ${f1(toPx(20))}px;color:${COL.ink};font:400 ${f1(toPx(o.body ?? 27))}px/1.26 ${FONT.body};display:none;z-index:${o.z ?? 4}`, parent);
      if (o.title) { const t0 = el('div', `position:relative;font:400 ${f1(toPx(o.size ?? 38))}px/1.12 ${FONT.display};color:${o.color ?? COL.red}`, box); t0.textContent = o.title; FM.text(t0, 'label', o.title, a, until); }
      for (const li of o.lines || []) { const d = el('div', `position:relative;margin-top:${f1(toPx(7))}px`, box); d.textContent = li; FM.text(d, 'label', li, o.ats ? o.ats[(o.lines || []).indexOf(li)] ?? a : a, until); }
      FM.add((t) => { const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return; const tq = Q(t), q = tq - a, out = until - tq, v = q < 0.36 ? 1 + E(q, 2.8, 6.5) * -0.8 : 1, ex = out < 0.14 ? out / 0.14 : 1; set(box, { transform: `rotate(${((o.tilt ?? 0) + (BOILON ? (hash(floor(t * FPSD) * 1.7 + a) - 0.5) * 0.005 : 0)).toFixed(4)}rad) scale(${((1 / pow(max(0.2, v), 0.5)) * ex).toFixed(3)},${(v * ex).toFixed(3)})` }); });
      if (o.sfx !== false) FM.sfx(a, 'pop', 0.5);
      return { el: box, at: a, until };
    };

    /* ---------- telling information: signs that bounce in, towers that spring up to their value ---------- */
    /* G.steps({ items: [{ text, note, hot }], T, until, x, y, w }): one show card per step along a line; hot steps go gold. Returns their centres. */
    G.steps = (o) => { const n = o.items.length, cols = PT ? 1 : n, cw = (o.w ?? W * 0.9) / cols, x0 = o.x ?? W * 0.05, y0 = o.y ?? H * 0.42, rh = 150; return o.items.map((it, i) => { const cx = x0 + cw * ((PT ? 0 : i) + 0.5), cy = y0 + (PT ? (i - (n - 1) / 2) * rh : (i % 2 ? 26 : -26)); G.card({ x: cx, y: cy, w: min(cw * 0.92, PT ? W * 0.84 : 420), title: it.text, lines: it.note ? [it.note] : [], at: o.T[i], until: o.until, fill: it.hot ? COL.gold : COL.cream, color: it.hot ? COL.ink : COL.red, tilt: (i % 2 ? 1 : -1) * 0.018, parent: o.parent }); FM.sfx(o.T[i], 'boing', 0.34); return { x: cx, y: cy }; }); };
    /* G.versus({ cols: [{ title, points, hot }], T, until }): two signs side by side; the winner in gold. */
    G.versus = (o) => { const n = o.cols.length, cw = (o.w ?? W * 0.86) / (PT ? 1 : n), x0 = o.x ?? W * 0.07; return o.cols.map((c, i) => { const cx = PT ? W / 2 : x0 + cw * (i + 0.5), cy = PT ? H * (0.3 + i * 0.3) : (o.y ?? H * 0.48); G.card({ x: cx, y: cy, w: min(cw * 0.92, 520), title: c.title, lines: (c.points || []).map((p) => (p && typeof p === 'object' ? p.text : String(p))), at: o.T[i], until: o.until, fill: c.hot ? COL.gold : COL.cream, color: c.hot ? COL.ink : COL.red, tilt: (i % 2 ? 1 : -1) * 0.02, parent: o.parent }); return { x: cx, y: cy }; }); };
    /* G.towers({ items: [[label, value], …], hot: [i], ats, until, x, y, w, unit }): a bar chart of skyscrapers: each springs up to its value and overshoots; called with a shot running (the drawing happens on top) */
    G.towers = (o) => { const K0 = ['slab', 'spire', 'mastb', 'pyr', 'hotel', 'zig', 'broad', 'lowa'], n = o.items.length, top = max(...o.items.map((i) => i[1])), base = o.y ?? H * 0.84, wd = o.w ?? W * 0.8, x0 = o.x ?? W * 0.1, maxH = o.h ?? H * 0.56, parent = o.parent; const pos = o.items.map((it, i) => ({ x: x0 + (wd * (i + 0.5)) / n, y: base - ((maxH * it[1]) / top) })); G.draw((u, t) => { o.items.forEach((it, i) => { const a = o.ats[i]; if (t < a) return; const name = K0[(o.kinds && o.kinds[i]) ?? i % K0.length]; const tw = T_(name), fr = (maxH * it[1]) / top / tw.H, s = min(((wd / n) * 0.82) / tw.wide, 1.2), dt = t - a, g = max(0.01, (fr / s) * (1 - E(dt, 1.8, 3.6))); drawTower(name, pos[i].x, base, s, { ht: g, rattle: dec(dt, 3) * 0.5, rip: 0.03 * dec(dt, 2), rp: t * 14 }, { iw: 2 }); }); }, o.ats[0] - 0.1, o.until ?? 1e9); o.items.forEach((it, i) => { const hot = (o.hot || []).includes(i); G.write(`${it[0]}`, { x: pos[i].x, y: base + 26, size: 26, at: o.ats[i], until: o.until, kind: 'label', parent, noFact: o.noFact }); G.write(`${it[1]}${o.unit ?? ''}`, { x: pos[i].x, y: pos[i].y - 26, size: hot ? 54 : 40, color: hot ? COL.gold : COL.cream, at: o.ats[i] + 0.2, until: o.until, kind: 'label', parent, noFact: o.noFact }); FM.sfx(o.ats[i], 'boing', 0.4); }); return pos; };
    /* sound cues that pair with the cartoon verbs */
    G.bonk = (at, gain = 0.8) => { FM.sfx(at, 'whack', gain); FM.sfx(at + 0.04, 'boing', gain * 0.8); return G; };

    /* captions: cream lettering with an ink edge, low in the frame */
    if (!FLAT && FM.T && FM.voiced && !FM.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(FM.T, co.max ?? (PT ? 13 : 22)), size = FM.px(co.size ?? (PT ? 46 : 46));
      const box = el('div', `left:0;right:0;top:${co.top ?? (PT ? FM.H * 0.77 : FM.H * 0.885)}px;text-align:center;z-index:880;pointer-events:none;display:none`, FM.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${FM.W * 0.86}px;font:400 ${f1(size)}px/1.3 ${FONT.body};${inkCss(size * 0.9, COL.cream)}`, box);
      FM.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { FM.appear(c.start); FM.appear(c.end); }
      FM.caps = segs;
    }
    /* the canvas is invisible to the DOM motion sheet: a running shot is action */
    FM.prep(() => { for (const s of shots) if (!s.o.quiet) { const sts = stills.filter(([a, b]) => a < s.b && b > s.a); let p = s.a; for (const [a, b] of sts) { if (a > p) FM.live(p, a); p = max(p, b); } if (p < s.b) FM.live(p, s.b); } });
    /* ---------- checks ---------- */
    FM.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: round(t * 10) / 10, src: '', what, msg });
      if (!BOILON) add(0, Ms('线条不抖', 'no line boil'), Ms('boil: 0 关掉了线条抖动：停住的画面像印出来的图，失去手绘感（一段戏要定住时用 G.pause）', 'boil: 0 turns the line boil off: held drawings look printed (use G.pause for a comic hold)'));
      if (FLAT) return out;
      if (!shots.length && !over.length) add(0, Ms('没有镜头', 'no shots'), Ms('没有 G.shot：画面是黑的', 'no G.shot: the frame is black'));
      let e = 0; for (const s of shots) { if (s.a > e + 0.05 && !irises.some((r) => r.at <= e + 0.05 && r.at + r.dur >= e - 1)) add(e, Ms('黑屏', 'black gap'), Ms(`${e.toFixed(1)}–${s.a.toFixed(1)} 秒没有镜头，是黑的`, `${e.toFixed(1)}–${s.a.toFixed(1)}s has no shot: black`)); e = max(e, s.b); if (s.b - s.a > 16) add(s.a, Ms('镜头太长', 'long shot'), Ms(`镜头 ${s.a.toFixed(1)} 秒起长 ${(s.b - s.a).toFixed(1)} 秒：黄金时代卡通靠切镜头推笑点，换一个景别`, `the shot at ${s.a.toFixed(1)}s runs ${(s.b - s.a).toFixed(1)}s: these cartoons cut to carry the gag, change the framing`)); }
      if (FM.duration > 20 && !stills.length) add(0, Ms('没有定格', 'no held beat'), Ms('整片没有 G.pause：一段彻底不动的停顿是这种喜剧的核心（§5）', 'no G.pause in the whole film: a dead-still pause is the heart of this comedy (§5)'));
      return out;
    });
    return P.infoKit ? P.infoKit(G, { steps: 'flow', versus: 'compare', towers: 'chart', card: 'illustration', moon: 'character' }) : G;
  };
})();
