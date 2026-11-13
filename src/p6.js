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
  const ch = {g, mesh, b, dress: style==='lehenga', lL:b.lHip, lR:b.rHip, aL:b.lSh, aR:b.rSh, ph:Math.random()*6};
  Rig.attach(ch, L);   // swaps in an animated 3D model when it has loaded; the simple body stays as a fallback
  return ch;
}
function animatePerson(ch, walk, amt, tt){
  if (ch.rig){ ch.rig.sit = false; ch.rig.want = amt > 1.1 ? 'Run' : amt > 0.5 ? 'Walk' : 'Idle'; }
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
/* =========================================================
   Animated 3D people (Quaternius, CC0). Each character gets its own copy of a model
   with its own animation mixer; outfits are applied as colours on the model's materials.
   ========================================================= */
const Rig = (()=>{
  // People of Bengaluru's own character files (Quaternius CC0 characters, each with its own animations)
  const MALE = ['pm','developer','investor','rockstar','maker','worker_m'], MALE_ALL = [...MALE, 'swat_m', 'moonshot'];
  const FEMALE = ['creative','founder','designer','formal_f','adventurer_f','worker_f'], FEMALE_ALL = [...FEMALE, 'hero'];
  const OLD = {m_Casual_2:'pm', m_Casual_Hoodie:'developer', m_Suit:'investor', m_Punk:'rockstar', m_Adventurer:'maker', m_Worker:'worker_m', m_Swat:'swat_m', m_Spacesuit:'moonshot',
    f_Casual:'creative', f_Suit:'founder', f_Punk:'designer', f_Formal:'formal_f', f_Adventurer:'adventurer_f', f_Worker:'worker_f', f_SciFi:'hero'};
  const ok = !!(THREE.GLTFLoader && THREE.SkeletonUtils);
  const loader = ok ? new THREE.GLTFLoader() : null, cache = {}, live = [];
  if (loader && window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const loadClips = () => Promise.resolve([]);   // animations come inside each character file
  const hashS = s => { let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const SKIN = /^Skin/, HAIR = /^Hair/, FIXED = /^(Eye|Eyebrows|Moustache|Gold|Earrings|Metal|Tie)/;
  function model(name){
    // retry a couple of times: on a weak connection a download can drop, and a failed load leaves a blank body
    const tryLoad = (url, ok, fail, n = 0) => loader.load(url, ok, undefined, e => n < 3 ? setTimeout(()=>tryLoad(url, ok, fail, n + 1), 800 * (n + 1)) : fail(e));
    if (!cache[name]) cache[name] = new Promise(res=>tryLoad(`models/people/bng/${name}.glb`, g=>{
      const root = g.scene; root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root), h = (box.max.y - box.min.y) || 1, y0 = box.min.y;
      // which material is the shirt, which is the trousers: by where its vertices sit on the body
      const stats = {};
      root.traverse(o=>{ if (!o.isMesh || !o.geometry.attributes.position) return; const nm = o.material.name || ''; if (SKIN.test(nm) || HAIR.test(nm) || FIXED.test(nm)) return;
        const pos = o.geometry.attributes.position, v = new THREE.Vector3(), st = stats[nm] = stats[nm] || {top:0, bot:0};
        for (let k=0;k<pos.count;k+=3){ v.fromBufferAttribute(pos,k).applyMatrix4(o.matrixWorld); const r = (v.y - y0)/h; if (r > 0.5 && r < 0.8) st.top++; else if (r > 0.15 && r <= 0.5) st.bot++; } });
      const by = key => Object.entries(stats).sort((a,b)=>b[1][key]-a[1][key])[0];
      const tp = by('top'), bt = by('bot');
      const clips = g.animations.map(c=>{ const k = c.clone(); k.name = c.name.replace(/^.*\|/, ''); return k; });   // 'CharacterArmature|Walk' -> 'Walk'
      // real height comes from the skeleton (bind-pose mesh bounds ignore the armature's own scale): feet to head bone is ~88% of standing height
      let blo = Infinity, bhi = -Infinity; const bv = new THREE.Vector3(); root.traverse(o=>{ if (o.isBone){ o.getWorldPosition(bv); blo = Math.min(blo, bv.y); bhi = Math.max(bhi, bv.y); } });
      const boneH = isFinite(bhi) && bhi > blo ? (bhi - blo) / 0.88 : h;
      res({root, clips, scale: 1.72 / boneH, top: tp && tp[0], bottom: bt && bt[0] !== (tp && tp[0]) ? bt[0] : null});
    }, ()=>res(null)));
    return cache[name];
  }
  function attach(ch, L){
    if (!ok || L.noRig) return;
    const want0 = OLD[L.model] || L.model;
    const female = FEMALE_ALL.includes(want0) || (!MALE_ALL.includes(want0) && (L.dress || L.style === 'lehenga' || L.head === 'longhair' || L.head === 'odhni'));
    const pool = female ? FEMALE : MALE;
    const hv = hashS(JSON.stringify([L.top, L.bottom, L.skin, L.headColor, L.head]));
    const KURTA = ['pm','developer','rockstar'], SHIRT = ['pm','investor','worker_m','developer','maker'], NOHAT = KURTA;   // turbans never go on top of a hat
    const name = ((MALE_ALL.includes(want0) || FEMALE_ALL.includes(want0)) && want0) || (L.style === 'lehenga' ? 'formal_f' : female ? pool[hv % pool.length] : L.head === 'turban' ? NOHAT[hv % NOHAT.length] : L.style === 'shirt' ? SHIRT[hv % SHIRT.length] : KURTA[hv % KURTA.length]);
    ch.rig = ch.rig || {want:'Idle', sit:false, pending:true};
    const body = ch.g;   // if this character is rebuilt before the model arrives, the late model must not attach to the new body
    Promise.all([model(name), loadClips()]).then(([m])=>{ const cl = m && m.clips;
      if (!m || !cl || !ch.g || ch.g !== body || ch.rig.inst) return;
      const inst = THREE.SkeletonUtils.clone(m.root); inst.scale.setScalar(m.scale);
      const turban = false, odhni = false;   // characters are used exactly as designed, like People of Bengaluru: no added turbans
      const tint = (mat, c) => { if (c) mat.color.set(c).convertSRGBToLinear(); };
      inst.traverse(o=>{
        if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const nm = o.material.name || ''; o.material = o.material.clone(); o.material.roughness = 0.8; o.material.metalness = 0;
        // every outfit keeps its own designed colours, skin and hair
      });
      ch.g.add(inst); ch.mesh.visible = false;
      const bones = {}; inst.traverse(o=>{ if (o.isBone) bones[o.name] = o; });
      // a turban replaces whatever the outfit wears on top of the head (hair, hard hats, caps): hide any part that sits wholly above the neck
      if (turban || odhni){ inst.updateMatrixWorld(true); const all = new THREE.Box3().setFromObject(inst), hgt = all.max.y - all.min.y, neckY = all.min.y + hgt * 0.84;
        inst.traverse(o=>{ if (!o.isMesh || SKIN.test(o.material.name || '') || /^(Eye|Eyebrows)/.test(o.material.name || '')) return; const bb = new THREE.Box3().setFromObject(o); if (bb.min.y > neckY) o.visible = false; }); }
      if ((turban || odhni) && bones.Head){
        // size the turban in world units, whatever the bone's own scale is
        ch.g.updateMatrixWorld(true); const ws = new THREE.Vector3(); bones.Head.getWorldScale(ws); const gs = new THREE.Vector3(); ch.g.getWorldScale(gs); const k = gs.x / ws.x;
        const mat = new THREE.MeshStandardMaterial({color:new THREE.Color(L.headColor || '#E8B33A').convertSRGBToLinear(), roughness:0.85});
        let t;
        if (turban){ t = new THREE.Group();   // wrapped cloth: stacked, slightly tilted bands with a rounded top
          const dome = new THREE.Mesh(new THREE.SphereGeometry(0.118, 24, 14, 0, Math.PI*2, 0, Math.PI*0.5), mat); dome.position.y = 0.03; t.add(dome);
          [[0.0, 0.122, 0.12], [0.035, 0.118, -0.16], [0.068, 0.106, 0.2]].forEach(([y, r, tilt])=>{ const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.034, 10, 28), mat); band.rotation.x = Math.PI/2 + tilt; band.position.y = y; t.add(band); });
          t.traverse(o=>{ if (o.isMesh) o.castShadow = true; }); t.scale.setScalar(k * 0.86); }
        else { t = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14, 0, Math.PI*2, 0, Math.PI*0.6), mat); t.scale.set(k, k*1.05, k*1.05); }
        // sit it on the crown: measure where the top of the head is in the bone's space
        const top = new THREE.Box3(); inst.traverse(o=>{ if (o.isMesh && SKIN.test(o.material.name || '')) top.expandByObject(o); }); const hp = new THREE.Vector3(); bones.Head.getWorldPosition(hp);
        const crown = isFinite(top.max.y) ? (top.max.y - hp.y) / gs.y : 0.22; t.position.set(0, k*Math.max(0.12, crown - (turban ? 0.075 : 0.05)), k*0.015); t.castShadow = true; bones.Head.add(t);
      }
      const mixer = new THREE.AnimationMixer(inst), acts = {};
      for (const c of cl) acts[c.name] = mixer.clipAction(c);
      const rig = ch.rig = Object.assign(ch.rig || {}, {inst, mixer, acts, bones, cur:null, pending:false});
      rig.want = rig.want || 'Idle';
      if (acts.Idle) { acts.Idle.time = Math.random() * acts.Idle.getClip().duration; }
      live.push(ch);
    });
  }
  const SIT_HIP = -1.45, SIT_KNEE = 1.5;
  const IDLE = r => r.acts.Idle ? 'Idle' : 'Idle_Neutral';
  function play(r, name, fade){
    if (name === 'Idle') name = IDLE(r);
    if (r.cur === name || !r.acts[name]) return;
    const next = r.acts[name].reset().fadeIn(fade).play();
    if (r.cur && r.acts[r.cur]) r.acts[r.cur].fadeOut(fade);
    r.cur = name;
  }
  // seated pose: bend hips and knees, rest the hands (the packs have no sitting animation)
  function sitPose(r){
    const b = r.bones, bone = n => b[n] || b[n.replace('.', '')];   // the loader strips dots from bone names
    for (const sd of ['L','R']){ const ul = bone('UpperLeg.'+sd), ll = bone('LowerLeg.'+sd); if (ul) ul.rotation.x += SIT_HIP; if (ll) ll.rotation.x += SIT_KNEE; }
  }
  function update(dt){
    for (const ch of live){ const r = ch.rig; if (!r || !r.mixer) continue;
      r.inst.position.y = r.sit ? -0.14 : 0;   // seated people sit a little lower on the seat
      if (r.sit){ play(r, 'Idle', 0.25); r.mixer.update(dt); sitPose(r); continue; }
      // match the walk/run cycle to how fast the character really moves, so feet don't skate
      const wp = ch.g.getWorldPosition(r.wp || (r.wp = new THREE.Vector3())), last = r.last || (r.last = wp.clone());
      const sp = dt > 0 ? Math.min(12, wp.distanceTo(last) / dt) : 0; last.copy(wp); r.speed = (r.speed || 0) + (sp - (r.speed || 0)) * Math.min(1, dt * 8);
      let want = r.want || 'Idle'; if (want === 'Walk' && r.speed > 3.6) want = 'Run'; if ((want === 'Walk' || want === 'Run') && r.speed < 0.25 && !ch.isPlayer) want = 'Idle';
      play(r, want, 0.2);
      const ts = want === 'Walk' ? THREE.MathUtils.clamp(r.speed / 1.45, 0.6, 1.5) : want === 'Run' ? THREE.MathUtils.clamp(r.speed / 4.6, 0.7, 1.4) : 1;
      if (r.acts[want]) r.acts[want].timeScale = ts; r.mixer.update(dt); }
  }
  return {attach, update, setSit(ch, v){ if (ch.rig) ch.rig.sit = v; }, wave(ch){ if (ch.rig && ch.rig.acts && ch.rig.acts.Wave && !ch.rig.sit){ ch.rig.want = 'Wave'; } }};
})();
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
/* Smooth shapes for vehicles and animals */
const S24 = new THREE.SphereGeometry(1, 24, 16), C20 = new THREE.CylinderGeometry(1, 1, 1, 20);
function RBOX(w, h, d, r){   // a box with rounded edges
  const key = [w,h,d,r].join(','); RBOX.c = RBOX.c || {}; if (RBOX.c[key]) return RBOX.c[key];
  const x = w/2 - r, y = h/2 - r, sh = new THREE.Shape();
  sh.moveTo(-x, -h/2); sh.lineTo(x, -h/2); sh.quadraticCurveTo(w/2, -h/2, w/2, -y); sh.lineTo(w/2, y); sh.quadraticCurveTo(w/2, h/2, x, h/2);
  sh.lineTo(-x, h/2); sh.quadraticCurveTo(-w/2, h/2, -w/2, y); sh.lineTo(-w/2, -y); sh.quadraticCurveTo(-w/2, -h/2, -x, -h/2);
  const g = new THREE.ExtrudeGeometry(sh, {depth: Math.max(0.001, d - 2*r), bevelEnabled:true, bevelThickness:r, bevelSize:r*0.6, bevelSegments:3, curveSegments:6});
  g.translate(0, 0, -(d - 2*r)/2); g.computeVertexNormals(); return RBOX.c[key] = g;
}
const HALFCYL = new THREE.CylinderGeometry(1, 1, 1, 22, 1, true, -Math.PI/2, Math.PI);
const TYRE = new THREE.TorusGeometry(0.22, 0.085, 10, 22), HUB = new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16);
function wheel(parts, x, y, z, rotY = 0){
  parts.push(cpart(TYRE, '#151515', m4(x, y, z, 1, 1, 1, 0, Math.PI/2 + rotY, 0)));
  parts.push(cpart(HUB, '#C9CCD2', m4(x, y, z, 1, 1, 1, 0, 0, Math.PI/2)));
  parts.push(cpart(HUB, '#2A2A2E', m4(x, y, z, 0.55, 1.15, 0.55, 0, 0, Math.PI/2)));
}
/* Swap a hand-built object for a detailed model once it loads (falls back to the hand-built one) */
const Swap = (()=>{
  const ok = !!THREE.GLTFLoader, loader = ok ? new THREE.GLTFLoader() : null, cache = {};
  const load = url => cache[url] || (cache[url] = new Promise(res=>loader.load(url, g=>res(g.scene), undefined, ()=>res(null))));
  function apply(g, url, o){
    if (!ok) return;
    load(url).then(root=>{ if (!root) return;
      const inst = root.clone(true), pivot = new THREE.Group(); pivot.add(inst);
      let b = new THREE.Box3().setFromObject(inst); const sz = b.getSize(new THREE.Vector3());
      if (sz.x > sz.z) inst.rotation.y = Math.PI/2;                 // long side along z
      inst.rotation.y += o.yaw || 0; inst.updateMatrixWorld(true);
      b = new THREE.Box3().setFromObject(inst); const s2 = b.getSize(new THREE.Vector3());
      const k = o.height ? o.height / s2.y : o.length / s2.z; inst.scale.multiplyScalar(k); inst.updateMatrixWorld(true);
      b = new THREE.Box3().setFromObject(inst); const c = b.getCenter(new THREE.Vector3());
      inst.position.x -= c.x; inst.position.z -= c.z + (o.dz || 0); inst.position.y -= b.min.y;
      inst.traverse(m=>{ if (m.isMesh){ m.castShadow = true; m.receiveShadow = true; if (m.material){ m.material = m.material.clone(); m.material.metalness = Math.min(m.material.metalness, 0.3); if (o.blackBody && m.material.map) blackLower(m); if (/^glass$|windscreen|windshield/i.test(m.material.name || '')){ m.material.transparent = true; m.material.opacity = 0.22; m.material.depthWrite = false; m.castShadow = false; } } } });   // see-through windscreens
      (o.hide || []).forEach(h=>h.visible = false); (o.parent || g).add(pivot); if (o.done) o.done(pivot);
    });
  }
  // Jaipur autos are black below and yellow above: turn the yellow paint below the waist black
  function blackLower(m){
    m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, cut = bb.min.y + 0.5 * (bb.max.y - bb.min.y);
    m.material.onBeforeCompile = sh => {
      sh.uniforms.uCut = {value: cut};
      sh.vertexShader = 'varying float vLy;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLy = position.y;');
      sh.fragmentShader = 'uniform float uCut; varying float vLy;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 c = diffuseColor.rgb; float yel = step(0.3, c.r) * step(0.55 * c.r, c.g) * step(c.b, 0.55 * c.g) * step(0.12, c.r - c.b);
          if (vLy < uCut) diffuseColor.rgb = mix(c, vec3(0.03, 0.03, 0.035), yel); }`);
    };
    m.material.customProgramCacheKey = () => 'blackLower' + cut.toFixed(3);
  }
  return {apply};
})();
/* A Jaipur auto-rickshaw: green and yellow body, black canvas roof */
const AUTO_YAW = 0, CAMEL_YAW = Math.PI, COW_YAW = 0; let autoCount = 0;
function makeAuto(){
  const g = new THREE.Group(), GRN = '#2C7A3F', YEL = '#F2C230', BLK = '#1C1C1F', CHR = '#D9DCE0', SEAT = '#6E2A26';
  const parts = [
    cpart(RBOX(1.32, 0.42, 2.36, 0.12), GRN, m4(0, 0.58, -0.02)),                 // lower body
    cpart(RBOX(1.34, 0.09, 2.38, 0.04), YEL, m4(0, 0.82, -0.02)),                 // yellow waist band
    cpart(RBOX(0.98, 1.0, 0.5, 0.2), GRN, m4(0, 0.98, 0.96)),                     // front cowl
    cpart(S24, GRN, m4(0, 0.78, 1.16, 0.5, 0.36, 0.22)),                          // nose
    cpart(RBOX(0.3, 0.1, 0.46, 0.04), BLK, m4(0, 0.47, 1.1)),                     // front mudguard
    cpart(RBOX(1.32, 0.62, 0.12, 0.05), GRN, m4(0, 0.98, -1.15)),                 // rear panel
    cpart(RBOX(1.0, 0.18, 0.06, 0.03), YEL, m4(0, 1.06, -1.22)),                  // rear stripe
    cpart(HALFCYL, BLK, m4(0, 1.82, -0.12, 0.72, 2.16, 0.3, Math.PI/2, 0, 0)),    // rounded canvas roof
    cpart(RBOX(1.46, 0.06, 2.2, 0.03), BLK, m4(0, 1.82, -0.12)),                  // roof rim
    cpart(RBOX(1.36, 0.62, 0.06, 0.03), BLK, m4(0, 1.52, -1.16)),                 // rear canvas
    cpart(RBOX(0.6, 0.2, 0.02, 0.02), '#8FA9B3', m4(0, 1.6, -1.2)),               // little rear window
    cpart(RBOX(0.58, 0.14, 0.52, 0.06), SEAT, m4(0, 0.86, 0.3)),                  // driver seat
    cpart(RBOX(1.18, 0.16, 0.6, 0.07), SEAT, m4(0, 0.84, -0.66)),                 // passenger bench
    cpart(RBOX(1.18, 0.56, 0.12, 0.06), SEAT, m4(0, 1.16, -0.96)),                // backrest
    cpart(C20, '#2A2A2A', m4(0, 1.2, 0.72, 0.024, 0.82, 0.024, 0, 0, Math.PI/2)), // handlebar
    cpart(C20, BLK, m4(-0.41, 1.2, 0.72, 0.04, 0.12, 0.04, 0, 0, Math.PI/2)), cpart(C20, BLK, m4(0.41, 1.2, 0.72, 0.04, 0.12, 0.04, 0, 0, Math.PI/2)),
    cpart(C20, CHR, m4(0, 1.0, 1.24, 0.11, 0.06, 0.11, Math.PI/2, 0, 0)),         // headlight
    cpart(S24, '#FFF6D6', m4(0, 1.0, 1.27, 0.085, 0.085, 0.03)),
    cpart(C20, '#F2EFE6', m4(0, 0.6, 1.27, 0.18, 0.1, 0.02, Math.PI/2, 0, 0)),    // number plate
    cpart(RBOX(0.12, 0.08, 0.04, 0.015), '#D8342B', m4(-0.5, 0.95, -1.22)), cpart(RBOX(0.12, 0.08, 0.04, 0.015), '#D8342B', m4(0.5, 0.95, -1.22)), // tail lights
    cpart(RBOX(0.4, 0.14, 0.03, 0.02), '#F2EFE6', m4(0, 0.7, -1.23)),            // rear plate
  ];
  // windscreen frame, roof poles and grab rails
  for (const x of [-0.52, 0.52]) parts.push(cpart(C20, BLK, m4(x, 1.52, 1.0, 0.028, 0.62, 0.028, 0.14, 0, 0)));
  parts.push(cpart(C20, BLK, m4(0, 1.84, 1.04, 0.028, 1.06, 0.028, 0, 0, Math.PI/2)));
  for (const [x, z] of [[-0.66, 0.45], [0.66, 0.45], [-0.66, -1.1], [0.66, -1.1]]) parts.push(cpart(C20, CHR, m4(x, 1.32, z, 0.022, 1.0, 0.022)));
  for (const x of [-0.67, 0.67]) parts.push(cpart(C20, CHR, m4(x, 1.12, -0.35, 0.018, 1.5, 0.018, Math.PI/2, 0, 0)));
  // mirrors
  for (const sx of [-1, 1]){ parts.push(cpart(C20, BLK, m4(sx*0.56, 1.42, 0.98, 0.012, 0.22, 0.012, 0, 0, sx*0.9))); parts.push(cpart(S24, CHR, m4(sx*0.66, 1.5, 0.98, 0.07, 0.05, 0.02))); }
  // wheels and the spare on the back
  wheel(parts, 0, 0.3, 1.02); wheel(parts, -0.62, 0.3, -0.82); wheel(parts, 0.62, 0.3, -0.82);
  for (const sx of [-1, 1]) parts.push(cpart(RBOX(0.2, 0.08, 0.6, 0.04), BLK, m4(sx*0.62, 0.6, -0.82)));
  parts.push(cpart(TYRE, '#151515', m4(0, 1.0, -1.3, 1.05, 1.05, 1.05))); parts.push(cpart(HUB, '#C9CCD2', m4(0, 1.0, -1.3, 1, 1, 1, Math.PI/2, 0, 0)));
  const m = new THREE.Mesh(merge(parts), PM); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), M_SCREEN); ws.position.set(0, 1.52, 1.0); ws.rotation.x = -0.14; g.add(ws);
  // most autos are the Indian auto ("Auto Rickshaw" by rSquare, CC BY 4.0); every fourth is a tuk-tuk for variety
  const tuk = (autoCount++ % 4) === 3; g.userData.tuk = tuk;
  Swap.apply(g, tuk ? 'models/vehicles/tuktuk.glb' : 'models/vehicles/auto.glb', {length: tuk ? 2.9 : 2.7, yaw: AUTO_YAW, hide: [m, ws], blackBody: !tuk});
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
/* Animated pigeons ("Pigeon" by hino, CC BY 4.0): peck and idle on the ground, take off and flap when someone comes near */
const PigeonRig = (()=>{
  const ok = !!(THREE.GLTFLoader && THREE.SkeletonUtils); let ready = false; const birds = [];
  if (ok) new THREE.GLTFLoader().load('models/animals/Pigeon.glb', g=>{
    const root = g.scene; root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root), len = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) || 1;
    const k = 0.7 / len, clips = {};   // a touch larger than life so they read on screen g.animations.forEach(c=>clips[c.name] = c);
    pigeons.forEach((p, i)=>{
      const inst = THREE.SkeletonUtils.clone(root); inst.scale.setScalar(k); inst.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.frustumCulled = false; } });
      const holder = new THREE.Group(); holder.add(inst); scene.add(holder);
      const mixer = new THREE.AnimationMixer(inst), acts = {}; for (const n in clips) acts[n] = mixer.clipAction(clips[n]);
      const names = Object.keys(acts), idle = ['idle1','idle2','idle3'].filter(n=>acts[n])[i % 3] || names[0]; if (!idle) return;
      acts[idle].play(); acts[idle].time = Math.random() * acts[idle].getClip().duration;
      birds.push({p, holder, mixer, acts, cur: idle, idle});
    });
    pigeons.mesh.visible = false; ready = true;
  });
  function play(bd, n){ if (bd.cur === n || !bd.acts[n]) return; bd.acts[n].reset().fadeIn(0.15).play(); bd.acts[bd.cur].fadeOut(0.15); bd.cur = n; }
  function update(dt, t){
    if (!ready) return;
    for (const bd of birds){ const p = bd.p; bd.holder.position.set(p.x, p.y, p.z); bd.holder.rotation.y = p.ry;
      if (p.fly > 0) play(bd, p.y > 0.4 ? 'pigeon_fly_loop' : 'goToFly'); else { const want = (Math.sin(t * 0.3 + p.ph) > 0.6) ? ['idle1','idle2','idle3'][(Math.floor(t * 0.3 + p.ph)) % 3] : bd.idle; play(bd, want); }
      bd.mixer.update(dt); }
  }
  return {update};
})();

/* Roads: alternating black-and-yellow kerbs along both edges and a dashed white centre line, with gaps where roads meet */
(function kerbs(){
  const inRoad = (x, z, self, pad = 0.2) => ROADS.some(r => r !== self && Math.abs(x - r.x) < r.w/2 + pad && Math.abs(z - r.z) < r.d/2 + pad);
  const K = [], L = [], SEG = 1.6;
  for (const r of ROADS){
    if (r.w > 30 && r.d > 30) continue;   // Badi Chaupar square: the roundabout has its own edge
    const alongX = r.w >= r.d, len = alongX ? r.w : r.d, half = (alongX ? r.d : r.w) / 2;
    for (let u = -len/2 + SEG/2, i = 0; u < len/2; u += SEG, i++){
      for (const side of [-1, 1]){ const x = alongX ? r.x + u : r.x + side * (half + 0.12), z = alongX ? r.z + side * (half + 0.12) : r.z + u;
        if (!inRoad(x, z, r, 0.4)) K.push({x, z, alongX, yellow: i % 2 === 0}); }
      const cx = alongX ? r.x + u : r.x, cz = alongX ? r.z : r.z + u;
      if (i % 2 === 0 && half > 4 && !inRoad(cx, cz, r, 1.5)) L.push({x: cx, z: cz, alongX});
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const make = (list, color, sx, sy, sz, y, cast) => { if (!list.length) return; const im = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.75}), list.length);
    list.forEach((k, i)=>{ q.setFromAxisAngle(up, k.alongX ? 0 : Math.PI/2); m.compose(new THREE.Vector3(k.x, y, k.z), q, new THREE.Vector3(sx, sy, sz)); im.setMatrixAt(i, m); }); im.castShadow = cast; im.receiveShadow = true; scene.add(im); };
  make(K.filter(k=>k.yellow), '#E8B528', SEG, 0.2, 0.3, 0.1, true);
  make(K.filter(k=>!k.yellow), '#1C1C1E', SEG, 0.2, 0.3, 0.1, true);
  make(L, '#ECE8DE', 2.4, 0.02, 0.16, 0.085, false);
})();

/* Nature MegaKit trees, one instanced mesh per tree shape so hundreds of trees cost a handful of draw calls */
(function plantTrees(){
  const fallback = () => { const g = new THREE.Group(); scene.add(g); TREE_SPOTS.forEach(t=>{ if (t.type !== 'scrub') treeSimple(t.x, t.z, t.type, t.s, g); }); g.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } }); };
  if (!THREE.GLTFLoader){ fallback(); return; }
  // what each Jaipur tree becomes, and how tall (metres) at scale 1
  const KIND = {neem:[['CommonTree_1','CommonTree_2','CommonTree_3','CommonTree_4','CommonTree_5'], 7.5], peepal:[['CommonTree_2','CommonTree_4'], 10], ashoka:[['Pine_2'], 8], bougainvillea:[['Bush_Common_Flowers'], 3.2], scrub:[['Bush_Common'], 1.3]};
  new THREE.GLTFLoader().load('models/nature/trees.glb', g=>{
    const shapes = {}; g.scene.updateMatrixWorld(true);
    g.scene.children.forEach(n=>{ const parts = []; n.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(n), inv = new THREE.Matrix4().copy(n.matrixWorld).invert();
      n.traverse(o=>{ if (o.isMesh){ const geo = o.geometry.clone(); geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); parts.push({geo, mat:o.material}); } });
      // stand every shape on the ground at its own centre (some sit off-origin in the file, which made bushes float)
      const bb = new THREE.Box3(); parts.forEach(p=>{ p.geo.computeBoundingBox(); bb.union(p.geo.boundingBox); }); const c = bb.getCenter(new THREE.Vector3());
      parts.forEach(p=>p.geo.translate(-c.x, -bb.min.y, -c.z));
      shapes[n.name] = {parts, h: (bb.max.y - bb.min.y) || 1, list: []}; });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0,1,0), sc = new THREE.Vector3();
    TREE_SPOTS.forEach(t=>{ const [names, H] = KIND[t.type] || KIND.neem, nm = names[Math.floor(t.pick * names.length)], sh = shapes[nm]; if (!sh) return;
      const k = H * t.s / sh.h; q.setFromAxisAngle(up, t.rot); sc.setScalar(k); const sink = /Bush/.test(nm) ? H * t.s * 0.18 : 0;   // bushes have no trunk: settle their lower leaves into the soil
      sh.list.push(new THREE.Matrix4().compose(new THREE.Vector3(t.x, (t.y || 0) - sink, t.z), q, sc)); });
    for (const nm in shapes){ const sh = shapes[nm]; if (!sh.list.length) continue;
      for (const p of sh.parts){ const im = new THREE.InstancedMesh(p.geo, p.mat, sh.list.length); sh.list.forEach((mx, i)=>im.setMatrixAt(i, mx)); im.castShadow = nm !== 'Bush_Common'; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); } }
  }, undefined, fallback);
})();

/* Office furniture (Kenney Furniture Kit, CC0): each piece centred on its footprint, standing on the floor, at real size */
const OfficeKit = (()=>{
  const K = 1.95, pieces = {}; let ready = false;
  if (THREE.GLTFLoader) new THREE.GLTFLoader().load('models/office.glb', g=>{
    g.scene.children.slice().forEach(n=>{ n.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(n), c = b.getCenter(new THREE.Vector3());
      const holder = new THREE.Group(); n.position.sub(new THREE.Vector3(c.x, b.min.y, c.z)); holder.add(n); holder.scale.setScalar(K);
      holder.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } }); pieces[n.name] = holder; });
    ready = true;
  });
  // place a copy of a piece in a room: x, z on the floor, turned by rot, optionally raised (y) and resized (s)
  function put(sc, name, x, z, rot = 0, y = 0, s = 1){ const p = pieces[name]; if (!p) return null; const c = p.clone(); c.position.set(x, y, z); c.rotation.y = rot; if (s !== 1) c.scale.multiplyScalar(s); sc.add(c); return c; }
  function size(name){ const p = pieces[name]; return p ? new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3()) : null; }
  return {get ready(){ return ready; }, put, size};
})();

/* Rideable scooters at the stands */
let scooterCount = 0;
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
  const m = new THREE.Mesh(merge(parts), PM); m.castShadow = true; m.receiveShadow = true; g.add(m);
  // "Scooter Motorcycle" by NORBERTO-3D and, every third one, "Cyberpunk Scooter" by Berk Gedik (both CC BY 4.0)
  const cyber = (scooterCount++ % 3) === 2;
  Swap.apply(g, cyber ? 'models/vehicles/scooter2.glb' : 'models/vehicles/scooter.glb', cyber ? {height: 1.2, hide: [m]} : {length: 1.85, hide: [m]});   // the standing e-scooter is sized by height (handlebar ~1.2 m)
  scene.add(g); return g;
}
const SCOOTER_COLS = ['#1F3B6E','#B82B2B','#2A2A2A','#E8E2D6','#2E8C87','#E05A2B','#5E8F3A'];
const scooters = scooterSpots.map(([x,z,r],i)=>{ const g = makeScooter(SCOOTER_COLS[i%SCOOTER_COLS.length]); return {type:'scooter', g, pos:V3(x,0,z), heading:r, v:0, state:'parked', lean:0}; });
scooters.forEach(s=>{ s.g.position.copy(s.pos); s.g.rotation.y = s.heading; });

/* Camels you can ride */
function makeCamel(){
  const g = new THREE.Group(), C = '#C79B68', C2 = '#B4844F', C3 = '#9C7044';
  // neck: a smooth curve from the chest up to the head
  const neckCurve = new THREE.CatmullRomCurve3([V3(0, 2.05, 0.85), V3(0, 2.2, 1.25), V3(0, 2.62, 1.48), V3(0, 2.9, 1.52)]);
  const neck = new THREE.TubeGeometry(neckCurve, 16, 0.15, 12, false);
  const body = merge([
    cpart(S24, C, m4(0, 1.9, 0, 0.5, 0.48, 1.05)),                    // barrel
    cpart(S24, C2, m4(0, 2.28, -0.12, 0.4, 0.42, 0.52)),              // hump
    cpart(S24, C, m4(0, 1.92, 0.78, 0.36, 0.38, 0.36)),               // chest
    cpart(S24, C, m4(0, 1.88, -0.9, 0.42, 0.42, 0.36)),               // rump
    cpart(neck, C, m4(0, 0, 0)),
    cpart(S24, C, m4(0, 2.95, 1.62, 0.15, 0.15, 0.24)),               // head
    cpart(S24, C2, m4(0, 2.9, 1.86, 0.1, 0.1, 0.14)),                 // muzzle
    cpart(S24, '#2A1A12', m4(0.11, 3.0, 1.66, 0.025, 0.025, 0.025)), cpart(S24, '#2A1A12', m4(-0.11, 3.0, 1.66, 0.025, 0.025, 0.025)),
    cpart(CONE(8), C2, m4(0.09, 3.1, 1.5, 0.035, 0.09, 0.035, -0.3)), cpart(CONE(8), C2, m4(-0.09, 3.1, 1.5, 0.035, 0.09, 0.035, -0.3)),
    // saddle: a red and gold Rajasthani blanket with tassels
    cpart(RBOX(1.02, 0.08, 1.0, 0.04), '#B83A6B', m4(0, 2.66, -0.1)), cpart(RBOX(1.06, 0.04, 1.04, 0.02), '#E8B33A', m4(0, 2.61, -0.1)),
    cpart(RBOX(0.5, 0.2, 0.62, 0.08), '#7A2E2A', m4(0, 2.78, -0.1)),
    cpart(C20, '#D8342B', m4(0, 2.12, 0.98, 0.18, 0.05, 0.18, 0.75)),   // neck band
    cpart(C20, C3, m4(0, 1.78, -1.18, 0.035, 0.55, 0.035, -0.3)), cpart(S24, '#4A3424', m4(0, 1.52, -1.27, 0.05, 0.1, 0.05)), // tail
  ]);
  const tass = []; for (const x of [-0.45, -0.15, 0.15, 0.45]) for (const sx of [-1, 1]) tass.push(cpart(S24, ['#E8B33A','#2E8C87','#D8342B','#F4EDE2'][Math.abs(Math.round(x*10))%4], m4(sx*0.53, 2.5, x*1.1 - 0.1, 0.035, 0.07, 0.035)));
  const bm = new THREE.Mesh(merge([body, ...tass]), PM); bm.castShadow = true; g.add(bm); g.userData.body = bm;
  // legs: thigh, knobbly knee, slim shin and a wide pad of a foot
  const legGeo = merge([
    cpart(new THREE.CylinderGeometry(0.17, 0.085, 1.2, 14), C, m4(0, -0.22, 0)),   // thick thigh that runs up into the body
    cpart(S24, C2, m4(0, -0.82, 0, 0.095, 0.1, 0.095)),
    cpart(new THREE.CylinderGeometry(0.065, 0.055, 0.56, 12), C2, m4(0, -1.1, 0)),
    cpart(S24, C3, m4(0, -1.41, 0.03, 0.12, 0.05, 0.15)),
  ]);
  const legs = [[-0.27, 0.7], [0.27, 0.7], [-0.27, -0.72], [0.27, -0.72]].map(([x, z])=>{ const l = new THREE.Mesh(legGeo, PM); l.position.set(x, 1.45, z); l.castShadow = true; g.add(l); return l; });
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
/* Animated cows and bulls (Quaternius, CC0) replace the simple ones once they load */
const AnimalRig = (()=>{
  const ok = !!(THREE.GLTFLoader && THREE.SkeletonUtils), loader = ok ? new THREE.GLTFLoader() : null, cache = {}, live = [];
  // measure height from the skeleton (the mesh's own bounds ignore the armature's scale)
  const load = n => cache[n] || (cache[n] = new Promise(res=>loader.load(`models/animals/${n}.glb`, g=>{ const r = g.scene; r.updateMatrixWorld(true); let lo = Infinity, hi = -Infinity; const v = new THREE.Vector3();
    r.traverse(o=>{ if (o.isBone){ o.getWorldPosition(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } }); if (!isFinite(hi)){ const b = new THREE.Box3().setFromObject(r); lo = b.min.y; hi = b.max.y; }
    res({root:r, clips:g.animations, h:(hi - Math.min(lo, 0))||1}); }, undefined, ()=>res(null))));
  function attach(a, name, height, tint){
    if (!ok) return;
    load(name).then(m=>{ if (!m) return;
      const inst = THREE.SkeletonUtils.clone(m.root); inst.scale.setScalar(height / m.h);
      inst.traverse(o=>{ if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); o.material.roughness = 0.85; if (tint && /^Main$/.test(o.material.name)) o.material.color.set(tint).convertSRGBToLinear(); });
      // some files hold several animals side by side (each with its own skeleton): show one, centred
      const skel = []; inst.traverse(o=>{ if (o.isSkinnedMesh && !skel.includes(o.skeleton.bones[0])) skel.push(o.skeleton.bones[0]); });
      if (skel.length > 1){ const keep = skel[(a.home ? Math.abs(Math.round(a.home.x * 7 + a.home.z * 3)) : 0) % skel.length];
        inst.traverse(o=>{ if (o.isSkinnedMesh && o.skeleton.bones[0] !== keep) o.visible = false; });
        inst.updateMatrixWorld(true); const c = new THREE.Vector3(), v = new THREE.Vector3(); let n = 0; inst.traverse(o=>{ if (o.isSkinnedMesh && o.visible) o.skeleton.bones.forEach(bn=>{ bn.getWorldPosition(v); c.add(v); n++; }); });
        if (n){ c.divideScalar(n); inst.position.x -= c.x; inst.position.z -= c.z; } }   // inst isn't parented yet, so these are already its parent's coordinates
      a.g.add(inst); a.body.visible = false; a.legs.forEach(l=>l.visible = false); if (a.head) a.head.visible = false;
      const mixer = new THREE.AnimationMixer(inst), acts = {}; for (const c of m.clips) acts[c.name] = mixer.clipAction(c);
      a.rig = {inst, mixer, acts, cur:null, h:height}; live.push(a);
    });
  }
  function play(r, n){ if (!r.acts[n]){ const only = Object.keys(r.acts); if (only.length === 1){ const a0 = r.acts[only[0]]; if (!a0.isRunning()) a0.play(); a0.timeScale = n === 'Walk' || n === 'Gallop' ? 1 : 0; r.cur = n; } return; }
    if (r.cur === n) return; r.acts[n].reset().fadeIn(0.3).play(); if (r.cur && r.acts[r.cur]) r.acts[r.cur].fadeOut(0.3); r.cur = n; }
  function update(dt){ for (const a of live){ const r = a.rig;
    // speed from how far the animal actually moved this frame, so legs always match the ground
    const p = a.g.position, last = r.last || (r.last = p.clone()), sp = dt > 0 ? Math.min(15, p.distanceTo(last) / dt) : 0; last.copy(p);
    r.speed = (r.speed || 0) + (sp - (r.speed || 0)) * Math.min(1, dt * 6);
    const sit = (a.sit || 0) > 0.5, run = r.speed > 2.6 && r.acts.Gallop, walk = r.speed > 0.15;
    const want = run ? 'Gallop' : walk ? 'Walk' : sit || ((a.bt|0) % 3 === 0) ? 'Eating' : 'Idle';
    play(r, want);
    if (r.acts[want]) r.acts[want].timeScale = want === 'Walk' ? THREE.MathUtils.clamp(r.speed / 1.1, 0.5, 1.8) : want === 'Gallop' ? THREE.MathUtils.clamp(r.speed / 5, 0.7, 1.6) : 1;
    r.mixer.update(dt); } }
  return {attach, update};
})();
// every other cow is the detailed resting cow ("Cow" by Asheraf, CC BY 4.0); it stays put since it has no walking animation
// every cow is animated: Brahman zebus ("Brahman Cow" by kunyong_Chen, CC BY 4.0) and Quaternius cows and bulls
cows.forEach((c, i)=>AnimalRig.attach(c, i % 3 === 2 ? 'Bull' : 'Cow', i % 3 === 2 ? 1.55 : 1.45, null));   // fully animated only: walk, graze, idle, gallop
camels.forEach(c=>{ c.g.position.copy(c.pos); c.g.rotation.y = c.heading; });
/* Rigged camel ("Bactrian Camel (Low Poly)" by Nyilonelycompany, CC BY-NC-SA 4.0). The model only has an idle
   animation, so the walk is made here: camels pace, moving both legs on one side together. */
const CamelRig = (()=>{
  const ok = !!(THREE.GLTFLoader && THREE.SkeletonUtils), live = []; let srcP = null;
  const src = () => srcP || (srcP = new Promise(res=>new THREE.GLTFLoader().load('models/animals/CamelRig.glb', g=>res(g), undefined, ()=>res(null))));
  function attach(a){
    if (!ok) return;
    src().then(g=>{ if (!g) return; try {
      const inst = THREE.SkeletonUtils.clone(g.scene), bones = {}; inst.traverse(o=>{ if (o.isBone) bones[o.name] = o; if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      const find = re => Object.values(bones).find(o=>re.test(o.name));
      inst.updateMatrixWorld(true); const v = new THREE.Vector3(); let lo = Infinity, hi = -Infinity; Object.values(bones).forEach(o=>{ o.getWorldPosition(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); });
      const rp = find(/^Root/).getWorldPosition(new THREE.Vector3()), hp = find(/^Head/).getWorldPosition(new THREE.Vector3());
      const pivot = new THREE.Group(); inst.scale.setScalar(2.9 / (hi - lo)); inst.rotation.y = -Math.atan2(hp.x - rp.x, hp.z - rp.z); pivot.add(inst); a.g.add(pivot);
      a.body.visible = false; a.legs.forEach(l=>l.visible = false);
      // legs: [upper, lower, side (+1 left, -1 right), front?]
      const legs = [['Shoulder_L','Elbow_L',1,1],['Shoulder_R','Elbow_R',-1,1],['Hip_L','Knee_L',1,0],['Hip_R','Knee_R',-1,0]].map(([u,l,s,f])=>({u:find(new RegExp('^'+u)), l:find(new RegExp('^'+l)), s, f})).filter(x=>x.u && x.l);
      const neck = [/^Neck_M/, /^Neck2_M/, /^Head_M/].map(find).filter(Boolean);
      const ctl = [...legs.flatMap(x=>[x.u, x.l]), ...neck]; const rest = ctl.map(b=>b.quaternion.clone());
      const mixer = new THREE.AnimationMixer(inst); if (g.animations[0]){ const act = mixer.clipAction(g.animations[0]); act.play(); act.time = Math.random() * g.animations[0].duration; }
      a.rig = {inst, pivot, mixer, legs, neck, ctl, rest, amt:0}; live.push(a);
    } catch(e){ console.warn('camel rig', e); } });
  }
  function update(dt, t){
    for (const a of live){ const r = a.rig, gp = a.g.position, lp = r.last || (r.last = gp.clone()), sp = dt > 0 ? Math.min(15, gp.distanceTo(lp) / dt) : 0; lp.copy(gp);
      r.speed = (r.speed || 0) + (sp - (r.speed || 0)) * Math.min(1, dt * 6); if (r.speed > 0.15) r.w = (r.w || 0) + dt * r.speed * 2.2; a.walk = r.w || 0;
      const moving = r.speed > 0.15 || Math.abs(a.v || 0) > 0.05, sit = 0;   // no kneeling: this skeleton folds the wrong way, so resting camels stand
      r.ctl.forEach((b,i)=>b.quaternion.copy(r.rest[i])); r.mixer.update(dt);
      r.amt += ((moving ? 1 : 0) - r.amt) * Math.min(1, dt * 4); const w = a.walk || 0, A = r.amt;
      for (const L of r.legs){ const ph = w + (L.s > 0 ? 0 : Math.PI), sw = Math.sin(ph);
        L.u.rotation.z += L.s * (0.42 * sw * A - sit * (L.f ? 1.35 : 1.1));
        L.l.rotation.z += L.s * (L.f ? 1 : -1) * (0.5 * Math.max(0, Math.cos(ph)) * A + sit * (L.f ? 2.1 : 1.9)); }
      r.neck.forEach((b,i)=>{ b.rotation.z += (Math.sin(w * 2) * 0.05 * A) + (1 - A) * Math.sin(t * 0.4 + a.home.x + i) * 0.04; });
      r.pivot.position.y = -sit * 1.05 + Math.abs(Math.sin(w)) * 0.05 * A; r.pivot.rotation.z = Math.sin(w) * 0.025 * A; }
  }
  return {attach, update};
})();
camels.forEach(c=>CamelRig.attach(c));
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
  Swap.apply(g, 'models/vehicles/jeep.glb', {length: 3.9, hide: [g.children.find(c=>c.isMesh && c.geometry && c.geometry.attributes.color), ...wheels].filter(Boolean)});   // "Jeep 1" by Kapi777, CC BY-NC 4.0
  scene.add(g); return {g, driver, wheels};
}
const jeepCurve = new THREE.CatmullRomCurve3(jeepPath.filter((p,i)=>i%3===0 || i===jeepPath.length-1).map(p=>V3(p[0],0,p[2])));
const jeep = (()=>{ const j = makeJeep(); return {type:'jeep', g:j.g, driver:j.driver, wheels:j.wheels, spin:0, u:0, dir:0, pos:V3(), heading:0, state:'parked', len:jeepCurve.getLength()}; })();
