(function(){
'use strict';
/* =========================================================
   PEOPLE — replace these sample profiles with real people
   ========================================================= */
const PEOPLE = [];   // the city only shows real, signed-in people

/* Real Jaipur places (layout is stylised, not to scale) */
const PLACES = [
  {name:'Hawa Mahal', x:-25, z:-4, r:26, fact:'The Palace of Winds, built in 1799 so royal women could watch street life unseen through its hundreds of small windows.'},
  {name:'Wind View Café', x:-10, z:14, r:9, fact:'Rooftop café directly across the road from Hawa Mahal.'},
  {name:'Tattoo Café & Lounge', x:-38, z:14, r:9, fact:'Another rooftop facing Hawa Mahal. Go at golden hour.'},
  {name:'Badi Chaupar', x:30, z:0, r:18, fact:'The big square where the old city’s main bazaars meet.'},
  {name:'Johari Bazaar', x:30, z:50, r:30, fact:'The jewellers’ market, and home of LMB’s famous sweets.'},
  {name:'Jantar Mantar', x:-14, z:-56, r:28, fact:'An 18th-century observatory. Its Samrat Yantra is one of the largest stone sundials in the world.'},
  {name:'City Palace', x:-68, z:-58, r:28, fact:'Chandra Mahal rises seven storeys and is still home to Jaipur’s royal family.'},
  {name:'Jal Mahal', x:30, z:-175, r:52, fact:'A palace in the middle of Man Sagar Lake. Most of its floors sit under the water.'},
  {name:'Albert Hall Museum', x:30, z:158, r:40, fact:'Rajasthan’s oldest museum, built in the Indo-Saracenic style in Ram Niwas Garden.'},
  {name:'Anokhi Café', x:122, z:-16, r:12, fact:'Farm-fresh food beside the Anokhi block-print store in C-Scheme.'},
  {name:'Curious Life Coffee Roasters', x:186, z:-16, r:12, fact:'Jaipur’s specialty coffee roasters, a favourite C-Scheme hangout.'},
  {name:'Tapri Central', x:133, z:60, r:14, fact:'Kulhad chai on a rooftop overlooking Central Park.'},
  {name:'Central Park', x:205, z:65, r:42, fact:'The city’s big green lung, with one of India’s tallest flag masts.'},
  {name:'Patrika Gate', x:246, z:0, r:24, fact:'A gateway where every wall and ceiling is painted in a different Rajasthani style.'},
  {name:'Sunset Point', x:-140, z:-150, r:24, fact:'Take the spiral road, a scooter or the jeep up for a view over the whole Pink City.'},
  {name:'Jagatpura Tech Park', x:207, z:132, r:40, fact:'Two towers of offices. IT companies can take a floor and post open roles.'},
  {name:'Panna Meena ka Kund', x:-150, z:-10, r:26, fact:'A 17th-century stepwell near Amer, famous for its criss-cross stairs.'},
];

/* =========================================================
   Renderer, scene, sky
   ========================================================= */
const canvas = document.getElementById('scene');
const isCoarse = matchMedia('(pointer: coarse)').matches;
const lowEnd = isCoarse || (navigator.hardwareConcurrency||8) <= 4;
/* 3D model downloads: phones get the lighter .lite versions; every download is tracked so the
   loading screen can wait for the whole city before it opens. */
const LITE = new Set(['models/vehicles/auto.glb','models/vehicles/tuktuk.glb','models/animals/Camel.glb','models/animals/CowStatic.glb','models/animals/CamelRig.glb','models/vehicles/scooter.glb','models/vehicles/scooter2.glb','models/nature/trees.glb']);
const modelUrl = u => (isCoarse && LITE.has(u)) ? u.replace(/\.glb$/, '.lite.glb') : u;
const ModelLoad = {started:0, done:0, bytes:{}};
if (THREE.GLTFLoader){
  const load0 = THREE.GLTFLoader.prototype.load;
  THREE.GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError){
    const u = modelUrl(url); ModelLoad.started++; let fin = false; const finish = () => { if (!fin){ fin = true; ModelLoad.done++; const b = ModelLoad.bytes[u]; if (b) b.loaded = b.total; } };
    return load0.call(this, u, g => { finish(); onLoad && onLoad(g); }, e => { if (e && e.total) ModelLoad.bytes[u] = {loaded:e.loaded, total:e.total}; onProgress && onProgress(e); }, e => { finish(); onError && onError(e); });
  };
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance', logarithmicDepthBuffer:true});   // precise depth so layered clothes (suit over shirt) never flicker
renderer.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xE6BFA2, 220, 1100);
scene.background = new THREE.Color();
const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.15, 2400);

const TIMES = {
  day:  {sun:[-0.62,0.30,0.72], turb:7, ray:2.4, mie:0.006, light:'#FFC997', li:2.6, hs:'#FFE3C8', hg:'#9C6A50', hi:0.35, exp:0.95, fog:'#E6BFA2', fogN:220, fogF:1100, glow:0.55, lamp:2.2, bloom:0.12},
  night:{sun:[-0.5,-0.22,0.6], light:'#9DB4E8', li:0.55, lightDir:[0.35,0.55,-0.45], turb:2, ray:0.6, mie:0.003, hs:'#3A4870', hg:'#1C1410', hi:0.5, exp:1.15, fog:'#1A2236', fogN:140, fogF:820, glow:3.2, lamp:9, bloom:0.95, mono:0.17},
  dusk: {sun:[-0.80,0.045,0.60], turb:9, ray:3.2, mie:0.012, light:'#FF8C55', li:1.25, hs:'#C9A6C2', hg:'#5E3E3A', hi:0.55, exp:0.9, fog:'#C79387', fogN:160, fogF:900, glow:1.6, lamp:6, bloom:0.55},
};
let timeMode = 'dusk';
const sunDir = new THREE.Vector3();
let sky = null; const envs = {};
const pmrem = new THREE.PMREMGenerator(renderer);
if (THREE.Sky){ sky = new THREE.Sky(); sky.scale.setScalar(1800); sky.material.depthWrite = false; scene.add(sky); }
function skyUniforms(u,T){ u.turbidity.value = T.turb; u.rayleigh.value = T.ray; u.mieCoefficient.value = T.mie; u.mieDirectionalG.value = 0.86; u.sunPosition.value.set(...T.sun).normalize().multiplyScalar(1000); }
function envFor(mode){
  if (envs[mode] || !THREE.Sky) return envs[mode];
  const T = TIMES[mode], es = new THREE.Scene(), s2 = new THREE.Sky(); s2.scale.setScalar(1000); skyUniforms(s2.material.uniforms, T); es.add(s2);
  const gr = new THREE.Mesh(new THREE.CircleGeometry(900,32), new THREE.MeshBasicMaterial({color:new THREE.Color(T.hg).convertSRGBToLinear()})); gr.rotation.x = -Math.PI/2; gr.position.y = -5; es.add(gr);
  return (envs[mode] = pmrem.fromScene(es, 0.04).texture);
}
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.35); scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
sunLight.castShadow = true;
const SM = lowEnd ? 2048 : 4096;
sunLight.shadow.mapSize.set(SM,SM);
Object.assign(sunLight.shadow.camera, {left:-80,right:80,top:80,bottom:-80,near:1,far:600});
sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.04;
scene.add(sunLight, sunLight.target);
const glowMats = [], monumentMats = [];   // materials whose glow depends on the time of day
let lampMat = null, bloomPass = null;
function applyTime(mode){
  timeMode = mode; const T = TIMES[mode];
  sunDir.set(...(T.lightDir || T.sun)).normalize();
  if (sky) skyUniforms(sky.material.uniforms, T);
  scene.environment = envFor(mode) || null;
  sunLight.color.set(T.light).convertSRGBToLinear(); sunLight.intensity = T.li;
  hemiLight.color.set(T.hs).convertSRGBToLinear(); hemiLight.groundColor.set(T.hg).convertSRGBToLinear(); hemiLight.intensity = T.hi;
  renderer.toneMappingExposure = T.exp;
  scene.fog.color.set(T.fog).convertSRGBToLinear(); scene.fog.near = T.fogN; scene.fog.far = T.fogF; scene.background.copy(scene.fog.color);
  glowMats.forEach(([m,base])=>{ m.emissiveIntensity = base*T.glow; });
  if (lampMat) lampMat.emissiveIntensity = T.lamp;
  monumentMats.forEach(m=>{ m.emissiveIntensity = T.mono || 0; });
  if (bloomPass) bloomPass.strength = T.bloom;
  if (typeof onTimeChange === 'function') onTimeChange(mode);
}

/* =========================================================
   Random + materials with procedural surface detail
   ========================================================= */
let seed = 271828;
const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (a,b) => a + rand()*(b-a);
const pick = a => a[Math.floor(rand()*a.length)];
const lin = hex => new THREE.Color(hex).convertSRGBToLinear();

const NOISE = `
varying vec3 vWP;
float jh(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float jn(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
 return mix(mix(mix(jh(i),jh(i+vec3(1.,0.,0.)),f.x),mix(jh(i+vec3(0.,1.,0.)),jh(i+vec3(1.,1.,0.)),f.x),f.y),
            mix(mix(jh(i+vec3(0.,0.,1.)),jh(i+vec3(1.,0.,1.)),f.x),mix(jh(i+vec3(0.,1.,1.)),jh(i+vec3(1.,1.,1.)),f.x),f.y),f.z); }
`;
const FRAG = {
  plaster:`
    float nA = jn(vWP*0.35)*0.5 + jn(vWP*1.9)*0.3 + jn(vWP*8.0)*0.2;
    diffuseColor.rgb *= 0.82 + 0.34*nA;
    float st = jn(vec3(vWP.x*0.9, vWP.y*0.06, vWP.z*0.9));
    diffuseColor.rgb *= 1.0 - 0.12*smoothstep(0.55,0.95,st);
    diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 2.4, vWP.y));`,
  stone:`
    float nA = jn(vWP*0.6)*0.5 + jn(vWP*3.0)*0.3 + jn(vWP*12.0)*0.2;
    diffuseColor.rgb *= 0.86 + 0.26*nA;
    diffuseColor.rgb *= mix(0.65, 1.0, smoothstep(0.0, 1.8, vWP.y));`,
  ground:`
    float nA = jn(vWP*0.05)*0.45 + jn(vWP*0.5)*0.3 + jn(vWP*4.0)*0.25;
    diffuseColor.rgb *= 0.8 + 0.36*nA;`,
  paving:`
    float nA = jn(vWP*0.12)*0.4 + jn(vWP*1.2)*0.3 + jn(vWP*6.0)*0.3;
    diffuseColor.rgb *= 0.84 + 0.3*nA;
    vec2 g = abs(fract(vWP.xz/vec2(1.8,1.2) + vec2(floor(vWP.z/1.2)*0.5,0.0))-0.5);
    diffuseColor.rgb *= 1.0 - 0.2*smoothstep(0.45,0.5,max(g.x,g.y));`,
  asphalt:`
    float nA = jn(vWP*0.08)*0.4 + jn(vWP*2.5)*0.3 + jn(vWP*20.0)*0.3;
    diffuseColor.rgb *= 0.78 + 0.4*nA;`,
  foliage:`
    float nA = jn(vWP*0.9)*0.6 + jn(vWP*4.0)*0.4;
    diffuseColor.rgb *= 0.62 + 0.62*nA;`,
  grass:`
    float nA = jn(vWP*0.15)*0.5 + jn(vWP*1.5)*0.3 + jn(vWP*9.0)*0.2;
    diffuseColor.rgb *= 0.75 + 0.45*nA;`,
};
function enhance(m, kind){
  if (!FRAG[kind]) return;
  m.onBeforeCompile = sh=>{
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n vec4 jwp = vec4(transformed,1.0);\n #ifdef USE_INSTANCING\n jwp = instanceMatrix*jwp;\n #endif\n vWP = (modelMatrix*jwp).xyz;');
    sh.fragmentShader = NOISE + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG[kind]);
  };
  m.customProgramCacheKey = () => 'jp-' + kind;
}
const matCache = {};
function mat(hex, kind='plaster', o={}){
  const key = hex + kind + JSON.stringify(o);
  if (matCache[key]) return matCache[key];
  const m = new THREE.MeshStandardMaterial(Object.assign({color:lin(hex), roughness:0.9, metalness:0, envMapIntensity:0.55}, o));
  enhance(m, kind); return (matCache[key] = m);
}

/* =========================================================
   Canvas textures: painted motifs, jaali, shop interiors, signs
   ========================================================= */
function cv(w,h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep){ const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; if (rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
function flower(ctx,x,y,r,col){
  ctx.fillStyle = col;
  for (let i=0;i<6;i++){ const a = i/6*Math.PI*2; ctx.beginPath(); ctx.ellipse(x+Math.cos(a)*r*0.55, y+Math.sin(a)*r*0.55, r*0.42, r*0.22, a, 0, Math.PI*2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(x,y,r*0.22,0,Math.PI*2); ctx.fill();
}
const WHITE_PAINT = '#FBF3EA';
// Arch outline decal (white painted border around an arch opening)
const archDecal = (()=>{
  const [c,x] = cv(256,384); x.strokeStyle = WHITE_PAINT; x.lineCap = 'round';
  const L = 256*0.115, R = 256*0.885, B = 384, top = 384*0.13, rx = (R-L)/2, ry = rx*1.15, cx = 128, spring = top + ry;
  for (const [off,lw] of [[10,7],[24,3]]){
    x.lineWidth = lw; x.beginPath();
    x.moveTo(L-off, B); x.lineTo(L-off, spring);
    // cusped arch: 5 lobes
    const n = 5;
    for (let i=0;i<n;i++){
      const a0 = Math.PI + i/n*Math.PI, a1 = Math.PI + (i+1)/n*Math.PI, am = (a0+a1)/2;
      const p1x = cx + Math.cos(a1)*(rx+off), p1y = spring + Math.sin(a1)*(ry+off);
      const qx = cx + Math.cos(am)*(rx+off-14), qy = spring + Math.sin(am)*(ry+off-14);
      x.quadraticCurveTo(qx, qy, p1x, p1y);
    }
    x.lineTo(R+off, B); x.stroke();
  }
  flower(x, cx, top-20, 16, WHITE_PAINT);
  for (const s of [-1,1]){ flower(x, cx+s*(rx+18), top+16, 10, WHITE_PAINT); }
  return tex(c);
})();
// Rectangular window frame decal
const rectDecal = (()=>{
  const [c,x] = cv(256,320); x.strokeStyle = WHITE_PAINT;
  x.lineWidth = 6; x.strokeRect(30,48,196,256);
  x.lineWidth = 3; x.strokeRect(14,32,228,280);
  x.beginPath(); x.moveTo(14,32); x.quadraticCurveTo(128,-20,242,32); x.stroke();
  flower(x,128,22,14,WHITE_PAINT); flower(x,14,312,9,WHITE_PAINT); flower(x,242,312,9,WHITE_PAINT);
  return tex(c);
})();
// Repeating frieze
const friezeTex = (()=>{
  const [c,x] = cv(256,64); x.strokeStyle = WHITE_PAINT; x.fillStyle = WHITE_PAINT; x.lineWidth = 4;
  x.beginPath(); x.moveTo(0,6); x.lineTo(256,6); x.moveTo(0,58); x.lineTo(256,58); x.stroke();
  x.lineWidth = 3; x.beginPath(); for (let i=0;i<=256;i+=4){ const y = 32 + Math.sin(i/256*Math.PI*4)*12; i? x.lineTo(i,y) : x.moveTo(i,y); } x.stroke();
  for (let k=0;k<4;k++) flower(x, 32+k*64, 32 + (k%2? 12:-12)*0.0, 9, WHITE_PAINT);
  const t = tex(c, true); return t;
})();
// Jaali lattice window (Hawa Mahal bays)
const jaaliTex = (()=>{
  const [c,x] = cv(128,192);
  x.fillStyle = '#C46C57'; x.fillRect(0,0,128,192);
  x.fillStyle = '#2A1410';
  x.beginPath(); x.moveTo(26,180); x.lineTo(26,70); x.quadraticCurveTo(26,26,64,18); x.quadraticCurveTo(102,26,102,70); x.lineTo(102,180); x.closePath(); x.fill();
  x.save(); x.clip();
  x.strokeStyle = '#C46C57'; x.lineWidth = 3.2;
  for (let i=-200;i<300;i+=11){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+192,192); x.stroke(); x.beginPath(); x.moveTo(i,192); x.lineTo(i+192,0); x.stroke(); }
  x.restore();
  x.strokeStyle = WHITE_PAINT; x.lineWidth = 4;
  x.beginPath(); x.moveTo(20,186); x.lineTo(20,70); x.quadraticCurveTo(20,20,64,12); x.quadraticCurveTo(108,20,108,70); x.lineTo(108,186); x.stroke();
  const t = tex(c, true); return t;
})();
// Shop interiors (lit)
const SHOP_KINDS = ['textiles','bangles','sweets','jewels','juttis','spices'];
const shopTex = SHOP_KINDS.map(kind=>{
  const [c,x] = cv(256,192);
  const g = x.createLinearGradient(0,0,0,192); g.addColorStop(0,'#6B3E26'); g.addColorStop(1,'#2A160E');
  x.fillStyle = g; x.fillRect(0,0,256,192);
  x.fillStyle = 'rgba(255,214,150,.35)'; x.beginPath(); x.ellipse(128,20,90,40,0,0,Math.PI*2); x.fill();
  const shelfY = [56,104,152];
  x.fillStyle = '#4A2A1A'; shelfY.forEach(y=>x.fillRect(8,y,240,6));
  const R = () => Math.random();
  const pal = ['#E8B33A','#D8342B','#2E8C87','#B83A6B','#3B4B8C','#F2C230','#5E8F3A','#E05A2B','#F4EDE2'];
  if (kind==='textiles'){ shelfY.forEach(y=>{ for (let i=12;i<244;i+=16){ x.fillStyle = pal[Math.floor(R()*pal.length)]; x.fillRect(i,y-38,13,38); x.fillStyle='rgba(255,255,255,.15)'; x.fillRect(i,y-38,3,38);} }); }
  if (kind==='bangles'){ shelfY.forEach(y=>{ for (let i=16;i<244;i+=12){ x.strokeStyle = pal[Math.floor(R()*pal.length)]; x.lineWidth = 3; for (let k=0;k<3;k++){ x.beginPath(); x.ellipse(i,y-16-k*3,5,12,0,0,Math.PI*2); x.stroke(); } } }); }
  if (kind==='sweets'){ shelfY.forEach(y=>{ for (let i=20;i<240;i+=44){ x.fillStyle='#C9C2B5'; x.fillRect(i-18,y-6,36,6); const col = ['#F2C230','#E8B33A','#F4EDE2','#E05A2B','#8FBF5A'][Math.floor(R()*5)]; x.fillStyle = col; for (let k=0;k<6;k++){ x.beginPath(); x.arc(i-13+k*5.2,y-11,4.5,0,Math.PI*2); x.fill(); } } }); }
  if (kind==='jewels'){ x.fillStyle = '#5A1020'; x.fillRect(10,10,236,172); shelfY.forEach(y=>{ for (let i=20;i<240;i+=22){ x.strokeStyle='#F2C230'; x.lineWidth=2.5; x.beginPath(); x.arc(i,y-22,8,0.1,Math.PI-0.1); x.stroke(); x.fillStyle = '#F7D774'; x.beginPath(); x.arc(i,y-12,3,0,Math.PI*2); x.fill(); } }); }
  if (kind==='juttis'){ shelfY.forEach(y=>{ for (let i=14;i<240;i+=20){ x.fillStyle = pal[Math.floor(R()*pal.length)]; x.beginPath(); x.ellipse(i,y-6,9,5,0,0,Math.PI*2); x.fill(); x.fillStyle='#F2C230'; x.fillRect(i-3,y-9,6,2);} }); }
  if (kind==='spices'){ shelfY.forEach(y=>{ for (let i=18;i<244;i+=26){ x.fillStyle = ['#C23B3B','#E8B33A','#6B4B35','#5E8F3A','#E05A2B'][Math.floor(R()*5)]; x.beginPath(); x.moveTo(i-11,y); x.quadraticCurveTo(i,y-30,i+11,y); x.fill(); } }); }
  const t = tex(c); return t;
});
// Café / store interior seen through glass
const cafeTex = ['#7A4A2E','#3E4A3A','#6B5A48'].map((wall,vi)=>{
  const [c,x] = cv(512,256);
  const g = x.createLinearGradient(0,0,0,256); g.addColorStop(0,wall); g.addColorStop(1,'#1E120C'); x.fillStyle = g; x.fillRect(0,0,512,256);
  x.fillStyle = 'rgba(0,0,0,.25)'; for (let i=0;i<512;i+=26) x.fillRect(i,0,2,256);
  for (let i=0;i<5;i++){ const lx = 50+i*100; x.strokeStyle='#222'; x.lineWidth=2; x.beginPath(); x.moveTo(lx,0); x.lineTo(lx,70); x.stroke();
    const rg = x.createRadialGradient(lx,80,2,lx,80,70); rg.addColorStop(0,'rgba(255,220,150,.95)'); rg.addColorStop(0.15,'rgba(255,200,120,.55)'); rg.addColorStop(1,'rgba(255,190,110,0)'); x.fillStyle = rg; x.fillRect(lx-70,10,140,140);
    x.fillStyle='#F6D8A0'; x.beginPath(); x.ellipse(lx,74,14,9,0,Math.PI,0); x.fill(); }
  x.fillStyle = '#4A2E1C'; x.fillRect(0,170,512,86); x.fillStyle = '#6B4530'; x.fillRect(0,166,512,8);
  for (let i=0;i<9;i++){ x.fillStyle = ['#F2E9DF','#E8B33A','#2E8C87','#B83A6B'][i%4]; x.fillRect(20+i*55,140,10,26); x.beginPath(); x.arc(25+i*55,138,6,0,Math.PI*2); x.fill(); }
  x.fillStyle = 'rgba(30,18,12,.85)'; for (let i=0;i<4;i++){ const px = 80+i*120+vi*20; x.beginPath(); x.arc(px,120,13,0,Math.PI*2); x.fill(); x.fillRect(px-17,133,34,40); }
  return tex(c);
});
// Painted panels for Patrika Gate
const paintTex = ['#D84F7A','#2F6FB0','#E8B33A','#2E8C87'].map((bg,i)=>{
  const [c,x] = cv(256,256); x.fillStyle = bg; x.fillRect(0,0,256,256);
  const fg = ['#F7D774','#FBF3EA','#D84F7A','#F2C230'][i], fg2 = ['#2E8C87','#E05A2B','#2F6FB0','#D84F7A'][i];
  x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(10,10,236,236); x.lineWidth = 2; x.strokeRect(22,22,212,212);
  for (let gx=0; gx<4; gx++) for (let gy=0; gy<4; gy++){
    const px = 48+gx*54, py = 48+gy*54;
    x.fillStyle = (gx+gy)%2 ? fg : fg2; x.beginPath(); x.moveTo(px,py-18); x.lineTo(px+18,py); x.lineTo(px,py+18); x.lineTo(px-18,py); x.fill();
    flower(x,px,py,10,(gx+gy)%2 ? fg2 : fg);
  }
  return tex(c);
});
// Stepwell riser pattern
const kundTex = (()=>{
  const [c,x] = cv(256,64); x.fillStyle = '#D9B98A'; x.fillRect(0,0,256,64);
  for (let i=0;i<256;i+=32){
    x.fillStyle = '#8E6C46'; x.beginPath(); x.moveTo(i,64); x.lineTo(i+16,0); x.lineTo(i+22,0); x.lineTo(i+6,64); x.fill();
    x.fillStyle = '#F2DDB4'; x.beginPath(); x.moveTo(i+32,64); x.lineTo(i+16,0); x.lineTo(i+10,0); x.lineTo(i+26,64); x.fill();
    for (let s=0;s<8;s++){ x.fillStyle='rgba(60,40,20,.55)'; x.fillRect(i+16-s*2-3, s*8+6, 6+s*4, 2); }
  }
  return tex(c, true);
})();
// Indian tricolour
const flagTex = (()=>{
  const [c,x] = cv(300,200);
  x.fillStyle = '#FF9933'; x.fillRect(0,0,300,67); x.fillStyle = '#FFFFFF'; x.fillRect(0,67,300,66); x.fillStyle = '#138808'; x.fillRect(0,133,300,67);
  x.strokeStyle = '#000080'; x.lineWidth = 3; x.beginPath(); x.arc(150,100,28,0,Math.PI*2); x.stroke();
  for (let i=0;i<24;i++){ const a = i/24*Math.PI*2; x.beginPath(); x.moveTo(150,100); x.lineTo(150+Math.cos(a)*27,100+Math.sin(a)*27); x.lineWidth=1.2; x.stroke(); }
  return tex(c);
})();
const signQueue = [];
function signTexture(s){
  const W = 1024, H = Math.round(1024*s.h/s.w);
  const [c,x] = cv(W,H);
  x.fillStyle = s.bg; x.fillRect(0,0,W,H);
  if (s.border){ x.strokeStyle = s.border; x.lineWidth = Math.max(6,H*0.06); x.strokeRect(H*0.06,H*0.06,W-H*0.12,H-H*0.12); }
  x.fillStyle = s.fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const fam = s.font || "'Hind', 'Noto Sans Devanagari', system-ui, sans-serif";
  let size = H*(s.sub ? 0.46 : 0.6);
  x.font = `${s.weight||700} ${size}px ${fam}`;
  while (x.measureText(s.text).width > W*0.9 && size > 10){ size *= 0.94; x.font = `${s.weight||700} ${size}px ${fam}`; }
  x.fillText(s.text, W/2, s.sub ? H*0.4 : H*0.54);
  if (s.sub){ let ss = H*0.24; x.font = `600 ${ss}px 'Hind', 'Noto Sans Devanagari', system-ui, sans-serif`; while (x.measureText(s.sub).width > W*0.9 && ss>8){ ss*=0.94; x.font = `600 ${ss}px 'Hind', system-ui, sans-serif`; } x.fillStyle = s.subFg || s.fg; x.fillText(s.sub, W/2, H*0.78); }
  return tex(c);
}
