/* =========================================================
   Trees
   ========================================================= */
const BLOBS = [0,1,2].map(k=>{
  let g = new THREE.IcosahedronGeometry(1, 2); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = THREE.BufferGeometryUtils.mergeVertices(g); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); const n = 1 + (vnoise(v.x*2.6+k*7, v.y*2.6+v.z*1.9)-0.5)*0.5 + (vnoise(v.x*7+k, v.z*7-v.y*3)-0.5)*0.12; v.multiplyScalar(n); p.setXYZ(i,v.x,v.y,v.z); }
  g.computeVertexNormals(); return g;
});
const LEAF = {neem:['#55702F','#4B6629','#62803A'], peepal:['#4E7A2C','#5D8A34'], bougainvillea:['#C2397A','#D24C8C','#5E7A34'], ashoka:['#3F5E26','#4A6B2C'], palm:['#5F7F35']};
function tree(x,z,type='neem',s=1){
  const g = new THREE.Group(), lc = LEAF[type];
  if (type==='palm'){
    const H = 9*s; let px = 0;
    for (let i=0;i<6;i++){ cyl(g,0.28*s-i*0.02,H/6+0.05,'#7A6249',px,i*H/6,0,8,'stone'); px += 0.12*s; }
    for (let i=0;i<9;i++){ const a = i/9*Math.PI*2; add(g,UBOX,mat(lc[0],'foliage'),px+Math.cos(a)*1.6*s,H+0.1-0.5*s,Math.sin(a)*1.6*s,0.5*s,0.06,3.4*s,-a+Math.PI/2,0.5); }
    place(g,x,z,rand()*6); circles.push({x,z,r:0.5}); return;
  }
  const trunkH = (type==='ashoka'?2.2:3.0)*s;
  cyl(g,0.32*s,trunkH,'#5E4634',0,0,0,9,'stone');
  add(g,UBOX,mat('#5E4634','stone'),0.5*s,trunkH*0.85,0,0.22*s,1.8*s,0.22*s,0,0,-0.6);
  add(g,UBOX,mat('#5E4634','stone'),-0.45*s,trunkH*0.9,0.2*s,0.2*s,1.6*s,0.2*s,0,0.3,0.6);
  if (type==='ashoka'){
    for (let i=0;i<4;i++) add(g,BLOBS[i%3],mat(lc[i%2],'foliage'),rr(-0.2,0.2)*s,trunkH+1.4*s+i*1.6*s,rr(-0.2,0.2)*s,(1.5-i*0.25)*s,1.4*s,(1.5-i*0.25)*s,rand()*6);
  } else {
    const n = type==='peepal' ? 7 : 5;
    for (let i=0;i<n;i++){
      const a = rand()*Math.PI*2, r = (i===0?0:rr(1.2,2.2))*s;
      const c = type==='bougainvillea' ? lc[i<n-1 ? (i%2) : 2] : lc[i%lc.length];
      add(g,BLOBS[i%3],mat(c,'foliage'),Math.cos(a)*r, trunkH + (i===0?2.0:rr(1.0,2.6))*s, Math.sin(a)*r, rr(1.7,2.5)*s,rr(1.4,2.0)*s,rr(1.7,2.5)*s,rand()*6);
    }
  }
  place(g,x,z,rand()*6); circles.push({x,z,r:0.45*s});
}

/* =========================================================
   Walls, bastions and gates of the walled city
   ========================================================= */
const WALL = '#CC7760';
function wallSeg(x1,z1,x2,z2){
  const g = new THREE.Group(), hz = Math.abs(z1-z2) < 0.01, L = hz ? Math.abs(x2-x1) : Math.abs(z2-z1);
  const cx = (x1+x2)/2, cz = (z1+z2)/2, t = 5, h = 9;
  box(g,L,h,t,WALL,0,0,0);
  box(g,L+0.2,0.25,t+0.4,WHITE,0,h-0.25,0);
  const n = Math.floor(L/1.6);
  for (let i=0;i<n;i++){ const lx = -L/2+(i+0.5)*L/n; kangura(g,lx,h,t/2-0.2,1.3,WALL); kangura(g,lx,h,-t/2+0.2,1.3,WALL); }
  for (let lx=-L/2+6; lx<L/2-3; lx+=12){ for (const s of [1,-1]){ add(g,archShapeGeo(1.4,2.6),M(DARK,'stone'),lx,3.2,s*(t/2+0.01),1,1,1,s>0?0:Math.PI); plane(g,M_ARCH,lx,3.2+1.5,s*(t/2+0.02),1.9,3.0,s>0?0:Math.PI); } }
  friezeStrip(g,L-1,0.5,0,h-0.8,t/2+0.012); friezeStrip(g,L-1,0.5,0,h-0.8,-t/2-0.012,Math.PI);
  place(g,cx,cz,hz?0:Math.PI/2);
  colliderLocal(cx,cz,hz?0:Math.PI/2,-L/2,L/2,-t/2,t/2);
}
function bastion(x,z){
  const g = new THREE.Group();
  cyl(g,5,11,WALL,0,0,0,20); cyl(g,5.3,0.3,WHITE,0,10.7,0,20);
  for (let i=0;i<18;i++){ const a = i/18*Math.PI*2; kangura(g,Math.cos(a)*4.9,11,Math.sin(a)*4.9,1.3,WALL); }
  chhatri(g,0,11,0,1.6,WALL,WHITE);
  place(g,x,z,0); circles.push({x,z,r:5});
}
function gate(x,z,rot,name){
  const g = new THREE.Group(), C = '#D27E66', D = 9;
  const s = new THREE.Shape(); const r = 8.5, hs = 4.5, W = 17;
  s.moveTo(-W,0); s.lineTo(-r,0); s.lineTo(-r,hs); s.absarc(0,hs,r,Math.PI,0,true); s.lineTo(r,0); s.lineTo(W,0); s.lineTo(W,17); s.lineTo(-W,17); s.lineTo(-W,0);
  const eg = new THREE.ExtrudeGeometry(s,{depth:D,bevelEnabled:false,curveSegments:24}); eg.translate(0,0,-D/2);
  g.add(new THREE.Mesh(eg, M(C)));
  for (const zz of [D/2+0.15,-D/2-0.15]){ const ring = new THREE.Mesh(archRingGeo(9.6,8.5,4.5,0.3), M(WHITE)); ring.position.z = zz; g.add(ring); }
  box(g,34.6,0.4,D+0.8,WHITE,0,16.8,0); box(g,34.2,0.5,D+0.4,C,0,16.3,0);
  for (const zz of [D/2-0.2,-D/2+0.2]) for (let i=0;i<22;i++) kangura(g,-16.2+i*32.4/21,17.2,zz,1.4,C);
  for (const sx of [-1,1]) for (const zz of [D/2+0.02,-D/2-0.02]){
    const ry = zz>0?0:Math.PI;
    for (const yy of [1.2,8.2]){ add(g,archShapeGeo(2.4,4.4),M(DARK,'stone'),sx*13,yy,zz,1,1,1,ry); plane(g,M_ARCH,sx*13,yy+2.5,zz+(zz>0?0.01:-0.01),3.2,5.1,ry); }
    plane(g,M_PAINT[(sx>0?0:1)],sx*13,14.4,zz+(zz>0?0.01:-0.01),5,2.2,ry);
  }
  plane(g,M_PAINT[2],0,15.0,D/2+0.02,9,1.6); plane(g,M_PAINT[2],0,15.0,-D/2-0.02,9,1.6,Math.PI);
  chhatri(g,-13,17.2,0,2.0,C,WHITE); chhatri(g,13,17.2,0,2.0,C,WHITE); chhatri(g,0,17.2,0,3.0,C,C);
  place(g,x,z,rot);
  colliderLocal(x,z,rot,-17,-8.6,-D/2,D/2); colliderLocal(x,z,rot,8.6,17,-D/2,D/2);
}
const S = 95, GH = 17;
wallSeg(-S,-S,30-GH,-S); wallSeg(30+GH,-S,S,-S);
wallSeg(-S,S,30-GH,S); wallSeg(30+GH,S,S,S);
wallSeg(S,-S,S,-GH); wallSeg(S,GH,S,S);
wallSeg(-S,-S,-S,-GH); wallSeg(-S,GH,-S,S);
[[-S,-S],[S,-S],[-S,S],[S,S],[-S,-50],[-S,50],[S,-50],[S,50],[-30,-S],[75,-S],[-30,S],[75,S]].forEach(([x,z])=>bastion(x,z));
gate(30,-S,0,'Ganga Pol'); gate(30,S,0,'Sanganeri Gate'); gate(S,0,Math.PI/2,'Suraj Pol'); gate(-S,0,Math.PI/2,'Chandpole');

/* =========================================================
   Badi Chaupar
   ========================================================= */
{
  const g = new THREE.Group();
  cyl(g,8.5,0.25,'#D6BE98',0,0,0,40,'paving');
  cyl(g,6.5,0.7,'#E6D7BE',0,0,0,40,'stone');
  add(g,new THREE.CylinderGeometry(6.0,6.0,0.1,40),M_WATER,0,0.62,0);
  cyl(g,1.2,1.4,'#E6D7BE',0,0.6,0,16,'stone');
  chhatri(g,0,2.0,0,1.5,'#D27E66',WHITE);
  place(g,30,0,0); circles.push({x:30,z:0,r:7});
  for (const [cx,cz,alongX] of [[13.5,0,false],[46.5,0,false],[30,-17,true],[30,17,true]])
    for (let k=-3;k<=3;k++) flat(M_LINE, alongX ? cx + k*1.6 : cx, alongX ? cz : cz + k*1.6, alongX ? 0.8 : 3.0, alongX ? 3.0 : 0.8, 0.095);
  for (let i=0;i<28;i++){ const a0 = i/28*Math.PI*2; if (i%2) continue; const m = add(staticRoot,new THREE.RingGeometry(14.2,14.45,6,1,a0,Math.PI*2/28),M_LINE,30,0.096,0,1,1,1,0,-Math.PI/2); m.userData.noCast = true; }
}

/* =========================================================
   Jantar Mantar
   ========================================================= */
{
  const SY = '#E3C28C', g = new THREE.Group();
  flat(M_PAVE2, -18, -58, 48, 60, 0.05);
  // Samrat Yantra gnomon
  const gn = new THREE.Shape(); gn.moveTo(-20,0); gn.lineTo(20,0); gn.lineTo(20,25); gn.lineTo(-20,0);
  const gg = new THREE.ExtrudeGeometry(gn,{depth:4,bevelEnabled:false}); gg.translate(0,0,-2); gg.rotateY(Math.PI/2);
  add(g,gg,M(SY,'stone'),0,0,0);
  for (let i=0;i<46;i++){ const t = i/46; box(g,2.6,0.32,0.95,'#EAD2A6',0,25*t-0.05,20-40*t-0.4,'stone'); }
  for (const s of [-1,1]){ const rail = add(g,UBOX,M(WHITE,'stone'),s*2.05,12.6,0,0.12,0.6,47.2,0,Math.atan2(25,40)); }
  box(g,4.6,1.2,6,SY,0,0,21,'stone');
  // quadrant blocks with concave scales
  const q = new THREE.Shape(); q.moveTo(0,0); q.lineTo(12,0); q.lineTo(12,9); q.absarc(0,14,13,Math.atan2(-5,12),-Math.PI/2,true); q.lineTo(0,0);
  const qg = new THREE.ExtrudeGeometry(q,{depth:9,bevelEnabled:false,curveSegments:24}); qg.translate(0,0,-4.5);
  add(g,qg,M(SY,'stone'),2,0,-2); add(g,qg,M(SY,'stone'),-2,0,-2,1,1,1,Math.PI);
  place(g,-12,-58,0);
  colliderLocal(-12,-58,0,-16,16,-20,22);
  // Jai Prakash bowls
  [[-32,-44],[-32,-72]].forEach(([x,z])=>{
    const b = new THREE.Group();
    add(b,new THREE.CylinderGeometry(8,8.4,1.6,40,1,true),M(SY,'stone'),0,0.8,0);
    add(b,new THREE.RingGeometry(7.3,8.1,40),M('#EAD2A6','stone'),0,1.61,0,1,1,1,0,-Math.PI/2);
    add(b,new THREE.SphereGeometry(7.4,32,12,0,Math.PI*2,Math.PI/2,Math.PI/2),new THREE.MeshStandardMaterial({color:lin('#E9D9BE'),roughness:0.6,side:THREE.DoubleSide}),0,1.6,0,1,0.2,1);
    for (let i=0;i<12;i++){ const a = i/12*Math.PI*2; add(b,UBOX,M(WHITE,'stone'),Math.cos(a)*4,1.15,Math.sin(a)*4,0.12,0.1,6.6,-a+Math.PI/2,0.17); }
    place(b,x,z,0); circles.push({x,z,r:8.4});
  });
  // Ram Yantra
  { const rgp = new THREE.Group(); for (let i=0;i<12;i++){ const a = i/12*Math.PI*2; box(rgp,1.4,4.2,1.0,SY,Math.cos(a)*6,0,Math.sin(a)*6,'stone').rotation.y = -a; }
    add(rgp,new THREE.TorusGeometry(6,0.5,8,40),M('#EAD2A6','stone'),0,4.3,0,1,1,0.6,0,Math.PI/2); cyl(rgp,0.6,4.5,SY,0,0,0,12,'stone');
    place(rgp,2,-80,0); circles.push({x:2,z:-80,r:6.8}); }
  // Laghu Samrat (small sundial)
  { const lg = new THREE.Group(); const sm = new THREE.ExtrudeGeometry(gn,{depth:4,bevelEnabled:false}); sm.translate(0,0,-2); sm.rotateY(Math.PI/2);
    add(lg,sm,M(SY,'stone'),0,0,0,0.3,0.3,0.3); add(lg,qg,M(SY,'stone'),0.6,0,-0.6,0.3,0.3,0.3); add(lg,qg,M(SY,'stone'),-0.6,0,-0.6,0.3,0.3,0.3,Math.PI);
    place(lg,2,-38,0); colliderLocal(2,-38,0,-5,5,-6.5,6.5); }
  // low boundary wall with openings
  [[-42,-88,6,-88],[-42,-28,-30,-28],[-24,-28,6,-28]].forEach(([a,b,c,d])=>{ const L = Math.abs(c-a); const wg = new THREE.Group(); box(wg,L,1.6,0.8,'#D9876E',0,0,0); box(wg,L,0.12,1.0,WHITE,0,1.6,0); place(wg,(a+c)/2,b,0); colliderLocal((a+c)/2,b,0,-L/2,L/2,-0.4,0.4,2); });
}

/* =========================================================
   City Palace: Chandra Mahal and Mubarak Mahal
   ========================================================= */
{
  flat(M_PAVE2, -68, -58, 48, 60, 0.05);
  const g = new THREE.Group(), C = '#EEDCB9', P = '#E2A08A';
  const fl = [[30,5.5,12],[27,4.2,11],[24,4.0,10],[20,3.8,9],[16,3.6,8],[12,3.4,7],[8,3.2,6]];
  let y = 0;
  fl.forEach(([w,h,d],i)=>{
    box(g,w,h,d,C,0,y,-d/2);
    const n = Math.max(3, Math.round(w/2.6)), ow = (w/n)*0.62;
    add(g,arcadeGeo(w,n,h,ow,h*0.72,0.5),M(i%2?P:C),0,y,0.25);
    box(g,w,0.3,1.4,STONE,0,y,-0.4,'stone');
    for (let k=0;k<n;k++){ const cx = -w/2 + (w/n)*(k+0.5); plane(g,M_SHOP[3],cx,y+h*0.36,-0.9,(w/n)*0.7,h*0.6); }
    box(g,w+0.6,0.22,1.4,WHITE,0,y+h,0.1); box(g,w+0.2,0.3,0.6,P,0,y+h-0.3,0.4);
    for (let k=0;k<Math.floor(w/1.1);k++) kangura(g,-w/2+0.55+k*1.1,y+h+0.22,0.4,0.9,C);
    if (i>0) for (const s of [-1,1]) chhatri(g,s*(w/2-1),y+h+0.22,-d/2,0.9,C,WHITE);
    y += h + 0.22;
  });
  chhatri(g,0,y,-2.5,1.8,C,'#D9A23A');
  cyl(g,0.08,9,'#3A3A3A',0,y+3.5,-2.5,6,'stone');
  const flag = new THREE.Group(); ['#D8342B','#F2C230','#2E6EB0','#2E8C3A','#FBF3EA'].forEach((c,i)=>box(flag,4.2,0.5,0.03,c,2.1,-i*0.5,0,'stone'));
  flag.position.set(0,y+12.3,-2.5); g.add(flag);
  place(g,-70,-74,0);
  colliderLocal(-70,-74,0,-15,15,-12,1);
  // Mubarak Mahal
  const mm = new THREE.Group(), MW = '#F4ECDC';
  for (let lvl=0; lvl<2; lvl++){
    const yy = lvl*4.6;
    for (let side=0; side<4; side++){
      const a = side*Math.PI/2, sx = Math.sin(a)*7.6, sz = Math.cos(a)*7.6;
      add(mm,arcadeGeo(15.2,5,4.4,2.0,3.2,0.6),M(MW,'stone'),sx,yy,sz,1,1,1,a);
      for (let k=0;k<5;k++) { const off = -15.2/2 + 3.04*(k+0.5); add(mm,UPLANE,M_ARCH,sx+Math.cos(a)*off+Math.sin(a)*0.31,yy+1.85,sz-Math.sin(a)*off+Math.cos(a)*0.31,2.6,3.7,1,a); }
    }
    box(mm,13.6,4.4,13.6,'#E8DCC5',0,yy,0,'stone');
    box(mm,16.6,0.3,16.6,'#C9A27A',0,yy+4.3,0,'stone');
  }
  for (let k=0;k<14;k++) for (let side=0;side<4;side++){ const a = side*Math.PI/2, off = -7.6+k*1.17; kangura(mm,Math.sin(a)*8+Math.cos(a)*off,9.5,Math.cos(a)*8-Math.sin(a)*off,0.9,MW); }
  for (const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]) chhatri(mm,a*7,9.5,b*7,1.2,MW,MW,'stone');
  place(mm,-70,-42,0); colliderLocal(-70,-42,0,-8.3,8.3,-8.3,8.3);
  // palace enclosure
  [[-93,-28,-50,-28]].forEach(([a,b,c])=>{ const L = c-a; const wg = new THREE.Group(); box(wg,L,3.2,1.2,'#D9876E',0,0,0); box(wg,L+0.2,0.15,1.4,WHITE,0,3.2,0); for(let i=0;i<Math.floor(L/1.2);i++) kangura(wg,-L/2+0.6+i*1.2,3.35,0,1,'#D9876E'); place(wg,(a+c)/2,b,0); colliderLocal((a+c)/2,b,0,-L/2,L/2,-0.6,0.6,3.6); });
}

// main street north row west of HM is already built; fill remaining lanes
lanes(-93,8,22,93);
lanes(52,93,-93,-22);
lanes(52,93,22,93);
// trees and life in the old city
[[-44,-8.9],[-2,-8.9],[4,8.9],[58,-8.9],[80,8.9],[-80,8.9],[-62,-8.9]].forEach(([x,z],i)=>tree(x,z,i%3===0?'bougainvillea':'neem',0.75));
[[-30,-35],[-36,-82],[-50,-60],[-88,-40],[-52,-35]].forEach(([x,z])=>tree(x,z,'neem',1.1));
