/* =========================================================
   Architectural pieces
   ========================================================= */
function chhatri(p,x,y,z,s,col,domeCol,k='plaster'){
  box(p,2.0*s,0.16*s,2.0*s,WHITE,x,y,z,k);
  for (const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]) cyl(p,0.08*s,1.25*s,col,x+a*0.75*s,y+0.16*s,z+b*0.75*s,8,k);
  box(p,2.2*s,0.14*s,2.2*s,WHITE,x,y+1.41*s,z,k);
  box(p,1.9*s,0.22*s,1.9*s,col,x,y+1.55*s,z,k);
  onion(p,0.82*s,domeCol||col,x,y+1.77*s,z,k,0.95);
  cone(p,0.07*s,0.5*s,'#D9A23A',x,y+1.77*s+1.5*s,z,6,'stone');
}
function kangura(p,x,y,z,s,col){ box(p,0.45*s,0.45*s,0.3*s,col,x,y,z); add(p,CONE(4),M(col),x,y+0.45*s+0.17*s,z,0.33*s,0.34*s,0.22*s,Math.PI/4); }
function jharokha(p,cx,y,fz,s,col){
  add(p,CONE(8),M(WHITE),cx,y-0.35*s,fz+0.45*s,0.55*s,0.7*s,0.4*s,0,Math.PI);
  box(p,2.0*s,0.18*s,1.15*s,WHITE,cx,y,fz+0.5*s);
  add(p,BAY,M_JAALI,cx,y+0.18*s+0.9*s,fz+0.02,0.9*s,1.8*s,0.82*s);
  box(p,2.1*s,0.14*s,1.2*s,WHITE,cx,y+2.0*s,fz+0.5*s);
  add(p,BANGLA,M(col),cx,y+2.14*s,fz+0.52*s,2.0*s,1.0*s,1.25*s);
  add(p,BANGLA_FILL,M(col),cx,y+2.14*s,fz+0.52*s,2.0*s,1.0*s,1.25*s);
  cone(p,0.06*s,0.4*s,'#D9A23A',cx,y+2.78*s,fz+0.52*s,6,'stone');
}
function windowUnit(p,cx,y0,fz,col,shut){
  if (rand()<0.32){ box(p,1.0,1.7,0.08,'#2A1A12',cx,y0,fz-0.02,'stone'); add(p,UBOX,M_WIN,cx,y0+0.85,fz+0.0,0.86,1.56,0.06); box(p,0.05,1.6,0.1,'#2A1A12',cx,y0+0.05,fz+0.02,'stone'); }
  else { box(p,1.0,1.7,0.14,shut,cx,y0,fz+0.02,'stone');
  box(p,0.06,1.7,0.16,'#2A1A12',cx,y0,fz+0.03,'stone'); }
  plane(p,M_RECT,cx,y0+0.85,fz+0.04,1.75,2.2);
  add(p,UBOX,M(WHITE),cx,y0+2.05,fz+0.3,1.7,0.07,0.6,0,0.3);
  box(p,0.12,0.25,0.4,WHITE,cx-0.62,y0+1.75,fz+0.15); box(p,0.12,0.25,0.4,WHITE,cx+0.62,y0+1.75,fz+0.15);
  box(p,1.35,0.1,0.25,WHITE,cx,y0-0.1,fz+0.1);
}
function rooftopExtras(g,w,d,h,col){
  const r = rand();
  if (r < 0.35){ cyl(g,0.75,1.25,'#1E1E1E',rr(-w/4,w/4),h,rr(-d/4,0),16,'stone'); }
  else if (r < 0.6){ const sw = 2.6; box(g,sw,2.5,sw,col,rr(-w/4,w/4),h,-d/2+sw/2+0.4); }
  else if (r < 0.78){ chhatri(g, rr(-w/5,w/5), h, rr(-d/5,0), 1.0, col, WHITE); }
  if (rand()<0.3){ // washing line with saris
    const z0 = rr(-d/3,d/4); box(g,0.05,1.6,0.05,'#3a3a3a',-w/3,h,z0,'stone'); box(g,0.05,1.6,0.05,'#3a3a3a',w/3,h,z0,'stone');
    for (let i=0;i<3;i++) box(g,rr(0.8,1.4),rr(0.6,1.1),0.03,pick(CLOTH),-w/3+0.8+i*(w/4),h+0.5,z0,'stone');
  }
}
let signNames = [
  ['Gopal Textiles','गोपाल टेक्सटाइल्स'],['Shree Bangle Store','श्री चूड़ी भंडार'],['Rajasthani Juttis','राजस्थानी जूतियाँ'],
  ['Mahaveer Jewellers','महावीर ज्वैलर्स'],['Kalyan Sweets','कल्याण मिष्ठान'],['Jaipuri Rajai House','जयपुरी रजाई हाउस'],
  ['Lakh Bangles','लाख की चूड़ियाँ'],['Sanganeri Prints','सांगानेरी प्रिंट्स'],['Chandpole Masale','चाँदपोल मसाले'],
  ['Johari Gems','जौहरी जेम्स'],['Bandhej Saree Centre','बंधेज साड़ी सेंटर'],['Mojari House','मोजड़ी हाउस'],['Shree Sweets','श्री मिष्ठान'],['Kesar Masala Bhandar','केसर मसाला भंडार'],
];
const SIGN_STYLES = [{bg:'#F4E3B5',fg:'#8B1E1E',subFg:'#1F3B6E'},{bg:'#1F3B6E',fg:'#F7E2A0'},{bg:'#B82B2B',fg:'#FFF2D6'},{bg:'#F2C230',fg:'#2B1A10'},{bg:'#FFFFFF',fg:'#1E5E3A',subFg:'#B82B2B'},{bg:'#2E5E3A',fg:'#FBF3EA'}];

function haveli(x,z,w,d,rot,o={}){
  const g = new THREE.Group();
  const floors = o.floors || (2 + Math.floor(rand()*2.3));
  const G = 5.2, F = 3.7, h = G + (floors-1)*F;
  const col = o.color || pick(PINKS), fz = d/2;
  const shut = pick(SHUTTER);
  const doorsLocal = [];
  rand(); const sn = o.shops !== false ? (o.sign || null) : null;
  const bKind = sn ? kindFromName(sn[0]) : Math.floor(rand()*6);
  if (o.shops !== false){
    const n = Math.max(1, Math.round(w/3.7)), sp = w/n, ow = sp*0.68, oh = G*0.72;
    add(g, arcadeGeo(+w.toFixed(1),n,G,+ow.toFixed(2),+oh.toFixed(2),0.7), M(col), 0,0,fz-0.35);
    box(g,w,0.38,3.0,STONE,0,0,fz-1.5,'stone');
    box(g,w+0.2,0.2,0.9,STONE,0,0,fz+0.42,'stone');
    box(g,w,G,d-3.1,col,0,0,-1.55);
    box(g,w,0.4,3.2,col,0,G-0.4,fz-1.55);
    for (let i=0;i<n;i++){
      const cx = -w/2 + sp*(i+0.5);
      plane(g,M_ARCH,cx,oh*1.15/2,fz+0.012,ow*1.32,oh*1.15);
      plane(g,M_SHOP[bKind] || M_CAFE[0],cx,0.38+oh*0.42,fz-3.04,sp*0.86,oh*0.84);
      doorsLocal.push([cx, ow, oh]);
      if (rand()<0.5){
        const aw = add(g,UBOX,M(pick(CLOTH),'stone'),cx,oh+0.25,fz+0.95,sp*0.94,0.05,2.0,0,0.38);
        aw.userData.cast = true;
        box(g,0.05,oh+0.1,0.05,'#4A3A2A',cx-sp*0.44,0,fz+1.85,'stone'); box(g,0.05,oh+0.1,0.05,'#4A3A2A',cx+sp*0.44,0,fz+1.85,'stone');
      }
      if (rand()<0.35) for (let k=0;k<3;k++) box(g,0.5,0.4,0.5,pick(['#D8B26A','#8C5A3C','#E8D8B8']),cx-0.6+k*0.6,0.38,fz-0.6,'stone');
    }
    if (sn){
      const st = o.signStyle || pick(SIGN_STYLES);
      sign(g,{text:sn[0],sub:sn[1],...st,border:st.subFg||null}, 0, oh+(G-oh)/2+0.1, fz+0.05, Math.min(w*0.8,9), Math.min(1.0,(G-oh)*0.8));
    }
  } else {
    box(g,w,G,d,col,0,0,0);
    add(g,archShapeGeo(1.6,2.8),M(DARK,'stone'),0,0,fz+0.01);
    plane(g,M_ARCH,0,1.6,fz+0.02,2.2,3.2);
    box(g,1.9,0.25,0.8,STONE,0,0,fz+0.4,'stone');
    for (const s of [-1,1]) if (w>7) windowUnit(g, s*w/3.2, 1.6, fz, col, shut);
  }
  if (floors>1) box(g,w,h-G,d,col,0,G,0);
  // cornices
  for (let f=0; f<floors; f++){
    const yb = G + f*F;
    if (f < floors-1 || true){
      box(g,w+0.36,0.2,0.75,WHITE,0,yb-0.12,fz+0.05);
      box(g,w+0.16,0.3,0.4,col,0,yb-0.42,fz+0.08);
    }
    if (f < floors-1) friezeStrip(g,w-0.4,0.42,0,yb+0.32,fz+0.012);
  }
  // upper windows / jharokhas
  for (let f=1; f<floors; f++){
    const y0 = G + (f-1)*F + 0.8, n = Math.max(1, Math.round(w/2.9)), sp = w/n;
    const jIdx = (f===1 && rand()<0.55) ? Math.floor(n/2) : -1;
    for (let i=0;i<n;i++){
      const cx = -w/2 + sp*(i+0.5);
      if (i===jIdx) jharokha(g,cx,G+0.25,fz,1.05,rand()<0.4?pick(PINKS):col);
      else windowUnit(g,cx,y0,fz,col,shut);
    }
  }
  // parapet + kanguras
  box(g,w,0.9,0.28,col,0,h,fz-0.14); box(g,w,0.9,0.28,col,0,h,-fz+0.14);
  box(g,0.28,0.9,d,col,-w/2+0.14,h,0); box(g,0.28,0.9,d,col,w/2-0.14,h,0);
  box(g,w+0.1,0.1,0.36,WHITE,0,h+0.9,fz-0.14);
  const nk = Math.floor(w/1.05); for (let i=0;i<nk;i++) kangura(g,-w/2+(i+0.5)*w/nk,h+1.0,fz-0.14,1,col);
  if (!o.noRoof) rooftopExtras(g,w,d,h+0.0,col);
  place(g,x,z,rot);
  colliderLocal(x,z,rot,-w/2,w/2,-d/2,fz+0.85);
  const c = Math.cos(rot), s = Math.sin(rot), lz = fz+1.35;
  doorsLocal.forEach(([lx,ow,oh])=>shopDoors.push({x:x + lx*c + lz*s, z:z - lx*s + lz*c, rot, kind:bKind, name: sn ? sn[0] : 'Free shop', sub: sn ? sn[1] : '', landmark: !!sn, ow, oh}));
  return {g,h,col};
}
function fillRow(a0,a1,fn,min=8,max=12.5){
  let a = a0;
  while (a < a1 - 5){ let w = Math.min(rr(min,max), a1-a); if (a1-a-w < 5) w = a1-a; if (w<5) break; fn(a + w/2, w); a += w + 0.15; }
}

/* =========================================================
   Hawa Mahal
   ========================================================= */
(function hawaMahal(){
  const g = new THREE.Group(), C = '#C46A55', C2 = '#D27C64', W = 42;
  // ground floor: arcade of shops along the street
  add(g, arcadeGeo(W,11,7,2.5,5.0,1.0), M(C), 0,0,-0.5);
  for (let i=0;i<11;i++){ const cx = -W/2 + W/11*(i+0.5); plane(g,M_ARCH,cx,5.0*1.15/2,0.01,2.5*1.32,5.0*1.15); plane(g,M_SHOP[i%M_SHOP.length],cx,2.3,-2.7,3.2,4.0); }
  box(g,W,0.35,3.2,STONE,0,0,-1.6,'stone');
  box(g,W,7,11,C,0,0,-8.3);
  box(g,W,0.5,3.4,C,0,6.5,-1.7);
  box(g,W+0.5,0.25,1.1,WHITE,0,6.9,0.1); box(g,W+0.3,0.35,0.5,C,0,6.55,0.1);
  friezeStrip(g,W-1,0.5,0,7.5,0.012);
  const tiers = [[42,15,4.4,10],[42,15,4.4,9],[34,12,4.2,7],[24,8,4.0,5.5],[14,5,3.9,4.2]];
  let y = 7.15;
  tiers.forEach(([w,n,th,dp],ti)=>{
    box(g,w,th,dp,C,0,y,-dp/2-0.6);
    const sp = w/n, r = sp*0.43;
    for (let i=0;i<n;i++){
      const cx = -w/2 + sp*(i+0.5), big = (ti>=2 && i===Math.floor(n/2));
      const rb = big ? r*1.25 : r, hb = th*(big?0.7:0.62);
      add(g,CONE(8),M(WHITE),cx,y+0.3,-0.25,rb*0.5,0.5,rb*0.35,0,Math.PI);
      box(g,rb*2.1,0.14,rb*1.4,WHITE,cx,y+0.45,-0.4);
      add(g,BAY,M_JAALI,cx,y+0.59+hb/2,-0.6,rb,hb,rb*0.95);
      box(g,rb*2.2,0.12,rb*1.45,WHITE,cx,y+0.59+hb,-0.4);
      if ((i+ti)%2===0){ onion(g,rb*0.82,C2,cx,y+0.71+hb,-0.55,'plaster',0.8); }
      else { add(g,BANGLA,M(C2),cx,y+0.71+hb,-0.45,rb*2.1,th*0.32,rb*1.4); add(g,BANGLA_FILL,M(C2),cx,y+0.71+hb,-0.45,rb*2.1,th*0.32,rb*1.4); }
      box(g,0.12,th*0.75,0.12,WHITE,cx-sp/2,y+0.45,-0.55);
    }
    box(g,w+0.3,0.18,dp+0.3,WHITE,0,y+th-0.18,-dp/2-0.6);
    const nxt = tiers[ti+1];
    if (nxt && nxt[0] < w){ for (const s of [-1,1]){ chhatri(g, s*(w/2-1.4), y+th, -1.6, 1.0, C2, C2); } }
    y += th;
  });
  // crown
  chhatri(g,0,y,-1.8,1.6,C2,C2); chhatri(g,-4.2,y,-1.8,1.0,C2,WHITE); chhatri(g,4.2,y,-1.8,1.0,C2,WHITE);
  box(g,8,1.4,0.5,C,0,y,-0.9); for (let i=0;i<7;i++) kangura(g,-3.4+i*1.13,y+1.4,-0.9,1,C);
  place(g,-25,-10,0);
  colliderLocal(-25,-10,0,-21,21,-14,1.2);
})();

/* =========================================================
   Rooftop cafés opposite Hawa Mahal
   ========================================================= */
function rooftopCafe(hv, w, d, name, sub, style){
  const g = hv.g, h = hv.h, fz = d/2;
  for (let i=0;i<4;i++){
    const tx = -w/2 + 1.8 + i*(w-3.6)/3, tz = fz - 2.2 - (i%2)*2.4;
    cyl(g,0.45,0.75,'#6B4B35',tx,h,tz,10,'stone');
    cyl(g,0.04,2.3,'#3A2A20',tx,h,tz,6,'stone');
    cone(g,1.3,0.55,pick(['#F2E9DF','#E8B33A','#B82B2B']),tx,h+2.1,tz,12,'stone');
    for (const s of [-1,1]) box(g,0.42,0.45,0.42,'#8C5A3C',tx+s*0.75,h,tz,'stone');
  }
  // string lights
  const posts = [[-w/2+0.4,fz-0.4],[w/2-0.4,fz-0.4],[w/2-0.4,-fz+1.2],[-w/2+0.4,-fz+1.2]];
  posts.forEach(([px,pz])=>cyl(g,0.05,2.6,'#2A2A2A',px,h,pz,6,'stone'));
  for (let k=0;k<4;k++){
    const [ax,az] = posts[k], [bx,bz] = posts[(k+1)%4];
    for (let t=0.05;t<1;t+=0.08){ const sag = Math.sin(t*Math.PI)*0.5; add(g,SPH,M_LIGHT,ax+(bx-ax)*t,h+2.55-sag,az+(bz-az)*t,0.07,0.07,0.07); }
  }
  sign(g,{text:name,sub,...style}, 0, h+1.55, fz+0.02, Math.min(w*0.85,10), 1.3);
}
{
  const hv1 = haveli(-10, 17, 11, 14, Math.PI, {floors:4, shops:true, sign:['Wind View Café','विंड व्यू कैफ़े'], signStyle:SIGN_STYLES[0], noRoof:true, color:'#D4806A'});
  rooftopCafe(hv1, 11, 14, 'WIND VIEW CAFÉ', 'Rooftop · Hawa Mahal view', {bg:'#FFF6E8',fg:'#9B2D20',subFg:'#1F3B6E',border:'#9B2D20'});
  const hv2 = haveli(-38, 17, 12, 14, Math.PI, {floors:4, shops:true, sign:['Tattoo Café & Lounge','टैटू कैफ़े'], signStyle:SIGN_STYLES[5], noRoof:true, color:'#D9876E'});
  rooftopCafe(hv2, 12, 14, 'THE TATTOO CAFE', '& Lounge · Rooftop', {bg:'#1B1B1B',fg:'#F2C230',subFg:'#FBF3EA',border:'#F2C230'});
}

/* =========================================================
   Old city blocks
   ========================================================= */
// Main bazaar (E–W) — fronts at z = ±10
fillRow(-93, 10, (cx,w)=>{ if (cx > -47 && cx < -3) return; haveli(cx,-16,w,12,0); });
fillRow(-93, -44, (cx,w)=>haveli(cx,16,w,12,Math.PI));
fillRow(-32, -16.5, (cx,w)=>haveli(cx,16,w,12,Math.PI));
fillRow(-4.5, 10, (cx,w)=>haveli(cx,16,w,12,Math.PI));
fillRow(50, 93, (cx,w)=>{ haveli(cx,-16,w,12,0); haveli(cx,16,w,12,Math.PI); });
// N–S bazaar — fronts at x = 20 / 40
fillRow(-93, -20, (cz,w)=>{ haveli(46,cz,w,12,-Math.PI/2); });
fillRow(-93, -24, (cz,w)=>{ haveli(14,cz,w,12,Math.PI/2,{floors:2}); });
fillRow(20, 93, (cz,w)=>{
  const lmb = cz > 28 && cz < 42;
  haveli(46,cz,w,12,-Math.PI/2, lmb ? {sign:['LMB · Laxmi Mishthan Bhandar','लक्ष्मी मिष्ठान भंडार'], signStyle:{bg:'#7A1020',fg:'#F7D774',subFg:'#FFF2D6'}, floors:3, color:'#D4806A'} : {sign: rand()<0.6 ? signNames[(Math.floor(rand()*4)+3)%signNames.length] : null});
  haveli(14,cz,w,12,Math.PI/2);
});
// Chaupar corners
[[15,-15,Math.PI/4*0],[45,-15,0],[15,15,Math.PI],[45,15,Math.PI]].forEach(([x,z,r])=>haveli(x,z,10,10,r,{floors:3}));
// Inner lanes
function lanes(x0,x1,z0,z1){
  for (let x = x0+7; x <= x1-6; x += 15) for (let z = z0+7; z <= z1-6; z += 15){
    if (rand()<0.12){ tree(x,z,rand()<0.35?'bougainvillea':'neem'); continue; }
    haveli(x,z,rr(10,12.5),rr(10,12),pick([0,Math.PI,Math.PI/2,-Math.PI/2]),{shops:rand()<0.35});
  }
}
