/* =========================================================
   Jal Mahal in Man Sagar Lake
   ========================================================= */
{
  add(staticRoot,new THREE.CircleGeometry(LAKE.r+1,64),M_WATER,LAKE.x,-0.7,LAKE.z,1,1,1,0,-Math.PI/2).userData.noCast = true;
  add(staticRoot,new THREE.CylinderGeometry(LAKE.r,LAKE.r,1.2,64,1,true),M('#A98C6A','stone'),LAKE.x,-0.6,LAKE.z).userData.noCast = true;
  circles.push({x:LAKE.x,z:LAKE.z,r:LAKE.r+0.3});
  const g = new THREE.Group(), S = '#D9A866', S2 = '#E4BB80';
  box(g,26,3.2,26,S,0,-0.8,0,'stone');
  for (let side=0; side<4; side++){ const a = side*Math.PI/2; add(g,arcadeGeo(22,7,3.0,2.0,2.4,0.6),M(S2,'stone'),Math.sin(a)*13.1,-0.6,Math.cos(a)*13.1,1,1,1,a); }
  box(g,27,0.35,27,WHITE,0,2.4,0,'stone');
  box(g,20,3.4,20,S,0,2.75,0,'stone');
  for (let side=0; side<4; side++){ const a = side*Math.PI/2; add(g,arcadeGeo(16,5,3.2,2.2,2.6,0.5),M(S2,'stone'),Math.sin(a)*10.1,2.75,Math.cos(a)*10.1,1,1,1,a); }
  box(g,21,0.3,21,WHITE,0,6.1,0,'stone');
  for (let k=0;k<4;k++) for (let i=0;i<18;i++){ const a = k*Math.PI/2, off = -9.5+i*1.12; kangura(g,Math.sin(a)*10.3+Math.cos(a)*off,6.4,Math.cos(a)*10.3-Math.sin(a)*off,0.9,S); }
  for (const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    add(g,CYL(8),M(S,'stone'),a*12,3.5,b*12,2.3,9,2.3);
    box(g,5,0.3,5,WHITE,a*12,8.0,b*12,'stone');
    chhatri(g,a*12,8.3,b*12,1.9,S,S2,'stone');
  }
  box(g,8,2.4,8,S2,0,6.4,0,'stone'); add(g,BANGLA,M(S),0,8.8,0,8.4,3,8.4); add(g,BANGLA_FILL,M(S),0,8.8,0,8.4,3,8.4);
  chhatri(g,0,8.8,6,1.2,S,S2,'stone'); chhatri(g,0,8.8,-6,1.2,S,S2,'stone');
  place(g,LAKE.x,LAKE.z,0.15);
  // promenade
  flat(M_PAVE2, 30, -132, 90, 9, 0.05);
  for (let x=-12; x<=72; x+=3){ const p = new THREE.Group(); cyl(p,0.08,1.1,'#7A5C3E',0,0,0,6,'stone'); place(p,x,-136.2,0); }
  box(staticRoot,84,0.08,0.08,'#7A5C3E',30,1.05,-136.2,'stone');
  for (let x=-8; x<=70; x+=16) lamp(x,-130.5);
}
function lamp(x,z,ax=1,az=0,y0=0){
  const g = new THREE.Group(), C = '#1E1E1E';
  cyl(g,0.16,0.5,C,0,0,0,10,'stone'); cyl(g,0.07,4.4,C,0,0.5,0,8,'stone'); add(g,SPH,M(C,'stone'),0,4.95,0,0.11,0.11,0.11);
  const L = 0.95, hx = ax*L, hz = az*L;
  add(g,UBOX,M(C,'stone'),hx/2,4.85,hz/2,Math.abs(ax)>0.01?L:0.05,0.05,Math.abs(az)>0.01?L:0.05);
  box(g,0.36,0.06,0.36,C,hx,4.62,hz,'stone'); add(g,UBOX,M_LIGHT,hx,4.4,hz,0.26,0.36,0.26); add(g,CONE(4),M(C,'stone'),hx,4.78,hz,0.26,0.24,0.26,Math.PI/4);
  place(g,x,z,0,y0); lampSpots.push([x+hx,4.4+y0,z+hz]); circles.push({x,z,r:0.22});
}


/* =========================================================
   Albert Hall Museum
   ========================================================= */
{
  flat(mat('#6E8A3C','grass'), 30, 170, 110, 70, 0.04);
  flat(M_PAVE2, 30, 132, 70, 14, 0.06);
  flat(M_PAVE2, 30, 148, 14, 30, 0.06);
  const g = new THREE.Group(), C = '#E7D1A8', P = '#D9937A', W = 58;
  box(g,W,10,20,C,0,0,-10,'stone');
  add(g,arcadeGeo(W,15,5.0,2.6,3.9,0.8),M(C,'stone'),0,0,0.4);
  add(g,arcadeGeo(W,15,4.6,2.4,3.6,0.8),M(C,'stone'),0,5.2,0.4);
  box(g,W,0.3,3.4,STONE,0,0,-1.3,'stone');
  box(g,W+0.6,0.3,1.6,WHITE,0,5.0,0.3,'stone'); box(g,W+0.6,0.35,1.6,P,0,9.8,0.3,'stone');
  for (let i=0;i<15;i++){ const cx = -W/2+W/15*(i+0.5); plane(g,M_ARCH,cx,3.9*1.15/2,0.82,2.6*1.32,3.9*1.15); plane(g,M_ARCH,cx,5.2+3.6*1.15/2,0.82,2.4*1.32,3.6*1.15); }
  for (let i=0;i<Math.floor(W/1.2);i++) kangura(g,-W/2+0.6+i*1.2,10.15,0.6,1,C);
  // central projecting portico + tower
  box(g,16,12,6,C,0,0,2.2,'stone'); add(g,arcadeGeo(16,3,11,4,8.5,0.8),M(C,'stone'),0,0,5.4);
  for (let i=0;i<3;i++) plane(g,M_ARCH,-16/2+16/3*(i+0.5),8.5*1.15/2,5.82,4*1.32,8.5*1.15);
  box(g,16.6,0.4,6.8,P,0,12,2.2,'stone');
  box(g,12,9,12,C,0,12.4,-4,'stone');
  for (let s=0;s<4;s++){ const a = s*Math.PI/2; add(g,arcadeGeo(11,3,6.5,2.4,5,0.5),M(C,'stone'),Math.sin(a)*6.05,13.6,-4+Math.cos(a)*6.05,1,1,1,a); }
  box(g,13,0.4,13,WHITE,0,21.4,-4,'stone');
  cyl(g,4.4,2.2,C,0,21.8,-4,24,'stone');
  onion(g,4.6,'#E9D8B4',0,24,-4,'stone',1.0);
  cone(g,0.25,2.2,'#D9A23A',0,31.7,-4,8,'stone');
  for (const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]) chhatri(g,a*5.5,21.8,-4+b*5.5,1.3,C,WHITE,'stone');
  for (const s of [-1,1]){ box(g,8,4,8,C,s*(W/2-4),10,-6,'stone'); chhatri(g,s*(W/2-4),14,-6,2.4,C,'#E9D8B4','stone'); chhatri(g,s*(W/2-12),10.2,0,1.2,C,WHITE,'stone'); }
  place(g,30,160,Math.PI);
  colliderLocal(30,160,Math.PI,-W/2,W/2,-20,6);
  // fountain + pigeons' plaza
  const f = new THREE.Group(); cyl(f,5,0.7,'#E6D7BE',0,0,0,32,'stone'); add(f,new THREE.CylinderGeometry(4.6,4.6,0.1,32),M_WATER,0,0.62,0); cyl(f,0.6,2.4,'#E6D7BE',0,0.6,0,12,'stone'); hemi(f,1.4,'#E6D7BE',0,2.6,0,'stone',0.4);
  place(f,30,130,0); circles.push({x:30,z:130,r:5});
  [[-12,140],[72,140],[-14,190],[74,190],[-4,160],[64,160]].forEach(([x,z])=>tree(x,z,'palm',1.1));
  [[-22,125],[82,125],[-22,200],[82,200]].forEach(([x,z])=>tree(x,z,'peepal',1.3));
}

/* =========================================================
   Panna Meena ka Kund stepwell
   ========================================================= */
{
  const g = new THREE.Group(), h = KUND.s/2, step = 1.3, rise = 1.15, N = 8;
  for (let k=0;k<N;k++){
    const o = h - k*step, yTop = -k*rise;
    for (let side=0; side<4; side++){
      const a = side*Math.PI/2;
      const b = add(g,UBOX,M_KUND,Math.sin(a)*(o-step/2),yTop-rise/2,Math.cos(a)*(o-step/2),2*o,rise,step,a);
    }
  }
  add(g,UPLANE,mat('#4C6B48','stone',{roughness:0.1,metalness:0.1}),0,-N*rise+0.3,0,2*(h-N*step)+0.5,2*(h-N*step)+0.5,1,0,-Math.PI/2);
  for (let side=0; side<4; side++){ const a = side*Math.PI/2; add(g,UBOX,M('#D9B98A','stone'),Math.sin(a)*(h+0.4),0.1,Math.cos(a)*(h+0.4),2*h+1.6,0.2,0.8,a); }
  for (const [a,b] of [[-1,-1],[1,-1]]) chhatri(g,a*(h+3),0,b*(h+3),1.8,'#D9B98A','#E8D2A6','stone');
  box(g,10,4.5,5,'#D9B98A',0,0,-h-4,'stone'); add(g,arcadeGeo(10,3,4.5,2.0,3.2,0.5),M('#E1C496','stone'),0,0,-h-1.3);
  place(g,KUND.x,KUND.z,0);
  colliderLocal(KUND.x,KUND.z,0,-5,5,-h-6.5,-h-1.5,5); const wh = h - N*step; colliderLocal(KUND.x,KUND.z,0,-wh,wh,-wh,wh,-20);
  [[-178,-30],[-122,20],[-176,16],[-128,-36]].forEach(([x,z])=>tree(x,z,'neem',1.2));
}

/* =========================================================
   MI Road and C-Scheme: cafés, Central Park, Patrika Gate
   ========================================================= */
function modern(x,z,w,d,rot,o={}){
  const g = new THREE.Group(), floors = o.floors || Math.floor(rr(3,6)), G = 4.4, F = 3.4, h = G + (floors-1)*F;
  const col = o.color || pick(['#E4C4A2','#D9A27E','#EAD9C2','#E0B08E','#CF8F72']), fz = d/2;
  box(g,w,h,d-1,col,0,0,-0.5);
  plane(g,M_CAFE[Math.floor(rand()*M_CAFE.length)],0,G*0.45,fz-1.15,w-1.2,G*0.8);
  add(g,UBOX,M_GLASS_SHOP,0,G*0.45,fz-0.6,w-1.2,G*0.8,0.06);
  box(g,w-1.0,0.15,0.2,'#2A2A2A',0,G*0.85,fz-0.55,'stone'); for (let k=0;k<=Math.floor(w/3);k++) box(g,0.1,G*0.8,0.16,'#2A2A2A',-w/2+0.6+k*(w-1.2)/Math.floor(w/3),G*0.05,fz-0.55,'stone');
  box(g,w,0.5,1.6,o.canopy||'#3A2A22',0,G-0.5,fz-0.1,'stone');
  for (let f=1; f<floors; f++){
    const yb = G + (f-1)*F;
    add(g,UBOX,M_GLASS,0,yb+F*0.5,fz-0.95,w-1.6,F*0.55,0.1);
    if (rand()<0.6 || o.balconies){ box(g,w-0.6,0.18,1.4,'#D8CCBC',0,yb,fz-0.3,'stone'); box(g,w-0.6,1.0,0.06,'#2A2A2A',0,yb+0.18,fz+0.38,'stone'); }
    else plane(g,M_JAALI,0,yb+F*0.5,fz-0.88,w-1.4,F*0.75);
  }
  box(g,w+0.3,0.6,d-0.7,'#B9A48E',0,h,-0.5,'stone');
  if (rand()<0.4) cyl(g,0.8,1.3,'#1E1E1E',w/4,h+0.6,-d/4,14,'stone');
  if (o.sign) sign(g,o.sign,0,G-0.25,fz+0.72,Math.min(w*0.8,9),0.9);
  place(g,x,z,rot); colliderLocal(x,z,rot,-w/2,w/2,-d/2,fz+0.7);
  if (o.cafe){ const c = Math.cos(rot), sn = Math.sin(rot), lz = fz+1.3; shopDoors.push({x:x + lz*sn, z:z + lz*c, rot, kind:6, name:o.cafe, sub:''}); }
  return {g,h,G};
}
fillRow(100,140,(cx,w)=>{
  if (cx>112 && cx<132) return;
  modern(cx,-19,w,12,0,{sign: rand()<0.7 ? {text:pick(['Rajasthali','Jaipur Bookmark','Kanha Sweets','Niros','Surana Jewellers','Raymond']),sub:'MI Road',...pick(SIGN_STYLES)} : null});
}, 9, 13);
{ // Anokhi Café
  const a = modern(122,-19,20,12,0,{cafe:'Anokhi Café',floors:3,color:'#F1E8DA',canopy:'#3E6D8C',sign:{text:'anokhi café',sub:'& Anokhi store',bg:'#F7F1E6',fg:'#2F4F7F',subFg:'#9B2D20',border:'#2F4F7F',font:"Georgia, 'Times New Roman', serif",weight:600}});
  for (let i=0;i<3;i++){ const tx = 116+i*6; const t = new THREE.Group(); cyl(t,0.5,0.75,'#F2EDE4',0,0,0,12,'stone'); cyl(t,0.04,2.2,'#3a3a3a',0,0,0,6,'stone'); cone(t,1.4,0.5,'#2F4F7F',0,2.0,0,12,'stone'); for (const s of [-1,1]) box(t,0.42,0.45,0.42,'#6B4B35',s*0.8,0,0,'stone'); place(t,tx,-10.8,0); }
  [[110,-11],[134,-11]].forEach(([x,z])=>{ const p = new THREE.Group(); cyl(p,0.45,0.7,'#B85C3F',0,0,0,10,'stone'); add(p,BLOBS[0],mat('#4E7A2C','foliage'),0,1.3,0,0.8,0.8,0.8); place(p,x,z,0); });
}
fillRow(160,240,(cx,w)=>{
  if (cx>176 && cx<196) return;
  modern(cx,-19,w,12,0,{sign: rand()<0.6 ? {text:pick(['Jawahar Kala Kendra','Lassiwala','Gaurav Tower','Jaipur Modern','Bapu Bazaar Outlet']),...pick(SIGN_STYLES)} : null});
}, 9, 13);
{ // Curious Life Coffee Roasters
  const c = modern(186,-19,20,12,0,{cafe:'Curious Life Coffee Roasters',floors:2,color:'#B4654A',canopy:'#1E1E1E',sign:{text:'CURIOUS LIFE',sub:'coffee roasters',bg:'#141414',fg:'#F4EAD8',subFg:'#E8B33A'}});
  for (let i=0;i<4;i++){ const t = new THREE.Group(); cyl(t,0.4,0.75,'#1E1E1E',0,0,0,12,'stone'); for (const s of [-1,1]) box(t,0.4,0.45,0.4,'#8C5A3C',s*0.7,0,0,'stone'); place(t,178+i*5,-10.8,0); }
}
fillRow(100,140,(cx,w)=>modern(cx,19,w,12,Math.PI,{sign: cx<112 ? {text:'LASSIWALA',sub:'लस्सीवाला · MI Road',bg:'#B82B2B',fg:'#FFF2D6'} : null}), 9, 13);
fillRow(-70,-14,(cz,w)=>modern(134,cz,w,12,Math.PI/2), 9, 13);
fillRow(16,50,(cz,w)=>modern(134,cz,w,12,Math.PI/2), 9, 13);
fillRow(72,105,(cz,w)=>modern(134,cz,w,12,Math.PI/2), 9, 13);
fillRow(-75,-14,(cz,w)=>modern(166,cz,w,12,-Math.PI/2), 9, 13);
{ // Tapri Central, rooftop facing Central Park
  const t = modern(134,61,20,12,Math.PI/2,{cafe:'Tapri Central',floors:4,color:'#D9A27E',sign:{text:'TAPRI',sub:'the tea house',bg:'#F2C230',fg:'#2B1A10',subFg:'#7A1020'}});
  const g = t.g, h = t.h;
  for (let i=0;i<6;i++) box(g,0.18,2.8,0.18,'#6B4B35',-9+i*3.6,h+0.6,5.2,'stone');
  for (let i=0;i<6;i++) box(g,0.18,2.8,0.18,'#6B4B35',-9+i*3.6,h+0.6,-1,'stone');
  for (let i=0;i<10;i++) box(g,0.12,0.12,6.6,'#7A5638',-9+i*2,h+3.4,2.1,'stone');
  for (let i=0;i<5;i++){ cyl(g,0.45,0.75,'#7A5638',-7+i*3.5,h+0.6,2.8,10,'stone'); add(g,BLOBS[i%3],mat('#55702F','foliage'),-8.5+i*4,h+1.1,-1.8,0.7,0.6,0.7); }
  sign(g,{text:'TAPRI CENTRAL',sub:'kulhad chai · rooftop',bg:'#2B1A10',fg:'#F2C230',subFg:'#FBF3EA',border:'#F2C230'},0,h+4.2,5.5,9,1.4);
}
{ // Central Park
  flat(mat('#6B8C3C','grass'), 205, 65, 80, 80, 0.05);
  add(staticRoot,new THREE.RingGeometry(26,29,64),mat('#CDB48E','paving'),205,0.08,65,1,1,1,0,-Math.PI/2).userData.noCast = true;
  flat(mat('#CDB48E','paving'),205,40,4,20,0.08);
  [[165,25,245,25],[165,105,245,105],[165,25,165,105],[245,25,245,105]].forEach(([a,b,c,d],i)=>{
    const L = Math.hypot(c-a,d-b), g = new THREE.Group();
    box(g,L,0.7,0.5,'#E2D6C2',0,0,0,'stone');
    for (let k=0;k<L;k+=2.2) box(g,0.06,1.2,0.06,'#2A3A2A',-L/2+k,0.7,0,'stone');
    box(g,L,0.06,0.06,'#2A3A2A',0,1.85,0,'stone');
    place(g,(a+c)/2,(b+d)/2,b===d?0:Math.PI/2);
    if (b===d && b===25){ colliderLocal(185,25,0,-20,20,-0.3,0.3,2); colliderLocal(228,25,0,-17,17,-0.3,0.3,2); }
    else colliderLocal((a+c)/2,(b+d)/2,b===d?0:Math.PI/2,-L/2,L/2,-0.3,0.3,2);
  });
  for (let i=0;i<22;i++){ const a = i/22*Math.PI*2; tree(205+Math.cos(a)*34,65+Math.sin(a)*34, i%5===0?'bougainvillea':(i%2?'neem':'peepal'), rr(0.9,1.2)); }
  for (let i=0;i<9;i++){ const a = i/9*Math.PI*2+0.3; tree(205+Math.cos(a)*18,65+Math.sin(a)*18,'ashoka',1); }
  const fm = new THREE.Group(); cyl(fm,3,0.8,'#E6D7BE',0,0,0,24,'stone'); add(fm,new THREE.CylinderGeometry(0.25,0.55,62,12),mat('#CFCFCF','stone',{metalness:0.7,roughness:0.35}),0,31.8,0);
  place(fm,205,65,0); circles.push({x:205,z:65,r:3});
}
const flagMesh = (()=>{ const g = new THREE.PlaneGeometry(15,10,24,12); g.translate(7.5,0,0); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({map:flagTex, side:THREE.DoubleSide, roughness:0.8})); m.position.set(205.3,57.5,65); m.castShadow = true; dynamicRoot.add(m); return m; })();
{ // Patrika Gate
  const g = new THREE.Group(), C = '#E59C7E', Y = '#E8B33A', D = 12, W = 46;
  const s = new THREE.Shape(); const arches = [[-15,3.5,8],[0,8,13],[15,3.5,8]];
  s.moveTo(-W/2,0);
  arches.forEach(([cx,r,oh])=>{ const hs = oh-r; s.lineTo(cx-r,0); s.lineTo(cx-r,hs); s.absarc(cx,hs,r,Math.PI,0,true); s.lineTo(cx+r,0); });
  s.lineTo(W/2,0); s.lineTo(W/2,17); s.lineTo(-W/2,17); s.lineTo(-W/2,0);
  const eg = new THREE.ExtrudeGeometry(s,{depth:D,bevelEnabled:false,curveSegments:20}); eg.translate(0,0,-D/2);
  g.add(new THREE.Mesh(eg, M(C)));
  for (const zz of [D/2+0.03,-D/2-0.03]){
    const ry = zz>0?0:Math.PI;
    arches.forEach(([cx,r,oh],i)=>{ const ring = new THREE.Mesh(archRingGeo(r+0.9,r,oh-r,0.25),M(i===1?Y:'#2F6FB0')); ring.position.set(cx,0,zz); g.add(ring); });
    for (const px of [-21,-7.5,7.5,21]) for (const yy of [2,6.5,11]) plane(g,M_PAINT[Math.abs(Math.round(px+yy))%4],px+(zz>0?0:0),yy+1.8,zz+(zz>0?0.01:-0.01),Math.abs(px)>20?2.8:2.4,3.8,ry);
    plane(g,M_PAINT[1],0,15.2,zz+(zz>0?0.01:-0.01),14,2.4,ry);
  }
  box(g,W+1,0.45,D+1,WHITE,0,17,0); box(g,W,0.6,D,Y,0,16.4,0);
  for (let i=0;i<5;i++) chhatri(g,-18+i*9,17.45,0,i===2?3.0:1.9,C,i%2?Y:'#D84F7A');
  for (const zz of [D/2-0.3,-D/2+0.3]) for (let i=0;i<30;i++) kangura(g,-22+i*44/29,17.45,zz,1.2,Y);
  place(g,246,0,Math.PI/2);
  colliderLocal(246,0,Math.PI/2,-23,-18.5,-D/2,D/2); colliderLocal(246,0,Math.PI/2,-11.5,-8,-D/2,D/2); colliderLocal(246,0,Math.PI/2,8,11.5,-D/2,D/2); colliderLocal(246,0,Math.PI/2,18.5,23,-D/2,D/2);
}
// street trees on MI Road
for (let x=104; x<240; x+=13){ if (Math.abs(x-150)>12){ tree(x,-11.8,'neem',0.85); if (x<140) tree(x+6,11.8,'neem',0.85); } }
for (let z=-70; z<105; z+=14) if (Math.abs(z)>16) { tree(141.5,z,'ashoka',0.9); }

/* =========================================================
   Nahargarh ridge fort and Amer
   ========================================================= */
{
  let prev = null;
  for (let a=-2.2; a<=-0.9; a+=0.035){
    const R = 360 + Math.sin(a*9)*18, x = CX + Math.cos(a)*R, z = CZ + Math.sin(a)*R*1.05, y = terrainH(x,z);
    if (prev){
      const dx = x-prev.x, dy = y-prev.y, dz = z-prev.z, L = Math.hypot(dx,dz);
      const s = add(staticRoot,UBOX,M('#D3A06A','stone'),(x+prev.x)/2,(y+prev.y)/2+1.6,(z+prev.z)/2,2.2,4,Math.hypot(L,dy)+0.6,Math.atan2(dx,dz),-Math.atan2(dy,L));
      if (Math.round(a*1000)%140 < 35) { const t = new THREE.Group(); cyl(t,2.6,6,'#D3A06A',0,0,0,12,'stone'); chhatri(t,0,6,0,1.2,'#D3A06A','#E4BB80','stone'); place(t,x,z,0,y-1); }
    }
    prev = {x,y,z};
  }
  const nx = CX - 40, nz = CZ - 370, ny = terrainH(nx,nz) - 4;
  const n = new THREE.Group(); const NC = '#E0B47C';
  box(n,46,12,22,NC,0,0,0,'stone'); add(n,arcadeGeo(46,12,6,2.4,4.4,0.6),M('#E9C38E','stone'),0,6,11.3);
  box(n,22,7,14,NC,-8,12,-2,'stone'); for (let i=0;i<5;i++) chhatri(n,-20+i*10,12,8,1.8,NC,'#F0D4A4','stone');
  place(n,nx,nz,0.1,ny);
  const ax = CX - 250, az = CZ - 300, ay = terrainH(ax,az) - 8;
  const am = new THREE.Group(); const AC = '#E6C28C';
  box(am,70,18,30,AC,0,0,0,'stone'); box(am,40,10,20,AC,-10,18,-4,'stone'); box(am,20,8,14,'#EED3A4',14,18,2,'stone');
  add(am,arcadeGeo(70,18,8,2.4,6,0.6),M('#EED3A4','stone'),0,9,15.3);
  for (let i=0;i<6;i++) chhatri(am,-28+i*11,18,10,2.6,AC,'#F0D4A4','stone');
  chhatri(am,-10,28,-4,3.2,AC,'#F0D4A4','stone');
  place(am,ax,az,0.6,ay);
}
{ // scrub on the hills
  // spots only: the bushes themselves are Nature MegaKit bushes, planted with the trees
  for (let i=0, k=0; i<5000 && k<350; i++){
    const a = rand()*Math.PI*2, R = rr(330,620), x = CX + Math.cos(a)*R, z = CZ + Math.sin(a)*R, y = terrainH(x,z);
    if (y < 1 || y > 34) continue; k++; TREE_SPOTS.push({x, z, y, type:'scrub', s: rr(0.9,2.0), rot: rand()*6.283, pick: rand()});
  }
}
// trees outside the walls
for (let i=0;i<220;i++){
  const x = rr(-220,280), z = rr(-260,240);
  if (Math.abs(x)<104 && Math.abs(z)<104) continue;
  if (x>94 && x<262 && z>-30 && z<110) continue;
  if (x>94 && x<262 && Math.abs(z)<28) continue;
  if (Math.hypot(x-LAKE.x,z-LAKE.z) < LAKE.r+14) continue;
  if (Math.abs(x-30)<14 && (z<-90 || z>90)) continue;
  if (z>118 && z<210 && x>-28 && x<88) continue;
  if (Math.abs(x-KUND.x)<26 && Math.abs(z-KUND.z)<26) continue;
  if (Math.abs(z)<12 && x<-90) continue;
  if (Math.hypot(x-HILL.x, z-HILL.z) < HILL.r + 6) continue;
  if (x>156 && x<262 && z>108 && z<200) continue;
  if (z>-118 && z<-104 && x>-84 && x<26) continue;
  if (terrainH(x,z) > 0.5) continue;
  if (Math.hypot(x-CX, z-CZ) > 310) continue;
  tree(x,z,pick(['neem','neem','peepal','ashoka','bougainvillea']),rr(0.9,1.4));
}

/* =========================================================
   Street life (static)
   ========================================================= */
const WHEEL = new THREE.CylinderGeometry(1,1,1,14); WHEEL.rotateZ(Math.PI/2);
function cart(x,z,rot,kind){
  const g = new THREE.Group();
  box(g,2.6,0.12,1.4,'#7A5638',0,0.8,0,'stone');
  for (const sz of [-1,1]) add(g,WHEEL,M('#2A2A2A','stone'),0,0.45,sz*0.75,0.08,0.45,0.45,Math.PI/2);
  const fruit = kind==='fruit' ? ['#E8B33A','#D8342B','#6E9A2E','#F2C230'] : ['#E05A2B','#5E8F3A','#C23B3B','#E8D8B8'];
  for (let i=0;i<14;i++) add(g,SPH,M(pick(fruit),'stone'),rr(-1.1,1.1),1.0+rr(0,0.15),rr(-0.5,0.5),0.17,0.15,0.17);
  cyl(g,0.04,2.4,'#3A2A20',1.1,0.9,0.5,6,'stone'); cone(g,1.5,0.55,pick(['#E8B33A','#2E8C87','#B82B2B','#3B4B8C']),1.1,3.2,0.5,12,'stone');
  place(g,x,z,rot); circles.push({x,z,r:1.3});
}
function scooter(x,z,rot){ scooterSpots.push([x,z,rot]); }
function cow(x,z,rot){ cowSpots.push([x,z,rot]); }
function camel(x,z,rot){ camelSpots.push([x,z,rot]); }
cart(-55,7.5,0,'fruit'); cart(4,-7.6,Math.PI,'veg'); cart(62,7.4,0.1,'fruit'); cart(23,48,Math.PI/2,'veg'); cart(37,-48,-Math.PI/2,'fruit'); cart(120,11,0,'fruit');
for (let i=0;i<7;i++) scooter(-82+i*1.0,8.4,0.2); for (let i=0;i<6;i++) scooter(60+i*1.0,-8.5,Math.PI+0.2);
for (let i=0;i<5;i++) scooter(38.6,60+i*1.0,-Math.PI/2+0.2); for (let i=0;i<6;i++) scooter(166+i*1.0,-11.6,0.15);
cow(56,3,1.2); cow(-70,-4,-0.6); cow(30,-60,2.4); cow(-120,4,0.3);
camel(50,-129,1.6); camel(4,-129,-1.6); camel(-128,18,1.2); camel(-74,-112,-1.2);
// street lamps, evenly spaced along both pavements, arms over the road
for (let x=-86; x<=86; x+=16){ if (Math.abs(x-30) < 22) continue; lamp(x,-7.6,0,1); lamp(x+8,7.6,0,-1); }
for (let z=-86; z<=86; z+=16){ if (Math.abs(z) < 22) continue; lamp(21.6,z,1,0); lamp(38.4,z+8,-1,0); }
for (const [x,z] of [[12,-18],[48,-18],[12,18],[48,18]]) lamp(x,z,(30-x)/18,(0-z)/18*0);
for (let x=104; x<=240; x+=16){ if (Math.abs(x-150) < 12) continue; if (!((x>110 && x<134) || (x>172 && x<198))) lamp(x,-10.3,0,1); lamp(x+8,10.3,0,-1); }
for (let z=-70; z<=104; z+=16){ if (Math.abs(z) < 16) continue; lamp(158.6,z,-1,0); }
for (const [x,z] of [[20,124],[40,124],[20,138],[40,138]]) lamp(x,z,x<30?1:-1,0);
// overhead electric wires across the bazaars
{
  const wireMat = M('#1C1C1C','stone');
  const pole = (x,z)=>{ const g = new THREE.Group(); cyl(g,0.13,8.5,'#4A4A48',0,0,0,8,'stone'); box(g,1.4,0.1,0.1,'#4A4A48',0,8.0,0,'stone'); place(g,x,z,0); };
  const wire = (a,b,y,sag)=>{ const pts = []; for (let t=0;t<=1.0001;t+=0.1) pts.push(new THREE.Vector3(a[0]+(b[0]-a[0])*t, y - Math.sin(t*Math.PI)*sag, a[1]+(b[1]-a[1])*t)); staticRoot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,0.025,4), wireMat)); };
  for (let x=-88; x<90; x+=22){ if (Math.abs(x-30)<22 || (x>-48 && x<-2)) continue; pole(x,-9.3); pole(x+11,9.3); }
  for (let x=-88; x<70; x+=22){ if (Math.abs(x-30)<22) continue; for (let k=0;k<3;k++){ wire([x,-9.3],[x+11,9.3],7.8-k*0.25,0.8+k*0.2); if (x+22<90 && !(x+22>-48 && x+22<-2) && Math.abs(x+22-30)>=22) wire([x,-9.3],[x+22,-9.3],7.9-k*0.2,0.6); } }
}

/* Night: fairy lights across the bazaars */
const fairySpots = [];
{
  const string = (a,b,y,sag)=>{ const n = Math.max(6, Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/0.9)); for (let i=0;i<=n;i++){ const t = i/n; fairySpots.push([a[0]+(b[0]-a[0])*t, y - Math.sin(t*Math.PI)*sag, a[1]+(b[1]-a[1])*t]); } };
  for (let x=-86; x<90; x+=7){ if (x>-46 && x<-4) continue; if (Math.abs(x-30)<20) continue; string([x,-9.6],[x+3.5,9.6],7.2,1.1); }
  for (let z=-88; z<90; z+=7){ if (Math.abs(z)<20) continue; string([20.4,z],[39.6,z+3.5],7.2,1.1); }
  for (let x=-46; x<-4; x+=1.0) fairySpots.push([x, 7.15, -9.2]);
  for (let x=104; x<240; x+=10){ if (Math.abs(x-150)<12) continue; string([x,-12.5],[x+5,12.5],7.6,1.3); }
  for (const zz of [-10,10]) for (let x=-93; x<93; x+=1.3){ if (Math.abs(x-30)<18) continue; fairySpots.push([x, 5.0, zz + (zz<0?-0.15:0.15)]); }
}
['#C46A55','#D27C64','#D9A866','#E4BB80','#E59C7E','#E7D1A8','#EEDCB9','#D27E66','#F4ECDC','#E3C28C','#E0B47C','#E6C28C','#EED3A4','#E9D8B4'].forEach(hx=>{
  Object.keys(matCache).forEach(k=>{ if (k.startsWith(hx)){ const m = matCache[k]; m.emissive = lin('#FFB06A'); m.emissiveIntensity = 0; monumentMats.push(m); } });
});

/* =========================================================
   Sunset Point: a hill with a spiral road to a viewpoint
   ========================================================= */
{
  const R = HILL.r, seg = 120;
  const g = new THREE.PlaneGeometry(2*R+4, 2*R+4, seg, seg); g.rotateX(-Math.PI/2);
  const p = g.attributes.position, cols = new Float32Array(p.count*3), c = new THREE.Color(), cLow = lin('#B89A6E'), cMid = lin('#8A8650'), cRock = lin('#9C7556');
  for (let i=0;i<p.count;i++){ const x = p.getX(i)+HILL.x, z = p.getZ(i)+HILL.z, d = Math.hypot(x-HILL.x,z-HILL.z); const rd = d < R && d > HILL.top + 0.5 ? roadAt(x,z,1.9) : null; const y = d < R ? (rd !== null ? rd - 0.1 : hillH(x,z)) - (d > R-1.5 ? 0.3 : 0) : -0.6;
    p.setXYZ(i,x,y,z); const n = fbm(x/9,z/9); c.copy(cLow).lerp(cMid, Math.min(1, y/18)*(0.5+0.5*n)); if (n>0.66 && y>8) c.lerp(cRock,0.5); cols[i*3]=c.r; cols[i*3+1]=c.g; cols[i*3+2]=c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(cols,3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat('#FFFFFF','ground',{vertexColors:true})); staticRoot.add(m);
  // spiral road
  const th0 = Math.atan2(32,60), turns = 1.75, r0 = R-3, r1 = HILL.top+0.5, N = 420, W = 2.4;
  const pos = [], idx = [];
  for (let i=0;i<=N;i++){
    const t = i/N, th = th0 + t*turns*Math.PI*2, r = r0 + (r1-r0)*t, ux = Math.cos(th), uz = Math.sin(th);
    const cx = HILL.x + ux*r, cz = HILL.z + uz*r, ry = hillH(cx,cz) + 0.14;
    for (const s of [-1,1]){ const x = HILL.x + ux*(r+s*W), z = HILL.z + uz*(r+s*W); pos.push(x, ry, z); }
    jeepPath.push([cx, ry, cz]);
    if (i<N) idx.push(i*2,i*2+1,i*2+2, i*2+1,i*2+3,i*2+2);
    if (i%10===0 && i<N){ const ox = HILL.x + ux*(r+W+0.4), oz = HILL.z + uz*(r+W+0.4); box(staticRoot,0.25,0.5,0.25,'#F4E9DD',ox,ry-0.1,oz,'stone'); }
    if (i%26===13 && i<N-10){ const lx = HILL.x + ux*(r+W+0.9), lz = HILL.z + uz*(r+W+0.9); lamp(lx,lz,-ux,-uz,ry-0.1); }
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); rg.setIndex(idx); rg.computeVertexNormals();
  const road = new THREE.Mesh(rg, mat('#77706A','asphalt',{roughness:0.95, side:THREE.DoubleSide})); road.userData.noCast = true; staticRoot.add(road);
  // road from the north gate to the foot of the hill
  flat(M_ASPH, -28, -112, 108, 9, 0.06);
  // summit platform
  const S = new THREE.Group(), H = HILL.h + 0.2, end = th0 + turns*Math.PI*2;
  cyl(S,HILL.top+0.6,0.6,'#D9B98A',0,H-0.6,0,40,'stone');
  for (let i=0;i<40;i++){ const a = i/40*Math.PI*2; let da = Math.abs(((a - end)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI); if (da < 0.28) continue; const x = Math.cos(a)*(HILL.top+0.2), z = Math.sin(a)*(HILL.top+0.2); kangura(S,x,H,z,1.2,'#D9876E'); circles.push({x:HILL.x+x, z:HILL.z+z, r:0.55}); }
  chhatri(S,-3.5,H,-3.5,2.0,'#D9876E',WHITE);
  for (const [x,z,r] of [[3,-4,0.6],[-5,2,2.2],[4,3,-0.8]]){ const b = new THREE.Group(); box(b,2.2,0.08,0.55,'#7A5638',0,0.45,0,'stone'); box(b,0.08,0.45,0.5,'#2A2A2A',-0.9,0,0,'stone'); box(b,0.08,0.45,0.5,'#2A2A2A',0.9,0,0,'stone'); b.position.set(x,H,z); b.rotation.y = r; S.add(b); }
  cyl(S,0.05,1.1,'#2A2A2A',2,H,1,8,'stone'); add(S,CYL(12),M('#3A3A3A','stone',{metalness:0.6,roughness:0.4}),2,H+1.25,1,0.09,0.6,0.09,0.4,1.2);
  sign(S,{text:'SUNSET POINT',sub:'सनसेट पॉइंट · view over the Pink City',bg:'#7A1020',fg:'#F7D774',subFg:'#FFF2D6'},-3.5,H+4.9,-1.9,4.2,1.1,0.8);
  for (let i=0;i<6;i++){ const a = i/6*Math.PI*2 + 0.3; lamp(HILL.x+Math.cos(a)*(HILL.top-1), HILL.z+Math.sin(a)*(HILL.top-1), -Math.cos(a)*0.01, -Math.sin(a)*0.01, H); }
  S.position.set(HILL.x,0,HILL.z); staticRoot.add(S);
  circles.push({x:HILL.x-3.5, z:HILL.z-3.5, r:1.9});
  scooter(-73,-114,-1.4); scooter(-73,-115.2,-1.4);
}

/* =========================================================
   Jagatpura: offices for companies (Manthhan Software and open slots)
   ========================================================= */
flat(M_ASPH, 200, 117, 104, 11, 0.06); flat(M_ASPH, 150, 116, 17, 14, 0.07);
flat(mat('#CDBBA4','paving'), 200, 124, 104, 4, 0.045);
function techTower(x,z,w,d,nF,tower){
  const g = new THREE.Group(), G = 5.4, F = 3.6, h = G + nF*F, fz = d/2;
  box(g,w-0.6,h-G,d-0.6,'#C9CDD2',0,G,0,'stone');
  box(g,w-0.6,G,d-3.2,'#C9CDD2',0,0,-1.3,'stone');
  box(g,w-0.6,0.3,3.0,'#E6E2DC',0,G-0.3,fz-1.5,'stone');
  for (let n=0;n<nF;n++){
    const y = G + n*F;
    box(g,w+0.1,0.45,d+0.1,'#E6E2DC',0,y-0.2,0,'stone');
    add(g,UBOX,M_GLASS,0,y+F*0.5+0.05,fz-0.28,w-0.5,F-0.6,0.1);
    for (const s of [-1,1]) add(g,UBOX,M_GLASS,s*(w/2-0.28),y+F*0.5+0.05,0,0.1,F-0.6,d-0.5);
    add(g,UBOX,M_GLASS,0,y+F*0.5+0.05,-fz+0.28,w-0.5,F-0.6,0.1);
  }
  for (let i=0;i<=Math.round(w/2.4);i++){ const mx = -w/2+0.25 + i*(w-0.5)/Math.round(w/2.4); box(g,0.12,h-G,0.14,'#8E949C',mx,G,fz-0.2,'stone'); }
  box(g,w+0.4,0.8,d+0.4,'#E6E2DC',0,h,0,'stone'); box(g,w*0.4,2.4,d*0.35,'#B9BEC4',0,h+0.8,0,'stone');
  plane(g,M_CAFE[1],0,G*0.42,fz-2.85,w-2,G*0.8); box(g,w-0.6,0.05,2.6,'#D6D2CC',0,0.02,fz-1.6,'stone');
  add(g,UBOX,M_GLASS_SHOP,0,G*0.45,fz-0.7,w-1.4,G*0.85,0.06);
  for (let i=0;i<=6;i++) box(g,0.1,G*0.9,0.14,'#2A2A2E',-w/2+0.7+i*(w-1.4)/6,0,fz-0.68,'stone');
  box(g,9,0.3,4.2,'#2A2A2E',0,G-0.35,fz+1.4,'stone'); for (const s of [-1,1]) cyl(g,0.12,G-0.35,'#2A2A2E',s*4,0,fz+3.2,10,'stone');
  sign(g,{text:`TECH PARK · TOWER ${tower}`,sub:'Jagatpura',bg:'#14202E',fg:'#F4EAD8',subFg:'#E8B33A'},0,G+0.05,fz+3.55,7.6,0.9);
  for (let i=0;i<5;i++){ const px = -w/2+2+i*(w-4)/4; if (Math.abs(px) > 3.2) box(g,1.3,0.55,0.7,'#3A4A3A',px,0,fz+0.7,'foliage'); }
  for (const s of [-1,1]) box(g,0.12,3.1,0.2,'#2A2A2E',s*2.12,0,fz-0.38,'stone');
  box(g,4.4,0.18,1.0,'#BFB6AA',0,0,fz+0.6,'stone'); box(g,4.8,0.09,1.6,'#BFB6AA',0,0,fz+1.4,'stone');
  add(g,UBOX,M_LIGHT,0,3.15,fz-0.38,4.3,0.08,0.06); add(g,UBOX,M_LIGHT,-2.15,1.55,fz-0.38,0.06,3.1,0.06); add(g,UBOX,M_LIGHT,2.15,1.55,fz-0.38,0.06,3.1,0.06);
  sign(g,{text:'ENTRANCE',sub:'प्रवेश · lifts to all floors',bg:'#2E8C5A',fg:'#FFFFFF',subFg:'#E8F5EC'},0,3.6,fz-0.36,3.6,0.8);
  box(g,4.4,0.03,2.4,'#3A3A3A',0,0,fz+0.6,'stone');
  place(g,x,z,Math.PI); colliderLocal(x,z,Math.PI,-w/2,w/2,-d/2,fz+0.75);
  const dz = z - (fz+1.4);
  lobbyDoors.push({x, z:dz, rot:Math.PI, kind:8, tower, name:`Tech Park Tower ${tower}`, nF});
  for (let n=1;n<=nF;n++) officeDoors.push({x, z:dz, rot:Math.PI, slot:officeDoors.length, kind:7, tower, n, name:'Available', tx:x, tz:z, fz, w, fy:G + (n-1)*F + F*0.5});
}
flat(mat('#CDBBA4','paving'), 207, 131, 100, 13, 0.045);
techTower(186,148,22,22,10,'A'); techTower(228,146,20,20,8,'B');
for (let x=166; x<=250; x+=16) lamp(x,124.5,0,-1);
for (let x=170; x<=250; x+=18) tree(x,110.5,'ashoka',0.9);
