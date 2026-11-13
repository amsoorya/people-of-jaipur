/* =========================================================
   Geometry primitives
   ========================================================= */
const UBOX = new THREE.BoxGeometry(1,1,1);
const UPLANE = new THREE.PlaneGeometry(1,1);
const CYL = n => (CYL[n] || (CYL[n] = new THREE.CylinderGeometry(1,1,1,n)));
const CONE = n => (CONE[n] || (CONE[n] = new THREE.ConeGeometry(1,1,n)));
const HEMI = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI*2, 0, Math.PI/2);
const SPH = new THREE.SphereGeometry(1, 16, 12);
const ONION = new THREE.LatheGeometry([[0,0],[0.92,0],[1.0,0.12],[1.1,0.38],[1.02,0.7],[0.72,1.0],[0.36,1.26],[0.1,1.48],[0.03,1.62],[0,1.7]].map(p=>new THREE.Vector2(p[0],p[1])), 18);
const BAY = new THREE.CylinderGeometry(1,1,1,4,1,false,-Math.PI/2,Math.PI);
const BANGLA = (()=>{ const s = new THREE.Shape(); s.moveTo(-0.5,0); s.quadraticCurveTo(-0.45,0.62,0,0.66); s.quadraticCurveTo(0.45,0.62,0.5,0); s.lineTo(0.42,0); s.quadraticCurveTo(0.38,0.5,0,0.54); s.quadraticCurveTo(-0.38,0.5,-0.42,0); s.lineTo(-0.5,0);
  const g = new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:10}); g.translate(0,0,-0.5); g.rotateY(Math.PI/2); return g; })();
const BANGLA_FILL = (()=>{ const s = new THREE.Shape(); s.moveTo(-0.45,0); s.quadraticCurveTo(-0.4,0.55,0,0.58); s.quadraticCurveTo(0.4,0.55,0.45,0); s.lineTo(-0.45,0);
  const g = new THREE.ExtrudeGeometry(s,{depth:0.96,bevelEnabled:false,curveSegments:10}); g.translate(0,0,-0.48); g.rotateY(Math.PI/2); return g; })();
const arcCache = {};
function arcadeGeo(w,n,h,ow,oh,depth){
  const key = [w,n,h,ow,oh,depth].map(v=>v.toFixed(2)).join('|');
  if (arcCache[key]) return arcCache[key];
  const s = new THREE.Shape(), r = ow/2, hs = Math.max(0.01, oh-r), sp = w/n;
  s.moveTo(-w/2,0);
  for (let i=0;i<n;i++){ const cx = -w/2 + sp*(i+0.5); s.lineTo(cx-r,0); s.lineTo(cx-r,hs); s.absarc(cx,hs,r,Math.PI,0,true); s.lineTo(cx+r,0); }
  s.lineTo(w/2,0); s.lineTo(w/2,h); s.lineTo(-w/2,h); s.lineTo(-w/2,0);
  const g = new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:14}); g.translate(0,0,-depth/2);
  return (arcCache[key] = g);
}
function archRingGeo(ro,ri,hs,depth){
  const s = new THREE.Shape();
  s.moveTo(-ro,0); s.lineTo(-ro,hs); s.absarc(0,hs,ro,Math.PI,0,true); s.lineTo(ro,0); s.lineTo(ri,0);
  s.lineTo(ri,hs); s.absarc(0,hs,ri,0,Math.PI,false); s.lineTo(-ri,0); s.lineTo(-ro,0);
  const g = new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:16}); g.translate(0,0,-depth/2); return g;
}
function archShapeGeo(w,h){ const r = w/2, s = new THREE.Shape(); s.moveTo(-r,0); s.lineTo(-r,h-r); s.absarc(0,h-r,r,Math.PI,0,true); s.lineTo(r,0); s.lineTo(-r,0); return new THREE.ShapeGeometry(s,12); }

/* =========================================================
   Scene graph helpers + collisions
   ========================================================= */
const staticRoot = new THREE.Group(); scene.add(staticRoot);
const dynamicRoot = new THREE.Group(); scene.add(dynamicRoot);
const colliders = [], circles = [];
const M = (h,k,o) => typeof h === 'string' ? mat(h,k,o) : h;
function add(p, geo, m, x,y,z, sx=1,sy=1,sz=1, ry=0, rx=0, rz=0){
  const o = new THREE.Mesh(geo, m); o.position.set(x,y,z); o.scale.set(sx,sy,sz);
  if (rx||ry||rz){ o.rotation.order = 'YXZ'; o.rotation.set(rx,ry,rz); }
  p.add(o); return o;
}
const box  = (p,w,h,d,c,x,y,z,k='plaster') => add(p,UBOX,M(c,k),x,y+h/2,z,w,h,d);
const cyl  = (p,r,h,c,x,y,z,n=12,k='plaster') => add(p,CYL(n),M(c,k),x,y+h/2,z,r,h,r);
const cone = (p,r,h,c,x,y,z,n=12,k='plaster') => add(p,CONE(n),M(c,k),x,y+h/2,z,r,h,r);
const onion= (p,r,c,x,y,z,k='plaster',hk=1) => add(p,ONION,M(c,k),x,y,z,r,r*hk,r);
const hemi = (p,r,c,x,y,z,k='plaster',hk=1) => add(p,HEMI,M(c,k),x,y,z,r,r*hk,r);
function plane(p,m,x,y,z,w,h,ry=0){ return add(p,UPLANE,m,x,y,z,w,h,1,ry); }
function colliderLocal(x,z,rot,lx1,lx2,lz1,lz2,h=40){
  const c = Math.cos(rot), s = Math.sin(rot);
  let a=Infinity,b=-Infinity,e=Infinity,f=-Infinity;
  for (const [lx,lz] of [[lx1,lz1],[lx2,lz1],[lx1,lz2],[lx2,lz2]]) { const wx = x + lx*c + lz*s, wz = z - lx*s + lz*c; a=Math.min(a,wx); b=Math.max(b,wx); e=Math.min(e,wz); f=Math.max(f,wz); }
  colliders.push({minX:a,maxX:b,minZ:e,maxZ:f,h});
}
function place(g,x,z,rot,y=0){ g.position.set(x,y,z); g.rotation.y = rot; staticRoot.add(g); return g; }

const decalMat = t => new THREE.MeshStandardMaterial({map:t, transparent:true, alphaTest:0.35, depthWrite:false, roughness:0.85, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2, envMapIntensity:0.5});
const M_ARCH = decalMat(archDecal), M_RECT = decalMat(rectDecal), M_FRIEZE = decalMat(friezeTex);
const M_JAALI = new THREE.MeshStandardMaterial({map:jaaliTex, roughness:0.85, envMapIntensity:0.5}); jaaliTex.repeat.set(4,1);
const M_SHOP = shopTex.map(t=>new THREE.MeshStandardMaterial({map:t, emissiveMap:t, emissive:lin('#FFC890'), emissiveIntensity:0.55, roughness:0.9}));
const M_GLASS = new THREE.MeshStandardMaterial({color:lin('#5E7680'), roughness:0.05, metalness:0.3, envMapIntensity:1.0});
const M_GLASS_SHOP = new THREE.MeshStandardMaterial({color:lin('#9FB4BA'), roughness:0.04, metalness:0.1, transparent:true, opacity:0.22, envMapIntensity:1.0, depthWrite:false});
const M_CAFE = cafeTex.map(t=>new THREE.MeshStandardMaterial({map:t, emissiveMap:t, emissive:lin('#FFD2A0'), emissiveIntensity:0.7, roughness:0.9}));
const M_WATER = new THREE.MeshStandardMaterial({color:lin('#2C5A62'), roughness:0.16, metalness:0.05, envMapIntensity:0.75});
const M_KUND = new THREE.MeshStandardMaterial({map:kundTex, roughness:0.9}); kundTex.repeat.set(3.5,1);
const M_PAINT = paintTex.map(t=>new THREE.MeshStandardMaterial({map:t, roughness:0.8}));
const M_LIGHT = new THREE.MeshStandardMaterial({color:lin('#FFE2A8'), emissive:lin('#FFC86E'), emissiveIntensity:2.2}); lampMat = M_LIGHT;
const M_WIN = new THREE.MeshStandardMaterial({color:lin('#3A2418'), emissive:lin('#FFB45E'), emissiveIntensity:0.6, roughness:0.6}); glowMats.push([M_WIN,0.7]);
const lampSpots = [];
const shopDoors = [];
const M_FAIRY = new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:0.2, vertexColors:false}); glowMats.push([M_FAIRY,0.9]);
const scooterSpots = [];
const KIND_NAMES = ['Textile shop','Bangle shop','Sweet shop','Jewellery shop','Jutti shop','Spice shop','Café'];
const kindFromName = n => /caf|tapri|coffee/i.test(n) ? 6 : /sweet|mishthan|LMB/i.test(n) ? 2 : /bangle/i.test(n) ? 1 : /jewel|gem/i.test(n) ? 3 : /jutti|mojari/i.test(n) ? 4 : /masal|spice/i.test(n) ? 5 : 0;
M_SHOP.forEach(m=>glowMats.push([m,1])); M_CAFE.forEach(m=>glowMats.push([m,1]));
function friezeStrip(p,w,h,x,y,z,ry=0){
  const g = new THREE.PlaneGeometry(w,h); const uv = g.attributes.uv; for (let i=0;i<uv.count;i++) uv.setX(i, uv.getX(i)*w/(h*4));
  const m = new THREE.Mesh(g,M_FRIEZE); m.position.set(x,y,z); m.rotation.y = ry; p.add(m); return m;
}
function sign(p, spec, x,y,z, w,h, ry=0){
  const o = new THREE.Object3D(); o.position.set(x,y,z); o.rotation.y = ry; p.add(o);
  signQueue.push({obj:o, spec:Object.assign({w,h},spec)});
}

/* =========================================================
   Palette
   ========================================================= */
const PINKS = ['#D9876E','#E0937A','#CF7A62','#E39E86','#D4806A','#DC8E72','#C9745E'];
const WHITE = '#F4E9DD', STONE = '#C6A383', SAND = '#D8A86C', CREAM = '#EEDCBC', DARK = '#26140F';
const CLOTH = ['#E8B33A','#2E8C87','#3B4B8C','#B83A6B','#D8342B','#F2C230','#5E8F3A','#E05A2B','#F2E9DF'];
const SHUTTER = ['#4F7D6A','#3E6D8C','#6E4A2E','#2E8C87','#5B4E8C'];

/* =========================================================
   Ground, roads, terrain
   ========================================================= */
const CX = 30, CZ = -10;
const LAKE = {x:30, z:-178, r:42};
const KUND = {x:-150, z:-10, s:30, step:1.3, rise:1.15, N:8};
const HILL = {x:-140, z:-150, r:68, h:36, top:10};
function hillH(x,z){ const d = Math.hypot(x-HILL.x, z-HILL.z); if (d >= HILL.r) return 0; if (d <= HILL.top) return HILL.h + 0.2; const t = (d-HILL.top)/(HILL.r-HILL.top); return HILL.h*(Math.cos(t*Math.PI)+1)/2; }
const ROAD = {th0:Math.atan2(32,60), turns:1.75, r0:HILL.r-3, r1:HILL.top+0.5, W:2.4};
function roadAt(x,z,pad){
  const dx = x-HILL.x, dz = z-HILL.z, r = Math.hypot(dx,dz), th = Math.atan2(dz,dx);
  let best = null, bd = Infinity;
  for (let k=-1;k<=3;k++){ const t = (th - ROAD.th0 + Math.PI*2*k)/(ROAD.turns*Math.PI*2); if (t < 0 || t > 1) continue;
    const rc = ROAD.r0 + (ROAD.r1-ROAD.r0)*t, d = Math.abs(r-rc); if (d < ROAD.W + pad && d < bd){ bd = d; best = hillH(HILL.x + Math.cos(th)*rc, HILL.z + Math.sin(th)*rc) + 0.14; } }
  return best;
}
function groundY(x,z){
  const hh = hillH(x,z); if (hh > 0){ const rd = roadAt(x,z,1.6); return rd !== null && Math.hypot(x-HILL.x,z-HILL.z) > HILL.top + 0.5 ? rd : hh; }
  const dx = Math.abs(x-KUND.x), dz = Math.abs(z-KUND.z), half = KUND.s/2;
  if (dx < half && dz < half){ const d = Math.max(dx,dz); const k = Math.min(KUND.N-1, Math.floor((half-d)/KUND.step)); return -k*KUND.rise; }
  return 0;
}
const camelSpots = [], jeepPath = [], officeDoors = [], lobbyDoors = [], cowSpots = [];
const MANTHHAN_SLOT = 2;
function vnoise(x,z){ const i=Math.floor(x), j=Math.floor(z), fx=x-i, fz=z-j; const h=(a,b)=>{ const s=Math.sin(a*127.1+b*311.7)*43758.5453; return s-Math.floor(s); };
  const u=fx*fx*(3-2*fx), v=fz*fz*(3-2*fz); return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v) + (h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v; }
const fbm = (x,z) => vnoise(x,z)*0.5 + vnoise(x*2.1,z*2.1)*0.25 + vnoise(x*4.3,z*4.3)*0.15 + vnoise(x*8.7,z*8.7)*0.1;
function terrainH(x,z){
  const dx = x-CX, dz = z-CZ, r = Math.hypot(dx*0.92, dz*(dz<0?0.85:1.0));
  if (r < 318) return -30;
  const t = Math.min(1, Math.max(0,(r-335)/170)); const s = t*t*(3-2*t);
  const north = dz < 0 ? 1.0 + Math.min(1,-dz/300)*0.6 : 0.75;
  return -0.4 + s*(55 + 110*fbm(x/90, z/90))*north + Math.max(0,(r-330))*0.02*fbm(x/25,z/25)*10;
}
{ // terrain ring
  const g = new THREE.PlaneGeometry(2200,2200,220,220); g.rotateX(-Math.PI/2);
  const pos = g.attributes.position, cols = new Float32Array(pos.count*3);
  const cSand = lin('#C9A27A'), cScrub = lin('#7F7E4D'), cRock = lin('#9C7556'), c = new THREE.Color();
  for (let i=0;i<pos.count;i++){
    const x = pos.getX(i)+CX, z = pos.getZ(i)+CZ, y = terrainH(x,z); pos.setY(i,y); pos.setX(i,x); pos.setZ(i,z);
    const k = Math.min(1, Math.max(0, y/45)), n = fbm(x/14,z/14);
    c.copy(cSand).lerp(cScrub, Math.min(1, k*1.4)*(0.6+0.4*n)); if (n > 0.62 && y > 20) c.lerp(cRock, 0.6);
    cols[i*3]=c.r; cols[i*3+1]=c.g; cols[i*3+2]=c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols,3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat('#FFFFFF','ground',{vertexColors:true})); m.userData.noCast = true; staticRoot.add(m);
}
{ // flat city ground with holes for the lake and the stepwell
  const s = new THREE.Shape(); s.absarc(CX, -CZ, 322, 0, Math.PI*2, false);
  const lh = new THREE.Path(); lh.absarc(LAKE.x, -LAKE.z, LAKE.r, 0, Math.PI*2, true); s.holes.push(lh);
  const kh = new THREE.Path(), h = KUND.s/2; kh.moveTo(KUND.x-h, -KUND.z-h); kh.lineTo(KUND.x-h, -KUND.z+h); kh.lineTo(KUND.x+h, -KUND.z+h); kh.lineTo(KUND.x+h, -KUND.z-h); kh.lineTo(KUND.x-h,-KUND.z-h); s.holes.push(kh);
  const g = new THREE.ShapeGeometry(s, 64); g.rotateX(-Math.PI/2);
  const m = new THREE.Mesh(g, mat('#D0AB82','ground')); m.userData.noCast = true; staticRoot.add(m);
}
function flat(m,x,z,w,d,y=0.02){ const o = new THREE.Mesh(UPLANE, m); o.rotation.x = -Math.PI/2; o.position.set(x,y,z); o.scale.set(w,d,1); o.userData.noCast = true; staticRoot.add(o); return o; }
const M_PAVE = mat('#C99F86','paving'), M_ASPH = mat('#77706A','asphalt',{roughness:0.95}), M_PAVE2 = mat('#D6BE98','paving'), M_LINE = mat('#E8E0D2','ground');
flat(M_PAVE, 0, 0, 192, 192, 0.03);                    // walled city paving
flat(M_ASPH, 0, 0, 188, 13, 0.06);                     // main E-W bazaar
flat(M_ASPH, 30, 0, 13, 188, 0.065);                   // N-S bazaar
flat(M_ASPH, 30, 0, 34, 34, 0.07);                     // Badi Chaupar
flat(M_ASPH, 30, -116, 13, 44, 0.06);                  // road to Jal Mahal
flat(M_ASPH, 30, 112, 13, 36, 0.06);                   // road to Albert Hall
flat(M_ASPH, -116, 0, 44, 11, 0.06);                   // road to the stepwell
flat(M_ASPH, 180, 0, 170, 17, 0.06);                   // MI Road / C-Scheme
flat(M_ASPH, 150, 15, 17, 190, 0.065);                 // cross road
flat(mat('#CDBBA4','paving'), 180, 0, 170, 26, 0.04);  // footpaths
flat(mat('#CDBBA4','paving'), 150, 15, 26, 190, 0.045);
for (let x=100; x<262; x+=8){ flat(M_LINE, x, 0, 3.4, 0.25, 0.09); }
for (let z=-75; z<108; z+=8){ if (Math.abs(z)>12) flat(M_LINE, 150, z, 0.25, 3.4, 0.09); }
