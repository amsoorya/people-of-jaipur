/* =========================================================
   Bake static meshes into a handful of draw calls
   ========================================================= */
staticRoot.updateMatrixWorld(true);
signQueue.forEach(s=>{ s.matrix = s.obj.matrixWorld.clone(); });
(function bake(){
  if (!THREE.BufferGeometryUtils) { staticRoot.traverse(o=>{ if (o.isMesh){ o.castShadow = !o.userData.noCast; o.receiveShadow = true; } }); return; }
  const buckets = new Map();
  staticRoot.traverse(o=>{
    if (!o.isMesh) return;
    const keepUV = !!o.material.map;
    let g = o.geometry.clone(); if (g.index) g = g.toNonIndexed();
    g.clearGroups();
    for (const k of Object.keys(g.attributes)) if (!(k==='position' || k==='normal' || (k==='color' && o.material.vertexColors) || (k==='uv' && keepUV))) g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld);
    if (o.matrixWorld.determinant() < 0){ const p = g.attributes.position; for (let i=0;i<p.count;i+=3){ for (const at of Object.values(g.attributes)){ const a = at.array, n = at.itemSize; for (let c=0;c<n;c++){ const t = a[(i+1)*n+c]; a[(i+1)*n+c] = a[(i+2)*n+c]; a[(i+2)*n+c] = t; } } } }
    const big = o.geometry.parameters && o.geometry.parameters.width > 600;
    const key = o.material.uuid + (o.userData.noCast ? 'n' : 'c');
    if (!buckets.has(key)) buckets.set(key,{m:o.material, cast:!o.userData.noCast, gs:[]});
    buckets.get(key).gs.push(g);
  });
  const merged = new THREE.Group(); let ok = true;
  for (const b of buckets.values()){
    for (let i=0;i<b.gs.length;i+=4000){
      const g = THREE.BufferGeometryUtils.mergeBufferGeometries(b.gs.slice(i,i+4000), false);
      if (!g) { ok = false; break; }
      const m = new THREE.Mesh(g, b.m); m.castShadow = b.cast && !b.m.transparent; m.receiveShadow = true; merged.add(m);
    }
    if (!ok) break;
  }
  if (ok){ scene.remove(staticRoot); scene.add(merged); }
  else { console.warn('bake failed'); staticRoot.traverse(o=>{ if (o.isMesh){ o.castShadow = !o.userData.noCast; o.receiveShadow = true; } }); }
})();

/* =========================================================
   People: smooth, vertex-coloured characters
   ========================================================= */
const V3 = (x,y,z)=>new THREE.Vector3(x,y,z);
function m4(x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){ return new THREE.Matrix4().compose(V3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)), V3(sx,sy,sz)); }
function cpart(geo,hex,mx){
  let g = geo.clone(); if (g.index) g = g.toNonIndexed();
  for (const k of Object.keys(g.attributes)) if (k!=='position' && k!=='normal') g.deleteAttribute(k);
  g.applyMatrix4(mx);
  const c = lin(hex), arr = new Float32Array(g.attributes.position.count*3);
  for (let i=0;i<arr.length;i+=3){ arr[i]=c.r; arr[i+1]=c.g; arr[i+2]=c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr,3)); return g;
}
const merge = parts => THREE.BufferGeometryUtils.mergeBufferGeometries(parts,false);
const PM = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.82, envMapIntensity:0.6});
const lathe = (pts,n=16) => new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])), n);
const S16 = new THREE.SphereGeometry(1,16,12), C12 = new THREE.CylinderGeometry(1,1,1,12), TOR = new THREE.TorusGeometry(1,0.32,8,20);
const PMS = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.78, envMapIntensity:0.6, skinning:true});
const BONE_DEF = [ // name, parent, world position in bind pose
  ['root',-1,[0,0,0]],['hips',0,[0,0.95,0]],['spine',1,[0,1.05,0]],['chest',2,[0,1.28,0]],['neck',3,[0,1.47,0]],['head',4,[0,1.55,0]],
  ['lSh',3,[-0.19,1.42,0]],['lEl',6,[-0.21,1.13,0]],['rSh',3,[0.19,1.42,0]],['rEl',8,[0.21,1.13,0]],
  ['lHip',1,[-0.09,0.93,0]],['lKnee',10,[-0.09,0.5,0]],['rHip',1,[0.09,0.93,0]],['rKnee',12,[0.09,0.5,0]],
];
const BI = {}; BONE_DEF.forEach((b,i)=>BI[b[0]] = i);
const S8 = new THREE.SphereGeometry(1,8,6), C7 = new THREE.CylinderGeometry(1,1,1,8);
function spart(geo,hex,mx,bone){
  const e = mx.elements, sc = Math.max(Math.hypot(e[0],e[1],e[2]), Math.hypot(e[8],e[9],e[10]));
  if (geo === S16 && sc < 0.06) geo = S8; if (geo === C12 && sc < 0.06) geo = C7;
  const g = cpart(geo,hex,mx), n = g.attributes.position.count, si = new Uint16Array(n*4), sw = new Float32Array(n*4), bi = BI[bone];
  for (let i=0;i<n;i++){ si[i*4] = bi; sw[i*4] = 1; }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si,4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw,4)); return g;
}
const HALFCAP = new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*0.52);
const ODHNI_DRAPE = new THREE.CylinderGeometry(0.14,0.26,0.8,16,1,true,Math.PI*0.45,Math.PI*1.1);
function makePerson(L, scale=1){
  const parts = [], sk = L.skin, top = L.top, bot = L.bottom, hc = L.headColor, hair = L.hair || (L.head==='hair' || L.head==='longhair' ? hc : '#1E1512');
  const style = L.style || (L.dress ? 'lehenga' : 'kurta');
  const w = L.build || 1;
  // torso
  if (style === 'shirt'){
    parts.push(spart(lathe([[0,0.9],[0.17,0.9],[0.175,1.0]]), bot, m4(0,0,0,w,1,0.78),'hips'));
    parts.push(spart(lathe([[0,0.98],[0.175,0.98],[0.19,1.14],[0.205,1.3],[0.2,1.39],[0.16,1.46],[0.06,1.5],[0,1.5]]), top, m4(0,0,0,w,1,0.74),'chest'));
  } else if (style === 'lehenga'){
    parts.push(spart(lathe([[0,0.03],[0.42,0.03],[0.37,0.3],[0.28,0.62],[0.17,0.94],[0,0.98]]), bot, m4(0,0,0,1,1,0.92),'hips'));
    parts.push(spart(lathe([[0,0.94],[0.15,0.94],[0.165,1.1],[0.19,1.28],[0.18,1.4],[0.14,1.46],[0.06,1.5],[0,1.5]]), top, m4(0,0,0,w,1,0.76),'chest'));
  } else {
    parts.push(spart(lathe([[0,0.56],[0.23,0.56],[0.2,0.72],[0.18,0.88],[0.175,0.99],[0,0.99]]), top, m4(0,0,0,w,1,0.8),'hips'));
    parts.push(spart(lathe([[0,0.98],[0.175,0.98],[0.19,1.14],[0.205,1.3],[0.2,1.39],[0.16,1.46],[0.06,1.5],[0,1.5]]), top, m4(0,0,0,w,1,0.74),'chest'));
  }
  for (const s of [-1,1]) parts.push(spart(S16, top, m4(s*0.18*w,1.4,0,0.075,0.07,0.075),'chest'));
  // neck and head
  parts.push(spart(C12, sk, m4(0,1.51,0,0.047,0.12,0.047),'neck'));
  parts.push(spart(S16, sk, m4(0,1.665,-0.005,0.098,0.118,0.108),'head'));
  parts.push(spart(S16, sk, m4(0,1.605,0.022,0.078,0.06,0.08),'head'));
  for (const s of [-1,1]){
    parts.push(spart(S16, sk, m4(s*0.098,1.66,-0.005,0.018,0.032,0.024),'head'));
    parts.push(spart(S16, '#F4F0EA', m4(s*0.037,1.682,0.094,0.019,0.012,0.009),'head'));
    parts.push(spart(S16, '#2A1A12', m4(s*0.037,1.682,0.101,0.0095,0.0095,0.005),'head'));
    parts.push(spart(UBOX, hair, m4(s*0.039,1.704,0.1,0.034,0.0075,0.007,0,0,s*-0.12),'head'));
  }
  parts.push(spart(S16, sk, m4(0,1.655,0.108,0.017,0.028,0.022),'head'));
  parts.push(spart(S16, '#8A4A40', m4(0,1.622,0.097,0.026,0.0065,0.008),'head'));
  if (L.moustache) parts.push(spart(S16, hair, m4(0,1.637,0.103,0.034,0.009,0.01),'head'));
  // hair / headwear
  if (L.head === 'turban'){
    for (let i=0;i<3;i++) parts.push(spart(TOR, hc, m4(0,1.7+i*0.034,-0.005,0.1-i*0.004,0.1-i*0.004,0.106-i*0.004,Math.PI/2),'head'));
    parts.push(spart(S16, hc, m4(0,1.775,-0.01,0.095,0.05,0.1),'head'));
    parts.push(spart(S16, hc, m4(0.03,1.74,0.09,0.035,0.045,0.02),'head'));
    parts.push(spart(UBOX, hc, m4(0.03,1.6,-0.112,0.05,0.2,0.014,0.18),'head'));
    parts.push(spart(HALFCAP, hair, m4(0,1.64,-0.012,0.1,0.06,0.105,Math.PI),'head'));
  } else if (L.head === 'odhni'){
    parts.push(spart(HALFCAP, hair, m4(0,1.675,-0.01,0.112,0.11,0.118),'head'));
    parts.push(spart(S16, hair, m4(0,1.66,-0.11,0.06,0.06,0.05),'head'));
    parts.push(spart(new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*0.6), hc, m4(0,1.66,-0.025,0.128,0.135,0.135,-0.32),'head'));
    parts.push(spart(ODHNI_DRAPE, hc, m4(0,1.28,-0.03,1,1,0.85),'chest'));
  } else {
    parts.push(spart(HALFCAP, hair, m4(0,1.675,-0.012,0.111,0.112,0.118),'head'));
    parts.push(spart(S16, hair, m4(0,1.715,0.06,0.075,0.03,0.05,0.4),'head'));
    if (L.head === 'longhair'){ parts.push(spart(UBOX, hair, m4(0,1.52,-0.085,0.2,0.34,0.05),'chest')); parts.push(spart(S16, hair, m4(0,1.64,-0.07,0.11,0.12,0.07),'head')); }
  }
  // arms
  const sleeve = style==='shirt' ? top : top, fore = style==='shirt' ? sk : top;
  for (const [s,sh,el] of [[-1,'lSh','lEl'],[1,'rSh','rEl']]){
    parts.push(spart(C12, sleeve, m4(s*0.195*w,1.28,0,0.052,0.29,0.05),sh));
    parts.push(spart(S16, sleeve, m4(s*0.205*w,1.13,0,0.048,0.045,0.048),el));
    parts.push(spart(C12, fore, m4(s*0.21*w,1.0,0,0.042,0.25,0.04),el));
    if (style!=='shirt') parts.push(spart(C12, sk, m4(s*0.21*w,0.885,0,0.034,0.03,0.032),el));
    parts.push(spart(S16, sk, m4(s*0.212*w,0.83,0.005,0.034,0.06,0.024),el));
  }
  // legs
  const legC = style==='lehenga' ? sk : (style==='shirt' ? bot : (L.bottom || '#F4EDE2'));
  for (const [s,hp,kn] of [[-1,'lHip','lKnee'],[1,'rHip','rKnee']]){
    parts.push(spart(C12, legC, m4(s*0.09,0.715,0,0.068,0.44,0.065),hp));
    parts.push(spart(C12, legC, m4(s*0.09,0.29,0,0.052,0.44,0.05),kn));
    parts.push(spart(S16, L.shoes || '#3A2418', m4(s*0.09,0.045,0.045,0.05,0.045,0.12),kn));
  }
  const geo = merge(parts);
  const bones = BONE_DEF.map(()=>new THREE.Bone());
  BONE_DEF.forEach(([n,p,wp],i)=>{ const pp = p<0 ? [0,0,0] : BONE_DEF[p][2]; bones[i].position.set(wp[0]-pp[0], wp[1]-pp[1], wp[2]-pp[2]); bones[i].name = n; if (p>=0) bones[p].add(bones[i]); });
  const mesh = new THREE.SkinnedMesh(geo, PMS); mesh.add(bones[0]); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const g = new THREE.Group(); g.add(mesh); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  g.scale.setScalar(scale * (L.height || 1));
  const b = {}; BONE_DEF.forEach(([n],i)=>b[n] = bones[i]);
  return {g, mesh, b, dress: style==='lehenga', lL:b.lHip, lR:b.rHip, aL:b.lSh, aR:b.rSh, ph:Math.random()*6};
}
function animatePerson(ch, walk, amt, tt){
  const b = ch.b, s = Math.sin(walk), legA = ch.dress ? 0.3 : 0.55;
  b.lHip.rotation.x = s*legA*amt; b.rHip.rotation.x = -s*legA*amt; b.lHip.rotation.z = 0; b.rHip.rotation.z = 0;
  b.lKnee.rotation.x = (0.08 + 0.7*Math.max(0, Math.sin(walk + 1.7)))*amt; b.rKnee.rotation.x = (0.08 + 0.7*Math.max(0, Math.sin(walk + 1.7 + Math.PI)))*amt;
  b.lSh.rotation.x = -s*0.42*amt; b.rSh.rotation.x = s*0.42*amt; b.lSh.rotation.z = -0.07; b.rSh.rotation.z = 0.07;
  b.lEl.rotation.x = -(0.12 + 0.3*Math.max(0, s))*amt - 0.08; b.rEl.rotation.x = -(0.12 + 0.3*Math.max(0, -s))*amt - 0.08;
  b.hips.position.y = 0.95 + Math.abs(Math.cos(walk))*0.022*amt; b.hips.rotation.y = s*0.07*amt; b.chest.rotation.y = -s*0.09*amt;
  const time = tt ?? performance.now()/1000;
  b.chest.rotation.x = Math.sin(time*1.7 + ch.ph)*0.018*(1-amt) + 0.04*amt;
  b.head.rotation.y = (1-amt)*Math.sin(time*0.35 + ch.ph)*0.25; b.head.rotation.x = -0.04*amt;
}
const M_SCREEN = new THREE.MeshStandardMaterial({color:new THREE.Color('#BFD6DE').convertSRGBToLinear(), transparent:true, opacity:0.18, roughness:0.05, metalness:0.1, depthWrite:false, side:THREE.DoubleSide});
/* Player */
const player = makePerson({top:'#F4EDE2',bottom:'#E8E0D0',head:'turban',headColor:'#EE9C14',skin:'#B07A57'});
scene.add(player.g);
const P = {pos:new THREE.Vector3(-25,0,3), rot:Math.PI, walk:0, y:0};

/* NPCs */
const npcs = [];
const fontReady = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise(r=>setTimeout(r,2500))]) : Promise.resolve();
function nameSprite(text){
  const [c,x] = cv(10,10); x.font = '600 44px Hind, system-ui, sans-serif';
  const W = Math.ceil(x.measureText(text).width + 64), H = 78; c.width = W; c.height = H;
  x.font = '600 44px Hind, system-ui, sans-serif';
  const r = 39; x.fillStyle = 'rgba(255,244,234,0.95)';
  x.beginPath(); x.moveTo(r,0); x.lineTo(W-r,0); x.arc(W-r,r,r,-Math.PI/2,Math.PI/2); x.lineTo(r,H); x.arc(r,r,r,Math.PI/2,Math.PI*1.5); x.fill();
  x.fillStyle = '#3B1E19'; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(text, W/2, H/2+3);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthWrite:false, toneMapped:false}));
  s.scale.set(W/H*0.5, 0.5, 1); return s;
}
const diamondGeo = new THREE.OctahedronGeometry(0.16);
PEOPLE.forEach(p=>{
  const ch = makePerson(p.look);
  ch.g.position.set(p.pos[0],0,p.pos[1]); ch.g.rotation.y = p.face; scene.add(ch.g);
  const marker = new THREE.Mesh(diamondGeo, new THREE.MeshBasicMaterial({color:'#FFB21E', toneMapped:false}));
  marker.position.set(p.pos[0],2.75,p.pos[1]); scene.add(marker);
  npcs.push({p, ch, marker, label:null, baseRot:p.face, rot:p.face, ph:rand()*6});
  circles.push({x:p.pos[0], z:p.pos[1], r:0.45});
});

/* Crowd walking the bazaars */
const CROWD_LOOKS = [
  {top:'#F4EDE2',bottom:'#F4EDE2',head:'turban',headColor:'#E8B33A',skin:'#8C5A3C',moustache:true,height:1.02},
  {style:'shirt',top:'#C9D6E2',bottom:'#3A3A40',head:'hair',headColor:'#1E1512',skin:'#B07A57',height:1.04},
  {top:'#B83A6B',bottom:'#E8B33A',dress:true,head:'odhni',headColor:'#E05A2B',skin:'#C98E6B',height:0.95},
  {top:'#F4EDE2',bottom:'#F4EDE2',head:'turban',headColor:'#D8342B',skin:'#9C6A4C',moustache:true},
  {style:'shirt',top:'#3E6D8C',bottom:'#2A2A33',head:'hair',headColor:'#1E1512',skin:'#B07A57'},
  {top:'#E05A2B',bottom:'#E05A2B',dress:true,head:'odhni',headColor:'#F2C230',skin:'#C98E6B'},
  {top:'#2E8C87',bottom:'#2E8C87',dress:true,head:'odhni',headColor:'#B83A6B',skin:'#9C6A4C'},
  {style:'shirt',top:'#FFFFFF',bottom:'#3A3A40',head:'hair',headColor:'#2A1B17',skin:'#D9A07E',height:1.05},
  {top:'#E8B33A',bottom:'#F4EDE2',head:'turban',headColor:'#E8B33A',skin:'#8C5A3C'},
  {top:'#B83A6B',bottom:'#B83A6B',dress:true,head:'hair',headColor:'#1E1512',skin:'#C98E6B'},
  {style:'shirt',top:'#7A8C5A',bottom:'#2E3140',head:'hair',headColor:'#1E1512',skin:'#9C6A4C',moustache:true},
];
const ROUTES = [[[-88,-8.4],[8,-8.4]],[[8,8.4],[-88,8.4]],[[22.4,-88],[22.4,-22]],[[37.6,22],[37.6,88]],[[22.4,22],[22.4,88]],[[52,-8.4],[88,-8.4]],[[88,8.4],[52,8.4]],[[100,-9.4],[240,-9.4]],[[240,9.4],[100,9.4]],[[-10,-132],[70,-132]],[[12,129],[48,129]],[[143.5,-60],[143.5,100]],[[166,121.5],[250,121.5]],[[-78,-110],[18,-110]]];
const walkers = [];
for (let i=0;i<(lowEnd?12:22);i++){
  const r = ROUTES[i%ROUTES.length], ch = makePerson(CROWD_LOOKS[i%CROWD_LOOKS.length], rr(0.93,1.05));
  const w = {ch, a:V3(r[0][0],0,r[0][1]), b:V3(r[1][0],0,r[1][1]), t:rand(), dir:rand()<0.5?1:-1, sp:rr(1.1,1.5), off:rr(-0.5,0.5), walk:rand()*6, pause:0, pos:V3()};
  w.len = w.a.distanceTo(w.b); scene.add(ch.g); walkers.push(w);
}
/* Auto-rickshaws */
function makeAuto(){
  const g = new THREE.Group();
  const parts = [
    cpart(UBOX,'#2F7A3E',m4(0,0.42,0,1.3,0.22,2.4)),                       // floor pan
    cpart(UBOX,'#2F7A3E',m4(0,0.85,0.95,0.9,0.9,0.5)),                     // front cowl
    cpart(S16,'#2F7A3E',m4(0,0.75,1.18,0.42,0.35,0.22)),
    cpart(UBOX,'#2F7A3E',m4(0,0.8,-1.12,1.3,0.75,0.16)),                   // low rear panel
    cpart(UBOX,'#F2C230',m4(0,1.2,-1.12,1.32,0.08,0.18)),
    cpart(UBOX,'#F2C230',m4(0,0.55,0,1.32,0.06,2.42)),                     // yellow stripe
    cpart(S16,'#1F1F22',m4(0,2.02,-0.15,0.72,0.16,1.12)),                  // canopy
    cpart(UBOX,'#1F1F22',m4(0,1.98,-0.15,1.4,0.06,2.15)),
    cpart(UBOX,'#1F1F22',m4(0,1.88,1.02,1.1,0.05,0.05)), cpart(UBOX,'#1F1F22',m4(-0.54,1.55,1.0,0.04,0.66,0.05,0.12)), cpart(UBOX,'#1F1F22',m4(0.54,1.55,1.0,0.04,0.66,0.05,0.12)),
    cpart(UBOX,'#6B4530',m4(0,0.82,0.3,0.55,0.12,0.5)),                    // driver seat
    cpart(UBOX,'#6B4530',m4(0,0.8,-0.65,1.2,0.14,0.62)),                   // rear bench
    cpart(UBOX,'#6B4530',m4(0,1.15,-0.95,1.2,0.6,0.1)),
    cpart(C12,'#2A2A2A',m4(0,1.18,0.7,0.022,0.8,0.022,0,0,Math.PI/2)),     // handlebar
    cpart(S16,'#FFF4C8',m4(0,0.95,1.22,0.09,0.09,0.04)),
  ];
  for (const [x,z] of [[-0.66,1.05],[0.66,1.05],[-0.66,-1.1],[0.66,-1.1]]) parts.push(cpart(C12,'#2F2F2F',m4(x,1.45,z,0.03,1.05,0.03)));
  for (const [x,z] of [[0,1.0],[-0.66,-0.85],[0.66,-0.85]]) parts.push(cpart(new THREE.CylinderGeometry(0.28,0.28,0.16,14),'#151515',m4(x,0.28,z,1,1,1,0,0,Math.PI/2)));
  const m = new THREE.Mesh(merge(parts), PM); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.04,0.64), M_SCREEN); ws.position.set(0,1.55,1.0); ws.rotation.x = -0.12; g.add(ws);
  scene.add(g); return g;
}
/* Traffic keeps left, as in India, and goes round Badi Chaupar's fountain instead of through it */
const RB = {x:30, z:0, r:11.5};
function ringHit(p, d){ // first point where the ray p + t*d meets the roundabout circle
  const fx = p[0]-RB.x, fz = p[1]-RB.z, b = fx*d[0] + fz*d[1], c = fx*fx + fz*fz - RB.r*RB.r, disc = b*b - c;
  const tt = -b - Math.sqrt(Math.max(0,disc)); return [p[0] + d[0]*tt, p[1] + d[1]*tt];
}
function makePath(pts){ const v = pts.map(p=>V3(p[0],0,p[1])), cum = [0]; for (let i=1;i<v.length;i++) cum.push(cum[i-1] + v[i].distanceTo(v[i-1])); return {pts:v, cum, len:cum[cum.length-1]}; }
function viaRoundabout(start, end){
  const d1 = [RB.x - start[0], RB.z - start[1]], n1 = Math.hypot(...d1); const dir1 = Math.abs(d1[0]) > Math.abs(d1[1]) ? [Math.sign(d1[0]),0] : [0,Math.sign(d1[1])];
  const d2 = [RB.x - end[0], RB.z - end[1]]; const dir2 = Math.abs(d2[0]) > Math.abs(d2[1]) ? [Math.sign(d2[0]),0] : [0,Math.sign(d2[1])];
  const inP = ringHit(start, dir1), outP = ringHit(end, dir2);
  let a0 = Math.atan2(inP[1]-RB.z, inP[0]-RB.x), a1 = Math.atan2(outP[1]-RB.z, outP[0]-RB.x); while (a1 <= a0) a1 += Math.PI*2;
  const arc = []; for (let a = a0 + 0.1; a < a1 - 0.05; a += 0.1) arc.push([RB.x + Math.cos(a)*RB.r, RB.z + Math.sin(a)*RB.r]);
  return makePath([start, inP, ...arc, outP, end]);
}
const LANES = [
  viaRoundabout([-86,-3.2],[86,-3.2]), viaRoundabout([86,3.2],[-86,3.2]),
  viaRoundabout([33.2,-86],[33.2,86]), viaRoundabout([26.8,86],[26.8,-86]),
  makePath([[104,-4],[238,-4]]), makePath([[238,4],[104,4]]),
];
const autos = [0,0,1,1,2,3,4,5].map((li,i)=>{ const path = LANES[li]; return {g:makeAuto(), path, s:(i%2 ? 0.55 : 0.1)*path.len + rand()*20, sp:rr(5.5,7), v:0}; });

/* Kites */
const kites = [];
{
  const ks = new THREE.Shape(); ks.moveTo(0,1); ks.lineTo(0.75,0); ks.lineTo(0,-1.1); ks.lineTo(-0.75,0); ks.lineTo(0,1);
  const kg = new THREE.ShapeGeometry(ks);
  for (let i=0;i<22;i++){
    const m = new THREE.Mesh(kg, new THREE.MeshStandardMaterial({color:lin(pick(['#EE9C14','#D8342B','#2E8C87','#B83A6B','#F2C230','#3B4B8C','#FFF6EE','#5E8F3A'])), side:THREE.DoubleSide, roughness:0.7, emissive:lin('#331a00'), emissiveIntensity:0.4}));
    const base = V3(rr(-100,220), rr(35,75), rr(-140,140));
    m.scale.setScalar(rr(1.1,1.8)); dynamicRoot.add(m);
    kites.push({m, base, ph:rand()*10, sp:rr(0.35,0.8)});
  }
}
/* Pigeons at Badi Chaupar and Albert Hall */
const pigeons = [];
{
  const pg = merge([cpart(S16,'#7D8590',m4(0,0.12,0,0.09,0.08,0.14)), cpart(S16,'#5E6672',m4(0,0.2,0.1,0.05,0.05,0.05)), cpart(UBOX,'#4A515C',m4(0,0.13,-0.14,0.08,0.02,0.1))]);
  const pm = new THREE.InstancedMesh(pg, PM, 80); pm.castShadow = true; scene.add(pm);
  for (let i=0;i<80;i++){ const c = i<45 ? [30,0,12] : [30,130,10]; const a = rand()*6.28, r = rr(c[2]*0.75,c[2]); pigeons.push({hx:c[0]+Math.cos(a)*r, hz:c[1]+Math.sin(a)*r, x:0,y:0,z:0, ry:rand()*6, fly:0, ph:rand()*6}); }
  pigeons.mesh = pm;
}

/* Rideable scooters at the stands */
function makeScooter(col){
  const g = new THREE.Group();
  const W1 = new THREE.CylinderGeometry(0.27,0.27,0.1,16);
  const parts = [
    cpart(W1,'#151515',m4(0,0.27,0.62,1,1,1,0,0,Math.PI/2)), cpart(W1,'#151515',m4(0,0.27,-0.6,1,1,1,0,0,Math.PI/2)),
    cpart(S16,col,m4(0,0.5,-0.3,0.2,0.24,0.5)), cpart(UBOX,'#1A1A1A',m4(0,0.78,-0.28,0.26,0.1,0.62)),
    cpart(UBOX,col,m4(0,0.3,0.12,0.3,0.08,0.7)), cpart(UBOX,col,m4(0,0.72,0.55,0.3,0.85,0.12,-0.25)),
    cpart(S16,col,m4(0,0.4,0.62,0.17,0.12,0.25)), cpart(C12,'#2A2A2A',m4(0,1.18,0.66,0.025,0.72,0.025,0,0,Math.PI/2)),
    cpart(S16,'#FFF4C8',m4(0,1.03,0.72,0.07,0.07,0.04)), cpart(UBOX,'#C0C0C0',m4(0,1.12,0.6,0.16,0.06,0.06)),
  ];
  const m = new THREE.Mesh(merge(parts), PM); m.castShadow = true; m.receiveShadow = true; g.add(m); scene.add(g); return g;
}
const SCOOTER_COLS = ['#1F3B6E','#B82B2B','#2A2A2A','#E8E2D6','#2E8C87','#E05A2B','#5E8F3A'];
const scooters = scooterSpots.map(([x,z,r],i)=>{ const g = makeScooter(SCOOTER_COLS[i%SCOOTER_COLS.length]); return {type:'scooter', g, pos:V3(x,0,z), heading:r, v:0, state:'parked', lean:0}; });
scooters.forEach(s=>{ s.g.position.copy(s.pos); s.g.rotation.y = s.heading; });

/* Camels you can ride */
function makeCamel(){
  const g = new THREE.Group(), C = '#C49A6C', C2 = '#B88A5A';
  const body = merge([
    cpart(S16,C,m4(0,1.85,0,0.52,0.5,1.1)), cpart(S16,C2,m4(0,2.32,-0.15,0.42,0.42,0.5)),
    cpart(UBOX,'#B83A6B',m4(0,2.62,-0.1,1.0,0.1,0.95)), cpart(UBOX,'#E8B33A',m4(0,2.57,-0.1,1.04,0.04,1.0)),
    cpart(C12,C,m4(0,2.35,1.15,0.14,0.9,0.16,0.75)), cpart(S16,C,m4(0,2.85,1.55,0.15,0.15,0.3)), cpart(S16,C2,m4(0,2.82,1.82,0.1,0.1,0.12)),
    cpart(S16,'#2A1A12',m4(0.09,2.92,1.62,0.025,0.025,0.025)), cpart(S16,'#2A1A12',m4(-0.09,2.92,1.62,0.025,0.025,0.025)),
    cpart(C12,'#D8342B',m4(0,2.2,1.0,0.17,0.05,0.17,0.75)), cpart(UBOX,C2,m4(0,1.75,-1.1,0.06,0.5,0.06,-0.3)),
  ]);
  const bm = new THREE.Mesh(body, PM); bm.castShadow = true; g.add(bm); g.userData.body = bm;
  const legGeo = merge([cpart(C12,C,m4(0,-0.42,0,0.09,0.84,0.09)), cpart(C12,C2,m4(0,-1.1,0,0.07,0.6,0.07)), cpart(S16,'#8A6A4A',m4(0,-1.42,0.03,0.11,0.05,0.14))]);
  const legs = [[-0.28,0.7],[0.28,0.7],[-0.28,-0.7],[0.28,-0.7]].map(([x,z])=>{ const l = new THREE.Mesh(legGeo, PM); l.position.set(x,1.45,z); l.castShadow = true; g.add(l); return l; });
  scene.add(g); return {g, legs, body:bm};
}
const camels = camelSpots.map(([x,z,r])=>{ const c = makeCamel(); return {type:'camel', g:c.g, legs:c.legs, body:c.body, pos:V3(x,0,z), home:V3(x,0,z), heading:r, v:0, state:'parked', walk:0, beh:'idle', bt:3+Math.random()*6, sit:0, legH:1.45, sitDrop:1.05, range:4, circle:null}; });
/* Cows that wander, lie down, get up, and move when someone honks */
function makeCow(col){
  const g = new THREE.Group(), C = col, D = '#2A1E16';
  const body = merge([cpart(S16,C,m4(0,1.05,0,0.48,0.44,0.95)), cpart(S16,C,m4(0,1.32,0.42,0.3,0.24,0.32)), cpart(UBOX,C,m4(0,1.2,-0.95,0.05,0.5,0.05,0.25)), cpart(S16,D,m4(0,0.92,-1.16,0.07,0.1,0.07))]);
  const bm = new THREE.Mesh(body, PM); bm.castShadow = true; g.add(bm);
  const headG = merge([cpart(S16,C,m4(0,0,0.22,0.22,0.25,0.36)), cpart(S16,'#E8C0B0',m4(0,-0.08,0.54,0.14,0.12,0.1)), cpart(CONE(6),'#8A6A4A',m4(-0.15,0.2,0.12,0.05,0.3,0.05,0,0,-0.4)), cpart(CONE(6),'#8A6A4A',m4(0.15,0.2,0.12,0.05,0.3,0.05,0,0,0.4)), cpart(S16,D,m4(-0.12,0.06,0.38,0.03,0.03,0.03)), cpart(S16,D,m4(0.12,0.06,0.38,0.03,0.03,0.03)), cpart(UBOX,'#E8B33A',m4(0,-0.18,0.05,0.24,0.06,0.2))]);
  const head = new THREE.Mesh(headG, PM); head.position.set(0,1.28,0.95); head.castShadow = true; g.add(head);
  const legGeo = merge([cpart(C12,C,m4(0,-0.4,0,0.075,0.8,0.075)), cpart(S16,D,m4(0,-0.82,0.02,0.08,0.05,0.1))]);
  const legs = [[-0.24,0.55],[0.24,0.55],[-0.24,-0.55],[0.24,-0.55]].map(([x,z])=>{ const l = new THREE.Mesh(legGeo, PM); l.position.set(x,0.85,z); l.castShadow = true; g.add(l); return l; });
  scene.add(g); return {g, legs, body:bm, head};
}
const COW_COLS = ['#F1ECE3','#E8E1D4','#8C7A6A','#D9CDB8'];
const cows = cowSpots.map(([x,z,r],i)=>{ const c = makeCow(COW_COLS[i%COW_COLS.length]); return {type:'cow', g:c.g, legs:c.legs, body:c.body, head:c.head, pos:V3(x,0,z), home:V3(x,0,z), heading:r||0, v:0, walk:0, beh: i%2 ? 'sitting' : 'idle', bt:4+Math.random()*8, sit: i%2 ? 1 : 0, legH:0.85, sitDrop:0.55, range:7, circle:null}; });
camels.forEach(c=>{ c.g.position.copy(c.pos); c.g.rotation.y = c.heading; });
/* The jeep that drives up to Sunset Point */
function makeJeep(){
  const g = new THREE.Group(), O = '#56653F', D = '#2A2A2A';
  const ARCH = new THREE.CylinderGeometry(1,1,1,16,1,true,-Math.PI/2,Math.PI); ARCH.rotateZ(Math.PI/2);
  const parts = [
    cpart(UBOX,O,m4(0,0.72,-0.15,1.5,0.5,3.3)),                 // tub
    cpart(UBOX,O,m4(0,0.98,1.15,1.42,0.36,1.15)),                // bonnet
    cpart(UBOX,D,m4(0,0.82,1.74,1.3,0.42,0.06)),                 // grille
    cpart(UBOX,'#3A3A3A',m4(0,0.5,1.86,1.7,0.16,0.16)),          // bumper
    cpart(UBOX,'#3A3A3A',m4(0,0.5,-1.84,1.6,0.14,0.14)),
    cpart(C12,D,m4(0,0.92,-1.86,0.36,0.22,0.36,Math.PI/2)),      // spare tyre
    cpart(UBOX,'#6B4530',m4(0,1.0,0.05,1.3,0.12,0.55)), cpart(UBOX,'#6B4530',m4(0,1.25,-0.2,1.3,0.5,0.1)),
    cpart(UBOX,'#6B4530',m4(0,1.0,-1.0,1.3,0.12,0.7)), cpart(UBOX,'#6B4530',m4(0,1.25,-1.32,1.3,0.5,0.1)),
    cpart(UBOX,D,m4(-0.74,1.62,-0.55,0.05,1.1,0.05)), cpart(UBOX,D,m4(0.74,1.62,-0.55,0.05,1.1,0.05)), cpart(UBOX,D,m4(0,2.15,-0.55,1.52,0.05,0.05)),
    cpart(UBOX,D,m4(-0.74,2.15,-1.1,0.05,0.05,1.1)), cpart(UBOX,D,m4(0.74,2.15,-1.1,0.05,0.05,1.1)),
    cpart(UBOX,D,m4(0,1.78,0.62,1.42,0.05,0.05)), cpart(UBOX,D,m4(-0.69,1.47,0.62,0.05,0.62,0.05)), cpart(UBOX,D,m4(0.69,1.47,0.62,0.05,0.62,0.05)),
    cpart(UBOX,'#3A3A3A',m4(-0.4,1.12,0.55,0.4,0.2,0.18)),       // dashboard
    cpart(C12,'#2A2A2A',m4(-0.4,1.25,0.35,0.025,0.32,0.025,0.6)),
    cpart(new THREE.TorusGeometry(0.17,0.025,8,20),D,m4(-0.4,1.42,0.28,1,1,1,0.6)),
    cpart(S16,'#FFF4C8',m4(-0.48,0.95,1.78,0.11,0.11,0.04)), cpart(S16,'#FFF4C8',m4(0.48,0.95,1.78,0.11,0.11,0.04)),
    cpart(UBOX,D,m4(-0.82,0.42,-0.1,0.12,0.06,1.2)), cpart(UBOX,D,m4(0.82,0.42,-0.1,0.12,0.06,1.2)),       // side steps
    cpart(UBOX,D,m4(-0.82,1.5,0.6,0.12,0.08,0.03)),
  ];
  for (const [x,z] of [[-0.78,1.15],[0.78,1.15],[-0.78,-1.15],[0.78,-1.15]]) parts.push(cpart(ARCH,O,m4(x,0.42,z,0.3,0.5,0.5)));
  const m = new THREE.Mesh(merge(parts), PM); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.32,0.58), M_SCREEN); ws.position.set(0,1.47,0.62); g.add(ws);
  const tyre = merge([cpart(new THREE.CylinderGeometry(0.4,0.4,0.3,20),'#161616',m4(0,0,0,1,1,1,0,0,Math.PI/2)), cpart(new THREE.CylinderGeometry(0.2,0.2,0.32,12),'#8A8F96',m4(0,0,0,1,1,1,0,0,Math.PI/2))]);
  const wheels = [[-0.8,1.15],[0.8,1.15],[-0.8,-1.15],[0.8,-1.15]].map(([x,z])=>{ const w = new THREE.Mesh(tyre, PM); w.position.set(x,0.4,z); w.castShadow = true; g.add(w); return w; });
  const driver = makePerson({style:'shirt',top:'#6E7A5A',bottom:'#3A3A30',head:'hair',headColor:'#1E1512',skin:'#9C6A4C',moustache:true});
  driver.g.position.set(-0.4,0.08,0.02); g.add(driver.g);
  scene.add(g); return {g, driver, wheels};
}
const jeepCurve = new THREE.CatmullRomCurve3(jeepPath.filter((p,i)=>i%3===0 || i===jeepPath.length-1).map(p=>V3(p[0],0,p[2])));
const jeep = (()=>{ const j = makeJeep(); return {type:'jeep', g:j.g, driver:j.driver, wheels:j.wheels, spin:0, u:0, dir:0, pos:V3(), heading:0, state:'parked', len:jeepCurve.getLength()}; })();
