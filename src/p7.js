/* =========================================================
   Signs (built once fonts are ready)
   ========================================================= */
const signGroup = new THREE.Group(); scene.add(signGroup);
fontReady.then(()=>{
  signQueue.forEach(s=>{
    const t = signTexture(s.spec);
    const m = new THREE.Mesh(UPLANE, new THREE.MeshStandardMaterial({map:t, emissiveMap:t, emissive:lin('#ffffff'), emissiveIntensity:0.18, roughness:0.7, polygonOffset:true, polygonOffsetFactor:-3}));
    s.matrix.decompose(m.position, m.quaternion, m.scale); m.scale.set(s.spec.w, s.spec.h, 1);
    m.receiveShadow = true; signGroup.add(m); glowMats.push([m.material,0.32]); m.material.emissiveIntensity = 0.32*TIMES[timeMode].glow;
  });
  fontsDone = true; refreshPeerLabels();
  npcs.forEach(n=>{ const s = nameSprite(n.p.name.split(' ')[0]); s.position.set(n.p.pos[0],2.35,n.p.pos[1]); scene.add(s); n.label = s; });
});

/* =========================================================
   Collision
   ========================================================= */
function resolve(p, r=0.4){
  for (const c of colliders){
    if (p.x+r<c.minX || p.x-r>c.maxX || p.z+r<c.minZ || p.z-r>c.maxZ) continue;
    const cx = Math.max(c.minX,Math.min(p.x,c.maxX)), cz = Math.max(c.minZ,Math.min(p.z,c.maxZ));
    const dx = p.x-cx, dz = p.z-cz, d2 = dx*dx+dz*dz;
    if (d2 > 1e-8){ const d = Math.sqrt(d2); if (d<r){ p.x += dx/d*(r-d); p.z += dz/d*(r-d); } }
    else { const l = p.x-c.minX, rt = c.maxX-p.x, t = p.z-c.minZ, b = c.maxZ-p.z, m = Math.min(l,rt,t,b);
      if (m===l) p.x = c.minX-r; else if (m===rt) p.x = c.maxX+r; else if (m===t) p.z = c.minZ-r; else p.z = c.maxZ+r; }
  }
  for (const c of circles){ const dx = p.x-c.x, dz = p.z-c.z, d = Math.hypot(dx,dz), m = c.r + r; if (d < m && d > 1e-6){ p.x = c.x + dx/d*m; p.z = c.z + dz/d*m; } }
  const dc = Math.hypot(p.x-CX, p.z-CZ); if (dc > 300){ p.x = CX + (p.x-CX)/dc*300; p.z = CZ + (p.z-CZ)/dc*300; }
}
resolve(P.pos);

/* =========================================================
   Input
   ========================================================= */
const keys = {}, joy = {x:0,y:0};
addEventListener('keydown', e=>{ if (e.target && e.target.matches && e.target.matches('input,textarea')) e.stopImmediatePropagation(); }, true);
addEventListener('keyup', e=>{ if (e.target && e.target.matches && e.target.matches('input,textarea')) e.stopImmediatePropagation(); }, true);
let yaw = 0, pitch = 0.22, dist = 6.2, mode = 'loading', cardOpen = false, nearNpc = null, current = null, snapCam = true;
addEventListener('keydown', e=>{
  if (mode === 'intro'){ if (e.key==='Enter') start(); return; }
  if (mode !== 'play') return;
  if (e.key==='Escape'){ for (const id of ['guideWrap','notifWrap','commWrap','meetWrap','clubWrap','recWrap']) if (!$(id).hidden){ $(id).hidden = true; cardOpen = false; return; } if (!menuWrap.hidden) toggleMenu(false); else if (!$('outfitWrap').hidden){ $('outfitWrap').hidden = true; cardOpen = false; } else if (!$('coWrap').hidden) closeCo(); else if (!$('jobsWrap').hidden) closeJobs(); else if (!$('chatWrap').hidden) closeChat(); else if (!$('bizWrap').hidden) closeBiz(); else if (prod) closeProducts(); else if (!$('joinWrap').hidden) closeJoin(); else if (cardOpen) closeCard(); else togglePanel(false); return; }
  if (!$('meetWrap').hidden || !$('clubWrap').hidden || !$('joinWrap').hidden || !$('chatWrap').hidden || !$('bizWrap').hidden || !$('coWrap').hidden || !$('outfitWrap').hidden) return;
  if (e.key==='e' || e.key==='E'){ if (prod) closeProducts(); else if (cardOpen) closeCard(); else doAction(); return; }
  if (mapOpen) return;
  if (cardOpen) return;
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e=>{ keys[e.code] = false; });
addEventListener('blur', ()=>{ for (const k in keys) keys[k] = false; });
let drag = null;
canvas.addEventListener('pointerdown', e=>{ if (mode!=='play') return; drag = {id:e.pointerId,x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); togglePanel(false); });
canvas.addEventListener('pointermove', e=>{ if (!drag || e.pointerId!==drag.id) return; yaw -= (e.clientX-drag.x)*0.005; if (flying) flyPitch = Math.max(-0.6, Math.min(1.35, flyPitch + (e.clientY-drag.y)*0.004)); else pitch = Math.max(-0.05, Math.min(1.2, pitch + (e.clientY-drag.y)*0.004)); drag.x = e.clientX; drag.y = e.clientY; });
const endDrag = e=>{ if (drag && e.pointerId===drag.id) drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', e=>{ dist = Math.max(3.2, Math.min(18, dist + e.deltaY*0.008)); }, {passive:true});
const $ = id => document.getElementById(id);
const stick = $('stick'), knob = $('knob'); let stickId = null;
stick.addEventListener('pointerdown', e=>{ stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); e.stopPropagation(); });
stick.addEventListener('pointermove', e=>{ if (e.pointerId===stickId) moveStick(e); });
const stopStick = e=>{ if (e.pointerId===stickId){ stickId = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
stick.addEventListener('pointerup', stopStick); stick.addEventListener('pointercancel', stopStick);
function moveStick(e){ const r = stick.getBoundingClientRect(), R = r.width/2; let dx = e.clientX-(r.left+R), dy = e.clientY-(r.top+R); const d = Math.hypot(dx,dy), mx = R-18; if (d>mx){ dx = dx/d*mx; dy = dy/d*mx; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx/mx; joy.y = dy/mx; }

/* =========================================================
   UI
   ========================================================= */
if (isCoarse) document.body.classList.add('touch');
const intro = $('intro'), hud = $('hud'), topright = $('topright'), panel = $('panel'), prompt = $('prompt'), cardWrap = $('cardWrap');
if (isCoarse) $('hint').textContent = 'Use the joystick to walk and drag to look around';
$('startBtn').addEventListener('click', ()=>{ let pr = null; try { pr = localStorage.getItem('jp-pending-role'); localStorage.removeItem('jp-pending-role'); } catch(e){}
  if (pr === 'signin' && db && myId){ start(); welcomeBack(); return; }
  if (pr && db && myId){ start(); runRole(pr); return; }
  if (db && myId){ start(); welcomeBack(); return; }   // already signed in: no need to ask how they're joining again
  showRoles(); });
const signInReturning = () => { if (!(window.JP_AUTH && window.JP_AUTH.signIn)) return; try { localStorage.setItem('jp-pending-role', 'signin'); } catch(e){} window.JP_AUTH.signIn(); };
$('introSign').addEventListener('click', signInReturning);
$('roleSignIn').addEventListener('click', signInReturning);
(async ()=>{ for (let i=0;i<40 && !(window.JP_AUTH && window.JP_AUTH.signedIn);i++) await new Promise(r=>setTimeout(r,100)); if (!window.JP_AUTH) return; await new Promise(r=>setTimeout(r,600));
  const inn = window.JP_AUTH.signedIn(); $('introSign').hidden = inn; $('roleSignIn').hidden = inn; if (inn) $('startBtn').textContent = 'Enter the city';
})();
/* Signed-in members go to their own spot; if they haven't added themselves yet, offer it. */
async function welcomeBack(){
  for (let i=0;i<30 && !profilesLoaded;i++) await new Promise(r=>setTimeout(r,200));
  if (myDoc){ const x = clampN(myDoc.x,-290,290,null), z = clampN(myDoc.z,-290,290,null); if (x!==null){ P.pos.set(x, 0, z + 1.6); resolve(P.pos); snapCam = true; }
    showHint(`Welcome back${myName ? ', ' + myName.split(' ')[0] : ''}! You’re at your spot.`); setTimeout(()=>showHint(''), 3500); }
  else showRoles();
}
function start(){
  if (mode !== 'intro') return;
  mode = 'play'; intro.classList.add('leaving'); setTimeout(()=>intro.hidden = true, 750);
  $('topbar').hidden = false; if (isCoarse){ stick.hidden = false; runBtn.hidden = false; }
  P.pos.set(-25,0,4); resolve(P.pos); P.rot = Math.PI; yaw = 0; pitch = 0.22; snapCam = true; canvas.focus(); Music.start();
  if (!isCoarse){ showHint('W to walk, A and D to turn, drag to look around. Walk up to shops and autos, then press E.'); setTimeout(()=>{ if (!flying && !riding) showHint(null); }, 9000); }
}
const initials = n => n.split(' ').map(s=>s[0]).join('').slice(0,2);
const lookColor = l => (l.headColor==='#1E1512'||l.headColor==='#2A1B17') ? l.top : l.headColor;
let tab = 'people';
function renderList(){
  const list = $('list'); list.innerHTML = '';
  $('tabJobs').setAttribute('aria-selected', String(tab==='jobs')); $('tabOffices').setAttribute('aria-selected', String(tab==='offices'));
  $('tabPeople').setAttribute('aria-selected', String(tab==='people')); $('tabPlaces').setAttribute('aria-selected', String(tab==='places')); $('tabShops').setAttribute('aria-selected', String(tab==='shops'));
  const peopleRows = ()=>{ const rows = []; live.peers.forEach(e=>{ const nm = peerName(e); const mm = e.by && memberMap.get(e.by); rows.push({t:nm, s:`Online now${e.place ? ', at ' + e.place : ''}`, c:'#34C27A', i:initials(nm==='Visitor'?'V':nm), go:()=>{ if (mm){ togglePanel(false); openCard(mm); return; } if (riding) exitAuto(); if (inShop) exitShop(); setFly(false); P.pos.set(e.cur.x+1.5,0,e.cur.z+1.5); resolve(P.pos); snapCam = true; }}); });
    const on = onlineIds(); memberMap.forEach(m=>{ if (on.has(m.id)) return; const co = m.p.company ? companyOf(m.p.company) : null; const st2 = Social.status(m.id); rows.push({creator: m.id === CREATOR_ID, t:m.p.name, s:[m.id === CREATOR_ID ? 'Creator of People of Jaipur' : '', st2==='connected' ? 'Connected' : st2==='incoming' ? 'Wants to connect' : '', m.p.role, co && co.name].filter(Boolean).join(', ') || 'Member', c:lookColor(m.p.look), i:initials(m.p.name), go:()=>{ togglePanel(false); openCard(m); }}); });
    const ci = rows.findIndex(r=>r.creator); if (ci > 0) rows.unshift(rows.splice(ci,1)[0]);
    if (myDoc) rows.unshift({t:`${myName || 'You'} (you)`, s:`Your spot${myDoc.place ? ', ' + myDoc.place : ''}. Tap to edit.`, c:'#EE9C14', i:initials(myName || 'You'), go:()=>{ togglePanel(false); openJoin(); }});
    return rows.length ? rows : [{t:'Nobody has joined yet', s: (db && myId) ? 'Be the first: Menu, then Add yourself to the city.' : 'Signed-in people show up here.', c:'#B85C48', i:'+', go:()=>{ if (db && myId) openJoin(); }}]; };
  const items = tab==='people' ? peopleRows()
                    : tab==='offices' ? officeDoors.slice().sort((a,b)=>{ const oa = floorName(a)!=='Available' ? 0 : 1, ob = floorName(b)!=='Available' ? 0 : 1; if (oa!==ob) return oa-ob; return a.tower===b.tower ? b.n-a.n : (a.tower<b.tower?-1:1); }).map(f=>{ const nm = floorName(f); return {t: nm==='Available' ? `Tower ${f.tower}, floor ${f.n}` : nm, s: nm==='Available' ? 'Free for an IT company' : `Tower ${f.tower}, floor ${f.n}`, c: nm==='Available' ? '#9AA59A' : '#2F4F7F', i: String(f.n), logo: (companyAt(f.slot)||{}).logo, go:()=>goToFloor(f)}; })
                    : tab==='jobs' ? (()=>{ const rows = []; coByslot.forEach((c,slot)=>c.jobs.forEach(j=>rows.push({t:j.title, s:`${c.name}, ${j.type}`, c:'#2F4F7F', i:c.name[0], go:()=>goToDoor(lobbyDoors.find(l=>l.tower===officeDoors[slot].tower))}))); return rows.length ? rows : [{t:'No jobs posted yet', s:'Companies register an office in Jagatpura and post their openings there.', c:'#2F4F7F', i:'+', go:()=>goToDoor(lobbyDoors[0])}]; })()
                    : tab==='shops' ? (bizByDoor.size ? [...bizByDoor.entries()].map(([i,b])=>({t:b.name, s:[KIND_NAMES[b.kind], b.address].filter(Boolean).join(', '), c:'#2E8C5A', i:b.name[0], go:()=>goToDoor(shopDoors[i])})) : [{t:'No shops registered yet', s:'Walk into any shop and tap “Is this your shop? Register it”.', c:'#B85C48', i:'+', go:()=>{}}])
                               : PLACES.map((p,i)=>({t:p.name, s:p.fact.split('.')[0]+'.', c:['#B85C48','#2E8C87','#E8A21B','#3B4B8C'][i%4], i:p.name[0], go:()=>goToPlace(p)}));
  if (tab==='offices'){ const sum = document.createElement('div'); sum.className = 'slotsum'; sum.innerHTML = `Jagatpura Tech Park: <b>Tower A</b> has 10 floors, <b>Tower B</b> has 8. Tap any floor to go straight there.`; list.appendChild(sum); }
  if (tab==='shops' || tab==='jobs'){
    const free = shopDoors.filter((d,i)=>!bizByDoor.has(i)), freeO = officeDoors.filter(d=>!coByslot.has(d.slot));
    const sum = document.createElement('div'); sum.className = 'slotsum';
    sum.innerHTML = tab==='shops' ? `<b>${bizByDoor.size} of ${shopDoors.length}</b> shop slots registered. ${free.length} free.` : `<b>${coByslot.size} of ${officeDoors.length}</b> Tech Park floors taken. Tower A has 10 floors, Tower B has 8.`;
    list.appendChild(sum);
    if (tab==='shops' && free.length){ const b = document.createElement('button'); b.className = 'btn'; b.style.margin = '0 10px 10px'; b.textContent = 'Take me to a free shop'; b.addEventListener('click', ()=>{ goToDoor(free[Math.floor(Math.random()*free.length)]); togglePanel(false); }); list.appendChild(b); }
  }
  items.forEach(it=>{
    const b = document.createElement('button'); b.className = 'row';
    const d = document.createElement('div'); d.className = 'dot'; d.style.background = it.c; d.textContent = it.i;
    if (it.logo){ d.textContent = ''; d.style.background = `#fff center/cover no-repeat url("${logoUrl(it.logo)}")`; }
    const tx = document.createElement('div'); const bb = document.createElement('b'); bb.textContent = it.t; const sp = document.createElement('span'); sp.textContent = it.s; tx.append(bb,sp);
    b.append(d,tx); b.addEventListener('click', ()=>{ it.go(); togglePanel(false); }); list.appendChild(b);
  });
}
$('tabPeople').addEventListener('click', ()=>{ tab='people'; renderList(); });
$('tabPlaces').addEventListener('click', ()=>{ tab='places'; renderList(); });
$('tabShops').addEventListener('click', ()=>{ tab='shops'; renderList(); });
$('tabJobs').addEventListener('click', ()=>{ tab='jobs'; renderList(); });
$('tabOffices').addEventListener('click', ()=>{ tab='offices'; renderList(); });
function goToFloor(f){ if (riding) exitAuto(); if (sitting) standUp(); setFly(false); closeProducts(); if (inShop && !inShop.floor){ const sv = inShop; inShop = null; activeScene = scene; scene.add(player.g); } enterFloor(f); }
function goToDoor(d){ if (riding) exitAuto(); if (inShop) exitShop(); setFly(false); P.pos.set(d.x + Math.sin(d.rot)*2.5, 0, d.z + Math.cos(d.rot)*2.5); resolve(P.pos); P.rot = d.rot + Math.PI; yaw = d.rot; pitch = 0.2; snapCam = true; }
$('peopleBtn').addEventListener('click', ()=>togglePanel(panel.hidden));
function togglePanel(show){ panel.hidden = !show; $('peopleBtn').setAttribute('aria-expanded', String(show)); if (show) renderList(); }
function faceTowards(tx,tz){ const dx = tx-P.pos.x, dz = tz-P.pos.z; P.rot = Math.atan2(dx,dz); yaw = Math.atan2(-dx,-dz); }
function goToNpc(n){ if (riding) exitAuto(); if (inShop) exitShop(); setFly(false); const a = n.baseRot; P.pos.set(n.p.pos[0]+Math.sin(a)*2.6,0,n.p.pos[1]+Math.cos(a)*2.6); resolve(P.pos); faceTowards(n.p.pos[0],n.p.pos[1]); pitch = 0.22; snapCam = true; }
const PLACE_SPOTS = {'Hawa Mahal':[-25,6,-25,-20],'Wind View Café':[-10,4,-10,12],'Tattoo Café & Lounge':[-38,4,-38,12],'Badi Chaupar':[30,22,30,0],'Johari Bazaar':[30,26,30,60],'Jantar Mantar':[-10,-25,-12,-58],'City Palace':[-62,-30,-70,-60],'Jal Mahal':[30,-128,30,-178],'Albert Hall Museum':[30,112,30,160],'Anokhi Café':[118,-6,122,-14],'Curious Life Coffee Roasters':[182,-6,186,-14],'Tapri Central':[150,56,134,62],'Central Park':[205,36,205,65],'Patrika Gate':[226,0,246,0],'Panna Meena ka Kund':[-150,12,-150,-10]};
function goToPlace(p){ if (riding) exitAuto(); if (inShop) exitShop(); setFly(false); const s = PLACE_SPOTS[p.name] || [p.x,p.z+12,p.x,p.z]; P.pos.set(s[0],0,s[1]); resolve(P.pos); faceTowards(s[2],s[3]); pitch = p.name==='Hawa Mahal' ? 0.05 : 0.18; snapCam = true; }
prompt.addEventListener('click', ()=>doAction());
function openCard(n){
  current = n; cardOpen = true; for (const k in keys) keys[k] = false;
  $('cAvatar').textContent = initials(n.p.name); $('cAvatar').style.background = lookColor(n.p.look);
  $('cName').textContent = n.p.name; $('cRole').textContent = n.p.role; $('cArea').textContent = n.p.area; $('cBuild').textContent = n.p.building;
  $('hiBtn').textContent = n.p.link ? 'View LinkedIn' : 'Say hi';
  const co = n.p.company ? companyOf(n.p.company) : null;
  $('officeBtn').hidden = !co; $('officeBtn').onclick = co ? (()=>{ closeCard(); goToFloor(officeDoors[co.slot]); }) : null;
  if (co) $('cRole').textContent = `${n.p.role}${n.p.role ? ', ' : ''}${co.name}${co.team.includes(n.id) || co.owner === n.id ? '' : ' (not yet confirmed)'}`;
  $('waveBtn').hidden = true; refreshCardSocial(n);
  $('cNote').textContent = n.member ? (Social.status(n.id)==='connected' ? 'You’re connected.' : 'Connect to see their LinkedIn and other links, and to message them.') : '';
  $('hiBtn').hidden = !n.p.link;
  if (n.id && n.id === CREATOR_ID){ $('cRole').textContent = `Creator of People of Jaipur${n.p.role ? ' · ' + n.p.role : ''}`; if (Social.status(n.id) !== 'connected') $('cNote').textContent = 'Say hello to the person who built this city. Tap Connect to message them.'; }
  cardWrap.hidden = false; prompt.hidden = true; $('hiBtn').focus();
}
function closeCard(){ cardOpen = false; cardWrap.hidden = true; canvas.focus(); }
$('closeBtn').addEventListener('click', closeCard);

cardWrap.addEventListener('click', e=>{ if (e.target===cardWrap) closeCard(); });
$('hiBtn').addEventListener('click', ()=>{ if (current && current.p.link && isLinkedIn(current.p.link)) window.open(current.p.link,'_blank','noopener'); else if (current && current.p.real){ $('cNote').textContent = `${current.p.name.split(' ')[0]} hasn’t added a LinkedIn link yet.`; } else if (current){ $('cNote').textContent = `${current.p.name.split(' ')[0]} waves back. This is a sample profile, so there’s no one to chat with yet.`; } });
function areaAt(x,z){
  let best = null, bd = Infinity;
  for (const p of PLACES){ const d = Math.hypot(x-p.x,z-p.z)/p.r; if (d < 1.25 && d < bd){ best = p; bd = d; } }
  if (best) return [best.name, best.fact];
  if (Math.abs(x)<=95 && Math.abs(z)<=95) return ['Pink City', 'Painted pink in 1876 to welcome the Prince of Wales, and it has stayed that way.'];
  if (x > 95 && z > -40 && z < 120) return ['C-Scheme', 'The modern heart of Jaipur, full of cafés and studios.'];
  return ['Outside the walls', 'The Aravalli hills ring the city to the north.'];
}
let lastArea = '';

/* Minimap */
const mm = $('minimap'), mctx = mm.getContext('2d');
function drawMap(){
  const me0 = flying ? drone : (inShop ? {x:inShop.door.x,z:inShop.door.z} : P.pos), W = mm.width, span = flying ? 700 : 260, s = W/span, ox = me0.x - span/2, oz = me0.z - span/2, X = x => (x-ox)*s, Z = z => (z-oz)*s;
  mctx.fillStyle = '#E3C49F'; mctx.fillRect(0,0,W,W);
  if (SAT.canvas){ const k = SAT.size/(SAT.x1-SAT.x0); mctx.drawImage(SAT.canvas,(ox-SAT.x0)*k,(oz-SAT.z0)*k,span*k,span*k,0,0,W,W); }
  else {
  mctx.fillStyle = '#E0A28C'; mctx.fillRect(X(-95),Z(-95),190*s,190*s);
  mctx.strokeStyle = '#B85C48'; mctx.lineWidth = 5*s; mctx.strokeRect(X(-95),Z(-95),190*s,190*s);
  mctx.fillStyle = '#7C726C'; [[0,0,188,13],[30,0,13,188],[30,-116,13,44],[30,112,13,36],[-116,0,44,11],[180,0,170,17],[150,15,17,190]].forEach(([x,z,w,d])=>mctx.fillRect(X(x-w/2),Z(z-d/2),w*s,d*s));
  mctx.fillStyle = '#7FA35A'; mctx.fillRect(X(165),Z(25),80*s,80*s); mctx.fillRect(X(-25),Z(135),110*s,70*s);
  mctx.fillStyle = '#5B97A3'; mctx.beginPath(); mctx.arc(X(LAKE.x),Z(LAKE.z),LAKE.r*s,0,Math.PI*2); mctx.fill();
  mctx.fillStyle = '#8B3A2A'; mctx.fillRect(X(-46),Z(-24),42*s,14*s); }
  for (const n of npcs){ mctx.fillStyle = n===nearNpc ? '#FFFFFF' : '#EE9C14'; mctx.beginPath(); mctx.arc(X(n.p.pos[0]),Z(n.p.pos[1]),6,0,Math.PI*2); mctx.fill(); mctx.strokeStyle='#3B1E19'; mctx.lineWidth=2; mctx.stroke(); }
  live.peers.forEach(e=>{ mctx.fillStyle = '#34C27A'; mctx.beginPath(); mctx.arc(X(e.cur.x),Z(e.cur.z),6,0,Math.PI*2); mctx.fill(); mctx.strokeStyle='#FFFFFF'; mctx.lineWidth=2; mctx.stroke(); });
  const me = me0; mctx.save(); mctx.translate(X(me.x),Z(me.z)); mctx.rotate(flying ? -yaw : -P.rot+Math.PI);
  mctx.fillStyle = '#FFFFFF'; mctx.strokeStyle = '#3B1E19'; mctx.lineWidth = 2.5;
  mctx.beginPath(); mctx.moveTo(0,-13); mctx.lineTo(9,9); mctx.lineTo(0,4); mctx.lineTo(-9,9); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
}

/* =========================================================
   Post-processing (desktop): ambient occlusion
   ========================================================= */
let composer = null;
if (!lowEnd && THREE.EffectComposer && THREE.SSAOPass && THREE.GammaCorrectionShader){
  try {
    composer = new THREE.EffectComposer(renderer);
    const ssao = new THREE.SSAOPass(scene, camera, innerWidth, innerHeight);
    ssao.kernelRadius = 1.2; ssao.minDistance = 0.0004; ssao.maxDistance = 0.012;
    composer.addPass(ssao);
    if (THREE.UnrealBloomPass){ bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth/2, innerHeight/2), 0.5, 0.55, 0.82); composer.addPass(bloomPass); }
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    composer.ssao = ssao;
  } catch(err){ console.warn(err); composer = null; }
}

/* =========================================================
   Time of day, lamp glow
   ========================================================= */
const haloTex = (()=>{ const [c,x] = cv(64,64); const g = x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,214,150,1)'); g.addColorStop(0.25,'rgba(255,190,110,.5)'); g.addColorStop(1,'rgba(255,170,90,0)'); x.fillStyle = g; x.fillRect(0,0,64,64); const t = new THREE.CanvasTexture(c); return t; })();
const halos = new THREE.Group(); scene.add(halos);
lampSpots.forEach(([x,y,z])=>{ const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, toneMapped:false, fog:true})); sp.position.set(x,y,z); sp.scale.set(3.2,3.2,1); halos.add(sp); });
const nightGroup = new THREE.Group(); scene.add(nightGroup);
{ // stars
  const n = 1400, pos = new Float32Array(n*3), col = new Float32Array(n*3);
  for (let i=0;i<n;i++){ const u = Math.random(), v = Math.random()*0.9+0.08, th = u*Math.PI*2, ph = Math.acos(1-v); const r = 1500;
    pos[i*3] = Math.sin(ph)*Math.cos(th)*r; pos[i*3+1] = Math.cos(ph)*r; pos[i*3+2] = Math.sin(ph)*Math.sin(th)*r; const b = 0.6+Math.random()*0.4; col[i*3]=b; col[i*3+1]=b; col[i*3+2]=b*1.05; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3)); g.setAttribute('color', new THREE.BufferAttribute(col,3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({size:2.2, sizeAttenuation:false, vertexColors:true, fog:false, depthWrite:false, transparent:true, opacity:0.9, toneMapped:false}));
  stars.renderOrder = -1; nightGroup.add(stars); nightGroup.userData.stars = stars;
  const [c,x] = cv(128,128); const rg = x.createRadialGradient(64,64,0,64,64,64); rg.addColorStop(0,'rgba(255,252,240,1)'); rg.addColorStop(0.28,'rgba(250,246,230,1)'); rg.addColorStop(0.34,'rgba(200,215,255,.35)'); rg.addColorStop(1,'rgba(160,180,255,0)'); x.fillStyle = rg; x.fillRect(0,0,128,128);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), fog:false, depthWrite:false, transparent:true, toneMapped:false})); moon.scale.set(150,150,1); nightGroup.add(moon); nightGroup.userData.moon = moon;
}
const fairy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.095,8,6), M_FAIRY, fairySpots.length);
{ const cols = ['#FFE7B0','#FFD27A','#FFC2D6','#FFE7B0','#B8E2FF','#FFE7B0']; const m4b = new THREE.Matrix4(), c = new THREE.Color();
  fairySpots.forEach((p,i)=>{ m4b.makeTranslation(p[0],p[1],p[2]); fairy.setMatrixAt(i,m4b); fairy.setColorAt(i, c.set(cols[i%cols.length]).convertSRGBToLinear()); });
  if (fairy.instanceColor) fairy.instanceColor.needsUpdate = true; scene.add(fairy); }
const jalGlow = (()=>{ const [c,x] = cv(128,256); const g = x.createLinearGradient(0,0,0,256); g.addColorStop(0,'rgba(255,190,110,.9)'); g.addColorStop(1,'rgba(255,170,90,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(64,0,60,256,0,0,Math.PI*2); x.fill();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(26,30), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false}));
  m.rotation.x = -Math.PI/2; m.position.set(LAKE.x, -0.55, LAKE.z + 13 + 15); scene.add(m); return m; })();
const nightLamp = new THREE.PointLight(lin('#FFB86A'), 0, 34, 1.4); scene.add(nightLamp);
const TIME_ORDER = ['day','dusk','night'], TIME_LABEL = {day:'Day', dusk:'Dusk', night:'Night'};
function onTimeChange(mode){
  nightLamp.intensity = mode==='night' ? 1.3 : mode==='dusk' ? 0.35 : 0;
  halos.visible = mode !== 'day'; nightGroup.visible = mode === 'night'; jalGlow.visible = mode === 'night';
  halos.children.forEach(h=>h.scale.setScalar(mode==='night' ? 4.4 : 3.2));
  const b = document.getElementById('timeBtn'); if (b){ b.textContent = TIME_LABEL[mode]; b.setAttribute('aria-label', `Time of day: ${TIME_LABEL[mode]}. Change it`); }
}
applyTime('dusk');
$('timeBtn').addEventListener('click', ()=>applyTime(TIME_ORDER[(TIME_ORDER.indexOf(timeMode)+1)%3]));

/* =========================================================
   Cinematic flight path (intro) and free flight
   ========================================================= */
const TOUR = [
  [[60,40,-120],[30,4,-178]], [[-10,46,-100],[-30,8,-60]], [[-62,34,-36],[-12,8,-58]], [[-52,24,32],[-25,14,-12]],
  [[-4,20,30],[-25,15,-12]], [[34,30,44],[30,4,0]], [[30,38,96],[30,12,160]], [[92,42,138],[30,14,160]],
  [[128,40,58],[205,22,65]], [[202,34,-34],[246,10,0]], [[160,64,-96],[60,10,-60]], [[100,56,-150],[30,4,-178]],
];
const tourPos = new THREE.CatmullRomCurve3(TOUR.map(k=>V3(k[0][0],k[0][1]+14,k[0][2])), true, 'centripetal');
const tourLook = new THREE.CatmullRomCurve3(TOUR.map(k=>V3(...k[1])), true, 'centripetal');
let tourU = 0.36;
let flying = false; const drone = V3(0,40,0); let flyPitch = 0.35, flyUp = 0;
function setFly(on){
  if (on === flying) return;
  flying = on; $('flyBtn').setAttribute('aria-pressed', String(on)); $('flyBtn').textContent = on ? 'Land' : 'Fly';
  showHint(on ? 'Flying. WASD to move, drag to look, Space and C to climb and descend. Press F to land.' : null); $('flyPad').hidden = !(on && isCoarse); prompt.hidden = true;
  if (on){ drone.set(P.pos.x + Math.sin(yaw)*30, 55, P.pos.z + Math.cos(yaw)*30); flyPitch = 0.55; }
  else { P.pos.set(drone.x - Math.sin(yaw)*0, 0, drone.z); resolve(P.pos); P.rot = yaw + Math.PI; pitch = 0.22; snapCam = true; }
}
$('flyBtn').addEventListener('click', ()=>{ if (riding) exitAuto(); if (inShop) exitShop(); setFly(!flying); });
addEventListener('keydown', e=>{ if (mode==='play' && !cardOpen && !mapOpen && (e.key==='f'||e.key==='F')){ if (riding) exitAuto(); if (inShop) exitShop(); setFly(!flying); } });
const holdBtn = (id,v)=>{ const b = $(id); const on = e=>{ e.preventDefault(); flyUp = v; }; const off = ()=>{ flyUp = 0; }; b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointercancel',off); b.addEventListener('pointerleave',off); };
holdBtn('upBtn',1); holdBtn('downBtn',-1);

/* =========================================================
   Live: other people walking the city right now
   ========================================================= */
const live = {room:null, user:null, peers:new Map(), names:{}, connected:false};
let fontsDone = false;
function liveSprite(text){
  const [c,x] = cv(10,10); x.font = '600 44px Hind, system-ui, sans-serif';
  const W = Math.ceil(x.measureText(text).width + 96), H = 78; c.width = W; c.height = H;
  x.font = '600 44px Hind, system-ui, sans-serif';
  const r = 39; x.fillStyle = 'rgba(24,44,36,0.88)';
  x.beginPath(); x.moveTo(r,0); x.lineTo(W-r,0); x.arc(W-r,r,r,-Math.PI/2,Math.PI/2); x.lineTo(r,H); x.arc(r,r,r,Math.PI/2,Math.PI*1.5); x.fill();
  x.fillStyle = '#34C27A'; x.beginPath(); x.arc(38,H/2,10,0,Math.PI*2); x.fill();
  x.fillStyle = '#FFFFFF'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(text, 60, H/2+3);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthWrite:false, toneMapped:false})); s.scale.set(W/H*0.5,0.5,1); return s;
}
const hashStr = s => { let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); } return h>>>0; };
const LIVE_TURBANS = ['#D8342B','#2E8C87','#B83A6B','#3B4B8C','#5E8F3A','#E05A2B'];
const orbGeo = new THREE.SphereGeometry(0.35,16,12), orbMat = new THREE.MeshBasicMaterial({color:'#34C27A', toneMapped:false});
function peerName(e){ const n = e.by && live.names[e.by]; return n || 'Visitor'; }
function refreshPeerLabels(){
  if (!fontsDone) return;
  live.peers.forEach(e=>{ const nm = peerName(e); if (e.labelText !== nm){ if (e.label){ scene.remove(e.label); e.label.material.map.dispose(); } e.label = liveSprite(nm); e.labelText = nm; scene.add(e.label); } });
}
async function resolveNames(){
  if (!live.user) return;
  const ids = [...new Set([...live.peers.values()].map(e=>e.by).filter(Boolean))].filter(id=>!(id in live.names));
  if (!ids.length) return;
  try { const ps = await live.user.profiles(ids); ids.forEach(id=>{ live.names[id] = (ps[id] && ps[id].name) || ''; }); } catch(e){ ids.forEach(id=>{ live.names[id] = ''; }); }
  refreshPeerLabels();
}
const num = (v,d=0) => (typeof v === 'number' && isFinite(v)) ? v : d;
function syncPeers(list){
  const seen = new Set(); let count = 0;
  for (const p of list){
    if (p.kind !== 'viewer') continue;
    count++;
    if (p.isMe){ if (p.sameTab) myPeer = p.peer; continue; }
    seen.add(p.peer);
    const pr = p.presence || {};
    if (typeof pr.x !== 'number') continue;
    let e = live.peers.get(p.peer);
    if (!e){
      const look = pr.lk && typeof pr.lk === 'object' ? lookFromCode(pr.lk) : Object.assign({}, CROWD_LOOKS[hashStr(p.by||p.peer) % CROWD_LOOKS.length], {head:'turban', headColor:LIVE_TURBANS[hashStr(p.peer)%LIVE_TURBANS.length]});
      const ch = makePerson(look); scene.add(ch.g);
      const orb = new THREE.Mesh(orbGeo, orbMat); orb.visible = false; scene.add(orb);
      e = {ch, orb, cur:V3(num(pr.x),0,num(pr.z)), tgt:V3(), rot:num(pr.r), y:0, walk:0, by:p.by, label:null, labelText:'', peerId:p.peer};
      live.peers.set(p.peer, e);
    }
    e.by = p.by;
    e.tgt.set(Math.max(-700,Math.min(700,num(pr.x))), Math.max(-12,Math.min(400,num(pr.y))), Math.max(-700,Math.min(700,num(pr.z))));
    e.tr = num(pr.r); e.moving = !!pr.m; e.fly = !!pr.f; e.sit = !!pr.st; e.wv = num(pr.wv); e.place = typeof pr.place === 'string' ? pr.place.slice(0,60) : '';
  }
  for (const [k,e] of live.peers) if (!seen.has(k)){ scene.remove(e.ch.g); scene.remove(e.orb); if (e.label) scene.remove(e.label); live.peers.delete(k); }
  live.count = count; updateLivePill(); resolveNames(); refreshPeerLabels();
}
function updateLivePill(){
  const pill = $('livePill');
  if (!live.room || !live.connected){ pill.hidden = true; return; }
  pill.hidden = false; const n = Math.max(1, live.count||1);
  $('liveCount').textContent = n === 1 ? 'Live: just you' : `${n} here now`;
}
(async ()=>{
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try {
    const [room, user] = await Promise.all([window.claude.use('room'), window.claude.use('user')]);
    live.user = user; if (!room) return; live.room = room;
    room.onConnection(c=>{ live.connected = c; updateLivePill(); }, ()=>{ live.connected = false; updateLivePill(); });
    room.onPeers(ch=>syncPeers(ch.peers), ()=>{});
  } catch(e){ /* single-player is fine */ }
})();
let lastSent = '', lastSendT = 0;
function sendPresence(now, moving){
  if (!live.room || now - lastSendT < 0.1) return;
  const st = flying ? {x:+drone.x.toFixed(1), z:+drone.z.toFixed(1), y:+drone.y.toFixed(1), r:+yaw.toFixed(2), m:0, f:1, place:lastArea}
                    : inShop ? {x:+inShop.door.x.toFixed(1), z:+inShop.door.z.toFixed(1), y:0, r:+inShop.door.rot.toFixed(2), m:0, f:0, place:inShop.door.name} : {lk:myLook, st: sitting ? 1 : 0, wv: lastWave, x:+P.pos.x.toFixed(1), z:+P.pos.z.toFixed(1), y:+(P.y||0).toFixed(1), r:+P.rot.toFixed(2), m:moving?1:0, f:0, place:lastArea};
  const key = JSON.stringify(st); if (key === lastSent) return;
  lastSent = key; lastSendT = now; live.room.presence(st).catch(()=>{});
}
function updatePeers(dt){
  live.peers.forEach(e=>{
    e.cur.lerp(e.tgt, Math.min(1, dt*8));
    if (e.fly){ e.ch.g.visible = false; e.orb.visible = true; e.orb.position.copy(e.cur); if (e.label) e.label.position.set(e.cur.x, e.cur.y+1.0, e.cur.z); }
    else {
      e.ch.g.visible = true; e.orb.visible = false;
      e.ch.g.position.set(e.cur.x,e.cur.y||0,e.cur.z); e.rot = angLerp(e.rot, e.tr, Math.min(1,dt*8)); e.ch.g.rotation.y = e.rot;
      if (e.sit){ seat(e.ch); e.ch.g.position.y = (e.cur.y||0) - 0.42; } else { if (e.moving) e.walk += dt*8; animatePerson(e.ch, e.walk, e.moving?1:0, t); }
      if (Date.now() - e.wv < 2500){ e.ch.b.rSh.rotation.set(-2.5,0,0.3 + Math.sin(t*7)*0.2); e.ch.b.rEl.rotation.x = -0.5; }
      if (e.label) e.label.position.set(e.cur.x, 2.3, e.cur.z);
    }
  });
}

/* =========================================================
   Sound: auto horn
   ========================================================= */
let actx = null;
function horn(){
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime;
    [0, 0.22].forEach(off=>{
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(420, t0+off); o.frequency.setValueAtTime(380, t0+off+0.08);
      g.gain.setValueAtTime(0.0001, t0+off); g.gain.exponentialRampToValueAtTime(0.08, t0+off+0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0+off+0.17);
      o.connect(g).connect(actx.destination); o.start(t0+off); o.stop(t0+off+0.2);
    });
  } catch(e){}
}

/* =========================================================
   Autos: hail one, get in, drive it
   ========================================================= */
function seat(ch){ const b = ch.b; b.lHip.rotation.set(-1.5,0,0.06); b.rHip.rotation.set(-1.5,0,-0.06); b.lKnee.rotation.x = b.rKnee.rotation.x = 1.45; b.lSh.rotation.set(-0.9,0,-0.2); b.rSh.rotation.set(-0.9,0,0.2); b.lEl.rotation.x = b.rEl.rotation.x = -0.6; b.hips.position.y = 0.95; b.chest.rotation.set(0,0,0); }
function stand(ch){ const b = ch.b; [b.lHip,b.rHip,b.lKnee,b.rKnee,b.lSh,b.rSh,b.lEl,b.rEl,b.chest,b.head,b.hips].forEach(x=>x.rotation.set(0,0,0)); b.hips.position.y = 0.95; }
const DRIVER_LOOK = {top:'#C9B48A',bottom:'#C9B48A',head:'hair',headColor:'#1E1512',skin:'#9C6A4C'};
autos.forEach(a=>{
  a.type = 'auto'; a.state = 'route'; a.pos = V3(); a.base = V3(); a.v = 0; a.timer = 0; pathPoint(a.path, a.s, a.pos); a.base.copy(a.pos); const lk = pathPoint(a.path, Math.min(a.path.len, a.s+2), V3()); a.heading = Math.atan2(lk.x-a.pos.x, lk.z-a.pos.z);
  a.driver = makePerson(DRIVER_LOOK); seat(a.driver); a.driver.g.position.set(0,-0.05,0.38); a.g.add(a.driver.g);
});
let riding = null;
seat(jeep.driver); jeep.driver.b.lSh.rotation.set(-1.2,0,0.25); jeep.driver.b.rSh.rotation.set(-1.2,0,-0.25); jeep.driver.b.lEl.rotation.x = jeep.driver.b.rEl.rotation.x = -0.5;
function seatOnGround(g, x, z, heading, halfL, halfW, lift){
  const sx = Math.sin(heading), cz = Math.cos(heading), rx = Math.cos(heading), rz = -Math.sin(heading);
  const h = (fx,fz)=>groundY(x + sx*fx + rx*fz, z + cz*fx + rz*fz);
  const fl = h(halfL,-halfW), fr = h(halfL,halfW), bl = h(-halfL,-halfW), br = h(-halfL,halfW);
  const y = (fl+fr+bl+br)/4 + (lift||0);
  g.position.set(x, y, z); g.rotation.order = 'YXZ'; g.rotation.y = heading;
  const cl = v => Math.max(-0.3, Math.min(0.3, v));
  g.rotation.x = cl(-Math.atan2(((fl+fr)-(bl+br))/2, 2*halfL)); g.rotation.z = cl(Math.atan2(((fl+bl)-(fr+br))/2, 2*halfW)*0.6);
  return y;
}
const roadLift = (x,z) => 0;
function placeJeep(){ const uu = Math.min(0.9999,Math.max(0.0001,jeep.u)), p = jeepCurve.getPointAt(uu), tg = jeepCurve.getTangentAt(uu);
  jeep.heading = Math.atan2(tg.x, tg.z) + (jeep.dir < 0 ? Math.PI : 0);
  jeep.pos.set(p.x, 0, p.z); jeep.pos.y = seatOnGround(jeep.g, p.x, p.z, jeep.heading, 1.15, 0.8, roadLift(p.x,p.z)); }
jeep.dir = 1; placeJeep(); jeep.dir = 0;
function rideJeep(){
  riding = jeep; jeep.state = 'moving'; jeep.dir = jeep.u < 0.5 ? 1 : -1;
  jeep.g.add(player.g); player.g.position.set(0.4,0.08,0.02); player.g.rotation.set(0,0,0); seat(player);
  yaw = jeep.heading - Math.PI; pitch = 0.3; dist = 9; snapCam = true;
  showHint(jeep.dir > 0 ? 'Heading up to Sunset Point. Drag to look around.' : 'Heading back down the hill.');
}
function updateJeep(dt){
  if (jeep.state !== 'moving'){ placeJeep(); return; }
  jeep.u += jeep.dir * 8 * dt / jeep.len; jeep.spin += 8*dt/0.4; jeep.wheels.forEach(w=>{ w.rotation.x = jeep.spin; });
  if (jeep.u >= 1 || jeep.u <= 0){
    jeep.u = jeep.u >= 1 ? 1 : 0; const atTop = jeep.u === 1; jeep.state = 'parked'; placeJeep(); jeep.dir = 0;
    riding = null; scene.add(player.g); stand(player); showHint(null);
    if (atTop){ P.pos.set(HILL.x + 2, 0, HILL.z + 2); P.rot = Math.atan2(CX-HILL.x, CZ-HILL.z); } else { P.pos.set(jeep.pos.x + 2.5, 0, jeep.pos.z); P.rot = 1.2; }
    resolve(P.pos); P.y = groundY(P.pos.x,P.pos.z); yaw = P.rot - Math.PI; pitch = 0.25; dist = 6.2; snapCam = true; return;
  }
  placeJeep(); P.pos.set(jeep.pos.x, 0, jeep.pos.z); P.rot = jeep.heading;
  if (!drag) yaw = angLerp(yaw, jeep.heading - Math.PI, Math.min(1, dt*2));
}
function hail(a){ a.state = 'stopped'; a.v = 0; a.timer = 25; horn(); }
function enterAuto(a){
  riding = a; a.state = 'driven'; a.v = 0;
  if (a.type === 'camel'){
    a.sit = 0; a.body.position.y = 0; a.legs.forEach(l=>{ l.scale.y = 1; l.position.y = a.legH; }); a.beh = 'idle'; a.circle.r = 0;
    a.g.add(player.g); player.g.position.set(0,1.72,-0.1); player.g.rotation.set(0,0,0); seat(player);
    player.b.lHip.rotation.set(-0.7,0,0.5); player.b.rHip.rotation.set(-0.7,0,-0.5); player.b.lKnee.rotation.x = player.b.rKnee.rotation.x = 1.1;
    yaw = a.heading - Math.PI; pitch = 0.25; dist = 8; snapCam = true;
    showHint('On the camel. W to walk, A and D to steer. Press E to get off.'); return;
  }
  if (a.type === 'scooter'){
    const ahead = V3(a.pos.x + Math.sin(a.heading)*1.6, 0, a.pos.z + Math.cos(a.heading)*1.6), ax = ahead.x, az = ahead.z; resolve(ahead, 0.5);
    if (Math.hypot(ahead.x-ax, ahead.z-az) > 0.05){ a.heading += Math.PI; a.g.rotation.y = a.heading; }
    a.g.add(player.g); player.g.position.set(0,-0.02,-0.3); player.g.rotation.set(0,0,0); seat(player); player.b.lHip.rotation.x = player.b.rHip.rotation.x = -1.05; player.b.lKnee.rotation.x = player.b.rKnee.rotation.x = 1.3; player.b.lSh.rotation.x = player.b.rSh.rotation.x = -1.0;
    yaw = a.heading - Math.PI; pitch = 0.22; dist = 5.2; snapCam = true;
    showHint('Riding the scooter. W and S to ride, A and D to steer, H to honk, V for the rider’s view. Press E to get off.');
    return;
  }
  a.driver.g.position.set(0.28,-0.08,-0.62); a.driver.aL.rotation.x = a.driver.aR.rotation.x = -0.2;
  a.g.add(player.g); player.g.position.set(0,-0.05,0.38); player.g.rotation.set(0,0,0); seat(player);
  yaw = a.heading - Math.PI; pitch = 0.25; dist = 8; snapCam = true;
  showHint('Driving the auto. W and S to drive, A and D to steer, H to honk, V for the view from inside. Press E to get out.');
}
function exitAuto(){
  const a = riding; if (!a) return; insideView = false; viewBtn.textContent = 'Inside view';
  riding = null; a.state = 'parked'; a.v = 0;
  if (a.type === 'auto') startRejoin(a);
  if (a.driver){ a.driver.g.position.set(0,-0.05,0.38); seat(a.driver); }
  a.g.rotation.z = 0;
  scene.add(player.g); stand(player);
  if (a.type === 'camel'){ a.home.set(a.pos.x,0,a.pos.z); a.beh = 'idle'; a.bt = 5; a.circle.r = 1.3; }
  const off = a.type==='camel' ? 2.0 : 1.6; P.pos.set(a.pos.x + Math.cos(a.heading)*off, 0, a.pos.z - Math.sin(a.heading)*off); resolve(P.pos); P.y = groundY(P.pos.x,P.pos.z);
  P.rot = a.heading; yaw = P.rot - Math.PI; dist = 6.2; snapCam = true; showHint(null);
}
const tmpV2 = new THREE.Vector3();
function nearestOnPath(path, x, z){
  let best = {s:0, d:Infinity};
  for (let i=1;i<path.pts.length;i++){ const A = path.pts[i-1], B = path.pts[i], abx = B.x-A.x, abz = B.z-A.z, L2 = abx*abx + abz*abz || 1;
    const k = Math.max(0, Math.min(1, ((x-A.x)*abx + (z-A.z)*abz)/L2)), px = A.x + abx*k, pz = A.z + abz*k, d = Math.hypot(x-px, z-pz);
    if (d < best.d) best = {s: path.cum[i-1] + Math.sqrt(L2)*k, d}; }
  return best;
}
function startRejoin(a){
  let bestLane = a.path, bn = nearestOnPath(a.path, a.pos.x, a.pos.z);
  for (const lane of LANES){ const n = nearestOnPath(lane, a.pos.x, a.pos.z); if (n.d < bn.d - 0.5){ bn = n; bestLane = lane; } }
  a.path = bestLane; a.state = 'rejoin'; a.rj = {s: bn.s, wait: 1.5, t: 0}; a.off = 0; a.offT = 0; a.blockT = 0;
}
function pathPoint(path, sv, out){ const c = path.cum; let lo = 0, hi = c.length-1; while (hi - lo > 1){ const mid = (lo+hi)>>1; if (c[mid] <= sv) lo = mid; else hi = mid; } const seg = c[hi]-c[lo] || 1, k = (sv - c[lo])/seg; return out.copy(path.pts[lo]).lerp(path.pts[hi], Math.max(0,Math.min(1,k))); }
// Keep a safe gap, go round cows and stopped vehicles like Jaipur traffic does, slow down round the roundabout
function laneGap(a, x0, z0, fx, fz){
  let gap = Infinity, still = true;
  const check = (x,z,r,moving)=>{ const dx = x - x0, dz = z - z0, along = dx*fx + dz*fz, lat = Math.abs(dx*fz - dz*fx); if (along > 0.5 && along < 12 && lat < 1.25 + r){ if (along - r < gap){ gap = along - r; still = !moving; } } };
  if (!riding || riding !== a) check(P.pos.x, P.pos.z, 0.4, false);
  for (const o of autos) if (o !== a) check(o.pos.x, o.pos.z, 1.2, o.state === 'route' && o.v > 0.5);
  for (const o of scooters) check(o.pos.x, o.pos.z, 0.6, o.state === 'driven');
  for (const c of camels) check(c.pos.x, c.pos.z, 1.2, c.state === 'driven');
  for (const c of cows) check(c.pos.x, c.pos.z, 1.0, c.beh === 'walk' || c.beh === 'flee');
  live.peers.forEach(e=>{ if (!e.fly) check(e.cur.x, e.cur.z, 0.5, e.moving); });
  return {gap, still};
}
function trafficSpeed(a){
  const fx = Math.sin(a.heading), fz = Math.cos(a.heading);
  const here = laneGap(a, a.pos.x, a.pos.z, fx, fz);
  const base = laneGap(a, a.base.x, a.base.z, fx, fz);
  // stuck behind something that isn't moving: pull out towards the centre and go round it
  if (base.gap < 7 && base.still) a.blockT = (a.blockT || 0) + 1/60; else a.blockT = 0;
  if (a.blockT > 1.0 && !a.honked){ a.honked = true; scareAnimals(a.pos.x + Math.sin(a.heading)*5, a.pos.z + Math.cos(a.heading)*5, 6); if (Math.hypot(a.pos.x-P.pos.x, a.pos.z-P.pos.z) < 25) horn(); }
  if (a.blockT === 0) a.honked = false;
  if (a.blockT > 2.2) a.offT = 2.7;
  else if (a.offT && base.gap > 9) a.offT = 0;
  let vmax = a.sp; if (Math.hypot(a.pos.x - RB.x, a.pos.z - RB.z) < RB.r + 6) vmax = Math.min(vmax, 3.8);
  if (a.offT) vmax = Math.min(vmax, 4);
  const gap = here.gap;
  if (gap < 2.4) return 0; if (gap < 6) return Math.min(vmax, (gap - 2.4)*1.4);
  return vmax;
}
function updateAutos(dt){
  updateJeep(dt);
  for (const a of autos.concat(scooters, camels)){
    if (a.type === 'camel' && a.state === 'parked') continue;
    if (a.state === 'route' || (a.state === 'stopped' && a.v > 0.05)){
      const tgt = a.state === 'route' ? trafficSpeed(a) : 0;
      a.v += (tgt > a.v ? Math.min(tgt - a.v, dt*3) : Math.max(tgt - a.v, -dt*10));
      a.s += a.v*dt; if (a.s >= a.path.len) a.s -= a.path.len;
      a.base = a.base || V3(); pathPoint(a.path, a.s, a.base); const look = pathPoint(a.path, Math.min(a.path.len, a.s + 2.0), tmpV2);
      if (look.distanceToSquared(a.base) > 0.01) a.heading = angLerp(a.heading, Math.atan2(look.x - a.base.x, look.z - a.base.z), Math.min(1, dt*6));
      a.off = a.off || 0; const ot = a.offT || 0; a.off += Math.sign(ot - a.off) * Math.min(Math.abs(ot - a.off), dt*1.4);
      a.pos.set(a.base.x - Math.cos(a.heading)*a.off, 0, a.base.z + Math.sin(a.heading)*a.off);
    } else if (a.state === 'stopped'){
      a.v = 0; a.timer -= dt; if (a.timer < 0 && Math.hypot(a.pos.x-P.pos.x, a.pos.z-P.pos.z) > 6){ a.state = 'route'; }
    } else if (a.state === 'rejoin'){
      const R0 = a.rj; R0.wait -= dt; R0.t += dt;
      if (R0.wait <= 0){
        const near = nearestOnPath(a.path, a.pos.x, a.pos.z); R0.s = Math.max(R0.s, near.s);
        const tgt = pathPoint(a.path, Math.min(a.path.len, R0.s + 5), tmpV2);
        const want = Math.atan2(tgt.x - a.pos.x, tgt.z - a.pos.z); a.heading = angLerp(a.heading, want, Math.min(1, dt*2.2));
        a.v += Math.sign(3.5 - a.v) * Math.min(Math.abs(3.5 - a.v), dt*2);
        const np = tmpV.set(a.pos.x + Math.sin(a.heading)*a.v*dt, 0, a.pos.z + Math.cos(a.heading)*a.v*dt); resolve(np, 1.05); a.pos.copy(np);
        if (near.d < 0.6){ a.state = 'route'; a.s = near.s; a.base = a.base || V3(); pathPoint(a.path, a.s, a.base); }
        else if (R0.t > 25){ a.state = 'route'; a.s = 0; a.v = 0; pathPoint(a.path, 0, a.pos); a.base = a.base || V3(); a.base.copy(a.pos); }
      }
    } else if (a.state === 'parked' && a.type === 'auto'){
      // an auto you left behind goes back to work once you've walked away
      a.parkT = (a.parkT || 0) + dt;
      if (a.parkT > 20 && Math.hypot(a.pos.x-P.pos.x, a.pos.z-P.pos.z) > 25){ a.parkT = 0; a.state = 'route'; a.s = 0; a.v = 0; a.off = 0; a.offT = 0; a.base = a.base || V3(); pathPoint(a.path, 0, a.base); a.pos.copy(a.base); }
    } else if (a.state === 'driven'){
      const thr = ((keys.KeyW||keys.ArrowUp)?1:0) - ((keys.KeyS||keys.ArrowDown)?1:0) - joy.y;
      const steer = ((keys.KeyA||keys.ArrowLeft)?1:0) - ((keys.KeyD||keys.ArrowRight)?1:0) - joy.x;
      const vmax = a.type==='scooter' ? 17 : a.type==='camel' ? 3.4 : 15;
      const tgtV = thr > 0 ? vmax*Math.min(1,thr) : thr < 0 ? -4*Math.min(1,-thr) : 0;
      a.v += Math.sign(tgtV - a.v) * Math.min(Math.abs(tgtV - a.v), dt*(thr===0 ? 7 : 6));
      if (keys.Space) a.v *= Math.max(0, 1 - dt*5);
      const st = Math.max(-1,Math.min(1,steer));
      a.heading += st * dt * (a.type==='scooter'?2.2:a.type==='camel'?1.3:1.6) * (a.type==='camel' ? (Math.abs(a.v)>0.1?1:0.7) : Math.max(-1, Math.min(1, a.v/5)));
      if (a.type==='scooter') a.lean = THREE.MathUtils.lerp(a.lean||0, -st*Math.min(1,Math.abs(a.v)/12)*0.32, Math.min(1,dt*5));
      const np = tmpV.set(a.pos.x + Math.sin(a.heading)*a.v*dt, 0, a.pos.z + Math.cos(a.heading)*a.v*dt);
      const bx = np.x, bz = np.z; resolve(np, a.type==='scooter' ? 0.55 : a.type==='camel' ? 1.2 : 1.05);
      if (Math.hypot(np.x-bx, np.z-bz) > 0.02) a.v *= 0.5;
      a.pos.copy(np); P.pos.set(a.pos.x, 0, a.pos.z); P.rot = a.heading;
      if (!drag) yaw = angLerp(yaw, a.heading - Math.PI, Math.min(1, dt*2.5));
    }
    const dims = a.type==='auto' ? [1.0,0.66] : a.type==='camel' ? [0.7,0.28] : [0.6,0.05];
    a.pos.y = seatOnGround(a.g, a.pos.x, a.pos.z, a.heading, dims[0], dims[1], roadLift(a.pos.x,a.pos.z));
    if (a.type === 'camel'){ if (Math.abs(a.v) > 0.05) a.walk += dt*a.v*1.9; const sw = Math.abs(a.v) > 0.05 ? 1 : 0; a.legs.forEach((l,i)=>{ l.rotation.x = Math.sin(a.walk + (i===0||i===3 ? 0 : Math.PI))*0.45*sw; }); }
    if (a.type==='scooter') a.g.rotation.z = a.state==='driven' ? a.lean : 0; else if (a.type==='camel') a.g.rotation.z += Math.sin(a.walk)*0.04; else if (a.state==='driven') a.g.rotation.z += Math.sin(t*28)*0.004*Math.min(1,Math.abs(a.v));
  }
}
addEventListener('keydown', e=>{ if (mode==='play' && (e.key==='h'||e.key==='H')){ horn(); const src = riding ? riding.pos : P.pos; scareAnimals(src.x, src.z, 14); } });

/* =========================================================
   Shop interiors
   ========================================================= */
let inShop = null, activeScene = scene;
const SHOP_WALL = ['#2E8C87','#E9A9B4','#F2D27A','#7A1A2A','#3B4B8C','#C9853A'];
const KEEPERS = [
  {top:'#F4EDE2',bottom:'#F4EDE2',head:'turban',headColor:'#D8342B',skin:'#B07A57'},
  {top:'#B83A6B',bottom:'#B83A6B',dress:true,head:'odhni',headColor:'#F2C230',skin:'#C98E6B'},
  {top:'#F4EDE2',bottom:'#E8E0D0',head:'hair',headColor:'#E9E4DC',skin:'#9C6A4C'},
  {top:'#2A2A33',bottom:'#F4EDE2',head:'turban',headColor:'#E8B33A',skin:'#B07A57'},
  {top:'#7A8C5A',bottom:'#F4EDE2',head:'turban',headColor:'#B83A6B',skin:'#8C5A3C'},
  {top:'#E05A2B',bottom:'#F4EDE2',head:'hair',headColor:'#1E1512',skin:'#9C6A4C'},
];
const GREET = [['Aaiye, aaiye! Kya dikhaun?','Come in! What can I show you?'],['Nayi chudiyan aayi hain!','New bangles just arrived!'],['Garam jalebi le lijiye!','Have some hot jalebi!'],['Shuddh chandi, shuddh sona.','Pure silver, pure gold.'],['Haath ki bani juttiyan!','Hand-stitched juttis!'],['Taaza masale, seedhe mandi se.','Fresh spices, straight from the market.']];
/* A shopkeeper behind the counter who turns to face you and greets you. */
function addKeeper(sc, look, greet, z){
  const ch = makePerson(look); ch.g.position.set(0.9, 0, z); sc.add(ch.g); sc.userData.keeper = ch;
  fontReady.then(()=>{ const b = bubble(greet[0], greet[1]); b.position.set(0.9, 2.55, z); sc.add(b); });
}
function bubble(line1, line2){
  const [c,x] = cv(10,10); x.font = '600 40px Hind, system-ui, sans-serif';
  const w1 = x.measureText(line1).width; x.font = '400 32px Hind, system-ui, sans-serif'; const w2 = x.measureText(line2).width;
  const W = Math.ceil(Math.max(w1,w2) + 70), H = 130; c.width = W; c.height = H + 24;
  x.fillStyle = 'rgba(255,248,238,0.97)'; const r = 30;
  x.beginPath(); x.moveTo(r,0); x.lineTo(W-r,0); x.quadraticCurveTo(W,0,W,r); x.lineTo(W,H-r); x.quadraticCurveTo(W,H,W-r,H); x.lineTo(W/2+16,H); x.lineTo(W/2,H+22); x.lineTo(W/2-16,H); x.lineTo(r,H); x.quadraticCurveTo(0,H,0,H-r); x.lineTo(0,r); x.quadraticCurveTo(0,0,r,0); x.fill();
  x.fillStyle = '#3B1E19'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '600 40px Hind, system-ui, sans-serif'; x.fillText(line1, W/2, 44);
  x.fillStyle = '#7A4A40'; x.font = '400 32px Hind, system-ui, sans-serif'; x.fillText(line2, W/2, 92);
  const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; tx.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, toneMapped:false})); s.scale.set(W/(H+24)*0.75, 0.75, 1); return s;
}
const ROOM = {W:7.2, D:10, H:4.4};
function shelfWall(sc, z, rx, w, levels, fill){
  for (let l=0; l<levels; l++){ const y = 0.45 + l*0.75; box(sc,w,0.05,0.45,'#5A3A26',rx,y,z,'stone'); fill(y+0.05, l); }
  box(sc,w,0.04,0.04,'#5A3A26',rx,0.45+levels*0.75,z,'stone');
}
function buildInterior(kind, stocked){
  const sc = new THREE.Scene(), {W,D,H} = ROOM, wall = SHOP_WALL[kind];
  sc.fog = new THREE.Fog(0x1a0f0a, 30, 60);
  sc.background = new THREE.Color('#1A0F0A');
  const fl = add(sc,UPLANE,mat('#D8C7AA','paving'),0,0,0,W,D+2,1,0,-Math.PI/2);
  box(sc,W,0.1,D,'#F2E6D6',0,H,0);
  box(sc,W,H,0.2,wall,0,0,-D/2);
  box(sc,0.2,H,D,wall,-W/2,0,0); box(sc,0.2,H,D,wall,W/2,0,0);
  add(sc,arcadeGeo(W,1,H,2.6,3.5,0.3),M(wall),0,0,D/2);
  plane(sc,M_ARCH,0,3.5*1.15/2,D/2+0.16,2.6*1.32,3.5*1.15);
  const outside = add(sc,UPLANE,new THREE.MeshBasicMaterial({color: timeMode==='dusk' ? '#C27F62' : '#F3DCC0'}),0,2,D/2+1.2,4,5);
  sc.userData.outside = outside;
  friezeStrip(sc,W-0.4,0.4,0,H-0.5,-D/2+0.11);
  for (const sx of [-1,1]) { const f = friezeStrip(sc,D-0.4,0.4,sx*(W/2-0.11),H-0.5,0,-sx*Math.PI/2); }
  // lights and fan
  sc.add(new THREE.HemisphereLight(lin('#FFE6C8'), lin('#5A3A26'), 0.7));
  for (const z of [-2.5, 1.5]){ const pl = new THREE.PointLight(lin('#FFD39A'), 1.6, 16, 1.6); pl.position.set(0,H-0.6,z); sc.add(pl); cyl(sc,0.01,0.45,'#222',0,H-0.45,z,4,'stone'); add(sc,SPH,M_LIGHT,0,H-0.6,z,0.12,0.12,0.12); }
  const fan = new THREE.Group(); cyl(fan,0.12,0.12,'#3A3A3A',0,0,0,12,'stone'); for (let i=0;i<3;i++){ const b = add(fan,UBOX,M('#6B6B6B','stone'),0,0.05,0,0.22,0.02,1.1); b.rotation.y = i*Math.PI*2/3; b.position.set(Math.sin(i*Math.PI*2/3)*0.6,0.05,Math.cos(i*Math.PI*2/3)*0.6); }
  fan.position.set(0,H-0.45,-0.5); sc.add(fan); cyl(sc,0.02,0.35,'#3A3A3A',0,H-0.35,-0.5,4,'stone'); sc.userData.fan = fan;
  // counter + keeper
  const cz = -D/2 + 2.6;
  if (kind===2 || kind===3){ box(sc,W-1.6,0.9,0.8,'#6B4530',0,0,cz,'stone'); add(sc,UBOX,M_GLASS_SHOP,0,1.15,cz,W-1.6,0.5,0.8); box(sc,W-1.6,0.04,0.8,'#E8DCC8',0,0.9,cz,'stone'); }
  else box(sc,W-1.6,1.0,0.8,'#6B4530',0,0,cz,'stone');
  sc.userData.keeper = null; sc.userData.counterZ = cz;
  if (stocked) addKeeper(sc, KEEPERS[kind % KEEPERS.length], GREET[kind] || GREET[0], cz - 0.9);
  const cols = ['#E8B33A','#D8342B','#2E8C87','#B83A6B','#3B4B8C','#F2C230','#5E8F3A','#E05A2B','#F4EDE2','#7E3FA0'];
  const C = () => cols[Math.floor(Math.random()*cols.length)];
  if (!stocked){ /* empty shelves until the owner lists products */ }
  else if (kind===0){ // textiles: folded stacks, hanging sarees, white gaddi
    shelfWall(sc,-D/2+0.35,0,W-0.6,4,(y)=>{ for (let x=-W/2+0.6; x<W/2-0.5; x+=0.55){ const n = 2+Math.floor(Math.random()*4); for (let k=0;k<n;k++) box(sc,0.48,0.1,0.38,C(),x,y+k*0.11,-D/2+0.38,'stone'); } });
    for (const sx of [-1,1]) for (let z=-2.8; z<3.5; z+=0.42){ box(sc,0.03,2.2,0.36,C(),sx*(W/2-0.35),0.9,z,'stone'); }
    for (const sx of [-1,1]) box(sc,0.05,0.05,6.6,'#8C6A3A',sx*(W/2-0.35),3.12,0.3,'stone');
    box(sc,W-1.4,0.28,3.2,'#F4F0E8',0,0,-0.2,'stone'); for (const x of [-2,-0.7,0.6,1.9]) add(sc,CYL(14),M('#F4F0E8','stone'),x,0.42,-1.6,0.16,0.7,0.16,0,0,Math.PI/2);
    for (let i=0;i<5;i++) box(sc,0.9,0.05,0.7,C(),-2+i*1,0.29,-0.4+Math.random()*0.8,'stone');
  } else if (kind===1){ // bangles
    for (const sx of [-1,1]) for (let r=0;r<6;r++) for (let c2=0;c2<4;c2++){ const z = -3+c2*1.6, y = 0.7+r*0.45, col = C(); cyl(sc,0.015,0.38,'#5A3A26',sx*(W/2-0.3),y-0.05,z,4,'stone'); for (let k=0;k<6;k++) add(sc,TOR,M(col,'stone',{metalness:0.4,roughness:0.35}),sx*(W/2-0.3),y+k*0.05,z,0.09,0.09,0.09,0,Math.PI/2); }
    shelfWall(sc,-D/2+0.35,0,W-0.6,4,(y)=>{ for (let x=-W/2+0.7; x<W/2-0.5; x+=0.42){ const col = C(); for (let k=0;k<8;k++) add(sc,TOR,M(col,'stone',{metalness:0.5,roughness:0.3}),x,y+0.1,-D/2+0.4+k*0.025,0.12,0.12,0.12); } });
    for (let i=0;i<6;i++){ const col = C(); for (let k=0;k<4;k++) add(sc,TOR,M(col,'stone',{metalness:0.5,roughness:0.3}),-2.4+i*0.95,1.02+k*0.03,cz,0.12,0.12,0.12,0,-Math.PI/2); }
  } else if (kind===2){ // sweets
    const sweets = [['#F2A33A','ladoo'],['#F4EDE2','barfi'],['#E8962A','jalebi'],['#8FBF5A','barfi'],['#F7D774','ladoo'],['#C9A27A','barfi']];
    sweets.forEach(([col,t2],i)=>{ const x = -2.4+i*0.97; box(sc,0.8,0.04,0.55,'#C9C2B5',x,0.92,cz,'stone');
      for (let k=0;k<9;k++){ const px = x-0.27+(k%3)*0.27, pz = cz-0.18+Math.floor(k/3)*0.18;
        if (t2==='ladoo') add(sc,SPH,M(col,'stone'),px,1.02,pz,0.07,0.07,0.07); else if (t2==='barfi') add(sc,UBOX,M(col,'stone'),px,1.0,pz,0.13,0.05,0.13,Math.PI/4); else add(sc,TOR,M(col,'stone',{roughness:0.3}),px,1.0,pz,0.07,0.07,0.07,0,Math.PI/2); } });
    shelfWall(sc,-D/2+0.35,0,W-0.6,4,(y)=>{ for (let x=-W/2+0.6; x<W/2-0.5; x+=0.5){ box(sc,0.4,0.22,0.3,Math.random()<0.5?'#B82B2B':'#E8B33A',x,y,-D/2+0.4,'stone'); } });
    for (const sx of [-1,1]) for (let i=0;i<3;i++){ box(sc,0.6,0.75,0.6,'#6B4530',sx*(W/2-1),0,-0.5+i*1.6,'stone'); cyl(sc,0.25,0.3,'#9C9C9C',sx*(W/2-1),0.75,-0.5+i*1.6,14,'stone'); }
  } else if (kind===3){ // jewellery
    for (const sx of [-1,1]) for (let i=0;i<3;i++){ const z = -2.2+i*2.0; box(sc,0.8,1.0,1.5,'#4A2418',sx*(W/2-0.7),0,z,'stone'); box(sc,0.7,0.03,1.4,'#7A1020',sx*(W/2-0.7),1.0,z,'stone'); add(sc,UBOX,M_GLASS_SHOP,sx*(W/2-0.7),1.25,z,0.8,0.5,1.5);
      for (let k=0;k<4;k++){ add(sc,new THREE.TorusGeometry(0.13,0.015,6,24,Math.PI),M('#E8C060','stone',{metalness:0.9,roughness:0.25}),sx*(W/2-0.7),1.04,z-0.5+k*0.33,1,1,1,0,-Math.PI/2); add(sc,SPH,M(k%2?'#C2203A':'#2E8C5A','stone',{roughness:0.15}),sx*(W/2-0.7),1.05,z-0.5+k*0.33+0.13,0.035,0.035,0.035); } }
    box(sc,W-0.6,2.4,0.05,'#8FA9B0',0,0.9,-D/2+0.13,'stone');
    for (let i=0;i<6;i++){ add(sc,new THREE.TorusGeometry(0.16,0.018,6,24,Math.PI),M('#E8C060','stone',{metalness:0.9,roughness:0.25}),-2.4+i*0.95,0.93,cz,1,1,1,0,-Math.PI/2); }
  } else if (kind===4){ // juttis
    for (const sx of [-1,1]) shelfWall(sc,0,sx*(W/2-0.35),0.5,5,(y)=>{});
    for (const sx of [-1,1]) for (let l=0;l<5;l++) for (let z=-3.8; z<3.8; z+=0.34){ const y = 0.5+l*0.75; const col = C(); add(sc,SPH,M(col,'stone'),sx*(W/2-0.35),y+0.06,z,0.09,0.07,0.15); add(sc,SPH,M('#F2C230','stone'),sx*(W/2-0.35),y+0.1,z+0.08,0.03,0.03,0.03); }
    for (const sx of [-1,1]) box(sc,0.5,0.05*1,7.6,'#5A3A26',sx*(W/2-0.35),0.45,0,'stone');
    shelfWall(sc,-D/2+0.35,0,W-0.6,4,(y)=>{ for (let x=-W/2+0.6; x<W/2-0.5; x+=0.4){ add(sc,SPH,M(C(),'stone'),x,y+0.06,-D/2+0.4,0.15,0.07,0.09); } });
    for (let i=0;i<3;i++) box(sc,1.2,0.45,0.6,'#8C5A3C',-1.5+i*1.5,0,1.5,'stone');
  } else { // spices
    const sp = ['#C23B3B','#E8B33A','#8A5A2E','#5E7A34','#E05A2B','#D9C7A0','#6B2A1A'];
    for (let i=0;i<7;i++){ const x = -2.6+i*0.87; cyl(sc,0.36,0.6,'#B9A07A',x,0,-0.4,12,'stone'); cone(sc,0.33,0.32,sp[i],x,0.6,-0.4,14,'stone'); }
    for (let i=0;i<6;i++){ const x = -2.2+i*0.9; cyl(sc,0.32,0.55,'#B9A07A',x,0,1.2,12,'stone'); cone(sc,0.29,0.28,sp[(i+3)%7],x,0.55,1.2,14,'stone'); }
    shelfWall(sc,-D/2+0.35,0,W-0.6,4,(y)=>{ for (let x=-W/2+0.6; x<W/2-0.5; x+=0.32){ add(sc,CYL(12),new THREE.MeshStandardMaterial({color:lin(sp[Math.floor(Math.random()*7)]),roughness:0.3}),x,y+0.15,-D/2+0.4,0.1,0.3,0.1); } });
    for (const sx of [-1,1]) for (let z=-3; z<3.5; z+=0.9) box(sc,0.04,0.7,0.02,'#C9A27A',sx*(W/2-0.15),2.6,z,'stone');
  }
  return sc;
}
function enterShop(door){
  const key = door.kind === 6 ? 'cafe:'+door.name+(door.biz?':'+door.biz.name:'') : door.kind + (door.biz ? ':open' : door.landmark ? ':sample' : ':empty');
  const okey = door.kind === 7 ? 'office:'+door.slot+':'+(door.co ? door.co.name + door.co.jobs.map(j=>j.title).join() : '') : key;
  if (door.kind === 7){ enterFloor(door); return; }
  if (!interiorCache[okey]) interiorCache[okey] = door.kind === 8 ? buildLobby(door) : door.kind === 6 ? buildCafe(door) : buildInterior(door.kind, !!door.biz || !!door.landmark);
  const sc0 = interiorCache[okey];
  const sc = sc0;
  sc.environment = scene.environment;
  sc.userData.outside.material.color.set(timeMode==='dusk' ? '#C27F62' : '#F3DCC0');
  inShop = {door, scene:sc, saved:P.pos.clone(), dims: sc.userData.dims || ROOM};
  activeScene = sc; sc.add(player.g);
  P.pos.set(0,0,inShop.dims.D/2-1.2); P.rot = Math.PI; yaw = 0; pitch = 0.18; dist = 3.4; snapCam = true;
  if (composer && composer.ssao) composer.ssao.scene = sc;
  $('area').textContent = door.name; $('fact').textContent = door.kind===8 ? 'Take the lift to any floor. Free floors can be registered by IT companies.' : door.kind===7 ? (door.co ? door.co.about : 'Check the jobs board on the right wall.') : door.biz ? (door.biz.address || door.biz.desc) : (door.kind===6 ? 'Grab a seat and say hi to someone.' : 'Have a look around. Walk back out through the door to leave.'); lastArea = door.name;
}
const interiorCache = {};
const interiorCacheReady = k => !!interiorCache[k];
function enterFloor(f){
  const key = 'floor:'+f.slot+':'+(f.co ? f.co.name + (f.co.logo||'') + f.co.jobs.map(j=>j.title).join() : '');
  if (!interiorCache[key]) interiorCache[key] = buildFloor(f);
  const sc = interiorCache[key]; sc.environment = scene.environment;
  if (!inShop) inShop = {saved:P.pos.clone()};
  const street = lobbyDoors.find(l=>l.tower===f.tower);
  inShop = {door:f, scene:sc, saved:inShop.saved, dims:sc.userData.dims, floor:true, street};
  activeScene = sc; sc.add(player.g); if (composer && composer.ssao) composer.ssao.scene = sc;
  P.pos.set(0,0,sc.userData.dims.D/2-1.6); P.rot = Math.PI; yaw = 0; pitch = 0.2; dist = 3.6; snapCam = true; P.y = 0;
  $('area').textContent = `${floorName(f)}`; $('fact').textContent = `Tower ${f.tower}, floor ${f.n}${f.co && f.co.about ? '. ' + f.co.about : f.co ? '' : '. This floor is free for an IT company.'}`; lastArea = floorName(f);
}
function exitShop(){
  closeProducts(); closeJobs(); closeLift(); if (!$('chatWrap').hidden) closeChat();
  const d = inShop.floor ? inShop.street : inShop.door; inShop = null; activeScene = scene; scene.add(player.g);
  if (composer && composer.ssao) composer.ssao.scene = scene;
  P.pos.set(d.x + Math.sin(d.rot)*0.8, 0, d.z + Math.cos(d.rot)*0.8); resolve(P.pos); P.rot = d.rot; yaw = P.rot - Math.PI; pitch = 0.22; dist = 6.2; snapCam = true; lastArea = '';
}
function shopResolve(p){
  const {W,D} = inShop.dims || ROOM, ud = inShop.scene.userData, cz = ud.counterZ;
  p.x = Math.max(-W/2+0.45, Math.min(W/2-0.45, p.x));
  if (p.z < cz+0.75) p.z = cz+0.75; if (p.z < -D/2+0.45) p.z = -D/2+0.45;
  if (inShop.floor && p.z > D/2-0.5) p.z = D/2-0.5;
  for (const r of (ud.rects||[])){ if (p.x>r.minX-0.35 && p.x<r.maxX+0.35 && p.z>r.minZ-0.35 && p.z<r.maxZ+0.35){ const l = p.x-(r.minX-0.35), rt = (r.maxX+0.35)-p.x, tp = p.z-(r.minZ-0.35), bt = (r.maxZ+0.35)-p.z, m = Math.min(l,rt,tp,bt); if (m===l) p.x = r.minX-0.35; else if (m===rt) p.x = r.maxX+0.35; else if (m===tp) p.z = r.minZ-0.35; else p.z = r.maxZ+0.35; } }
  for (const c of (inShop.scene.userData.circles||[])){ const dx = p.x-c.x, dz = p.z-c.z, d = Math.hypot(dx,dz); if (d < c.r && d > 1e-6){ p.x = c.x + dx/d*c.r; p.z = c.z + dz/d*c.r; } }
  if (!inShop.floor && p.z > D/2-0.4 && Math.abs(p.x) > 1.0) p.z = D/2-0.4;
}

/* =========================================================
   Satellite map
   ========================================================= */
const SAT = {x0:-215, x1:295, z0:-275, z1:235, size: lowEnd ? 1536 : 2048, canvas:null};
function captureSatellite(){
  try {
    const w = SAT.x1-SAT.x0, h = SAT.z1-SAT.z0, S = SAT.size;
    const oc = new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, 10, 2000);
    const cx = (SAT.x0+SAT.x1)/2, cz = (SAT.z0+SAT.z1)/2;
    oc.up.set(0,0,-1); oc.position.set(cx, 900, cz); oc.lookAt(cx, 0, cz); oc.updateMatrixWorld();
    const rt = new THREE.WebGLRenderTarget(S, S); rt.texture.encoding = THREE.sRGBEncoding;
    const prevMode = timeMode, prevFog = scene.fog, hidden = [];
    applyTime('day'); scene.fog = null;
    scene.traverse(o=>{ if (o.isSprite && o.visible){ o.visible = false; hidden.push(o); } });
    if (sky) sky.visible = false; dynamicRoot.visible = false;
    const sc2 = sunLight.shadow.camera, prev = [sc2.left,sc2.right,sc2.top,sc2.bottom];
    Object.assign(sc2,{left:-300,right:300,top:300,bottom:-300}); sc2.updateProjectionMatrix();
    sunLight.target.position.set(cx,0,cz); sunLight.position.set(cx + sunDir.x*400, sunDir.y*400, cz + sunDir.z*400); sunLight.target.updateMatrixWorld(); sunLight.updateMatrixWorld();
    renderer.setRenderTarget(rt); renderer.render(scene, oc); renderer.setRenderTarget(null);
    const px = new Uint8Array(S*S*4); renderer.readRenderTargetPixels(rt,0,0,S,S,px);
    [sc2.left,sc2.right,sc2.top,sc2.bottom] = prev; sc2.updateProjectionMatrix();
    hidden.forEach(o=>o.visible = true); if (sky) sky.visible = true; dynamicRoot.visible = true; scene.fog = prevFog; applyTime(prevMode);
    rt.dispose();
    const [c,x] = cv(S,S), img = x.createImageData(S,S);
    for (let y=0;y<S;y++){ const src = (S-1-y)*S*4; img.data.set(px.subarray(src, src+S*4), y*S*4); }
    x.putImageData(img,0,0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(235,225,215,1)'; x.fillRect(0,0,S,S); x.globalCompositeOperation = 'source-over';
    SAT.canvas = c;
  } catch(err){ console.warn('satellite capture failed', err); }
}
const satPx = (x,z) => [(x-SAT.x0)/(SAT.x1-SAT.x0)*SAT.size, (z-SAT.z0)/(SAT.z1-SAT.z0)*SAT.size];

// Big map view
const bigmap = $('bigmap'), bctx = bigmap.getContext('2d'), mapWrap = $('mapWrap');
const view = {cx:20, cz:-10, scale:1.6};   // scale = screen px per world unit
let mapOpen = false;
function openMap(){
  if (!SAT.canvas) captureSatellite();
  mapOpen = true; mapWrap.hidden = false; for (const k in keys) keys[k] = false;
  const me = flying ? drone : P.pos; view.cx = me.x; view.cz = me.z; view.scale = Math.min(innerWidth, innerHeight)/260;
  sizeMap(); drawBigMap();
}
function closeMap(){ mapOpen = false; mapWrap.hidden = true; canvas.focus(); }
function sizeMap(){ const d = Math.min(devicePixelRatio,2); bigmap.width = innerWidth*d; bigmap.height = innerHeight*d; bctx.setTransform(d,0,0,d,0,0); }
const toScreen = (x,z) => [innerWidth/2 + (x-view.cx)*view.scale, innerHeight/2 + (z-view.cz)*view.scale];
const toWorld = (sx,sy) => [view.cx + (sx-innerWidth/2)/view.scale, view.cz + (sy-innerHeight/2)/view.scale];
let mapHits = [];
function pillText(ctx,text,x,y,bg,fg){
  ctx.font = '600 14px Hind, system-ui, sans-serif'; const w = ctx.measureText(text).width + 20, h = 26;
  ctx.fillStyle = bg; ctx.beginPath(); const r = 13; ctx.moveTo(x-w/2+r,y-h/2); ctx.arcTo(x+w/2,y-h/2,x+w/2,y+h/2,r); ctx.arcTo(x+w/2,y+h/2,x-w/2,y+h/2,r); ctx.arcTo(x-w/2,y+h/2,x-w/2,y-h/2,r); ctx.arcTo(x-w/2,y-h/2,x+w/2,y-h/2,r); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,x,y+1);
  return {x0:x-w/2,x1:x+w/2,y0:y-h/2,y1:y+h/2};
}
function drawBigMap(){
  if (!mapOpen) return;
  const W = innerWidth, H = innerHeight;
  bctx.fillStyle = '#B79C7C'; bctx.fillRect(0,0,W,H);
  if (SAT.canvas){ const [ax,ay] = toScreen(SAT.x0,SAT.z0); bctx.imageSmoothingQuality = 'high'; bctx.drawImage(SAT.canvas, ax, ay, (SAT.x1-SAT.x0)*view.scale, (SAT.z1-SAT.z0)*view.scale); }
  mapHits = [];
  const placed = []; const overlaps = r => placed.some(q=>r.x0<q.x1+4 && r.x1>q.x0-4 && r.y0<q.y1+2 && r.y1>q.y0-2);
  PLACES.forEach(p=>{ const [x,y] = toScreen(p.x,p.z); bctx.fillStyle = '#B85C48'; bctx.beginPath(); bctx.arc(x,y,5,0,Math.PI*2); bctx.fill();
    bctx.font = '600 14px Hind, system-ui, sans-serif'; const w = bctx.measureText(p.name).width + 20; let ly = y-20, r = {x0:x-w/2,x1:x+w/2,y0:ly-13,y1:ly+13};
    if (overlaps(r)){ ly = y+20; r = {x0:x-w/2,x1:x+w/2,y0:ly-13,y1:ly+13}; }
    if (overlaps(r)){ mapHits.push({r:{x0:x-8,x1:x+8,y0:y-8,y1:y+8}, go:()=>goToPlace(p)}); return; }
    placed.push(r); pillText(bctx,p.name,x,ly,'rgba(255,244,234,.94)','#3B1E19'); mapHits.push({r, go:()=>goToPlace(p)}); });
  npcs.forEach(n=>{ const [x,y] = toScreen(n.p.pos[0],n.p.pos[1]); bctx.fillStyle = '#EE9C14'; bctx.strokeStyle = '#3B1E19'; bctx.lineWidth = 2; bctx.beginPath(); bctx.arc(x,y,7,0,Math.PI*2); bctx.fill(); bctx.stroke();
    if (view.scale > 2.2){ const r = pillText(bctx,n.p.name.split(' ')[0],x,y+20,'rgba(238,156,20,.95)','#3B1E19'); mapHits.push({r, go:()=>goToNpc(n)}); } mapHits.push({r:{x0:x-10,x1:x+10,y0:y-10,y1:y+10}, go:()=>goToNpc(n)}); });
  lobbyDoors.forEach(l=>{ const [x,y] = toScreen(l.x,l.z); const r = pillText(bctx,`Tower ${l.tower} · go inside`,x,y+22,'rgba(46,140,90,.95)','#fff'); mapHits.push({r, go:()=>{ if (riding) exitAuto(); if (inShop) exitShop(); setFly(false); enterShop(l); }}); });
  bizByDoor.forEach((b,i)=>{ const d = shopDoors[i], [x,y] = toScreen(d.x,d.z); bctx.fillStyle = '#2E8C5A'; bctx.strokeStyle = '#fff'; bctx.lineWidth = 2; bctx.fillRect(x-6,y-6,12,12); bctx.strokeRect(x-6,y-6,12,12); if (view.scale > 2.6){ const r = pillText(bctx,b.name,x,y-18,'rgba(46,140,90,.95)','#fff'); mapHits.push({r, go:()=>goToDoor(d)}); } });
  live.peers.forEach(e=>{ const [x,y] = toScreen(e.cur.x,e.cur.z); bctx.fillStyle = '#34C27A'; bctx.strokeStyle = '#fff'; bctx.lineWidth = 2; bctx.beginPath(); bctx.arc(x,y,7,0,Math.PI*2); bctx.fill(); bctx.stroke(); if (view.scale > 2.2) pillText(bctx,peerName(e),x,y+20,'rgba(24,44,36,.9)','#fff'); });
  const me = flying ? drone : P.pos, [mx,my] = toScreen(me.x,me.z);
  bctx.save(); bctx.translate(mx,my); bctx.rotate(flying ? -yaw : -P.rot+Math.PI);
  bctx.fillStyle = '#FFFFFF'; bctx.strokeStyle = '#3B1E19'; bctx.lineWidth = 2.5; bctx.beginPath(); bctx.moveTo(0,-14); bctx.lineTo(10,10); bctx.lineTo(0,5); bctx.lineTo(-10,10); bctx.closePath(); bctx.fill(); bctx.stroke(); bctx.restore();
  pillText(bctx,'You',mx,my+24,'#FFFFFF','#3B1E19');
}
{
  const pts = new Map(); let moved = 0, pinch0 = null;
  bigmap.addEventListener('pointerdown', e=>{ bigmap.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); moved = 0; if (pts.size===2){ const [a,b] = [...pts.values()]; pinch0 = {d:Math.hypot(a.x-b.x,a.y-b.y), s:view.scale}; } });
  bigmap.addEventListener('pointermove', e=>{ const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX-p.x, dy = e.clientY-p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size===2 && pinch0){ const [a,b] = [...pts.values()]; view.scale = Math.max(0.6, Math.min(14, pinch0.s*Math.hypot(a.x-b.x,a.y-b.y)/pinch0.d)); moved += 10; }
    else { view.cx -= dx/view.scale; view.cz -= dy/view.scale; moved += Math.abs(dx)+Math.abs(dy); }
    drawBigMap(); });
  const up = e=>{ const p = pts.get(e.pointerId); pts.delete(e.pointerId); if (pts.size<2) pinch0 = null;
    if (p && moved < 6 && e.type==='pointerup'){
      const hit = [...mapHits].reverse().find(h=>e.clientX>=h.r.x0 && e.clientX<=h.r.x1 && e.clientY>=h.r.y0 && e.clientY<=h.r.y1);
      if (hit){ hit.go(); closeMap(); return; }
      const [wx,wz] = toWorld(e.clientX,e.clientY);
      if (Math.hypot(wx-CX,wz-CZ) < 300){ if (riding) exitAuto(); if (inShop) exitShop(); setFly(false); P.pos.set(wx,0,wz); resolve(P.pos); snapCam = true; closeMap(); }
    } };
  bigmap.addEventListener('pointerup', up); bigmap.addEventListener('pointercancel', up);
  bigmap.addEventListener('wheel', e=>{ e.preventDefault(); const [wx,wz] = toWorld(e.clientX,e.clientY); view.scale = Math.max(0.6, Math.min(14, view.scale*Math.exp(-e.deltaY*0.0015))); const [nx,nz] = toWorld(e.clientX,e.clientY); view.cx += wx-nx; view.cz += wz-nz; drawBigMap(); }, {passive:false});
  $('zin').addEventListener('click', ()=>{ view.scale = Math.min(14, view.scale*1.4); drawBigMap(); });
  $('zout').addEventListener('click', ()=>{ view.scale = Math.max(0.6, view.scale/1.4); drawBigMap(); });
  $('mapClose').addEventListener('click', closeMap);
  $('mapBtn').addEventListener('click', openMap);
  $('minimap').addEventListener('click', openMap);
  addEventListener('keydown', e=>{ if (mode!=='play') return; if (e.key==='m'||e.key==='M'){ mapOpen ? closeMap() : openMap(); } else if (e.key==='Escape' && mapOpen) closeMap(); });
  addEventListener('resize', ()=>{ if (mapOpen){ sizeMap(); drawBigMap(); } });
}

/* =========================================================
   One action button: meet, hail, ride, enter, leave
   ========================================================= */
let action = null, actionKey = '';
function showHint(text){ const h = $('flyHint'); if (text){ h.textContent = text; h.hidden = false; } else h.hidden = true; }
function computeAction(){
  if (mode!=='play' || cardOpen || flying || mapOpen || prod) return null;
  if (inShop){
    const ud = inShop.scene.userData, R2 = inShop.dims;
    if (liftState) return null;
    { const nl = nearestLift(); if (nl) return {key:'call'+nl.x, label:'Call the lift', fn:()=>callLift(nl)}; }
    if (ud.lobby){ return P.pos.z > R2.D/2 - 2.2 ? {key:'out', label:'Step outside', fn:exitShop} : null; }
    if (ud.floor){
      if (Math.hypot(ud.reception.x-P.pos.x, ud.reception.z-P.pos.z) < 1.8) return {key:'rec', label:'Talk to the receptionist', fn:openReception};
      if (Math.hypot(ud.jobsSpot.x-P.pos.x, ud.jobsSpot.z-P.pos.z) < 2.2) return {key:'jobs', label:'See open roles', fn:openJobs}; return null; }
    for (const tb of (ud.tables||[])){ if (Math.hypot(tb.x-P.pos.x, tb.z-P.pos.z) < 2.0 && tb.seats.some(s=>!s.npc)){ return {key:'tbl'+tb.x+tb.z, label:'Sit down and join the chat', fn:()=>sitAt(tb, 'cafe:'+inShop.door.name, {title:inShop.door.name, sub:'Chat with people at this café', color:'#7A5638'}, inShop.scene)}; } }
    if (ud.office && ud.jobsSpot && Math.hypot(ud.jobsSpot.x-P.pos.x, ud.jobsSpot.z-P.pos.z) < 2.2) return {key:'jobs', label:'See open roles', fn:openJobs};
    if (P.pos.z < ud.counterZ + 1.7){ const b0 = inShop.door.biz; if (b0 && b0.products.length) return {key:'counter', label: ud.cafe ? 'See the menu' : 'See what they sell', fn:openProducts}; if (!b0 && (inShop.door.landmark || inShop.door.kind === 6)) return {key:'counter', label: ud.cafe ? 'See the menu' : 'See what they sell', fn:openProducts}; if (!b0 && db && myId) return {key:'claim', label:'Is this yours? Register it', fn:openBiz}; }
    return P.pos.z > R2.D/2 - 2.2 ? {key:'out', label:'Step outside', fn:exitShop} : null;
  }
  for (const tb of outdoorTables){ if (!riding && Math.hypot(tb.x-P.pos.x, tb.z-P.pos.z) < 1.8 && tb.seats.some(s=>!s.npc)){ return {key:'otbl'+tb.x, label:'Sit down and join the chat', fn:()=>sitAt(tb, 'cafe:'+tb.place, {title:tb.place, sub:'Chat with people at this café', color:'#7A5638'}, scene)}; } }
  if (sitting && sitting.free) return {key:'standup', label:'Stand up', fn:standUp};
  for (const bd2 of BOARDS){ if (Math.hypot(bd2.x-P.pos.x, bd2.z-P.pos.z) < 2.6) return {key:'board', label:'Read the community board', fn:()=>openComm('meets')}; }
  { const ks = kundSeat(); if (ks && !riding) return {key:'kund', label:'Sit on the steps', fn:()=>sitFree(ks.x, ks.z, ks.rot, ks.y, true)}; }
  for (const b of BENCHES){ if (!riding && Math.hypot(b.x-P.pos.x, b.z-P.pos.z) < 1.7) return {key:'bench', label:'Sit on the bench', fn:()=>sitFree(b.x, b.z, b.rot, b.y, false)}; }
  if (riding) return riding.type==='jeep' ? null : {key:'getout', label: riding.type==='scooter' ? 'Get off the scooter' : riding.type==='camel' ? 'Get off the camel' : 'Get out of the auto', fn:exitAuto};
  if (jeep.state !== 'moving' && Math.hypot(jeep.pos.x-P.pos.x, jeep.pos.z-P.pos.z) < 4.2) return {key:'jeep'+jeep.u, label: jeep.u < 0.5 ? 'Take the jeep up to Sunset Point' : 'Take the jeep back down', fn:rideJeep};
  { let bc = null, bd = 3.0; for (const c of camels){ const d = Math.hypot(c.pos.x-P.pos.x, c.pos.z-P.pos.z); if (d < bd){ bd = d; bc = c; } } if (bc) return {key:'camel'+camels.indexOf(bc), label:'Ride the camel', fn:()=>enterAuto(bc)}; }
  { let bp = null, bd0 = 3.2; live.peers.forEach(e=>{ if (e.fly) return; const d = Math.hypot(e.cur.x-P.pos.x, e.cur.z-P.pos.z); if (d < bd0){ bd0 = d; bp = e; } }); if (bp && !riding){ const mm = bp.by && memberMap.get(bp.by); return mm ? {key:'meet'+bp.peerId, label:`Meet ${peerName(bp)}`, fn:()=>{ waveAt(bp); openCard(mm); }} : {key:'wave'+bp.peerId, label:`Wave at ${peerName(bp)}`, fn:()=>waveAt(bp)}; } }
  if (nearNpc) return {key:'npc'+nearNpc.p.name, label:`Meet ${nearNpc.p.name.split(' ')[0]}`, fn:()=>openCard(nearNpc)};
  let ba = null, bd = 5.5; for (const a of autos){ const d = Math.hypot(a.pos.x-P.pos.x, a.pos.z-P.pos.z); if (d < bd){ bd = d; ba = a; } }
  if (ba) return (ba.state==='route' || ba.state==='rejoin') ? {key:'hail'+autos.indexOf(ba), label:'Stop the auto', fn:()=>hail(ba)} : {key:'in'+autos.indexOf(ba), label:'Get in the auto', fn:()=>enterAuto(ba)};
  let bs = null; bd = 2.2; for (const sc of scooters){ const d = Math.hypot(sc.pos.x-P.pos.x, sc.pos.z-P.pos.z); if (d < bd){ bd = d; bs = sc; } }
  if (bs) return {key:'sc'+scooters.indexOf(bs), label:'Ride the scooter', fn:()=>enterAuto(bs)};
  for (const l of lobbyDoors){ if (Math.abs(l.x-P.pos.x) < 6 && P.pos.z > l.z - 9 && P.pos.z < l.z + 1) return {key:'lobby'+l.tower, label:`Walk in, or press E for Tower ${l.tower}`, fn:()=>enterShop(l)}; }
  let bdoor = null; bd = 1.9; for (const d of shopDoors){ if (d.kind === 7) continue; const dd = Math.abs(d.x-P.pos.x) + Math.abs(d.z-P.pos.z); if (dd < bd){ bd = dd; bdoor = d; } }
  if (bdoor){
    const bi = shopDoors.indexOf(bdoor), open = bdoor.landmark || bdoor.kind === 6 || bizByDoor.has(bi);
    if (open) return {key:'door'+bdoor.x+bdoor.z, label:`Enter ${bdoor.name}`, fn:()=>enterShop(bdoor)};
    return {key:'free'+bi, label: (db && myId) ? 'Free shop: register it as yours' : 'Free shop: sign in to register it', fn:()=>{ if (db && myId){ enterShop(bdoor); setTimeout(openBiz, 300); } else showHint('This shop is free. Signed-in businesses can register it from the Menu.'); }};
  }
  return null;
}
function updateAction(){
  action = computeAction(); const k = action ? action.key : '';
  if (k !== actionKey){ actionKey = k; prompt.innerHTML = ''; if (action){ if (!isCoarse){ const kb = document.createElement('kbd'); kb.textContent = 'E'; prompt.append(kb); } prompt.append(document.createTextNode(action.label)); } }
  prompt.hidden = !action;
}
function doAction(){ if (action) action.fn(); }


/* =========================================================
   People who add themselves (saved for everyone)
   ========================================================= */
const OUTFITS = [['#2E8C87','#EE9C14'],['#B83A6B','#F2C230'],['#3B4B8C','#D8342B'],['#F4EDE2','#E05A2B'],['#7E3FA0','#F2C230'],['#E9A23B','#C23B3B'],['#2A2A33','#E8B33A'],['#5E8F3A','#F4EDE2']];
const memberMap = new Map(); let db = null, myId = null, myDoc = null, outfitPick = 0, profilesLoaded = false;
const CREATOR_ID = (window.JP_CONFIG && window.JP_CONFIG.creatorId) || '';
const isLinkedIn = u => { try { const x = new URL(u); return x.protocol==='https:' && /(^|\.)linkedin\.com$/.test(x.hostname) && /^\/in\/[^/]+\/?$/.test(x.pathname); } catch(e){ return false; } };
const clampN = (v,a,b,d) => (typeof v==='number' && isFinite(v)) ? Math.max(a,Math.min(b,v)) : d;
const str = (v,n) => typeof v === 'string' ? v.slice(0,n) : '';
function memberLook(d){ if (d.lk && typeof d.lk === 'object') return lookFromCode(d.lk); const o = OUTFITS[clampN(d.outfit,0,OUTFITS.length-1,0)|0]; const dress = !!d.dress; return {top:o[0], bottom: dress ? o[0] : '#F4EDE2', dress, head: dress ? 'odhni' : 'turban', headColor:o[1], skin:['#C98E6B','#B07A57','#D9A07E','#9C6A4C'][clampN(d.skin,0,3,1)|0]}; }
async function memberNames(ids){ if (!live.user || !ids.length) return {}; try { return await live.user.profiles(ids); } catch(e){ return {}; } }
async function syncMembers(snap){
  const seen = new Set();
  for (const doc of snap.docs){
    const d = doc.data() || {}; seen.add(doc.id);
    if (doc.id === myId){ myDoc = d; if (memberMap.has(doc.id)) removeMember(doc.id); continue; }
    const x = clampN(d.x,-290,290,null), z = clampN(d.z,-290,290,null); if (x===null || z===null) continue;
    let m = memberMap.get(doc.id);
    const sig = JSON.stringify([x,z,d.outfit,d.dress,d.skin,d.lk]);
    if (m && m.sig !== sig){ removeMember(doc.id); m = null; }
    if (!m){
      const look = memberLook(d), ch = makePerson(look); ch.g.position.set(x,0,z); ch.g.rotation.y = clampN(d.r,-10,10,0); scene.add(ch.g);
      const marker = new THREE.Mesh(diamondGeo, new THREE.MeshBasicMaterial({color: doc.id === CREATOR_ID ? '#F5B13A' : '#34C27A', toneMapped:false})); marker.position.set(x,2.75,z); scene.add(marker);
      m = {id:doc.id, sig, ch, marker, label:null, member:true, baseRot:clampN(d.r,-10,10,0), rot:clampN(d.r,-10,10,0), ph:Math.random()*6, p:{name:'Someone', role:'', area:'', building:'', pos:[x,z], face:clampN(d.r,-10,10,0), link:'', look}};
      memberMap.set(doc.id, m); npcs.push(m); circles.push(m.circle = {x, z, r:0.45});
    }
    m.p.role = str(d.role,60); m.p.building = str(d.building,160); m.p.link = isLinkedIn(str(d.linkedin,120)) ? str(d.linkedin,120) : '';
    m.p.area = str(d.place,60) || 'Somewhere in Jaipur'; m.p.company = str(d.company,80); m.p.displayName = str(d.displayName,48);
    const so = d.socials && typeof d.socials === 'object' ? d.socials : {}; m.p.socials = {}; SOCIALS.forEach(([k])=>{ const c2 = cleanSocial(k, str(so[k],200)); if (c2) m.p.socials[k] = c2; }); if (!m.p.socials.linkedin && isLinkedIn(str(d.linkedin,120))) m.p.socials.linkedin = str(d.linkedin,120);
    m.p.link = '';
  }
  for (const id of [...memberMap.keys()]) if (!seen.has(id)) removeMember(id);
  if (!seen.has(myId)) myDoc = null;
  $('joinBtn').textContent = myDoc ? 'Edit your profile and spot' : 'Add yourself to the city';
  $('creatorBtn').hidden = !(CREATOR_ID && memberMap.has(CREATOR_ID));
  if (typeof refreshOffices === 'function') refreshOffices();
  const names = await memberNames([...memberMap.keys()]);
  memberMap.forEach(m=>{ const nm = (names[m.id] && names[m.id].name) || m.p.displayName || 'Someone'; m.p.name = nm; if (fontsDone && m.labelText !== nm){ if (m.label) scene.remove(m.label); m.label = liveSprite(m.id === CREATOR_ID ? `${nm.split(' ')[0]} · Creator` : nm.split(' ')[0]); m.labelText = nm; m.label.position.set(m.p.pos[0],2.35,m.p.pos[1]); scene.add(m.label); } });
}
function removeMember(id){ const m = memberMap.get(id); if (!m) return; scene.remove(m.ch.g); scene.remove(m.marker); if (m.label) scene.remove(m.label); const i = npcs.indexOf(m); if (i>=0) npcs.splice(i,1); const j = circles.indexOf(m.circle); if (j>=0) circles.splice(j,1); memberMap.delete(id); }
(async ()=>{
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try {
    const [d, u] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!d || !u) return; db = d; live.user = live.user || u; myId = await u.id();
    db.collection('profiles').onSnapshot(snap=>{ syncMembers(snap); profilesLoaded = true; }, ()=>{});   // everyone sees members, signed in or not
    if (!myId) return;
    $('joinBtn').hidden = false;
  } catch(e){}
})();
const sw = $('jSw');
OUTFITS.forEach((o,i)=>{ const b = document.createElement('button'); b.type = 'button'; b.style.background = `linear-gradient(135deg, ${o[0]} 55%, ${o[1]} 55%)`; b.setAttribute('aria-label', `Outfit ${i+1}`); b.setAttribute('aria-pressed', String(i===0)); b.addEventListener('click', ()=>{ outfitPick = i; [...sw.children].forEach((c,k)=>c.setAttribute('aria-pressed', String(k===i))); }); sw.appendChild(b); });
async function openJoin(){
  toggleMenu(false);
  if (riding) exitAuto(); if (inShop) exitShop(); setFly(false);
  for (const k in keys) keys[k] = false; cardOpen = true;
  let nm = ''; try { const me = await live.user.me(); nm = (me && me.name) || ''; } catch(e){}
  $('jNameWrap').hidden = !!nm; $('jNameIn').value = myDoc ? str(myDoc.displayName,48) : '';
  const soc = Social.private ? (await Social.socials(myId) || {}) : (myDoc && myDoc.socials) || {};
  $('jX').value = soc.x || ''; $('jIg').value = soc.instagram || ''; $('jGh').value = soc.github || ''; $('jWeb').value = soc.website || '';
  $('jPriv').textContent = Social.private ? 'Only people you’ve connected with can see these links. The database enforces it.' : 'Only people you’ve connected with are shown these links.';
  $('jName').textContent = nm || 'Your Claude account';
  $('jRole').value = myDoc ? str(myDoc.role,60) : ''; $('jBuild').value = myDoc ? str(myDoc.building,160) : ''; $('jLink').value = myDoc ? str((myDoc.socials && myDoc.socials.linkedin) || myDoc.linkedin,120) : '';
  outfitPick = myDoc ? clampN(myDoc.outfit,0,OUTFITS.length-1,0)|0 : 0; [...sw.children].forEach((c,k)=>c.setAttribute('aria-pressed', String(k===outfitPick)));
  const jc = $('jCo'); jc.innerHTML = ''; const o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Not listed, or I’d rather not say'; jc.appendChild(o0);
  coByslot.forEach(c=>{ const o = document.createElement('option'); o.value = c.owner; o.textContent = c.name; jc.appendChild(o); }); jc.value = myDoc ? str(myDoc.company,80) : '';
  $('jRemove').hidden = !myDoc; $('jNote').textContent = ''; $('joinWrap').hidden = false; $('jRole').focus();
}
/* Meet the creator: walk new members over to the creator's spot and open their card. */
function meetCreator(isWelcome){
  const m = CREATOR_ID && memberMap.get(CREATOR_ID); if (!m || myId === CREATOR_ID) return false;
  if (isWelcome){ try { if (localStorage.getItem('jp-met-creator')) return false; localStorage.setItem('jp-met-creator', '1'); } catch(e){} }
  if (mode !== 'play') start();
  if (!$('prodWrap').hidden && prod) closeProducts();
  for (const id of ['coWrap','bizWrap','joinWrap','jobsWrap','recWrap']) $(id).hidden = true;
  if (riding) exitAuto(); if (inShop) exitShop(); if (flying) setFly(false);
  const a = m.rot || 0; P.pos.set(m.p.pos[0] + Math.sin(a)*4.5, 0, m.p.pos[1] + Math.cos(a)*4.5); resolve(P.pos); P.rot = a; dist = Math.max(dist, 4.5); pitch = 0.2; snapCam = true;
  setTimeout(()=>{ openCard(m); if (isWelcome) $('cNote').textContent = `Welcome to People of Jaipur! Meet ${m.p.name.split(' ')[0]}, who built this city. Tap Connect to say hello.`; }, 700);
  return true;
}
$('creatorBtn').addEventListener('click', ()=>{ toggleMenu(false); meetCreator(false); });
function closeJoin(){ $('joinWrap').hidden = true; cardOpen = false; canvas.focus(); }
$('joinBtn').addEventListener('click', openJoin);
$('jCancel').addEventListener('click', closeJoin);
$('joinWrap').addEventListener('click', e=>{ if (e.target === $('joinWrap')) closeJoin(); });
$('joinForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const role = $('jRole').value.trim(), building = $('jBuild').value.trim(), link = $('jLink').value.trim();
  if (!role || !building){ $('jNote').textContent = 'Add what you do and what you’re building.'; return; }
  if (link && !isLinkedIn(link)){ $('jNote').textContent = 'Use your public LinkedIn profile link, like https://www.linkedin.com/in/your-name'; return; }
  const socials = {linkedin:link};
  for (const [id,key] of [['jX','x'],['jIg','instagram'],['jGh','github'],['jWeb','website']]){ const v = $(id).value.trim(); const c2 = cleanSocial(key, v); if (c2 === null){ $('jNote').textContent = `Check your ${SOCIALS.find(s=>s[0]===key)[1]} link. It needs to start with https://`; return; } socials[key] = c2 || ''; }
  const dispName = $('jNameWrap').hidden ? '' : $('jNameIn').value.trim();
  if (!$('jNameWrap').hidden && !dispName){ $('jNote').textContent = 'Add your name so people know who you are.'; return; }
  $('jSave').disabled = true; $('jNote').textContent = 'Saving…';
  const spot = {x:+P.pos.x.toFixed(1), z:+P.pos.z.toFixed(1)};
  if (Social.private){ try { await Social.setSocials(socials); } catch(e){} }
  if (dispName && window.JP_AUTH && window.JP_AUTH.setName) window.JP_AUTH.setName(dispName);
  const body = {role, building, displayName:dispName, socials: Social.private ? {} : socials, lk:Object.assign({},myLook), company:$('jCo').value || '', outfit:outfitPick, dress: myLook.style==='lehenga', skin:myLook.skin|0, x:spot.x, z:spot.z, r:+((P.rot+Math.PI)%(Math.PI*2)).toFixed(2), place:lastArea, updatedAt:Date.now()};
  const firstJoin = !myDoc;
  try { await db.collection('profiles').doc(myId).set(body); $('jNote').textContent = 'Saved. When you’re offline, people find you at this spot.'; setTimeout(closeJoin, 900); if (firstJoin) setTimeout(()=>meetCreator(true), 1400); }
  catch(err){ $('jNote').textContent = (err && (err.code==='permission_denied' || err.code==='not_granted')) ? 'You need edit access to this page to add yourself. Ask the person who shared it.' : 'That didn’t save. Check your connection and try again.'; }
  $('jSave').disabled = false;
});
$('jRemove').addEventListener('click', async ()=>{ try { await db.collection('profiles').doc(myId).delete(); closeJoin(); } catch(e){ $('jNote').textContent = 'That didn’t work. Try again.'; } });
/* =========================================================
   Music: an original, generated Rajasthani-style piece
   (tanpura drone, santoor-like plucks in raag Mand, soft dholak)
   ========================================================= */
const Music = (()=>{
  let ctx = null, master = null, verb = null, on = true, timer = null, next = 0, beat = 0, phraseAt = 0;
  const SA = 146.83, R = {S:1,R:9/8,G:5/4,M:4/3,P:3/2,D:5/3,N:15/8};
  const f = (sw,o=0) => SA*R[sw]*Math.pow(2,o);
  const cache = {};
  function pluck(fr, dur, bright){
    const key = fr.toFixed(2)+bright; if (cache[key]) return cache[key];
    const sr = ctx.sampleRate, n = Math.floor(sr*dur), buf = ctx.createBuffer(1,n,sr), d = buf.getChannelData(0);
    const p = Math.max(2, Math.round(sr/fr)), ring = new Float32Array(p); for (let i=0;i<p;i++) ring[i] = Math.random()*2-1;
    let k = 0; for (let i=0;i<n;i++){ const a = ring[k], b = ring[(k+1)%p]; ring[k] = (a*bright + b*(1-bright))*0.997; d[i] = a; k = (k+1)%p; }
    return (cache[key] = buf);
  }
  function play(buf, when, gain, pan=0){
    const s = ctx.createBufferSource(), g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.buffer = buf; g.gain.value = gain; s.connect(g); let out = g; if (pn){ pn.pan.value = pan; g.connect(pn); out = pn; }
    out.connect(master); out.connect(verb); s.start(when);
  }
  function drum(when, low){
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(low ? 110 : 220, when); o.frequency.exponentialRampToValueAtTime(low ? 60 : 160, when+0.18);
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(low ? 0.22 : 0.08, when+0.01); g.gain.exponentialRampToValueAtTime(0.0001, when+(low?0.35:0.12));
    o.connect(g).connect(master); o.start(when); o.stop(when+0.4);
  }
  const PHRASES = [['S','G','M','P','D','P','M','G'],['G','M','D','N','S1','N','D','P'],['N','D','P','M','G','M','G','R','S'],['P','D','S1','D','P','M','G'],['S','R','G','M','G','R','S']];
  function noteF(n){ return n.endsWith('1') ? f(n[0],2) : f(n,1); }
  function schedule(){
    const now = ctx.currentTime, beatLen = 60/66;
    while (next < now + 0.6){
      const b = beat % 8;
      const drone = ['P','S1','S1','S'][beat % 4]; play(pluck(drone==='P' ? f('P',-1) : drone==='S' ? f('S',-1) : f('S'), 4, 0.25), next, 0.16, -0.3);
      if (timeMode !== 'night'){ if (b===0 || b===5) drum(next, true); if (b===3 || b===6) drum(next, false); }
      if (next >= phraseAt){
        const ph = PHRASES[Math.floor(Math.random()*PHRASES.length)]; let tt = next;
        ph.forEach((n,i)=>{ play(pluck(noteF(n), 2.2, 0.62), tt, 0.11, 0.25); tt += (i===ph.length-1 ? 0.9 : 0.36 + Math.random()*0.22); });
        phraseAt = tt + 4 + Math.random()*6;
      }
      next += beatLen; beat++;
    }
  }
  function init(){
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.0001; master.connect(ctx.destination);
    verb = ctx.createConvolver(); const len = ctx.sampleRate*2.6, ir = ctx.createBuffer(2,len,ctx.sampleRate);
    for (let c=0;c<2;c++){ const d = ir.getChannelData(c); for (let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len,3); }
    verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.35; verb.connect(vg).connect(master);
    next = ctx.currentTime + 0.1; phraseAt = next + 3;
  }
  function start(){ if (!on) return; try { if (!ctx) init(); ctx.resume(); master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5); if (!timer) timer = setInterval(schedule, 200); } catch(e){} }
  function stop(){ if (!ctx) return; master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); setTimeout(()=>{ if (!on && ctx) ctx.suspend(); }, 1500); }
  function toggle(){ on = !on; if (on) start(); else stop(); return on; }
  document.addEventListener('visibilitychange', ()=>{ if (!ctx) return; if (document.hidden) ctx.suspend(); else if (on) ctx.resume(); });
  return {start, toggle, get on(){ return on; }, ctx:()=>ctx};
})();
$('musicBtn').addEventListener('click', ()=>{ const v = Music.toggle(); $('musicBtn').setAttribute('aria-pressed', String(v)); });

/* =========================================================
   Inside view for autos and scooters
   ========================================================= */
let insideView = false;
const viewBtn = $('viewBtn');
function setInside(v){ insideView = v; viewBtn.textContent = v ? 'Outside view' : 'Inside view'; snapCam = true; }
viewBtn.addEventListener('click', ()=>setInside(!insideView));
addEventListener('keydown', e=>{ if (mode==='play' && riding && (e.key==='v'||e.key==='V')) setInside(!insideView); });

/* =========================================================
   Conversations (real replies from Claude when available)
   ========================================================= */
/* Real people only: chat rooms per place, saved for everyone who visits */
const chatLog = {all:[], mine:[], names:{}}; let chatKey = null, chatMeta = null, sitting = null;
const CHIPS = ['Namaste!','Anyone around?','Where are you from?','What are you building?'];
function chatWho(id){ return id === myId ? 'You' : (chatLog.names[id] || 'Someone'); }
function renderRoom(){
  if (!chatKey) return; const el = $('chatLog'); el.innerHTML = '';
  const msgs = (chatMeta && chatMeta.dm ? Social.dmMessages(chatMeta.dm) : chatLog.all.filter(m=>m.r===chatKey)).slice().sort((a,b)=>a.t-b.t).slice(-80);
  if (!msgs.length){ const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'No messages here yet. Say hello, and anyone who visits will see it.'; el.appendChild(p); }
  msgs.forEach(m=>{ const d = document.createElement('div'); d.className = 'msg ' + (m.by===myId ? 'me' : 'them'); if (m.by !== myId){ const n = document.createElement('b'); n.className = 'who'; n.textContent = chatWho(m.by); d.appendChild(n); } const tx = document.createElement('span'); tx.textContent = m.x; d.appendChild(tx); el.appendChild(d); });
  el.scrollTop = 1e6;
}
function openRoom(key, meta){
  for (const k in keys) keys[k] = false; cardOpen = true; closeProducts(true);
  chatKey = key.slice(0,80); chatMeta = meta;
  $('chatName').textContent = meta.title; $('chatRole').textContent = meta.sub || '';
  $('chatAv').textContent = meta.title.replace(/[^A-Za-z]/g,'').slice(0,1) || '#'; $('chatAv').style.background = meta.color || '#B85C48';
  const can = !!(db && myId); $('chatInput').disabled = !can; $('chatSend').disabled = !can;
  $('chatInput').placeholder = can ? 'Write a message…' : 'Sign in to chat';
  $('chatNote').textContent = can ? (meta.dm ? meta.sub : 'Everyone who visits this place can read these messages. Be kind.') : 'You can read along. Signed-in people with edit access can chat.';
  const chips = $('chatChips'); chips.innerHTML = '';
  if (can) CHIPS.forEach(c=>{ const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.addEventListener('click', ()=>sendRoom(c)); chips.appendChild(b); });
  $('chatWrap').hidden = false; renderRoom(); if (can && !isCoarse) $('chatInput').focus();
}
function closeChat(){ $('chatWrap').hidden = true; cardOpen = false; chatKey = null; if (sitting) standUp(); canvas.focus(); }
$('chatClose').addEventListener('click', closeChat);
$('chatForm').addEventListener('submit', e=>{ e.preventDefault(); const v = $('chatInput').value.trim(); if (v){ $('chatInput').value = ''; sendRoom(v); } });
async function sendRoom(text){
  if (!db || !myId || !chatKey) return;
  if (chatMeta && chatMeta.dm && Social.private){ try { await Social.sendDM(chatMeta.dm, text.slice(0,1000)); renderRoom(); } catch(e){ $('chatNote').textContent = 'That message didn’t send. Try again.'; } return; }
  const m = {r:chatKey, x:text.slice(0,240), t:Date.now()};
  chatLog.mine = chatLog.mine.concat([m]).slice(-40); chatLog.all.push(Object.assign({by:myId}, m)); renderRoom();
  try { await db.collection('chatlog').doc(myId).set({msgs:chatLog.mine}); $('chatNote').textContent = 'Everyone who visits this place can read these messages. Be kind.'; }
  catch(err){ $('chatNote').textContent = (err && (err.code==='permission_denied'||err.code==='not_granted')) ? 'You need edit access to this page to chat. Ask the person who shared it.' : 'That message didn’t send. Try again.'; }
}
async function syncChat(snap){
  const all = [];
  for (const doc of snap.docs){ const d = doc.data() || {}; const arr = Array.isArray(d.msgs) ? d.msgs.slice(-40) : [];
    const clean = arr.filter(m=>m && typeof m.x === 'string' && typeof m.r === 'string').map(m=>({by:doc.id, r:m.r.slice(0,80), x:m.x.slice(0,240), t:clampN(m.t,0,1e15,0)}));
    if (doc.id === myId) chatLog.mine = clean.map(({r,x,t})=>({r,x,t})); all.push(...clean); }
  chatLog.all = all;
  const ids = [...new Set(all.map(m=>m.by))].filter(id=>id !== myId && !(id in chatLog.names));
  if (ids.length && live.user){ try { const ps = await live.user.profiles(ids); ids.forEach(id=>{ chatLog.names[id] = (ps[id] && ps[id].name) || ''; }); } catch(e){} }
  renderRoom();
}
(async ()=>{
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try { const d = await window.claude.use('db'); if (!d) return; let tries = 0; while (!myId && tries++ < 40) await new Promise(r=>setTimeout(r,250));
    d.collection('chatlog').onSnapshot(syncChat, ()=>{}); } catch(e){}
})();
$('cityChatBtn').addEventListener('click', ()=>{ toggleMenu(false); openRoom('city', {title:'Jaipur chat', sub:'Everyone walking the city', color:'#B85C48'}); });

/* Sitting down at a table */
function npcSay(ch, parent, text){
  const sp = bubble(text, ''); sp.scale.multiplyScalar(0.8); sp.position.set(ch.g.position.x, 1.85, ch.g.position.z); parent.add(sp);
  setTimeout(()=>{ parent.remove(sp); sp.material.map.dispose(); }, 7000);
}
function sitAt(tbl, room, meta, parent){
  const seat0 = tbl.seats.find(s=>!s.npc); if (!seat0) return;
  sitting = {tbl, seat:seat0};
  P.pos.set(seat0.x, 0, seat0.z); P.rot = seat0.rot; seatPose(player);
  yaw = P.rot - Math.PI + 0.5; pitch = 0.32; dist = 2.8; snapCam = true;
  openRoom(room, meta);
}
function standUp(){
  const s = sitting; if (!s) return; sitting = null; stand(player); showHint(null);
  if (s.free){ P.pos.x += Math.sin(s.rot + (s.back ? Math.PI : 0))*0.7; P.pos.z += Math.cos(s.rot + (s.back ? Math.PI : 0))*0.7; P.y = s.y; }
  else { P.pos.x += Math.sin(s.seat.rot + Math.PI)*0.7; P.pos.z += Math.cos(s.seat.rot + Math.PI)*0.7; }
  dist = inShop ? 3.4 : 6.2;
}
function sitFree(x, z, rot, y, back){
  sitting = {free:true, x, z, rot, y, back}; P.pos.set(x,0,z); P.rot = rot; P.y = y;
  seat(player); player.b.lSh.rotation.set(-0.35,0,-0.12); player.b.rSh.rotation.set(-0.35,0,0.12); player.b.lEl.rotation.x = player.b.rEl.rotation.x = -1.0;
  yaw = rot - Math.PI + 0.35; pitch = 0.28; dist = 4.4; snapCam = true;
  showHint('Enjoy the view. Press E, or start walking, to stand up.');
}
const angDist = (a,b) => Math.abs(((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI);
const BENCHES = [[3,-4,0.6],[-5,2,2.2],[4,3,-0.8]].map(([bx,bz,r])=>{ const x = HILL.x+bx, z = HILL.z+bz; const f1 = r, f2 = r+Math.PI; const toCity = Math.atan2(CX-x, CZ-z); const d1 = angDist(f1,toCity), d2 = angDist(f2,toCity); return {x, z, rot: d1 < d2 ? f1 : f2, y:HILL.h+0.2+0.1}; });
function kundSeat(){
  const dx = P.pos.x-KUND.x, dz = P.pos.z-KUND.z, half = KUND.s/2, d = Math.max(Math.abs(dx),Math.abs(dz)); if (d >= half) return null;
  const k = Math.min(KUND.N-1, Math.floor((half-d)/KUND.step)), inner = half-(k+1)*KUND.step + 0.22, y = -k*KUND.rise;
  if (Math.abs(dx) >= Math.abs(dz)){ const sg = Math.sign(dx)||1; return {x:KUND.x + sg*inner, z:KUND.z + Math.max(-inner,Math.min(inner,dz)), rot: sg>0 ? -Math.PI/2 : Math.PI/2, y}; }
  const sg = Math.sign(dz)||1; return {x:KUND.x + Math.max(-inner,Math.min(inner,dx)), z:KUND.z + sg*inner, rot: sg>0 ? Math.PI : 0, y};
}

/* =========================================================
   Products, sellers and cafés
   ========================================================= */
const PRODUCTS = {
  0:[{n:'Bandhej dupatta',p:'₹850',d:'Tie-dyed by hand in tiny dots, in Jaipur’s brightest colours.',m:'cloth',c:'#D8342B'},{n:'Sanganeri block-print bedsheet',p:'₹1,450',d:'Hand block-printed cotton from Sanganer, with two pillow covers.',m:'fold',c:'#3B4B8C'},{n:'Leheriya saree',p:'₹2,200',d:'Wave-pattern resist dye, light enough for a Jaipur summer.',m:'cloth',c:'#F2C230'},{n:'Jaipuri razai',p:'₹1,800',d:'A cotton quilt so light it folds into a small bag.',m:'fold',c:'#B83A6B'}],
  1:[{n:'Lac bangle set',p:'₹350',d:'Warm lac pressed with glass stones, the way it’s done in Maniharon ka Rasta.',m:'bangles',c:'#C23B3B'},{n:'Glass bangles, a dozen',p:'₹120',d:'Thin, bright and they chime when you walk.',m:'bangles',c:'#2E8C87'},{n:'Kundan kada',p:'₹650',d:'A gold-tone kada set with kundan stones.',m:'bangles',c:'#E8C060'},{n:'Bridal chooda',p:'₹1,900',d:'Red and ivory set for weddings.',m:'bangles',c:'#B82B2B'}],
  2:[{n:'Ghewar',p:'₹480 a box',d:'A honeycomb disc soaked in syrup and topped with rabri. Teej season’s favourite.',m:'ghewar',c:'#E8B33A'},{n:'Mawa kachori',p:'₹45',d:'Flaky and stuffed with sweet mawa and nuts, then dipped in syrup.',m:'kachori',c:'#C98A3A'},{n:'Kaju katli',p:'₹1,100 a kg',d:'Thin cashew diamonds with silver leaf.',m:'katli',c:'#EDE6D6'},{n:'Jalebi',p:'₹60 a plate',d:'Hot, crisp and dripping with syrup.',m:'jalebi',c:'#E8962A'}],
  3:[{n:'Kundan necklace',p:'₹4,500',d:'Glass stones set in gold-tone foil, the old Jaipur way.',m:'necklace',c:'#E8C060'},{n:'Meenakari earrings',p:'₹1,200',d:'Bright enamel work in Jaipur’s famous meenakari style.',m:'earrings',c:'#2E6EB0'},{n:'Silver payal',p:'₹2,100',d:'A pair of anklets with tiny bells.',m:'payal',c:'#D8D8D8'},{n:'Polki ring',p:'₹3,200',d:'Uncut stones in a heavy setting.',m:'ring',c:'#E8C060'}],
  4:[{n:'Embroidered jutti',p:'₹650',d:'Hand-stitched leather with thread work. Soft after a week.',m:'jutti',c:'#B83A6B'},{n:'Mirror-work mojari',p:'₹780',d:'Tiny mirrors stitched along the toe.',m:'jutti',c:'#2E8C87'},{n:'Kids’ juttis',p:'₹350',d:'Small, bright and very hard to lose.',m:'jutti',c:'#F2C230'},{n:'Camel-leather sandals',p:'₹900',d:'Tough, tan and made to last.',m:'jutti',c:'#A0673A'}],
  5:[{n:'Mathania mirch',p:'₹180 for 250 g',d:'Deep red Rajasthani chilli with more colour than heat.',m:'spice',c:'#B8282A'},{n:'Haldi',p:'₹90 for 250 g',d:'Bright turmeric, ground fresh.',m:'spice',c:'#E8B33A'},{n:'Garam masala',p:'₹120 for 100 g',d:'The shop’s own blend, roasted every week.',m:'spice',c:'#7A4A2A'},{n:'Kesar',p:'₹350 a gram',d:'Saffron threads, sold in a tiny tin.',m:'spice',c:'#D0402A'}],
  6:[{n:'Masala chai in a kulhad',p:'₹60',d:'Strong, gingery and served in a clay cup.',m:'kulhad',c:'#A85A3A'},{n:'Pyaaz kachori',p:'₹50',d:'Jaipur’s breakfast classic, crisp and spicy.',m:'kachori',c:'#C98A3A'},{n:'Bun maska',p:'₹70',d:'Soft bun, lots of butter.',m:'bun',c:'#E0B070'},{n:'Cold coffee',p:'₹140',d:'Thick, sweet and very cold.',m:'glass',c:'#7A5030'}],
};
const pmat = (c,o) => mat(c,'stone',o||{});
function productModel(item){
  const g = new THREE.Group(), c = item.c;
  switch(item.m){
    case 'cloth': { const geo = new THREE.PlaneGeometry(1.1,1.2,12,12), p = geo.attributes.position; for (let i=0;i<p.count;i++){ const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x*6)*0.06 + (0.6-y)*(0.6-y)*0.08); } geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({map:paintTex[0], color:lin(c), side:THREE.DoubleSide, roughness:0.9})); m.position.y = 0.6; g.add(m); break; }
    case 'fold': for (let k=0;k<3;k++) box(g,0.7,0.12,0.5,k===1?'#F4EDE2':c,0,k*0.13,0,'stone'); break;
    case 'bangles': for (let k=0;k<7;k++) add(g,TOR,pmat(k%3===2?'#E8C060':c,{metalness:0.5,roughness:0.3}),0,0.05+k*0.045,0,0.16,0.16,0.16,0,Math.PI/2); break;
    case 'ghewar': cyl(g,0.36,0.03,'#F4F0E8',0,0,0,24,'stone'); cyl(g,0.27,0.12,c,0,0.03,0,24,'stone'); cyl(g,0.25,0.03,'#F4EDE2',0,0.15,0,24,'stone'); for (let k=0;k<6;k++) add(g,SPH,pmat('#5E8F3A'),Math.cos(k)*0.15,0.19,Math.sin(k)*0.15,0.02,0.02,0.02); break;
    case 'kachori': cyl(g,0.36,0.03,'#F4F0E8',0,0,0,24,'stone'); for (let k=0;k<3;k++) add(g,SPH,pmat(c),-0.18+k*0.18,0.08,0,0.11,0.06,0.11); break;
    case 'katli': cyl(g,0.36,0.03,'#F4F0E8',0,0,0,24,'stone'); for (let k=0;k<7;k++) add(g,UBOX,pmat(c,{metalness:0.3,roughness:0.4}),-0.2+(k%4)*0.13,0.05,-0.08+Math.floor(k/4)*0.16,0.1,0.025,0.1,Math.PI/4); break;
    case 'jalebi': cyl(g,0.36,0.03,'#F4F0E8',0,0,0,24,'stone'); for (let k=0;k<4;k++) add(g,new THREE.TorusGeometry(0.08,0.022,8,20),pmat(c,{roughness:0.25}),-0.12+(k%2)*0.22,0.06,-0.1+Math.floor(k/2)*0.2,1,1,1,0,Math.PI/2); break;
    case 'necklace': add(g,new THREE.TorusGeometry(0.22,0.02,8,32,Math.PI),pmat(c,{metalness:0.9,roughness:0.25}),0,0.45,0,1,1,1,0,0,Math.PI); for (let k=0;k<7;k++){ const a = Math.PI + k/6*Math.PI; add(g,SPH,pmat(k%2?'#C2203A':'#2E8C5A',{roughness:0.15}),Math.cos(a)*0.22,0.45+Math.sin(a)*0.22,0.02,0.03,0.03,0.03); } cyl(g,0.03,0.24,'#5A1020',0,0,0,8,'stone'); break;
    case 'earrings': for (const s of [-1,1]){ add(g,SPH,pmat(c,{roughness:0.2}),s*0.12,0.3,0,0.06,0.06,0.03); cone(g,0.07,0.12,'#E8C060',s*0.12,0.14,0,10,'stone'); } break;
    case 'payal': for (const s of [-1,1]) add(g,new THREE.TorusGeometry(0.11,0.012,6,28),pmat(c,{metalness:0.9,roughness:0.2}),s*0.13,0.12,0,1,1,1,0,Math.PI/2.4); break;
    case 'ring': add(g,new THREE.TorusGeometry(0.06,0.015,8,24),pmat(c,{metalness:0.9,roughness:0.25}),0,0.1,0); add(g,SPH,pmat('#F4F0E8',{roughness:0.1}),0,0.17,0,0.035,0.03,0.035); break;
    case 'jutti': for (const s of [-1,1]){ add(g,SPH,pmat(c),s*0.11,0.06,0,0.09,0.07,0.2); add(g,SPH,pmat('#F2C230'),s*0.11,0.11,0.08,0.035,0.02,0.05); cone(g,0.03,0.08,c,s*0.11,0.03,0.21,6,'stone'); } break;
    case 'spice': cyl(g,0.25,0.12,'#C9B79C',0,0,0,20,'stone'); cone(g,0.23,0.18,c,0,0.12,0,20,'stone'); break;
    case 'kulhad': add(g,new THREE.CylinderGeometry(0.09,0.065,0.16,16),pmat(c),0,0.08,0); cyl(g,0.08,0.01,'#C8925A',0,0.155,0,16,'stone'); break;
    case 'bun': cyl(g,0.3,0.03,'#F4F0E8',0,0,0,20,'stone'); add(g,SPH,pmat(c),0,0.09,0,0.14,0.08,0.14); break;
    case 'glass': add(g,new THREE.CylinderGeometry(0.08,0.07,0.24,16),M_GLASS_SHOP,0,0.12,0); cyl(g,0.07,0.18,c,0,0.01,0,16,'stone'); break;
    default: box(g,0.4,0.3,0.3,c,0,0,0,'stone');
  }
  return g;
}
let prod = null;   // {door, items, i, model, biz}
function openProducts(){
  if (!inShop) return;
  const d = inShop.door, biz = d.biz, kind = biz ? biz.kind : d.kind;
  const sample = !biz && (d.landmark || d.kind === 6);
  if (sample){
    const items = (PRODUCTS[d.kind] || PRODUCTS[0]).map(p=>Object.assign({}, p, {d: p.d + ' (Sample item)'}));
    prod = {door:d, items, i:0, model:null, biz:null, kind:d.kind, sample:true};
    const czz = inShop.scene.userData.counterZ; P.pos.set(-0.5,0,czz+1.6); P.rot = Math.PI; yaw = 0.15; pitch = 0.12; dist = 2.4; snapCam = true;
    cardOpen = true; for (const k in keys) keys[k] = false;
    $('prodWrap').hidden = false; showProduct(); return;
  }
  if (!biz || !biz.products.length){
    cardOpen = false; $('area').textContent = d.name;
    $('fact').textContent = biz ? `${biz.name} hasn’t listed any products yet.` : (d.landmark || d.kind===6) ? `${d.name} is a real Jaipur place. If it’s yours, register it to list what you sell.` : 'This shop is free.';
    if (!biz && db && myId) openBiz(); return;
  }
  const items = biz.products.map((p,i)=>({n:p.n, p:p.p || '', d:p.d || '', m:(PRODUCTS[kind]||PRODUCTS[0])[i % 4].m, c:(PRODUCTS[kind]||PRODUCTS[0])[i % 4].c}));
  prod = {door:d, items, i:0, model:null, biz, kind};
  const czz = inShop.scene.userData.counterZ; P.pos.set(-0.5,0,czz+1.6); P.rot = Math.PI; yaw = 0.15; pitch = 0.12; dist = 2.4; snapCam = true;
  cardOpen = true; for (const k in keys) keys[k] = false;
  $('prodWrap').hidden = false; showProduct();
}
function showProduct(){
  const it = prod.items[prod.i], sc = inShop.scene, cz = sc.userData.counterZ;
  if (prod.model) sc.remove(prod.model);
  prod.model = productModel(it); prod.model.scale.setScalar(1.5); prod.model.position.set(0, (prod.kind===2||prod.kind===3) ? 1.42 : 1.02, cz + 0.05); sc.add(prod.model);
  $('prodShop').textContent = prod.biz ? prod.biz.name : prod.door.name;
  $('prodName').textContent = it.n; $('prodPrice').textContent = it.p;
  $('prodDesc').textContent = it.d || (prod.biz ? prod.biz.desc : '');
  $('prodCount').textContent = `${prod.i+1} of ${prod.items.length}`;
  $('prodAsk').textContent = prod.sample ? 'Is this your shop? Register it' : 'Message the shop'; $('prodAsk').hidden = !prod.biz && !(prod.sample && db && myId);
  $('prodBuy').hidden = !(prod.biz && prod.biz.url); $('prodDir').hidden = !(prod.biz && prod.biz.address);
  $('prodNote').textContent = 'Listed by the shop.';
  $('prodClaim').hidden = !(db && myId && !prod.biz);

}
function closeProducts(keepCard){ if (!prod) return; dist = 3.4; if (prod.model && inShop) inShop.scene.remove(prod.model); prod = null; $('prodWrap').hidden = true; if (!keepCard) cardOpen = false; }
$('prodPrev').addEventListener('click', ()=>{ prod.i = (prod.i + prod.items.length - 1) % prod.items.length; showProduct(); });
$('prodNext').addEventListener('click', ()=>{ prod.i = (prod.i + 1) % prod.items.length; showProduct(); });
$('prodClose').addEventListener('click', ()=>closeProducts());
$('prodBuy').addEventListener('click', ()=>{ if (prod && prod.biz && safeUrl(prod.biz.url)) window.open(prod.biz.url,'_blank','noopener'); });
$('prodDir').addEventListener('click', ()=>{ if (prod && prod.biz && prod.biz.address) window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(prod.biz.address),'_blank','noopener'); });
$('prodAsk').addEventListener('click', ()=>{
  const it = prod.items[prod.i], d = prod.door, biz = prod.biz, kind = prod.kind;
  if (prod.sample){ closeProducts(); if (db && myId) openBiz(); return; }
  if (!biz) return;
  closeProducts(true); openRoom('shop:'+shopDoors.indexOf(d), {title:biz.name, sub:'Messages to the shop. The owner replies when they’re online.', color:'#2E8C5A'});
});
/* Café interiors */
const CAFE_PEOPLE = [
  {name:'Riya', look:{top:'#2E8C87',bottom:'#2A2A33',head:'longhair',headColor:'#1E1512',skin:'#C98E6B'}, bio:'a 27-year-old founder building a travel app for Rajasthan’s small towns', opener:'Hey! Pull up a chair. The chai here is properly strong.'},
  {name:'Imran', look:{top:'#F4EDE2',bottom:'#3B4B8C',head:'hair',headColor:'#1E1512',skin:'#9C6A4C'}, bio:'from a blue-pottery family in Jaipur, now studying product design', opener:'Salaam! New here? Jaipur’s best stories happen over chai.'},
  {name:'Aditi', look:{top:'#B83A6B',bottom:'#B83A6B',dress:true,head:'hair',headColor:'#2A1B17',skin:'#D9A07E'}, bio:'a freelance illustrator who sketches the old city’s doorways', opener:'Hi! I’m sketching the café. Want to see?'},
  {name:'Karan', look:{top:'#E0A33A',bottom:'#2E3140',head:'hair',headColor:'#1E1512',skin:'#B07A57'}, bio:'a backend engineer at a Jaipur fintech who loves cricket and kachori', opener:'Arre, sit sit. Had pyaaz kachori yet?'},
  {name:'Meenal', look:{top:'#3B4B8C',bottom:'#3B4B8C',dress:true,head:'odhni',headColor:'#E8B33A',skin:'#C98E6B'}, bio:'runs a small block-print label from Sanganer', opener:'Namaste! Everything I’m wearing is hand block-printed, by the way.'},
  {name:'Vikram', look:{top:'#F4EDE2',bottom:'#F4EDE2',head:'turban',headColor:'#D8342B',skin:'#8C5A3C'}, bio:'a retired history teacher who knows every gate of the walled city', opener:'Ah, a visitor! Did you know Jaipur was planned on a grid back in 1727?'},
];
function seatPose(ch){ seat(ch); ch.b.lSh.rotation.x = ch.b.rSh.rotation.x = -0.75; ch.b.lEl.rotation.x = ch.b.rEl.rotation.x = -0.9; }
function buildCafe(door){
  const sc = new THREE.Scene(), {W,D,H} = ROOM;
  sc.fog = new THREE.Fog(0x1a0f0a, 30, 60); sc.background = new THREE.Color('#1A0F0A');
  add(sc,UPLANE,mat('#8C5A3C','paving'),0,0,0,W,D+2,1,0,-Math.PI/2);
  box(sc,W,0.1,D,'#EFE3D2',0,H,0);
  for (const [w,x,z,ry] of [[W,0,-D/2,0],[D,-W/2,0,Math.PI/2],[D,W/2,0,Math.PI/2]]){ const g = new THREE.Group(); box(g,w,1.2,0.2,'#6B4530',0,0,0,'stone'); box(g,w,H-1.2,0.2,'#EBD9BE',0,1.2,0); g.position.set(x,0,z); g.rotation.y = ry; sc.add(g); }
  add(sc,arcadeGeo(W,1,H,2.6,3.5,0.3),M('#EBD9BE'),0,0,D/2);
  const outside = add(sc,UPLANE,new THREE.MeshBasicMaterial({color:'#F3DCC0'}),0,2,D/2+1.2,4,5); sc.userData.outside = outside;
  sc.add(new THREE.HemisphereLight(lin('#FFE6C8'), lin('#5A3A26'), 0.75));
  for (const [x,z] of [[-1.8,-0.6],[1.8,-0.6],[-1.8,2.2],[1.8,2.2]]){ const pl = new THREE.PointLight(lin('#FFC98A'), 0.9, 9, 1.6); pl.position.set(x,H-1.0,z); sc.add(pl); cyl(sc,0.008,0.9,'#222',x,H-0.9,z,4,'stone'); add(sc,new THREE.ConeGeometry(0.22,0.22,16,1,true),new THREE.MeshStandardMaterial({color:lin('#2A2A2A'),side:THREE.DoubleSide}),x,H-0.95,z); add(sc,SPH,M_LIGHT,x,H-1.05,z,0.08,0.08,0.08); }
  // counter, machine, menu board
  const cz = -D/2 + 2.4;
  box(sc,W-1.4,1.0,0.75,'#5A3A26',0,0,cz,'stone'); box(sc,W-1.3,0.06,0.85,'#2A2A2A',0,1.0,cz,'stone');
  box(sc,0.6,0.45,0.4,'#C9C9C9',-1.6,1.06,cz,'stone'); cyl(sc,0.16,0.35,'#B85C3F',1.2,1.06,cz,14,'stone'); for (let i=0;i<5;i++) add(sc,new THREE.CylinderGeometry(0.06,0.045,0.11,12),pmat('#A85A3A'),0.2+i*0.15,1.11,cz+0.15);
  const [mc,mx] = cv(512,320); mx.fillStyle = '#1E2420'; mx.fillRect(0,0,512,320); mx.strokeStyle = '#C9A27A'; mx.lineWidth = 10; mx.strokeRect(5,5,502,310);
  mx.fillStyle = '#F4EDE2'; mx.font = "700 40px Hind, system-ui, sans-serif"; mx.textAlign = 'center'; mx.fillText(door.name.length > 22 ? 'Menu' : door.name, 256, 58);
  mx.font = "500 28px Hind, system-ui, sans-serif"; const menu = door.biz && door.biz.products.length ? door.biz.products : PRODUCTS[6]; if (menu.length) menu.forEach((p,i)=>{ mx.textAlign = 'left'; mx.fillText(p.n.slice(0,24), 34, 116+i*48); mx.textAlign = 'right'; mx.fillText(p.p, 478, 116+i*48); }); else { mx.fillText('Pull up a chair and say hello', 256, 150); mx.fillText('to whoever is here.', 256, 192); }
  plane(sc,new THREE.MeshStandardMaterial({map:tex(mc), roughness:0.9}),0,2.75,-D/2+0.12,2.6,1.6);
  box(sc,0.9,0.02,0.6,'#6B4530',0.4,1.18,cz-0.85,'stone');
  sc.userData.keeper = null; sc.userData.counterZ = cz;
  addKeeper(sc, KEEPERS[3 % KEEPERS.length], ['Chai piyoge?','Fancy a cup of chai?'], cz - 0.9);
  // tables, chairs, people
  const circlesIn = [], sitters = [];
  const startIx = hashStr(door.name) % CAFE_PEOPLE.length;
  [[-1.8,-0.4],[1.8,-0.4],[-1.8,2.4],[1.8,2.4]].forEach(([tx,tz],ti)=>{
    cyl(sc,0.5,0.04,'#7A5638',tx,0.74,tz,24,'stone'); cyl(sc,0.05,0.74,'#2A2A2A',tx,0,tz,8,'stone'); cyl(sc,0.28,0.02,'#2A2A2A',tx,0,tz,16,'stone');
    add(sc,new THREE.CylinderGeometry(0.06,0.045,0.11,12),pmat('#A85A3A'),tx+0.15,0.83,tz);
    for (const s of [-1,1]){ const chx = tx + s*0.78; box(sc,0.45,0.05,0.45,'#6B4530',chx,0.46,tz,'stone'); box(sc,0.05,0.5,0.45,'#6B4530',chx+s*0.22,0.48,tz,'stone'); for (const [a,b] of [[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]]) box(sc,0.04,0.46,0.04,'#4A2E1C',chx+a,0,tz+b,'stone'); }
    circlesIn.push({x:tx, z:tz, r:1.15});
    const tbl = {x:tx, z:tz, seats:[{x:tx-0.74, z:tz, rot:Math.PI/2, npc:null},{x:tx+0.74, z:tz, rot:-Math.PI/2, npc:null}]}; (sc.userData.tables = sc.userData.tables || []).push(tbl);
    if (false){
      const pp = CAFE_PEOPLE[(startIx + ti) % CAFE_PEOPLE.length], s = ti%2 ? 1 : -1;
      const ch = makePerson(pp.look); seatPose(ch); ch.g.position.set(tx + s*0.74, -0.42, tz); ch.g.rotation.y = s>0 ? -Math.PI/2 : Math.PI/2; sc.add(ch.g);
      const st = {ch, pp, x:tx + s*0.74, z:tz, base:ch.g.rotation.y, ph:Math.random()*6}; sitters.push(st); tbl.seats[s>0?1:0].npc = st;
    }
  });
  for (const [x,z] of [[-W/2+0.5,D/2-0.6],[W/2-0.5,D/2-0.6]]){ cyl(sc,0.25,0.5,'#B85C3F',x,0,z,12,'stone'); add(sc,BLOBS[0],mat('#4E7A2C','foliage'),x,0.95,z,0.45,0.5,0.45); }
  sc.userData.circles = circlesIn; sc.userData.sitters = sitters; sc.userData.cafe = true;
  return sc;
}

/* Outdoor café tables: people to chat with */
const outdoorSitters = [];
const outdoorTables = [116,122,128].map(x=>({x, z:-10.8, place:'Anokhi Café', seats:[{x:x-0.8,z:-10.8,rot:Math.PI/2,npc:null},{x:x+0.8,z:-10.8,rot:-Math.PI/2,npc:null}]}))
  .concat([178,183,188,193].map(x=>({x, z:-10.8, place:'Curious Life Coffee Roasters', seats:[{x:x-0.7,z:-10.8,rot:Math.PI/2,npc:null},{x:x+0.7,z:-10.8,rot:-Math.PI/2,npc:null}]})));


/* =========================================================
   Businesses that register a shop (saved for everyone)
   ========================================================= */
const isLogoRef = v => typeof v === 'string' && (/^[0-9a-f]{32}$/.test(v) || /^https:\/\/[^\s"']+$/.test(v));
const logoUrl = v => (typeof v === 'string' && v.startsWith('data:image/png;base64,')) ? v : isLogoRef(v) ? (/^[0-9a-f]{32}$/.test(v) ? '/_blob/' + v : v) : '';
const logoTexCache = {};
function logoTexture(v){ const u = logoUrl(v); if (!u) return null; if (logoTexCache[u]) return logoTexCache[u]; const ld = new THREE.TextureLoader(); ld.setCrossOrigin('anonymous'); const tx = ld.load(u); tx.encoding = THREE.sRGBEncoding; return (logoTexCache[u] = tx); }
const safeUrl = u => { try { const x = new URL(u); return x.protocol === 'https:'; } catch(e){ return false; } };
const bizSigns = new Map(); const bizByDoor = new Map(); let myBiz = null;
function bladeSign(d, name){
  const [c,x] = cv(512,160); x.fillStyle = '#FFF6E8'; x.fillRect(0,0,512,160); x.strokeStyle = '#2E8C5A'; x.lineWidth = 12; x.strokeRect(6,6,500,148);
  x.fillStyle = '#3B1E19'; x.textAlign = 'center'; x.textBaseline = 'middle'; let sz = 60; x.font = `700 ${sz}px Hind, system-ui, sans-serif`; while (x.measureText(name).width > 460 && sz > 18){ sz -= 2; x.font = `700 ${sz}px Hind, system-ui, sans-serif`; } x.fillText(name, 256, 84);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.6), new THREE.MeshStandardMaterial({map:tex(c), side:THREE.DoubleSide, emissiveMap:null, roughness:0.7}));
  const ox = Math.sin(d.rot), oz = Math.cos(d.rot), sx = Math.cos(d.rot), sz2 = -Math.sin(d.rot);
  m.position.set(d.x - ox*0.8 + sx*1.3, 3.6, d.z - oz*0.8 + sz2*1.3); m.rotation.y = d.rot + Math.PI/2; scene.add(m);
  const rod = new THREE.Mesh(UBOX, M('#2A2A2A','stone')); rod.scale.set(0.04,0.04,1.4); rod.position.set(d.x - ox*0.5 + sx*1.3, 3.95, d.z - oz*0.5 + sz2*1.3); rod.rotation.y = d.rot; scene.add(rod);
  return [m, rod];
}
function syncShops(snap){
  const claims = new Map(); myBiz = null;
  for (const doc of snap.docs){
    const d = doc.data() || {}; const door = clampN(d.door,0,shopDoors.length-1,-1)|0; if (door < 0 || !shopDoors[door]) continue;
    const name = str(d.name,40).trim(); if (!name) continue;
    const products = Array.isArray(d.products) ? d.products.slice(0,3).map(p=>({n:str(p && p.n,40).trim(), p:str(p && p.p,14).trim()})).filter(p=>p.n) : [];
    const b = {owner:doc.id, door, name, kind:clampN(d.kind,0,6,0)|0, desc:str(d.desc,200), url: safeUrl(str(d.url,200)) ? str(d.url,200) : '', address:str(d.address,160), products, createdAt:clampN(d.createdAt,0,1e15,0)};
    if (doc.id === myId) myBiz = b;
    const prev = claims.get(door); if (!prev || b.createdAt < prev.createdAt) claims.set(door, b);
  }
  shopDoors.forEach((d,i)=>{ if (d.origName === undefined){ d.origName = d.name; d.origKind = d.kind; } const b = claims.get(i);
    d.biz = b || null; d.name = b ? b.name : d.origName; d.kind = b ? b.kind : d.origKind;
    const cur = bizSigns.get(i);
    if (b && (!cur || cur.name !== b.name)){ if (cur) cur.meshes.forEach(m=>scene.remove(m)); bizSigns.set(i,{name:b.name, meshes:bladeSign(d,b.name)}); }
    if (!b && cur){ cur.meshes.forEach(m=>scene.remove(m)); bizSigns.delete(i); }
  });
  bizByDoor.clear(); claims.forEach((b,i)=>bizByDoor.set(i,b)); if (typeof updateShutters === 'function') updateShutters();
}
(async ()=>{
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try { const d = await window.claude.use('db'); if (!d) return; let tries = 0; while (!myId && tries++ < 12) await new Promise(r=>setTimeout(r,250));
    d.collection('shops').onSnapshot(syncShops, ()=>{}); } catch(e){}
})();
function openBiz(){
  if (!inShop || !db || !myId) return;
  closeProducts(true); cardOpen = true;
  const d = inShop.door, mine = myBiz && myBiz.door === shopDoors.indexOf(d) ? myBiz : null;
  $('bName').value = mine ? mine.name : ''; $('bKind').value = String(mine ? mine.kind : d.kind); $('bDesc').value = mine ? mine.desc : ''; $('bUrl').value = mine ? mine.url : ''; $('bAddr').value = mine ? mine.address : '';
  for (let i=0;i<3;i++){ $('bP'+i).value = mine && mine.products[i] ? mine.products[i].n : ''; $('bR'+i).value = mine && mine.products[i] ? mine.products[i].p : ''; }
  $('bNote').textContent = myBiz && !mine ? `You already registered ${myBiz.name}. Saving here moves it to this shop.` : '';
  $('bRemove').hidden = !myBiz; $('bizWrap').hidden = false; $('bName').focus();
}
function closeBiz(){ $('bizWrap').hidden = true; cardOpen = false; }
$('prodClaim').addEventListener('click', openBiz);
$('bCancel').addEventListener('click', closeBiz);
$('bizWrap').addEventListener('click', e=>{ if (e.target === $('bizWrap')) closeBiz(); });
$('bizForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const name = $('bName').value.trim(), desc = $('bDesc').value.trim(), url = $('bUrl').value.trim(), address = $('bAddr').value.trim();
  if (!name || !desc){ $('bNote').textContent = 'Add your business name and a line about your shop.'; return; }
  if (url && !safeUrl(url)){ $('bNote').textContent = 'Use a full link that starts with https://'; return; }
  const products = [0,1,2].map(i=>({n:$('bP'+i).value.trim(), p:$('bR'+i).value.trim()})).filter(p=>p.n);
  const door = shopDoors.indexOf(inShop.door), taken = bizByDoor.get(door);
  if (taken && taken.owner !== myId){ $('bNote').textContent = 'Another business already registered this shop. Try one next door.'; return; }
  $('bSave').disabled = true; $('bNote').textContent = 'Saving…';
  if (!myBiz) setTimeout(()=>meetCreator(true), 2600);
  try { await db.collection('shops').doc(myId).set({door, name, kind:+$('bKind').value, desc, url, address, products, createdAt: (myBiz && myBiz.createdAt) || Date.now(), updatedAt:Date.now()});
    $('bNote').textContent = 'Your shop is live in the city.'; setTimeout(()=>{ closeBiz(); exitShop(); }, 800); }
  catch(err){ $('bNote').textContent = (err && (err.code==='permission_denied'||err.code==='not_granted')) ? 'You need edit access to this page to register a shop. Ask the person who shared it.' : 'That didn’t save. Check your connection and try again.'; }
  $('bSave').disabled = false;
});
$('bRemove').addEventListener('click', async ()=>{ try { await db.collection('shops').doc(myId).delete(); closeBiz(); } catch(e){ $('bNote').textContent = 'That didn’t work. Try again.'; } });

/* =========================================================
   Menu, running, outfits
   ========================================================= */
let alwaysRun = false;
const menuWrap = $('menuWrap');
function toggleMenu(show){ menuWrap.hidden = !show; $('menuBtn').setAttribute('aria-expanded', String(show)); syncTimeSeg(); }
$('menuBtn').addEventListener('click', ()=>toggleMenu(menuWrap.hidden));
menuWrap.addEventListener('click', e=>{ if (e.target === menuWrap) toggleMenu(false); });
function syncTimeSeg(){ [...$('timeSeg').children].forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.t === timeMode))); }
$('timeSeg').addEventListener('click', e=>{ const t2 = e.target.dataset && e.target.dataset.t; if (t2){ applyTime(t2); syncTimeSeg(); } });
const runToggle = $('runToggle'), runBtn = $('runBtn');
function setRun(v){ alwaysRun = v; runToggle.setAttribute('aria-pressed', String(v)); runToggle.textContent = `Always run: ${v ? 'on' : 'off'}`; runBtn.setAttribute('aria-pressed', String(v)); runBtn.textContent = v ? 'Running' : 'Run'; try { localStorage.setItem('jp-run', v ? '1' : '0'); } catch(e){} }
runToggle.addEventListener('click', ()=>setRun(!alwaysRun)); runBtn.addEventListener('click', ()=>setRun(!alwaysRun));
try { if (localStorage.getItem('jp-run') === '1') setRun(true); } catch(e){}
// music button text lives in the menu now
function syncMusicUi(){ const on = Music.on; $('musicBtn').textContent = `Music: ${on ? 'on' : 'off'}`; $('musicBtn').setAttribute('aria-pressed', String(on)); $('musicTop').textContent = on ? 'Music on' : 'Music off'; $('musicTop').setAttribute('aria-pressed', String(on)); try { localStorage.setItem('jp-music', on ? '1' : '0'); } catch(e){} }
$('musicBtn').addEventListener('click', ()=>{ setTimeout(syncMusicUi, 0); });
$('musicTop').addEventListener('click', ()=>{ Music.toggle(); syncMusicUi(); });
try { if (localStorage.getItem('jp-music') === '0'){ Music.toggle(); } } catch(e){}
syncMusicUi();

const PAL = {top:['#F4EDE2','#2F4F7F','#2E8C87','#B83A6B','#D8342B','#E8B33A','#3A3A40','#7E3FA0','#6E9AA8','#5E8F3A'],
             bot:['#F4EDE2','#2A2A33','#3B4B8C','#E8B33A','#B83A6B','#2E8C87','#7A5638','#D8342B'],
             hc:['#E8B33A','#D8342B','#E05A2B','#B83A6B','#2E8C87','#F4EDE2','#1E1512','#3B4B8C'],
             skin:['#E2B08E','#D9A07E','#C98E6B','#B07A57','#9C6A4C','#7A4E36']};
let myLook = {style:'kurta', head:'turban', top:0, bot:0, hc:0, skin:3};
try { const sv = JSON.parse(localStorage.getItem('jp-look') || 'null'); if (sv && typeof sv === 'object') myLook = Object.assign(myLook, sv); } catch(e){}
function lookFromCode(L){
  const st = ['kurta','shirt','lehenga'].includes(L.style) ? L.style : 'kurta', hd = ['turban','hair','longhair','odhni'].includes(L.head) ? L.head : 'hair';
  const ix = (arr,i) => arr[Math.max(0,Math.min(arr.length-1,(i|0)))];
  return {style:st, dress: st==='lehenga', head:hd, top:ix(PAL.top,L.top), bottom:ix(PAL.bot,L.bot), headColor:ix(PAL.hc,L.hc), hair:'#1E1512', skin:ix(PAL.skin,L.skin), moustache: st!=='lehenga' && hd==='turban'};
}
function rebuildPlayer(){
  const parent = player.g.parent, pos = player.g.position.clone(), rot = player.g.rotation.clone();
  parent.remove(player.g);
  const np = makePerson(lookFromCode(myLook));
  player.g = np.g; player.mesh = np.mesh; player.b = np.b; player.dress = np.dress; player.lL = np.lL; player.lR = np.lR; player.aL = np.aL; player.aR = np.aR;
  player.g.position.copy(pos); player.g.rotation.copy(rot); parent.add(player.g);
  if (riding) seat(player);
}
function swatchRow(id, arr, key){
  const el = $(id); el.innerHTML = '';
  arr.forEach((c,i)=>{ const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', `${key} colour ${i+1}`); b.setAttribute('aria-pressed', String(myLook[key]===i)); b.addEventListener('click', ()=>{ myLook[key] = i; saveLook(); }); el.appendChild(b); });
}
function segSync(id, key){ [...$(id).children].forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.v === myLook[key]))); }
function renderOutfit(){ segSync('oStyle','style'); segSync('oHead','head'); swatchRow('oTop',PAL.top,'top'); swatchRow('oBot',PAL.bot,'bot'); swatchRow('oHc',PAL.hc,'hc'); swatchRow('oSkin',PAL.skin,'skin'); }
function saveLook(){ try { localStorage.setItem('jp-look', JSON.stringify(myLook)); } catch(e){} rebuildPlayer(); renderOutfit(); lastSent = ''; }
$('oStyle').addEventListener('click', e=>{ if (e.target.dataset.v){ myLook.style = e.target.dataset.v; if (myLook.style==='lehenga' && myLook.head==='turban') myLook.head = 'odhni'; saveLook(); } });
$('oHead').addEventListener('click', e=>{ if (e.target.dataset.v){ myLook.head = e.target.dataset.v; saveLook(); } });
$('outfitBtn').addEventListener('click', ()=>{ toggleMenu(false); cardOpen = true; renderOutfit(); $('outfitWrap').hidden = false; });
$('oDone').addEventListener('click', ()=>{ $('outfitWrap').hidden = true; cardOpen = false; canvas.focus(); });
rebuildPlayer();

/* =========================================================
   Offices, companies and jobs
   ========================================================= */
const coByslot = new Map(); let myCo = null;
const officeSigns = new Map();
function officeSignTex(title, sub, vacant){
  const [c,x] = cv(1024,256); x.fillStyle = vacant ? '#F4EFE6' : '#14202E'; x.fillRect(0,0,1024,256);
  x.fillStyle = vacant ? '#7A4A40' : '#F4EAD8'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let sz = 96; x.font = `700 ${sz}px Hind, system-ui, sans-serif`; while (x.measureText(title).width > 940 && sz > 24){ sz -= 4; x.font = `700 ${sz}px Hind, system-ui, sans-serif`; }
  x.fillText(title, 512, sub ? 104 : 128);
  if (sub){ x.font = '500 48px Hind, system-ui, sans-serif'; x.fillStyle = vacant ? '#B85C48' : '#E8B33A'; x.fillText(sub, 512, 190); }
  return tex(c);
}
const MANTHHAN_LOGO = 'data:image/png;base64,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';
// Manthhan is in Tower A by default. When its owner registers the floor, their own details take over.
const MANTHHAN_SEED = {owner:'', seed:true, team:[], slot:MANTHHAN_SLOT, name:'Manthhan', logo:MANTHHAN_LOGO, about:'Engineering AI that runs in production, for government, enterprise and retail.', url:'https://manthhan.com/', email:'contact@manthhan.com', phone:'+919582016238', address:'Jagatpura, Jaipur', jobs:[], createdAt:0};
function companyAt(slot){ const co = coByslot.get(slot); if (co){ if (slot === MANTHHAN_SLOT && !co.logo && /manthhan/i.test(co.name)) return Object.assign({}, co, {logo:MANTHHAN_LOGO}); return co; } return slot === MANTHHAN_SLOT ? MANTHHAN_SEED : null; }
function floorName(d){ const co = companyAt(d.slot); return co ? co.name : 'Available'; }
function setOfficeSign(d){
  const co = companyAt(d.slot); d.co = co || null; d.name = floorName(d);
  const show = !!co, title = co ? co.name : '', sub = co ? `Floor ${d.n}` : '';
  const key = show ? title + '|' + sub + '|' + (co && co.logo || '') : ''; const cur = officeSigns.get(d.slot); if (cur && cur.key === key) return;
  if (cur){ scene.remove(cur.mesh); if (cur.logo) scene.remove(cur.logo); officeSigns.delete(d.slot); }
  if (!show) return;
  const W = Math.min(d.w*0.55, 11);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, W/4*0.8), new THREE.MeshStandardMaterial({map:officeSignTex(title, sub, false), roughness:0.6, emissive:lin('#ffffff')}));
  m.material.emissiveMap = m.material.map; glowMats.push([m.material,0.3]); m.material.emissiveIntensity = 0.3*TIMES[timeMode].glow;
  m.position.set(d.tx + d.w*0.18, d.fy, d.tz - d.fz - 0.12); m.rotation.y = Math.PI; scene.add(m);
  let lg = null; if (co.logo){ const sz = W/4*0.8; lg = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({map:logoTexture(co.logo), transparent:true, toneMapped:false})); lg.position.set(d.tx + d.w*0.18 + W/2 + sz*0.65, d.fy, d.tz - d.fz - 0.12); lg.rotation.y = Math.PI; scene.add(lg); }
  officeSigns.set(d.slot, {key, mesh:m, logo:lg});
}
fontReady.then(()=>officeDoors.forEach(setOfficeSign));
const entranceMarkers = [];
fontReady.then(()=>lobbyDoors.forEach(l=>{
  const dm = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({color:'#34C27A', toneMapped:false})); dm.position.set(l.x, 4.6, l.z+0.4); scene.add(dm);
  const lb = liveSprite(`Tower ${l.tower} entrance`); lb.position.set(l.x, 4.0, l.z+0.4); lb.scale.multiplyScalar(1.5); scene.add(lb);
  entranceMarkers.push(dm);
}));
const okMail = e => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(String(e||'').trim());
const okPhone = p => /^\+?[0-9][0-9 ()-]{6,18}$/.test(String(p||'').trim()) && String(p).replace(/\D/g,'').length >= 7;
function syncCompanies(snap){
  const claims = new Map(); myCo = null;
  for (const doc of snap.docs){
    const d = doc.data() || {}; const slot = clampN(d.slot,0,officeDoors.length-1,-1)|0; if (slot < 0) continue;
    const name = str(d.name,48).trim(); if (!name) continue;
    const jobs = Array.isArray(d.jobs) ? d.jobs.slice(0,3).map(j=>({title:str(j && j.title,60).trim(), type:str(j && j.type,20), apply: safeUrl(str(j && j.apply,200)) ? str(j.apply,200) : ''})).filter(j=>j.title) : [];
    const team = Array.isArray(d.team) ? d.team.filter(x=>typeof x==='string').slice(0,60) : [];
    const c = {owner:doc.id, team, slot, name, logo: isLogoRef(d.logo) ? d.logo : '', about:str(d.about,220), url: safeUrl(str(d.url,200)) ? str(d.url,200) : '', email: okMail(str(d.email,120)) ? str(d.email,120).trim() : '', phone: okPhone(str(d.phone,20)) ? str(d.phone,20).trim() : '', address:str(d.address,160), jobs, createdAt:clampN(d.createdAt,0,1e15,0)};
    if (doc.id === myId) myCo = c;
    const prev = claims.get(slot); if (!prev || c.createdAt < prev.createdAt) claims.set(slot, c);
  }
  coByslot.clear(); claims.forEach((c,k)=>coByslot.set(k,c));
  officeDoors.forEach(setOfficeSign);
  if (typeof refreshOffices === 'function') refreshOffices();
}
(async ()=>{
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try { const d = await window.claude.use('db'); if (!d) return; let tries = 0; while (!myId && tries++ < 12) await new Promise(r=>setTimeout(r,250));
    d.collection('companies').onSnapshot(syncCompanies, ()=>{}); } catch(e){}
})();
const cityView = (()=>{ const [c,x] = cv(1024,256); const g = x.createLinearGradient(0,0,0,256); g.addColorStop(0,'#9EC3E6'); g.addColorStop(0.6,'#F2D2B4'); g.addColorStop(1,'#E8B898'); x.fillStyle = g; x.fillRect(0,0,1024,256);
  x.fillStyle = '#B58B70'; x.beginPath(); x.moveTo(0,150); for (let i=0;i<=1024;i+=32) x.lineTo(i, 130 + Math.sin(i/90)*18 + Math.sin(i/37)*8); x.lineTo(1024,256); x.lineTo(0,256); x.fill();
  for (let i=0;i<70;i++){ const bx = Math.random()*1024, bw = 14+Math.random()*30, bh = 20+Math.random()*60; x.fillStyle = ['#D98A72','#CF7C66','#E3A08A','#C9745E','#E8E0D6'][i%5]; x.fillRect(bx, 256-bh-30*Math.random(), bw, bh+40); if (i%7===0){ x.beginPath(); x.arc(bx+bw/2, 256-bh-30, bw/2.4, Math.PI, 0); x.fill(); } }
  return tex(c); })();
const M_VIEW = new THREE.MeshStandardMaterial({map:cityView, emissiveMap:cityView, emissive:lin('#ffffff'), emissiveIntensity:0.85, roughness:0.2});
function wallWithGaps(sc, W, H, z, wallCol, gaps){
  const GW = 2.3, xs = [-W/2, ...gaps.flatMap(g=>[g-GW/2, g+GW/2]), W/2];
  for (let i=0;i<xs.length;i+=2){ const a = xs[i], b = xs[i+1]; if (b-a > 0.01) box(sc,b-a,H,0.2,wallCol,(a+b)/2,0,z,'stone'); }
  gaps.forEach(g=>box(sc,GW,H-2.75,0.2,wallCol,g,2.75,z,'stone'));
}
function roomShell(sc, W, D, H, floorCol, wallCol, noFront, backGaps, frontGaps){
  add(sc,UPLANE,mat(floorCol,'paving'),0,0,0,W,D,1,0,-Math.PI/2);
  box(sc,W,0.1,D,'#F2F0EC',0,H,0,'stone');
  if (backGaps) wallWithGaps(sc,W,H,-D/2,wallCol,backGaps); else box(sc,W,H,0.2,wallCol,0,0,-D/2,'stone');
  box(sc,0.2,H,D,wallCol,-W/2,0,0,'stone'); box(sc,0.2,H,D,wallCol,W/2,0,0,'stone');
  if (!noFront){ if (frontGaps) wallWithGaps(sc,W,H,D/2,wallCol,frontGaps); else box(sc,W,H,0.2,wallCol,0,0,D/2,'stone'); }
  for (let x=-W/2+3; x<W/2-2; x+=3) add(sc,UBOX,M_LIGHT,x,H-0.06,0,1.6,0.04,0.4);
  sc.add(new THREE.HemisphereLight(lin('#F4F6FF'), lin('#6A6A6A'), 1.0));
  const pl = new THREE.PointLight(lin('#FFF4E6'), 0.8, 20, 1.4); pl.position.set(0,H-0.5,0); sc.add(pl);
}
function floorIndicator(label){ const [c,x] = cv(128,64); x.fillStyle = '#111'; x.fillRect(0,0,128,64); x.fillStyle = '#FF8A3A'; x.font = '700 44px Hind, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 64, 36); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function makeLift(sc, x, zWall, out, label){
  // out: +1 if the room is on the +z side of the wall, -1 if on the -z side
  const ry = out > 0 ? 0 : Math.PI, car = new THREE.Group(), depth = 2.2, cz = zWall - out*(depth/2 + 0.1);
  box(car,2.3,0.04,depth,'#8A8F96',0,0,0,'stone'); box(car,2.3,0.06,depth,'#E8E6E2',0,2.72,0,'stone');
  add(car,UBOX,M_LIGHT,0,2.7,0,1.2,0.03,1.0);
  for (const s of [-1,1]) box(car,0.06,2.75,depth,'#C9CDD2',s*1.15,0,0,'stone');
  box(car,2.3,2.75,0.06,'#C9CDD2',0,0,-out*depth/2,'stone');
  add(car,UPLANE,new THREE.MeshStandardMaterial({color:lin('#C9D6DC'), roughness:0.05, metalness:0.8}),0,1.5,-out*(depth/2-0.04),1.5,1.6,1,ry);
  box(car,1.9,0.05,0.06,'#9A9EA4',0,0.95,-out*(depth/2-0.08),'stone');
  box(car,0.25,0.6,0.04,'#2A2A2E',0.95,1.1,out*(depth/2-0.35),'stone');
  for (let i=0;i<4;i++) add(car,SPH,M_LIGHT,0.95,1.2+i*0.12,out*(depth/2-0.37),0.025,0.025,0.012);
  car.position.set(x,0,cz); sc.add(car);
  const pl = new THREE.PointLight(lin('#FFF6E8'), 0.6, 5, 1.6); pl.position.set(x,2.4,cz); sc.add(pl);
  const zd = zWall - out*0.16;
  const doorL = box(sc,1.15,2.6,0.06,'#B9BEC4',x-0.575,0,zd,'stone'), doorR = box(sc,1.15,2.6,0.06,'#B9BEC4',x+0.575,0,zd,'stone');
  box(sc,2.6,0.16,0.22,'#2A2A2E',x,2.62,zWall+out*0.02,'stone');
  const ind = new THREE.Mesh(UPLANE, new THREE.MeshBasicMaterial({map:floorIndicator(label), toneMapped:false})); ind.scale.set(0.5,0.25,1); ind.position.set(x,3.0,zWall+out*0.12); ind.rotation.y = ry; sc.add(ind);
  const lift = {x, zWall, out, doorL, doorR, open:0, target:0, carZ:cz, ind, label};
  (sc.userData.lifts = sc.userData.lifts || []).push(lift);
  return lift;
}
function liftDoors(sc, x, z, ry){ const g = new THREE.Group(); box(g,2.2,2.6,0.12,'#B9BEC4',0,0,0,'stone'); box(g,0.04,2.4,0.14,'#5A5F66',0,0.05,0,'stone'); box(g,2.6,0.2,0.16,'#2A2A2E',0,2.6,0,'stone'); add(g,UBOX,M_LIGHT,0,2.95,0.05,0.5,0.12,0.04); g.position.set(x,0,z); g.rotation.y = ry; sc.add(g); }
function buildLobby(door){
  const sc = new THREE.Scene(), W = 14, D = 12, H = 5;
  sc.background = new THREE.Color('#1A1A1E'); sc.fog = new THREE.Fog(0x1a1a1e, 40, 80);
  roomShell(sc,W,D,H,'#D6D2CC','#ECE8E2',true,[-2.2,2.2]);
  add(sc,arcadeGeo(W,1,H,2.8,3.6,0.25),M('#ECE8E2','stone'),0,0,D/2);
  sc.userData.outside = add(sc,UPLANE,new THREE.MeshBasicMaterial({color:'#F3DCC0'}),0,2,D/2+1.2,4,5);
  makeLift(sc,-2.2,-D/2,1,'G'); makeLift(sc,2.2,-D/2,1,'G');
  const [lc,lx] = cv(1024,200); lx.fillStyle = '#14202E'; lx.fillRect(0,0,1024,200); lx.fillStyle = '#F4EAD8'; lx.textAlign = 'center'; lx.font = '700 84px Hind, system-ui, sans-serif'; lx.fillText(`TECH PARK · TOWER ${door.tower}`, 512, 128);
  plane(sc,new THREE.MeshStandardMaterial({map:tex(lc), roughness:0.6}),0,3.8,-D/2+0.13,5.6,1.1);
  // directory board
  const fl = officeDoors.filter(f=>f.tower===door.tower).sort((a,b)=>b.n-a.n);
  const [dc,dx] = cv(512,64+fl.length*40); dx.fillStyle = '#1E2420'; dx.fillRect(0,0,512,dc.height); dx.fillStyle = '#E8B33A'; dx.font = '700 32px Hind, system-ui, sans-serif'; dx.fillText('Directory', 24, 44);
  dx.font = '500 26px Hind, system-ui, sans-serif'; fl.forEach((f,i)=>{ dx.fillStyle = '#F4EDE2'; dx.fillText(`${f.n}`, 24, 88+i*40); dx.fillStyle = floorName(f)==='Available' ? '#9AA59A' : '#F4EDE2'; dx.fillText(floorName(f).slice(0,30), 80, 88+i*40); });
  plane(sc,new THREE.MeshStandardMaterial({map:tex(dc), roughness:0.7}),W/2-0.13,2.4,-1.5,2.2,2.2*dc.height/512,-Math.PI/2);
  box(sc,3.4,1.05,0.8,'#2A2A2E',-3.6,0,0.5,'stone'); box(sc,3.5,0.05,0.9,'#C9C2B5',-3.6,1.05,0.5,'stone');
  for (const z of [1.5,3.4]) { box(sc,2.2,0.45,0.85,'#5A6B7A',4,0,z,'stone'); box(sc,2.2,0.5,0.2,'#5A6B7A',4.95,0.45,z,'stone'); }
  for (const [x,z] of [[-W/2+0.6,D/2-0.8],[W/2-0.6,D/2-0.8],[-W/2+0.6,-D/2+0.8],[W/2-0.6,-D/2+0.8]]){ cyl(sc,0.3,0.55,'#2A2A2E',x,0,z,12,'stone'); add(sc,BLOBS[0],mat('#4E7A2C','foliage'),x,1.1,z,0.5,0.65,0.5); }
  sc.userData = Object.assign(sc.userData, {keeper:null, counterZ:-99, dims:{W,D,H}, lobby:true, rects:[{minX:-5.4,maxX:-1.8,minZ:0,maxZ:1}], circles:[{x:4,z:1.5,r:1.1},{x:4,z:3.4,r:1.1}]});
  return sc;
}
function buildFloor(f){
  const sc = new THREE.Scene(), W = 16, D = 12, H = 3.6, co = f.co, name = floorName(f);
  sc.background = new THREE.Color('#1A1A1E'); sc.fog = new THREE.Fog(0x1a1a1e, 40, 80);
  roomShell(sc,W,D,H,'#BDB7AE','#EEEBE6',false,null,[0]);
  // windows with the city outside
  plane(sc,M_VIEW,0,1.9,-D/2+0.12,W-1,2.0); plane(sc,M_VIEW,-W/2+0.12,1.9,-1,D-4,2.0,Math.PI/2); plane(sc,M_VIEW,W/2-0.12,1.9,-2.5,D-6,2.0,-Math.PI/2);
  for (let x=-W/2+1; x<W/2; x+=2.5) box(sc,0.08,2.0,0.06,'#6A6E74',x,0.9,-D/2+0.15,'stone');
  makeLift(sc,0,D/2,-1,String(f.n));
  // company wall
  const [lc,lx] = cv(1024,220); lx.fillStyle = '#14202E'; lx.fillRect(0,0,1024,220); lx.fillStyle = name==='Available' ? '#9AA59A' : '#F4EAD8'; lx.textAlign = 'center'; let sz = 80; lx.font = `700 ${sz}px Hind, system-ui, sans-serif`; const label = name==='Available' ? `Floor ${f.n} · available` : name; while (lx.measureText(label).width > 950 && sz > 26){ sz -= 4; lx.font = `700 ${sz}px Hind, system-ui, sans-serif`; } lx.fillText(label, 512, 128);
  plane(sc,new THREE.MeshStandardMaterial({map:tex(lc), roughness:0.6}),-4.6,2.3,D/2-0.13,4.6,1.0,Math.PI);
  if (co && co.logo){ const lm = new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1), new THREE.MeshBasicMaterial({map:logoTexture(co.logo), transparent:true, toneMapped:false})); lm.position.set(-1.6,2.3,D/2-0.13); lm.rotation.y = Math.PI; sc.add(lm); }
  box(sc,3,1.05,0.75,'#2A2A2E',-4.6,0,3.6,'stone'); box(sc,3.1,0.05,0.85,'#C9C2B5',-4.6,1.05,3.6,'stone');
  const rects = [{minX:-6.2,maxX:-3.0,minZ:3.2,maxZ:4.0}], circlesIn = [];
  const screen = new THREE.MeshStandardMaterial({color:lin('#0E1A2A'), emissive:lin('#5AA0FF'), emissiveIntensity:0.9, roughness:0.3});
  const LOOKS = [{style:'shirt',top:'#6E9AA8',bottom:'#2E3140',head:'hair',headColor:'#1E1512',skin:'#9C6A4C'},{style:'shirt',top:'#B83A6B',bottom:'#2A2A33',head:'longhair',headColor:'#2A1B17',skin:'#D9A07E'},{style:'kurta',top:'#F4EDE2',bottom:'#F4EDE2',head:'hair',headColor:'#1E1512',skin:'#B07A57',moustache:true},{style:'shirt',top:'#3A3A40',bottom:'#2A2A33',head:'hair',headColor:'#1E1512',skin:'#C98E6B'}];
  let k = 0;
  for (const row of [0.4,-2.0]) for (const x of [-1.8,0.6,3.0]){
    box(sc,1.9,0.05,0.85,'#E2DDD5',x,0.74,row,'stone'); box(sc,0.05,0.74,0.75,'#2A2A2E',x-0.9,0,row,'stone'); box(sc,0.05,0.74,0.75,'#2A2A2E',x+0.9,0,row,'stone');
    box(sc,0.6,0.38,0.03,'#1A1A1A',x,0.92,row-0.27,'stone'); add(sc,UPLANE,screen,x,1.11,row-0.25,0.55,0.32); box(sc,0.42,0.02,0.15,'#2A2A2A',x,0.78,row,'stone');
    rects.push({minX:x-1.0,maxX:x+1.0,minZ:row-0.5,maxZ:row+0.5});
    box(sc,0.5,0.06,0.5,'#2A2A2E',x,0.44,row+0.8,'stone');
    k++;
  }
  // glass meeting room (back left)
  const gm = new THREE.MeshStandardMaterial({color:lin('#A9C3CC'), transparent:true, opacity:0.25, roughness:0.05, depthWrite:false});
  add(sc,UBOX,gm,-5.25,1.5,-2.8,5.1,3.0,0.06); add(sc,UBOX,gm,-2.7,1.5,-4.4,0.06,3.0,2.8);
  box(sc,2.6,0.05,1.2,'#7A5638',-5.4,0.74,-4.4,'stone'); cyl(sc,0.08,0.74,'#2A2A2E',-5.4,0,-4.4,8,'stone');
  for (const [x,z] of [[-6.5,-4.4],[-4.3,-4.4],[-5.4,-3.6],[-5.4,-5.2]]) box(sc,0.45,0.48,0.45,'#2A2A2E',x,0,z,'stone');
  box(sc,0.05,0.9,1.6,'#1A1A1A',-W/2+0.15,1.2,-4.4,'stone');
  rects.push({minX:-7.9,maxX:-2.6,minZ:-6,maxZ:-2.75});
  // pantry (back right)
  box(sc,3.4,0.95,0.7,'#5A3A26',5.6,0,-5.4,'stone'); box(sc,3.5,0.05,0.8,'#2A2A2A',5.6,0.95,-5.4,'stone'); box(sc,0.5,0.45,0.4,'#C9C9C9',4.6,1.0,-5.4,'stone'); box(sc,0.8,1.9,0.7,'#D8D8D8',7.4,0,-4.2,'stone');
  for (const x of [4.8,5.8,6.8]) { cyl(sc,0.18,0.7,'#2A2A2E',x,0,-4.5,10,'stone'); }
  rects.push({minX:3.8,maxX:7.9,minZ:-6,maxZ:-3.8});
  // lounge (front right) and jobs board
  box(sc,2.6,0.45,0.9,'#B85C3F',5.6,0,3.8,'stone'); box(sc,2.6,0.5,0.22,'#B85C3F',5.6,0.45,4.25,'stone'); box(sc,1.2,0.4,0.7,'#7A5638',5.6,0,2.6,'stone');
  rects.push({minX:4.2,maxX:7.0,minZ:2.2,maxZ:4.4});
  const [jc,jx] = cv(512,384); jx.fillStyle = '#F7F3EC'; jx.fillRect(0,0,512,384); jx.strokeStyle = '#2E8C5A'; jx.lineWidth = 12; jx.strokeRect(6,6,500,372);
  jx.fillStyle = '#14202E'; jx.font = '700 46px Hind, system-ui, sans-serif'; jx.textAlign = 'center'; jx.fillText('We’re hiring', 256, 70); jx.font = '500 30px Hind, system-ui, sans-serif';
  const jobs = co ? co.jobs : []; if (jobs.length) jobs.forEach((j,i)=>jx.fillText(j.title.slice(0,30), 256, 140 + i*60)); else { jx.fillStyle = '#7A4A40'; jx.fillText('No roles posted yet', 256, 170); }
  plane(sc,new THREE.MeshStandardMaterial({map:tex(jc), roughness:0.8}),W/2-0.13,1.7,1.0,1.8,1.35,-Math.PI/2);
  if (false){ const [wc,wx] = cv(512,320); wx.fillStyle = '#FBFBF8'; wx.fillRect(0,0,512,320); wx.strokeStyle = '#2F4F7F'; wx.lineWidth = 3;
    const layers = [[80,4],[200,6],[320,6],[440,2]]; layers.forEach(([lx2,n],li)=>{ for (let q=0;q<n;q++){ const y = 160 + (q-(n-1)/2)*42; if (li < 3){ const nx = layers[li+1]; for (let m=0;m<nx[1];m++){ const y2 = 160 + (m-(nx[1]-1)/2)*42; wx.globalAlpha = 0.35; wx.beginPath(); wx.moveTo(lx2,y); wx.lineTo(nx[0],y2); wx.stroke(); wx.globalAlpha = 1; } } wx.beginPath(); wx.arc(lx2,y,12,0,Math.PI*2); wx.fillStyle = li===3 ? '#D8342B' : '#2F4F7F'; wx.fill(); } });
    plane(sc,new THREE.MeshStandardMaterial({map:tex(wc), roughness:0.5}),-2.68,1.6,-3.6,1.8,1.1,-Math.PI/2); }
  for (const [x,z] of [[-W/2+0.6,D/2-0.8],[2.6,D/2-0.8],[W/2-0.6,-1.2]]){ cyl(sc,0.28,0.55,'#2A2A2E',x,0,z,12,'stone'); add(sc,BLOBS[0],mat('#4E7A2C','foliage'),x,1.05,z,0.5,0.6,0.5); }
  // a receptionist behind the front desk on every floor
  { const rp = makePerson({style:'shirt',top:'#2F4F7F',bottom:'#2A2A33',head:'longhair',headColor:'#1E1512',skin:'#B07A57'}); rp.g.position.set(-4.6,0,4.5); rp.g.rotation.y = Math.PI; sc.add(rp.g);
    fontReady.then(()=>{ const lb = liveSprite('Reception'); lb.position.set(-4.6,2.4,4.5); sc.add(lb); }); }
  // the company's real, confirmed team stands at the desks
  const team = co ? teamOf(co) : []; const deskSpots = [[-1.8,1.2],[0.6,1.2],[3.0,1.2],[-1.8,-1.2],[0.6,-1.2],[3.0,-1.2]];
  team.slice(0,6).forEach((m,i)=>{ const ch = makePerson(m.p.look); ch.g.position.set(deskSpots[i][0],0,deskSpots[i][1]); ch.g.rotation.y = Math.PI*0.9; sc.add(ch.g); fontReady.then(()=>{ const lb = liveSprite(m.p.name.split(' ')[0]); lb.position.set(deskSpots[i][0],2.3,deskSpots[i][1]); sc.add(lb); }); });
  sc.userData = Object.assign(sc.userData, {keeper:null, counterZ:-99, dims:{W,D,H}, floor:true, office:true, rects, circles:circlesIn, sitters:[], jobsSpot:{x:W/2-1.3, z:1.0}, reception:{x:-4.6, z:3.0}});
  return sc;
}
function openReception(){
  const d = inShop.door, co = d.co; cardOpen = true;
  $('recTitle').textContent = co ? co.name : `Floor ${d.n}`;
  $('recSay').textContent = co ? `Namaste, welcome to ${co.name}! ${co.about || ''}`.trim() : 'Namaste! This floor is available. If your company would like an office in the Tech Park, you can register it here.';
  const info = $('recInfo'); info.innerHTML = '';
  if (co && co.logo){ const im = document.createElement('img'); im.src = logoUrl(co.logo); im.alt = `${co.name} logo`; im.className = 'jlogo'; info.appendChild(im); }
  const row = (label, text, href) => { const r = document.createElement('div'); r.className = 'recrow'; const sp = document.createElement('span'); sp.textContent = label; r.appendChild(sp);
    if (href){ const a = document.createElement('a'); a.textContent = text; a.href = href; if (/^https:/.test(href)){ a.target = '_blank'; a.rel = 'noopener'; } r.appendChild(a); } else { const b = document.createElement('b'); b.textContent = text; r.appendChild(b); } info.appendChild(r); };
  if (co){
    if (co.url) row('Website', co.url.replace(/^https?:\/\//,'').replace(/\/$/,''), co.url);
    if (co.email) row('Email', co.email, 'mailto:' + co.email);
    if (co.phone) row('Phone', co.phone, 'tel:' + co.phone.replace(/[^\d+]/g,''));
    row('Office', `${co.address || 'Jagatpura, Jaipur'} · Tower ${d.tower}, floor ${d.n}`);
    row('Open roles', co.jobs.length ? `${co.jobs.length} open` : 'None right now');
  }
  $('recJobs').textContent = co ? 'See open roles' : 'Register your company';
  $('recWrap').hidden = false;
}
function closeReception(keep){ $('recWrap').hidden = true; if (!keep) cardOpen = false; }
$('recClose').addEventListener('click', ()=>closeReception());
$('recJobs').addEventListener('click', ()=>{ closeReception(true); openJobs(); });
function openJobs(){
  const d = inShop.door, co = d.co; cardOpen = true;
  $('jobsCo').textContent = co ? co.name : d.name; const list = $('jobsList'); list.innerHTML = '';
  if (co && co.logo){ const im = document.createElement('img'); im.src = logoUrl(co.logo); im.alt = `${co.name} logo`; im.className = 'jlogo'; list.appendChild(im); }
  const jobs = co ? co.jobs : [];
  if (!jobs.length){ const p = document.createElement('p'); p.className = 'prod-desc'; p.textContent = co ? `${co.name} hasn’t posted any roles yet.` : 'No roles posted yet. Once this company registers, its openings show up here and in the Jobs list.'; list.appendChild(p); }
  jobs.forEach(j=>{ const r = document.createElement('div'); r.className = 'job'; const t = document.createElement('div'); const b = document.createElement('b'); b.textContent = j.title; const sp = document.createElement('span'); sp.textContent = `${j.type || 'Role'}, ${co.address || 'Jaipur'}`; t.append(b,sp); r.appendChild(t);
    if (j.apply){ const a = document.createElement('button'); a.className = 'btn primary'; a.textContent = 'Apply'; a.addEventListener('click', ()=>window.open(j.apply,'_blank','noopener')); r.appendChild(a); } list.appendChild(r); });
  $('jobsSite').hidden = !(co && co.url); $('coClaim').hidden = !(db && myId && (!co || co.owner === myId));
  $('coClaim').hidden = !(db && myId && (!co || co.seed || co.owner === myId));
  $('coClaim').textContent = co && co.owner === myId ? 'Edit your company and roles' : co && co.seed ? 'Are you from Manthhan? Claim this floor' : 'Is this your company? Register it';
  $('jobsWrap').hidden = false;
}
function closeJobs(keep){ $('jobsWrap').hidden = true; if (!keep) cardOpen = false; }
$('jobsClose').addEventListener('click', ()=>closeJobs());
$('jobsSite').addEventListener('click', ()=>{ const co = inShop && inShop.door.co; if (co && safeUrl(co.url)) window.open(co.url,'_blank','noopener'); });
$('coClaim').addEventListener('click', ()=>{ closeJobs(true); openCo(); });
function openCo(){
  const d = inShop.door, mine = myCo && myCo.slot === d.slot ? myCo : null;
  const seed = !mine && d.slot === MANTHHAN_SLOT ? MANTHHAN_SEED : null;
  $('cName2').value = mine ? mine.name : seed ? 'Manthhan' : ''; $('cAbout').value = mine ? mine.about : seed ? seed.about : ''; $('cUrl').value = mine ? mine.url : seed ? seed.url : ''; $('cMail').value = mine ? (mine.email || '') : seed ? seed.email : (window.JP_AUTH && window.JP_AUTH.email ? window.JP_AUTH.email() : ''); $('cPhone').value = mine ? (mine.phone || '') : seed ? seed.phone : ''; $('cAddr').value = mine ? mine.address : 'Jagatpura, Jaipur';
  for (let i=0;i<3;i++){ const j = mine && mine.jobs[i]; $('cJ'+i).value = j ? j.title : ''; $('cT'+i).value = j ? (j.type||'Full-time') : 'Full-time'; $('cA'+i).value = j ? j.apply : ''; }
  $('coNote').textContent = myCo && !mine ? `You already registered ${myCo.name}. Saving here moves it to this office.` : '';
  const claims = [...memberMap.values()].filter(m=>m.p.company === myId), tw = $('coTeam'); tw.innerHTML = '';
  claims.forEach(m=>{ const l = document.createElement('label'); l.className = 'teamrow'; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = m.id; cb.checked = !!(mine && mine.team.includes(m.id)); const sp = document.createElement('span'); sp.textContent = `${m.p.name}${m.p.role ? ', ' + m.p.role : ''}`; l.append(cb, sp); tw.appendChild(l); });
  $('coTeamWrap').hidden = !claims.length;
  pendingLogo = null; $('cLogo').value = ''; const pv = $('cLogoPrev'); const shownLogo = (mine && mine.logo) || (d.slot === MANTHHAN_SLOT ? MANTHHAN_LOGO : ''); if (shownLogo){ pv.src = logoUrl(shownLogo); pv.hidden = false; } else pv.hidden = true;
  $('coRemove').hidden = !myCo; cardOpen = true; $('coWrap').hidden = false; $('cName2').focus();
}
function closeCo(){ $('coWrap').hidden = true; cardOpen = false; }
$('coCancel').addEventListener('click', closeCo);
let pendingLogo = null;
$('cLogo').addEventListener('change', async ()=>{
  const f = $('cLogo').files && $('cLogo').files[0]; pendingLogo = null; if (!f) return;
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)){ $('coNote').textContent = 'Use a PNG, JPG or WebP image.'; return; }
  if (f.size > 8*1024*1024){ $('coNote').textContent = 'That image is over 8 MB. Try a smaller one.'; return; }
  try {
    const bmp = await createImageBitmap(f), k = Math.min(1, 512/Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width*k), h = Math.round(bmp.height*k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp,0,0,w,h);
    pendingLogo = await new Promise(r=>c.toBlob(r,'image/png'));
    const pv = $('cLogoPrev'); pv.src = URL.createObjectURL(pendingLogo); pv.hidden = false; $('coNote').textContent = '';
  } catch(e){ $('coNote').textContent = 'That image couldn’t be read. Try another file.'; }
});
$('coWrap').addEventListener('click', e=>{ if (e.target === $('coWrap')) closeCo(); });
$('coForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const name = $('cName2').value.trim(), about = $('cAbout').value.trim(), url = $('cUrl').value.trim(), address = $('cAddr').value.trim();
  if (!coEmailOk()){ $('coNote').textContent = coEmailMsg(); return; }
  if (!name || !about){ $('coNote').textContent = 'Add your company name and what you do.'; return; }
  const email = $('cMail').value.trim(), phone = $('cPhone').value.trim();
  if (!url || !safeUrl(url)){ $('coNote').textContent = 'Add your website as a full link that starts with https://'; return; }
  if (!okMail(email)){ $('coNote').textContent = 'Add a contact email visitors can write to.'; return; }
  if (!okPhone(phone)){ $('coNote').textContent = 'Add a phone number, like +91 98765 43210.'; return; }
  const jobs = [];
  for (let i=0;i<3;i++){ const title = $('cJ'+i).value.trim(), apply = $('cA'+i).value.trim(); if (!title) continue; if (apply && !safeUrl(apply)){ $('coNote').textContent = `The apply link for “${title}” needs to start with https://`; return; } jobs.push({title, type:$('cT'+i).value, apply}); }
  const slot = inShop.door.slot, taken = coByslot.get(slot);
  if (taken && taken.owner !== myId){ $('coNote').textContent = 'Another company already registered this office. Try another one on this road.'; return; }
  $('coSave').disabled = true; $('coNote').textContent = 'Saving…';
  const team = [...$('coTeam').querySelectorAll('input:checked')].map(i=>i.value);
  let logo = (myCo && myCo.logo) || '';
  if (pendingLogo){
    const assets = window.claude && window.claude.use ? await window.claude.use('assets') : null;
    if (!assets){ $('coNote').textContent = 'Logo upload isn’t available for your account here. Your company will save without it.'; }
    else { try { $('coNote').textContent = 'Uploading your logo…'; const r = await assets.upload(pendingLogo, {type:'image/png'}); logo = r.id; } catch(err){ $('coNote').textContent = 'The logo didn’t upload. Saving the rest.'; } }
  }
  try { await db.collection('companies').doc(myId).set({slot, name, about, url, email, phone, address, jobs, team, logo, createdAt:(myCo && myCo.createdAt) || Date.now(), updatedAt:Date.now()});
    if (!myCo) setTimeout(()=>meetCreator(true), 2600);
    $('coNote').textContent = 'Your floor is live.'; setTimeout(()=>{ closeCo(); const f = inShop && inShop.door; if (f && f.kind===7){ setTimeout(()=>{ const ff = officeDoors[f.slot]; enterFloor(ff); }, 400); } }, 800); }
  catch(err){ $('coNote').textContent = (err && (err.code==='permission_denied'||err.code==='not_granted')) ? 'You need edit access to this page to register a company. Ask the person who shared it.' : 'That didn’t save. Check your connection and try again.'; }
  $('coSave').disabled = false;
});
$('coRemove').addEventListener('click', async ()=>{ try { await db.collection('companies').doc(myId).delete(); closeCo(); } catch(e){ $('coNote').textContent = 'That didn’t work. Try again.'; } });

/* =========================================================
   Clean UI: hide controls while a panel is open
   ========================================================= */
const DIALOGS = ['notifWrap','commWrap','meetWrap','clubWrap','guideWrap','roleWrap','liftWrap','cardWrap','chatWrap','prodWrap','bizWrap','joinWrap','coWrap','jobsWrap','recWrap','outfitWrap','mapWrap'];
function syncDialogs(){ const open = DIALOGS.some(id=>!$(id).hidden); document.body.classList.toggle('dlg', open); }
const dlgObs = new MutationObserver(syncDialogs); DIALOGS.forEach(id=>dlgObs.observe($(id), {attributes:true, attributeFilter:['hidden']}));
if (isCoarse) runBtn.hidden = true;

/* =========================================================
   Lift and the "how are you joining?" chooser
   ========================================================= */
let liftMode = 'go';
function openLift(tower, mode='go'){
  liftMode = mode; cardOpen = true; for (const k in keys) keys[k] = false;
  $('liftTower').textContent = `Tech Park Tower ${tower}`; $('liftTitle').textContent = mode==='register' ? 'Pick a free floor' : 'Which floor?'; $('liftClose').textContent = mode==='ride' ? 'Step out' : 'Close';
  const list = $('liftList'); list.innerHTML = '';
  const row = (title, sub, btn, fn, primary, logo)=>{ const r = document.createElement('div'); r.className = 'frow'; if (logo){ const im = document.createElement('img'); im.src = logoUrl(logo); im.alt = ''; im.className = 'flogo'; r.appendChild(im); } const t = document.createElement('div'); t.style.flex = '1'; const b = document.createElement('b'); b.textContent = title; const sp = document.createElement('span'); sp.textContent = sub; t.append(b,sp); const bt = document.createElement('button'); bt.className = 'btn' + (primary ? ' primary' : ''); bt.textContent = btn; bt.addEventListener('click', fn); r.append(t,bt); list.appendChild(r); };
  officeDoors.filter(f=>f.tower===tower).sort((a,b)=>b.n-a.n).forEach(f=>{
    const nm = floorName(f), free = nm === 'Available';
    if (mode==='register') row(`Floor ${f.n}`, free ? 'Free for your company' : nm, free ? 'Take this floor' : 'Visit', ()=>{ closeLift(); enterFloor(f); if (free && db && myId) setTimeout(openCo, 500); }, free);
    else { const here = inShop && inShop.floor && inShop.door.slot === f.slot, co = companyAt(f.slot); row(`Floor ${f.n}`, here ? `${nm} (you’re here)` : nm, here ? 'Here' : 'Go', ()=>{ if (here) return; if (!chooseDest(f)){ closeLift(); enterFloor(f); } }, false, co && co.logo); }
  });
  const lob = lobbyDoors.find(l=>l.tower===tower);
  const atLobby = inShop && inShop.scene.userData.lobby;
  row('Ground floor', atLobby ? 'Lobby (you’re here)' : 'Lobby and street exit', atLobby ? 'Here' : 'Go', ()=>{ if (atLobby) return; if (!chooseDest(lob)){ closeLift(); inShop = null; enterShop(lob); } }, false);
  $('liftWrap').hidden = false;
}
function closeLift(keepRide){ if ($('liftWrap').hidden) return; $('liftWrap').hidden = true; cardOpen = false; }
$('liftClose').addEventListener('click', ()=>{ if (liftState && liftState.phase === 'choosing') stepOut(); else closeLift(); });

let pendingRole = null;
/* Companies register with a work email; personal addresses (Gmail etc.) can't. The database checks this too. */
const coEmailOk = () => !(window.JP_AUTH && window.JP_AUTH.isWorkEmail) || window.JP_AUTH.isWorkEmail();
const coEmailMsg = () => `Companies register with a work email, like you@yourcompany.com. You’re signed in as ${window.JP_AUTH.email()}. Sign out from the Menu and sign in with your company email to register.`;
function showRoles(){ $('roleNote').textContent = ''; $('roleWrap').hidden = false; cardOpen = true; }
$('roleBtn').addEventListener('click', ()=>{ toggleMenu(false); showRoles(); });
$('roleWrap').addEventListener('click', async e=>{
  const btn = e.target.closest('.choice'); if (!btn) return; const role = btn.dataset.role;
  if (role !== 'explore' && !(db && myId)){
    if (window.JP_AUTH && window.JP_AUTH.signIn){ try { localStorage.setItem('jp-pending-role', role); } catch(err){} $('roleNote').textContent = role === 'company' ? 'Sign in with your work email to register your company…' : 'Taking you to sign in…'; window.JP_AUTH.signIn(); return; }
    $('roleNote').textContent = 'Registering needs you to be signed in with edit access to this page. You can still explore.'; return;
  }
  if (role === 'company' && !coEmailOk()){ $('roleNote').textContent = coEmailMsg(); return; }
  $('roleWrap').hidden = true; cardOpen = false;
  if (mode !== 'play') start();
  runRole(role);
});
function runRole(role){
  if (role === 'explore'){ let g = null; try { g = localStorage.getItem('jp-guided'); } catch(e){} if (!g) setTimeout(()=>$('guideBtn').click(), 900); }
  if (role === 'individual') setTimeout(openJoin, 300);
  else if (role === 'business'){
    const free = shopDoors.map((d,i)=>[d,i]).filter(([d,i])=>!bizByDoor.has(i) && d.kind !== 6);
    const pickD = (free.length ? free[Math.floor(Math.random()*free.length)][0] : shopDoors[0]);
    enterShop(pickD); setTimeout(()=>{ openBiz(); $('bNote').textContent = `This is a free shop. Register it, or pick another from Explore, then Shops.`; }, 400);
  }
  else if (role === 'company'){ const lob = lobbyDoors[0]; enterShop(lob); setTimeout(()=>openLift(lob.tower,'register'), 400); }
}

/* =========================================================
   Free shops have their shutters down until a real business registers
   ========================================================= */
const shutterTex = (()=>{ const [c,x] = cv(256,320); x.fillStyle = '#8E9298'; x.fillRect(0,0,256,320);
  for (let y=0;y<320;y+=10){ x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0,y,256,3); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0,y+6,256,2); }
  x.fillStyle = '#5E6268'; x.fillRect(0,300,256,20); x.fillStyle = '#2A2A2A'; x.fillRect(118,286,20,14);
  x.fillStyle = '#F7F3EC'; x.fillRect(48,120,160,62); x.strokeStyle = '#2E8C5A'; x.lineWidth = 5; x.strokeRect(50,122,156,58);
  x.fillStyle = '#2E8C5A'; x.font = '700 30px Hind, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('AVAILABLE', 128, 158); x.font = '500 17px Hind, system-ui, sans-serif'; x.fillStyle = '#3B1E19'; x.fillText('दुकान खाली', 128, 176);
  return tex(c); })();
const shutterDoors = shopDoors.map((d,i)=>[d,i]).filter(([d])=>!d.landmark && d.kind !== 6 && d.ow);
const shutters = new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1), new THREE.MeshStandardMaterial({map:shutterTex, roughness:0.55, metalness:0.35}), shutterDoors.length);
shutters.receiveShadow = true; scene.add(shutters);
function updateShutters(){
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  shutterDoors.forEach(([d,i],k)=>{
    const open = bizByDoor.has(i), ox = Math.sin(d.rot), oz = Math.cos(d.rot);
    m.compose(new THREE.Vector3(d.x - ox*1.8, d.oh*0.5 + 0.38, d.z - oz*1.8), q.setFromEuler(e.set(0,d.rot,0)), open ? new THREE.Vector3(0.0001,0.0001,1) : new THREE.Vector3(d.ow*1.02, d.oh*1.02, 1));
    shutters.setMatrixAt(k, m);
  });
  shutters.instanceMatrix.needsUpdate = true;
}

/* =========================================================
   Real connections: teams, who's online, waves, shop inbox
   ========================================================= */
let myName = '';
(async ()=>{ for (let i=0;i<40 && !live.user;i++) await new Promise(r=>setTimeout(r,250)); if (live.user){ try { const me = await live.user.me(); myName = (me && me.name) || ''; } catch(e){} } })();
function companyOf(ownerId){ for (const c of coByslot.values()) if (c.owner === ownerId) return c; return null; }
function teamOf(co){
  const list = [...memberMap.values()].filter(m=>m.p.company === co.owner && (co.team.includes(m.id) || m.id === co.owner));
  if (myDoc && myDoc.company === co.owner && (co.team.includes(myId) || co.owner === myId)) list.unshift({id:myId, p:{name: myName || 'You', look: lookFromCode(myLook)}});
  return list;
}
let officeSig = '';
function refreshOffices(){
  const sig = JSON.stringify([...coByslot.values()].map(c=>[c.slot,c.name,c.logo,c.team,teamOf(c).map(m=>m.id)]));
  if (sig === officeSig) return; officeSig = sig;
  Object.keys(interiorCache).filter(k=>k.startsWith('floor:')).forEach(k=>{ if (!(inShop && inShop.scene === interiorCache[k])) delete interiorCache[k]; });
}
function onlineIds(){ const s2 = new Set(); live.peers.forEach(e=>{ if (e.by) s2.add(e.by); }); return s2; }
function syncMemberVisibility(){ const on = onlineIds(); memberMap.forEach(m=>{ const v = !on.has(m.id); m.ch.g.visible = v; m.marker.visible = v; if (m.label) m.label.visible = v; if (m.circle) m.circle.r = v ? 0.45 : 0; }); }
// waves
let myPeer = null;
async function waveAt(e){
  if (!live.room) return; lastWave = Date.now(); lastSent = '';
  try { await live.room.emit('wave', {to: e.peerId}); showHint(`You waved at ${peerName(e)}.`); setTimeout(()=>showHint(null), 3000); }
  catch(err){ showHint('Waving needs edit access to this page.'); setTimeout(()=>showHint(null), 3000); }
}
let lastWave = 0;
(async ()=>{ for (let i=0;i<40 && !live.room;i++) await new Promise(r=>setTimeout(r,250)); if (!live.room) return;
  live.room.on('wave', msg=>{ if (!msg || msg.isMe || !msg.data || msg.data.to !== myPeer) return; const e = live.peers.get(msg.peer); const nm = e ? peerName(e) : 'Someone';
    showHint(`${nm} waved at you.`); setTimeout(()=>showHint(null), 5000); }, ()=>{}); })();
// shop inbox for owners
function inboxCount(){ if (!myBiz) return 0; const key = 'shop:'+myBiz.door; let seen = 0; try { seen = +localStorage.getItem('jp-seen-'+key) || 0; } catch(e){} return chatLog.all.filter(m=>m.r===key && m.by !== myId && m.t > seen).length; }
function refreshInbox(){ const n = inboxCount(); $('inboxBtn').hidden = !myBiz; $('inboxBtn').textContent = n ? `Messages for your shop (${n} new)` : 'Messages for your shop'; $('menuBtn').classList.toggle('dot', n > 0); }
$('inboxBtn').addEventListener('click', ()=>{ toggleMenu(false); if (!myBiz) return; const key = 'shop:'+myBiz.door; try { localStorage.setItem('jp-seen-'+key, String(Date.now())); } catch(e){} openRoom(key, {title:myBiz.name, sub:'Messages from visitors to your shop', color:'#2E8C5A'}); refreshInbox(); });
setInterval(()=>{ refreshInbox(); syncMemberVisibility(); }, 1500);

/* =========================================================
   Riding the lift: call it, walk in, choose, ride, walk out
   ========================================================= */
let liftState = null;
function ding(){ try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t0 = actx.currentTime; [880,660].forEach((fq,i)=>{ const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = fq; g.gain.setValueAtTime(0.0001,t0+i*0.18); g.gain.exponentialRampToValueAtTime(0.12,t0+i*0.18+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+i*0.18+0.6); o.connect(g).connect(actx.destination); o.start(t0+i*0.18); o.stop(t0+i*0.18+0.7); }); } catch(e){} }
function nearestLift(){ const ls = inShop && inShop.scene.userData.lifts; if (!ls) return null; let best = null, bd = 2.6; for (const l of ls){ const d = Math.hypot(l.x-P.pos.x, l.zWall-P.pos.z); if (d < bd){ bd = d; best = l; } } return best; }
function callLift(l){ l.target = 1; liftState = {phase:'opening', lift:l, t:0}; ding(); }
function chooseDest(dest){ if (!liftState || liftState.phase !== 'choosing') return false; closeLift(true); liftState.dest = dest; liftState.phase = 'closing'; liftState.lift.target = 0; return true; }
function stepOut(){ if (!liftState) return; closeLift(true); liftState.phase = 'leaving'; liftState.t = 0; liftState.from = P.pos.clone(); }
function tweenWalk(from, to, k){ P.pos.set(from.x + (to.x-from.x)*k, 0, from.z + (to.z-from.z)*k); P.walk += 0.12; animatePerson(player, P.walk, 0.9, t); }
function updateLift(dt){
  // animate every lift door in the current scene
  const ls = inShop && inShop.scene.userData.lifts; if (ls) ls.forEach(l=>{ l.open += Math.sign(l.target - l.open) * Math.min(Math.abs(l.target - l.open), dt*1.2); const o = l.open*1.1; l.doorL.position.x = l.x - 0.575 - o; l.doorR.position.x = l.x + 0.575 + o; if (l.open < 0.02 && l.target === 0 && l.closeAt && t > l.closeAt){ l.closeAt = 0; } if (l.target === 1 && l.closeAt && t > l.closeAt && !liftState){ l.target = 0; l.closeAt = 0; } });
  if (!liftState) return;
  const L = liftState.lift, S = liftState; S.t += dt;
  const car = new THREE.Vector3(L.x, 0, L.carZ), facing = L.out > 0 ? 0 : Math.PI;
  if (S.phase === 'opening' && L.open > 0.97){ S.phase = 'boarding'; S.t = 0; S.from = P.pos.clone(); }
  else if (S.phase === 'boarding'){ const k = Math.min(1, S.t/1.3); tweenWalk(S.from, car, k); P.rot = angLerp(P.rot, k < 0.75 ? Math.atan2(car.x-S.from.x, car.z-S.from.z) : facing, Math.min(1, dt*6)); if (k >= 1){ P.rot = facing; animatePerson(player, P.walk, 0, t); S.phase = 'choosing'; openLift(inShop.floor ? inShop.door.tower : inShop.door.tower, 'ride'); } }
  else if (S.phase === 'closing' && L.open < 0.03){ S.phase = 'riding'; S.t = 0; const fromN = inShop.floor ? inShop.door.n : 0, toN = S.dest.kind === 8 ? 0 : S.dest.n; S.fromN = fromN; S.toN = toN; S.dur = 1.6 + Math.abs(toN - fromN)*0.35; }
  else if (S.phase === 'riding'){
    const k = Math.min(1, S.t/S.dur), cur = Math.round(S.fromN + (S.toN - S.fromN)*k), arrow = S.toN > S.fromN ? '▲' : S.toN < S.fromN ? '▼' : '•';
    showHint(`${arrow}  ${cur === 0 ? 'Ground floor' : 'Floor ' + cur}`);
    if (k >= 1){ const dest = S.dest; showHint(null);
      if (dest.kind === 8){ inShop = null; enterShop(dest); } else enterFloor(dest);
      const nl = (inShop.scene.userData.lifts || [])[0]; if (!nl){ liftState = null; return; }
      nl.open = 0; nl.target = 0; P.pos.set(nl.x, 0, nl.carZ); P.rot = nl.out > 0 ? 0 : Math.PI; snapCam = true;
      liftState = {phase:'arriving', lift:nl, t:0}; ding(); nl.target = 1; yaw = P.rot - Math.PI; pitch = 0.2; dist = 3.6; }
  }
  else if (S.phase === 'arriving' && L.open > 0.97){ S.phase = 'leaving'; S.t = 0; S.from = P.pos.clone(); }
  else if (S.phase === 'leaving'){ if (S.t < dt*1.5){ yaw = P.rot - Math.PI; snapCam = true; } const to = new THREE.Vector3(L.x, 0, L.zWall + L.out*1.8), k = Math.min(1, S.t/1.3); tweenWalk(S.from, to, k); P.rot = L.out > 0 ? 0 : Math.PI;
    if (k >= 1){ animatePerson(player, P.walk, 0, t); L.closeAt = t + 1.5; liftState = null; } }
}
/* =========================================================
   Connections: request, accept or decline, then private chat and links
   ========================================================= */
const SOCIALS = [['linkedin','LinkedIn',/(^|\.)linkedin\.com$/],['x','X',/(^|\.)(x|twitter)\.com$/],['instagram','Instagram',/(^|\.)instagram\.com$/],['github','GitHub',/(^|\.)github\.com$/],['website','Website',null]];
function cleanSocial(key, u){ if (!u) return ''; try { const x = new URL(u); if (x.protocol !== 'https:') return null; const rule = SOCIALS.find(s=>s[0]===key)[2]; if (rule && !rule.test(x.hostname)) return null; return x.href.slice(0,200); } catch(e){ return null; } }
const dmKey = id => 'dm:' + [myId, id].sort().join(':');
const Social = (()=>{
  const ext = window.JP_SOCIAL || null;            // own domain: privacy enforced by the database
  const conn = new Map();                          // artifact: id -> {req,acc,rej}
  const extState = {list:[], dms:{}};
  const changeH = [];
  const fire = () => changeH.forEach(h=>{ try { h(); } catch(e){} });
  const arr = v => Array.isArray(v) ? v.filter(x=>typeof x==='string').slice(0,300) : [];
  function mine(){ return conn.get(myId) || {req:[],acc:[],rej:[]}; }
  async function saveMine(m){ conn.set(myId, m); fire(); await db.collection('conn').doc(myId).set({req:m.req, acc:m.acc, rej:m.rej}); }
  if (ext){
    const refresh = async ()=>{ try { extState.list = await ext.connections(); } catch(e){} fire(); };
    ext.onChange(async what=>{ await refresh(); if (what && what.dmWith && extState.dms[what.dmWith]) { try { extState.dms[what.dmWith] = await ext.messages(what.dmWith); } catch(e){} fire(); } });
    (async ()=>{ for (let i=0;i<40 && !myId;i++) await new Promise(r=>setTimeout(r,250)); if (myId) refresh(); })();
  } else {
    (async ()=>{ if (!window.claude || !window.claude.use) return; const d = await window.claude.use('db'); if (!d) return; for (let i=0;i<40 && !myId;i++) await new Promise(r=>setTimeout(r,250));
      d.collection('conn').onSnapshot(snap=>{ conn.clear(); snap.docs.forEach(doc=>{ const v = doc.data()||{}; conn.set(doc.id, {req:arr(v.req), acc:arr(v.acc), rej:arr(v.rej)}); }); fire(); }, ()=>{}); })();
  }
  function status(id){
    if (!myId || id === myId) return 'self';
    if (ext){ const r = extState.list.find(c=>c.other===id); return r ? r.status : 'none'; }
    const m = mine(), t = conn.get(id) || {req:[],acc:[],rej:[]};
    const iReq = m.req.includes(id), iAcc = m.acc.includes(id), iRej = m.rej.includes(id), tReq = t.req.includes(myId), tAcc = t.acc.includes(myId), tRej = t.rej.includes(myId);
    if ((iReq && (tAcc || tReq)) || (tReq && iAcc)) return 'connected';
    if (tReq && !iAcc && !iRej) return 'incoming';
    if (iReq && tRej) return 'declined';
    if (iReq) return 'outgoing';
    return 'none';
  }
  return {
    private: !!ext, onChange: h => changeH.push(h), status,
    async request(id){ if (ext) return ext.request(id); const m = mine(); await saveMine({req:[...new Set([...m.req, id])], acc:m.acc, rej:m.rej.filter(x=>x!==id)}); },
    async respond(id, yes){ if (ext) return ext.respond(id, yes); const m = mine(); await saveMine(yes ? {req:m.req, acc:[...new Set([...m.acc, id])], rej:m.rej.filter(x=>x!==id)} : {req:m.req, acc:m.acc.filter(x=>x!==id), rej:[...new Set([...m.rej, id])]}); },
    async remove(id){ if (ext) return ext.remove(id); const m = mine(); await saveMine({req:m.req.filter(x=>x!==id), acc:m.acc.filter(x=>x!==id), rej:m.rej}); },
    connections(){ if (ext) return extState.list.filter(c=>c.status==='connected').map(c=>c.other); const ids = new Set(); conn.forEach((v,k)=>{ if (k!==myId) ids.add(k); }); mine().req.forEach(x=>ids.add(x)); mine().acc.forEach(x=>ids.add(x)); return [...ids].filter(x=>status(x)==='connected'); },
    incoming(){ if (ext) return extState.list.filter(c=>c.status==='incoming').map(c=>c.other); const out = []; conn.forEach((v,k)=>{ if (k!==myId && status(k)==='incoming') out.push(k); }); return out; },
    async socials(id){ if (ext){ try { return await ext.socialsOf(id); } catch(e){ return null; } } if (status(id)!=='connected' && id!==myId) return null; const m = memberMap.get(id); return m ? (m.p.socials || {}) : (id===myId && myDoc ? myDoc.socials || {} : {}); },
    async setSocials(obj){ if (ext) return ext.setSocials(obj); },
    dmMessages(id){ if (ext) return (extState.dms[id] || []); return chatLog.all.filter(m=>m.r===dmKey(id)); },
    async loadDM(id){ if (ext){ try { extState.dms[id] = await ext.messages(id); } catch(e){ extState.dms[id] = []; } fire(); } },
    async sendDM(id, text){ if (ext){ await ext.send(id, text); extState.dms[id] = await ext.messages(id); fire(); return; } },
  };
})();

/* Names for any id */
async function nameOf(id){ if (id === myId) return myName || 'You'; const m = memberMap.get(id); if (m && m.p.name && m.p.name !== 'Someone') return m.p.name; if (live.user){ try { const ps = await live.user.profiles([id]); if (ps[id] && ps[id].name) return ps[id].name; } catch(e){} } return 'Someone'; }

/* Card actions for real people */
async function refreshCardSocial(n){
  const id = n.id, st = n.member ? Social.status(id) : 'self';
  const cb = $('connBtn'), dmb = $('dmBtn'), soc = $('cSocials');
  cb.hidden = dmb.hidden = true; cb.disabled = false; soc.hidden = true; soc.innerHTML = '';
  if (!n.member || !myId) return;
  if (st === 'none'){ cb.hidden = false; cb.textContent = 'Connect'; cb.onclick = async ()=>{ cb.disabled = true; try { await Social.request(id); $('cNote').textContent = `Request sent. ${n.p.name.split(' ')[0]} gets a notification.`; } catch(e){ $('cNote').textContent = noWriteMsg(e); } refreshCardSocial(n); }; }
  else if (st === 'outgoing'){ cb.hidden = false; cb.textContent = 'Request sent'; cb.disabled = true; }
  else if (st === 'declined'){ cb.hidden = false; cb.textContent = 'Not accepted'; cb.disabled = true; }
  else if (st === 'incoming'){ cb.hidden = false; cb.textContent = 'Accept'; dmb.hidden = false; dmb.textContent = 'Decline';
    cb.onclick = async ()=>{ await Social.respond(id, true); notifyLocal(`You’re now connected with ${n.p.name}.`); refreshCardSocial(n); };
    dmb.onclick = async ()=>{ await Social.respond(id, false); $('cNote').textContent = 'Declined.'; refreshCardSocial(n); }; }
  else if (st === 'connected'){
    dmb.hidden = false; dmb.textContent = 'Message'; dmb.onclick = ()=>{ closeCard(); openDM(id, n.p.name); };
    const s2 = await Social.socials(id) || {};
    const links = SOCIALS.map(([k,label])=>[label, s2[k]]).filter(([,u])=>u && cleanSocial(SOCIALS.find(x=>x[1]===label)[0], u));
    if (links.length){ soc.hidden = false; links.forEach(([label,u])=>{ const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label; soc.appendChild(a); }); }
    $('cNote').textContent = 'You’re connected.';
  }
}
const noWriteMsg = e => (e && (e.code==='permission_denied'||e.code==='not_granted')) ? 'You need to be signed in with edit access to do that.' : 'That didn’t go through. Try again.';
function openDM(id, name){
  if (Social.status(id) !== 'connected'){ notifyLocal('You can message people once you’re connected.'); return; }
  openRoom(dmKey(id), {title:name, sub: Social.private ? 'Private: only you two can read this.' : 'Only shown to the two of you.', color:'#2F4F7F', dm:id});
  Social.loadDM(id); try { localStorage.setItem('jp-seen-'+dmKey(id), String(Date.now())); } catch(e){}
}
Social.onChange(()=>{ if (chatKey && chatKey.startsWith('dm:')) renderRoom(); refreshNotif(); if (!cardWrap.hidden && current && current.member) refreshCardSocial(current); });

/* =========================================================
   Notifications
   ========================================================= */
function notifyLocal(text){ showHint(text); setTimeout(()=>showHint(null), 5000); }
let seenConn = new Set(); try { seenConn = new Set(JSON.parse(localStorage.getItem('jp-seen-conn') || '[]')); } catch(e){}
let notifItems = [], lastIncoming = new Set(), lastConnected = null;
async function buildNotifs(){
  const items = [];
  for (const id of Social.incoming()) items.push({kind:'req', id, name: await nameOf(id)});
  for (const id of Social.connections()) if (!seenConn.has(id)) items.push({kind:'acc', id, name: await nameOf(id)});
  for (const id of Social.connections()){ let seen = 0; try { seen = +localStorage.getItem('jp-seen-'+dmKey(id)) || 0; } catch(e){} const n = Social.dmMessages(id).filter(m=>m.by !== myId && m.t > seen).length; if (n) items.push({kind:'dm', id, name: await nameOf(id), n}); }
  if (myBiz){ const n = inboxCount(); if (n) items.push({kind:'shop', n}); }
  return items;
}
async function refreshNotif(){
  if (!myId) return;
  notifItems = await buildNotifs();
  const n = notifItems.length;
  $('notifBtn').innerHTML = ''; $('notifBtn').append(document.createTextNode('Notifications')); if (n){ const b = document.createElement('span'); b.className = 'badge'; b.textContent = String(n); $('notifBtn').appendChild(b); }
  $('menuBtn').classList.toggle('dot', n > 0);
  // pop-up toasts for new requests and new connections
  const inc = new Set(Social.incoming()); inc.forEach(id=>{ if (!lastIncoming.has(id)) nameOf(id).then(nm=>notifyLocal(`${nm} wants to connect. Open Notifications in the Menu.`)); }); lastIncoming = inc;
  const con = new Set(Social.connections()); if (lastConnected) con.forEach(id=>{ if (!lastConnected.has(id)) nameOf(id).then(nm=>notifyLocal(`You and ${nm} are now connected. Messages and links are unlocked.`)); }); lastConnected = con;
  if (!$('notifWrap').hidden) renderNotif();
}
function renderNotif(){
  const list = $('notifList'); list.innerHTML = '';
  if (!myId){ const p = document.createElement('p'); p.className = 'prod-desc'; p.textContent = 'Sign in to get connection requests and messages.'; list.appendChild(p); return; }
  if (!notifItems.length){ const p = document.createElement('p'); p.className = 'prod-desc'; p.textContent = 'You’re all caught up.'; list.appendChild(p); }
  notifItems.forEach(it=>{
    const r = document.createElement('div'); r.className = 'nrow'; const t = document.createElement('div'); const b = document.createElement('b'); const sp = document.createElement('span'); t.append(b, sp); r.appendChild(t);
    const btn = (label, fn, primary)=>{ const x = document.createElement('button'); x.className = 'btn' + (primary ? ' primary' : ''); x.textContent = label; x.addEventListener('click', fn); r.appendChild(x); };
    if (it.kind === 'req'){ b.textContent = it.name; sp.textContent = 'wants to connect with you'; btn('Accept', async ()=>{ await Social.respond(it.id, true); refreshNotif(); }, true); btn('Decline', async ()=>{ await Social.respond(it.id, false); refreshNotif(); }); }
    if (it.kind === 'acc'){ b.textContent = it.name; sp.textContent = 'You’re connected. Messages and profile links are unlocked.'; btn('Message', ()=>{ seenConn.add(it.id); try { localStorage.setItem('jp-seen-conn', JSON.stringify([...seenConn])); } catch(e){} $('notifWrap').hidden = true; cardOpen = false; openDM(it.id, it.name); }, true); btn('OK', ()=>{ seenConn.add(it.id); try { localStorage.setItem('jp-seen-conn', JSON.stringify([...seenConn])); } catch(e){} refreshNotif(); }); }
    if (it.kind === 'dm'){ b.textContent = it.name; sp.textContent = `${it.n} new message${it.n>1?'s':''}`; btn('Open', ()=>{ $('notifWrap').hidden = true; cardOpen = false; openDM(it.id, it.name); refreshNotif(); }, true); }
    if (it.kind === 'shop'){ b.textContent = myBiz.name; sp.textContent = `${it.n} new message${it.n>1?'s':''} for your shop`; btn('Open', ()=>{ $('notifWrap').hidden = true; cardOpen = false; $('inboxBtn').click(); }, true); }
    list.appendChild(r);
  });
}
$('notifBtn').addEventListener('click', ()=>{ toggleMenu(false); cardOpen = true; $('notifWrap').hidden = false; renderNotif(); });
$('notifClose').addEventListener('click', ()=>{ $('notifWrap').hidden = true; cardOpen = false; });
setInterval(refreshNotif, 3000);

/* =========================================================
   Community: meets and clubs
   ========================================================= */
const comm = {meets:new Map(), rsvps:new Map(), clubs:new Map(), members:new Map(), tab:'meets'};
(async ()=>{
  if (!window.claude || !window.claude.use) return; const d = await window.claude.use('db'); if (!d) return; for (let i=0;i<40 && !myId;i++) await new Promise(r=>setTimeout(r,250));
  const sub = (col, map, pick)=>d.collection(col).onSnapshot(snap=>{ map.clear(); snap.docs.forEach(doc=>map.set(doc.id, pick(doc.data()||{}))); if (!$('commWrap').hidden) renderComm(); }, ()=>{});
  const items = (v, n) => Array.isArray(v.items) ? v.items.slice(0,n).filter(x=>x && typeof x.id==='string') : [];
  sub('meets', comm.meets, v=>items(v,10).map(m=>({id:m.id.slice(0,80), title:str(m.title,70), when:clampN(m.when,0,1e15,0), where:str(m.where,120), link:safeUrl(str(m.link,200)) ? str(m.link,200) : '', about:str(m.about,300), club:str(m.club,80), cap:clampN(m.cap,0,500,0)})));
  sub('rsvps', comm.rsvps, v=>Array.isArray(v.meets) ? v.meets.filter(x=>typeof x==='string').slice(0,100) : []);
  sub('clubs', comm.clubs, v=>items(v,3).map(c=>({id:c.id.slice(0,80), name:str(c.name,50), about:str(c.about,260)})));
  sub('clubmembers', comm.members, v=>Array.isArray(v.clubs) ? v.clubs.filter(x=>typeof x==='string').slice(0,100) : []);
})();
const fmtWhen = ms => new Date(ms).toLocaleString('en-IN', {weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit'});
function allMeets(){ const out = []; comm.meets.forEach((list, host)=>list.forEach(m=>out.push(Object.assign({host}, m)))); return out.filter(m=>m.when > Date.now() - 3*3600e3).sort((a,b)=>a.when-b.when); }
function allClubs(){ const out = []; comm.clubs.forEach((list, founder)=>list.forEach(c=>out.push(Object.assign({founder}, c)))); return out; }
const goingTo = id => { let n = 0; comm.rsvps.forEach(l=>{ if (l.includes(id)) n++; }); return n; };
const membersOf = id => { let n = 0; comm.members.forEach(l=>{ if (l.includes(id)) n++; }); return n; };
async function saveDoc(col, data){ if (!db || !myId) throw {code:'not_granted'}; await db.collection(col).doc(myId).set(data); }
async function renderComm(){
  const list = $('commList'); list.innerHTML = '';
  $('cmMeets').setAttribute('aria-selected', String(comm.tab==='meets')); $('cmClubs').setAttribute('aria-selected', String(comm.tab==='clubs'));
  $('commNew').textContent = comm.tab==='meets' ? 'Organise a meet' : 'Start a club'; $('commNew').hidden = !(db && myId);
  const empty = t => { const p = document.createElement('p'); p.className = 'prod-desc'; p.textContent = t; list.appendChild(p); };
  if (comm.tab === 'meets'){
    const ms = allMeets(); if (!ms.length) empty(db && myId ? 'No meets coming up. Organise the first one.' : 'No meets coming up yet.');
    const mine = comm.rsvps.get(myId) || [];
    for (const m of ms){
      const r = document.createElement('div'); r.className = 'crow'; const t = document.createElement('div'); const b = document.createElement('b'); b.textContent = m.title;
      const w = document.createElement('span'); w.className = 'when'; w.textContent = fmtWhen(m.when);
      const club = m.club ? allClubs().find(c=>c.id===m.club) : null; const going = goingTo(m.id);
      const sp = document.createElement('span'); sp.textContent = [m.where, club && club.name, `${going} going${m.cap ? ' of ' + m.cap : ''}`, `by ${await nameOf(m.host)}`].filter(Boolean).join(' · ');
      t.append(b, w, sp); if (m.about){ const a = document.createElement('span'); a.textContent = m.about; t.appendChild(a); } r.appendChild(t);
      const col = document.createElement('div'); col.style.flex = 'none'; col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px';
      const btn = (label, fn, primary)=>{ const x = document.createElement('button'); x.className = 'btn' + (primary ? ' primary' : ''); x.textContent = label; x.addEventListener('click', fn); col.appendChild(x); };
      if (db && myId){
        if (m.host === myId) btn('Cancel meet', async ()=>{ const left = (comm.meets.get(myId)||[]).filter(x=>x.id!==m.id); try { await saveDoc('meets', {items:left}); } catch(e){ $('commNote').textContent = noWriteMsg(e); } });
        else if (mine.includes(m.id)) btn('Leave', async ()=>{ try { await saveDoc('rsvps', {meets:mine.filter(x=>x!==m.id)}); } catch(e){ $('commNote').textContent = noWriteMsg(e); } });
        else if (!m.cap || going < m.cap) btn('Join', async ()=>{ try { await saveDoc('rsvps', {meets:[...mine.filter(x=>allMeets().some(y=>y.id===x)), m.id]}); $('commNote').textContent = `You’re going to ${m.title}.`; } catch(e){ $('commNote').textContent = noWriteMsg(e); } }, true);
        else { const x = document.createElement('span'); x.textContent = 'Full'; col.appendChild(x); }
      }
      if (m.link) btn('Open link', ()=>window.open(m.link,'_blank','noopener'));
      btn('Chat', ()=>{ $('commWrap').hidden = true; cardOpen = false; openRoom('meet:'+m.id, {title:m.title, sub:'Chat for this meet', color:'#B85C48'}); });
      r.appendChild(col); list.appendChild(r);
    }
  } else {
    const cs = allClubs(); if (!cs.length) empty(db && myId ? 'No clubs yet. Start the first one.' : 'No clubs yet.');
    const mine = comm.members.get(myId) || [];
    for (const c of cs){
      const r = document.createElement('div'); r.className = 'crow'; const t = document.createElement('div'); const b = document.createElement('b'); b.textContent = c.name;
      const sp = document.createElement('span'); sp.textContent = `${membersOf(c.id)} member${membersOf(c.id)===1?'':'s'} · started by ${await nameOf(c.founder)}`; const a = document.createElement('span'); a.textContent = c.about; t.append(b, sp, a); r.appendChild(t);
      const col = document.createElement('div'); col.style.flex = 'none'; col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px';
      const btn = (label, fn, primary)=>{ const x = document.createElement('button'); x.className = 'btn' + (primary ? ' primary' : ''); x.textContent = label; x.addEventListener('click', fn); col.appendChild(x); };
      if (db && myId){
        if (c.founder === myId) btn('Close club', async ()=>{ try { await saveDoc('clubs', {items:(comm.clubs.get(myId)||[]).filter(x=>x.id!==c.id)}); } catch(e){ $('commNote').textContent = noWriteMsg(e); } });
        else if (mine.includes(c.id)) btn('Leave', async ()=>{ try { await saveDoc('clubmembers', {clubs:mine.filter(x=>x!==c.id)}); } catch(e){ $('commNote').textContent = noWriteMsg(e); } });
        else btn('Join', async ()=>{ try { await saveDoc('clubmembers', {clubs:[...mine, c.id]}); $('commNote').textContent = `You joined ${c.name}.`; } catch(e){ $('commNote').textContent = noWriteMsg(e); } }, true);
      }
      btn('Club chat', ()=>{ $('commWrap').hidden = true; cardOpen = false; openRoom('club:'+c.id, {title:c.name, sub:'Club chat', color:'#2E8C5A'}); });
      r.appendChild(col); list.appendChild(r);
    }
  }
}
function openComm(tabName){ toggleMenu(false); togglePanel(false); comm.tab = tabName || comm.tab; cardOpen = true; $('commNote').textContent = ''; $('commWrap').hidden = false; renderComm(); }
$('communityBtn').addEventListener('click', ()=>openComm('meets'));
$('cmMeets').addEventListener('click', ()=>{ comm.tab = 'meets'; renderComm(); });
$('cmClubs').addEventListener('click', ()=>{ comm.tab = 'clubs'; renderComm(); });
$('commClose').addEventListener('click', ()=>{ $('commWrap').hidden = true; cardOpen = false; });
$('commNew').addEventListener('click', ()=>{
  $('commWrap').hidden = true;
  if (comm.tab === 'meets'){ const sel = $('mClub'); sel.innerHTML = ''; const o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Not tied to a club'; sel.appendChild(o0); allClubs().forEach(c=>{ const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o); });
    ['mTitle','mWhere','mLink','mAbout','mCap'].forEach(k=>$(k).value = ''); const dflt = new Date(Date.now() + 7*86400e3); dflt.setHours(18,0,0,0); $('mWhen').value = new Date(dflt.getTime() - dflt.getTimezoneOffset()*60000).toISOString().slice(0,16); $('mNote').textContent = ''; $('meetWrap').hidden = false; $('mTitle').focus(); }
  else { $('kName').value = ''; $('kAbout').value = ''; $('kNote').textContent = ''; $('clubWrap').hidden = false; $('kName').focus(); }
});
$('mCancel').addEventListener('click', ()=>{ $('meetWrap').hidden = true; openComm('meets'); });
$('kCancel').addEventListener('click', ()=>{ $('clubWrap').hidden = true; openComm('clubs'); });
$('meetForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const title = $('mTitle').value.trim(), when = new Date($('mWhen').value).getTime(), where = $('mWhere').value.trim(), link = $('mLink').value.trim(), about = $('mAbout').value.trim(), club = $('mClub').value, cap = parseInt($('mCap').value,10) || 0;
  if (!title || !isFinite(when)){ $('mNote').textContent = 'Add a title and a date and time.'; return; }
  if (when < Date.now()){ $('mNote').textContent = 'Pick a time in the future.'; return; }
  if (link && !safeUrl(link)){ $('mNote').textContent = 'The link needs to start with https://'; return; }
  const existing = (comm.meets.get(myId) || []).filter(m=>m.when > Date.now() - 3*3600e3);
  if (existing.length >= 10){ $('mNote').textContent = 'You already have 10 upcoming meets. Cancel one first.'; return; }
  try { await saveDoc('meets', {items:[...existing, {id:myId+'-'+Date.now(), title, when, where, link, about, club, cap: Math.max(0,Math.min(500,cap))}]}); $('meetWrap').hidden = true; openComm('meets'); $('commNote').textContent = 'Your meet is on the board.'; }
  catch(err){ $('mNote').textContent = noWriteMsg(err); }
});
$('clubForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const name = $('kName').value.trim(), about = $('kAbout').value.trim();
  if (!name || !about){ $('kNote').textContent = 'Add a name and what the club is about.'; return; }
  const existing = comm.clubs.get(myId) || []; if (existing.length >= 3){ $('kNote').textContent = 'You can run up to 3 clubs.'; return; }
  const id = myId+'-'+Date.now();
  try { await saveDoc('clubs', {items:[...existing, {id, name, about}]}); await saveDoc('clubmembers', {clubs:[...(comm.members.get(myId)||[]), id]}); $('clubWrap').hidden = true; openComm('clubs'); $('commNote').textContent = `${name} is live. Share it in City chat.`; }
  catch(err){ $('kNote').textContent = noWriteMsg(err); }
});

/* Community notice boards in the city */
const BOARDS = [];
{
  const [c,x] = cv(512,384); x.fillStyle = '#6B4530'; x.fillRect(0,0,512,384); x.fillStyle = '#F4E9D2'; x.fillRect(16,16,480,352);
  x.fillStyle = '#7A1020'; x.font = '700 50px Hind, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('Community board', 256, 80);
  x.fillStyle = '#3B1E19'; x.font = '500 30px Hind, system-ui, sans-serif'; x.fillText('Meets · Clubs · Tech talks', 256, 140); x.fillText('Organise one, or join in', 256, 190);
  const pins = ['#D8342B','#2E8C87','#E8B33A','#3B4B8C']; for (let i=0;i<6;i++){ x.fillStyle = ['#FFF6D8','#E8F2F8','#FBE6EC'][i%3]; x.fillRect(40+(i%3)*150, 230+Math.floor(i/3)*64, 130, 52); x.fillStyle = pins[i%4]; x.beginPath(); x.arc(105+(i%3)*150, 236+Math.floor(i/3)*64, 6, 0, Math.PI*2); x.fill(); }
  const mt = new THREE.MeshStandardMaterial({map:tex(c), roughness:0.8});
  const place2 = (x0,z0,ry)=>{ const g = new THREE.Group(); add(g,UBOX,M('#4A2E1C','stone'),0,1.0,0,0.12,2.0,0.12); add(g,UBOX,M('#4A2E1C','stone'),-1.3,1.0,0,0.12,2.0,0.12); add(g,UBOX,M('#4A2E1C','stone'),1.3,1.0,0,0.12,2.0,0.12); add(g,UPLANE,mt,0,2.0,0.08,2.8,2.1); box(g,3.0,0.12,0.4,'#4A2E1C',0,3.05,0,'stone'); g.position.set(x0,0,z0); g.rotation.y = ry; scene.add(g); BOARDS.push({x:x0+Math.sin(ry)*1.5, z:z0+Math.cos(ry)*1.5}); circles.push({x:x0, z:z0, r:1.2}); };
  place2(21.7, 15.5, Math.PI/2); place2(196, 129.5, Math.PI); place2(206, 46, -Math.PI/2);
}
$('guideBtn').addEventListener('click', ()=>{ toggleMenu(false); cardOpen = true; $('guidePriv').innerHTML = ''; const b = document.createElement('b'); b.textContent = 'Your privacy'; const p = document.createElement('p'); p.textContent = Social.private ? 'Your profile links and private messages are protected by the database itself: only you and the people you’ve accepted can read them.' : 'On this preview, private messages and profile links are only shown to people you’re connected with, but they aren’t locked down in the database. On peopleofjaipur.com they are.'; $('guidePriv').append(b, p); $('guideWrap').hidden = false; });
$('guideClose').addEventListener('click', ()=>{ $('guideWrap').hidden = true; cardOpen = false; try { localStorage.setItem('jp-guided','1'); } catch(e){} });
$('tabComm').addEventListener('click', ()=>openComm('meets'));

/* =========================================================
   Animals: wander, stand around, lie down, get up, and make way for a horn
   ========================================================= */
cows.concat(camels).forEach(a=>{ a.circle = {x:a.pos.x, z:a.pos.z, r: a.type==='cow' ? 1.0 : 1.3}; circles.push(a.circle); a.range = a.type==='cow' ? 5 : 3; });
function scareAnimals(x, z, radius){
  for (const a of cows.concat(camels)){
    if (a.type === 'camel' && a.state === 'driven') continue;
    const d = Math.hypot(a.pos.x - x, a.pos.z - z); if (d > radius) continue;
    const ax = (a.pos.x - x)/(d||1), az = (a.pos.z - z)/(d||1);
    let tg = null; for (let i=0;i<10 && !tg;i++){ const spread = (Math.random()-0.5)*1.6, cx = ax*Math.cos(spread) - az*Math.sin(spread), cz = ax*Math.sin(spread) + az*Math.cos(spread), dd = 4 + Math.random()*3, x2 = a.pos.x + cx*dd, z2 = a.pos.z + cz*dd; if (freeSpot(a, x2, z2)) tg = V3(x2,0,z2); }
    if (!tg) continue; a.beh = 'flee'; a.bt = 8; a.stuck = 0; a.target = tg;
  }
}
// Is this spot somewhere an animal can actually stand?
function freeSpot(a, x, z){
  if (hillH(x,z) > 0.3 || Math.abs(groundY(x,z)) > 0.05) return false;
  if (Math.hypot(x-LAKE.x, z-LAKE.z) < LAKE.r + 2) return false;
  for (const c of colliders) if (x > c.minX-1.2 && x < c.maxX+1.2 && z > c.minZ-1.2 && z < c.maxZ+1.2) return false;
  for (const c of circles) if (c !== a.circle && c.r > 0 && Math.hypot(x-c.x, z-c.z) < c.r + 1.4) return false;
  return true;
}
function pickTarget(a, cx, cz, radius){
  for (let i=0;i<12;i++){ const ang = Math.random()*Math.PI*2, r = 1.5 + Math.random()*radius, x = cx + Math.cos(ang)*r, z = cz + Math.sin(ang)*r; if (freeSpot(a, x, z)) return V3(x,0,z); }
  return null;
}
function moveAnimal(a, tx, tz, speed, dt){
  const dx = tx - a.pos.x, dz = tz - a.pos.z, dist = Math.hypot(dx,dz);
  const want = Math.atan2(dx, dz); a.heading = angLerp(a.heading, want, Math.min(1, dt*3));
  // only walk forward once roughly facing the target, so they never spiral round it
  const facing = Math.cos(want - a.heading), step = Math.min(dist, speed*dt) * Math.max(0, facing);
  const ox = a.pos.x, oz = a.pos.z;
  const np = tmpV.set(ox + Math.sin(a.heading)*step, 0, oz + Math.cos(a.heading)*step);
  const save = a.circle.r; a.circle.r = 0; resolve(np, a.type==='cow' ? 0.8 : 1.1); a.circle.r = save;
  // never let a collision push carry them faster than a walk
  let mx = np.x - ox, mz = np.z - oz; const m = Math.hypot(mx,mz), cap = speed*dt*1.05;
  if (m > cap){ mx *= cap/m; mz *= cap/m; }
  a.pos.x = ox + mx; a.pos.z = oz + mz; const moved = Math.hypot(mx,mz); a.walk += moved*2.2;
  return {moved, dist, wanted: step};
}
function updateAnimal(a, dt){
  a.bt -= dt;
  const standing = a.sit < 0.02;
  if (a.beh === 'idle'){
    a.sit = Math.max(0, a.sit - dt*0.8);
    if (a.bt <= 0 && standing){
      const r = Math.random();
      if (r < 0.45){ const tg = pickTarget(a, a.home.x, a.home.z, a.range); if (tg){ a.target = tg; a.beh = 'walk'; a.bt = 25; a.stuck = 0; } else a.bt = 3 + Math.random()*4; }
      else if (r < 0.75){ a.beh = 'sitting'; a.bt = 12 + Math.random()*25; }
      else a.bt = 3 + Math.random()*6;
    }
  } else if (a.beh === 'walk' || a.beh === 'flee'){
    if (!standing){ a.sit = Math.max(0, a.sit - dt*(a.beh==='flee' ? 1.6 : 0.8)); }
    else {
      const sp = a.beh === 'flee' ? (a.type==='cow' ? 1.3 : 1.1) : 0.7;
      const r = moveAnimal(a, a.target.x, a.target.z, sp, dt);
      // blocked: something is in the way, so stop rather than shove past it
      if (r.wanted > 0 && r.moved < r.wanted*0.5) a.stuck = (a.stuck||0) + dt; else a.stuck = Math.max(0, (a.stuck||0) - dt);
      let other = false; for (const o of cows.concat(camels)) if (o !== a && Math.hypot(o.pos.x-a.pos.x, o.pos.z-a.pos.z) < 2.6 && Math.cos(Math.atan2(o.pos.x-a.pos.x, o.pos.z-a.pos.z) - a.heading) > 0.5){ other = true; break; }
      if (r.dist < 0.6 || a.bt <= 0 || a.stuck > 1.2 || other){ if (a.beh === 'flee' && freeSpot(a, a.pos.x, a.pos.z)) a.home.set(a.pos.x, 0, a.pos.z); a.beh = 'idle'; a.bt = 4 + Math.random()*8; }
    }
  } else if (a.beh === 'sitting'){
    a.sit = Math.min(1, a.sit + dt*0.6);
    if (a.bt <= 0){ a.beh = 'idle'; a.bt = 3 + Math.random()*5; }
  }
  const s = a.sit, moving = (a.beh === 'walk' || a.beh === 'flee') && standing;
  a.body.position.y = -a.sitDrop*s;
  a.legs.forEach((l,i)=>{ l.scale.y = 1 - 0.7*s; l.position.y = a.legH - a.sitDrop*s*0.4; l.rotation.x = moving ? Math.sin(a.walk + (i===0||i===3 ? 0 : Math.PI))*0.4 : 0; });
  if (a.head){ a.head.position.y = 1.28 - a.sitDrop*s*0.8; a.head.rotation.x = moving ? Math.sin(a.walk*2)*0.05 : (Math.sin(t*0.7 + a.home.x)*0.12 + (s > 0.5 ? 0.15 : 0)); a.head.rotation.y = Math.sin(t*0.3 + a.home.z)*0.25*(1-s*0.5); }
  a.circle.x = a.pos.x; a.circle.z = a.pos.z;
  a.pos.y = seatOnGround(a.g, a.pos.x, a.pos.z, a.heading, a.type==='cow' ? 0.55 : 0.7, 0.28, 0);
}
function updateAnimals(dt){ for (const c of cows) updateAnimal(c, dt); for (const c of camels) if (c.state === 'parked' && !(riding === c)) updateAnimal(c, dt); }

/* =========================================================
   Tech Park: automatic sliding glass doors you can walk straight through
   ========================================================= */
const autoDoors = lobbyDoors.map(l=>{
  const zPlane = l.z + 1.8, mk = ()=>{ const g = new THREE.Group();
    add(g,UBOX,new THREE.MeshStandardMaterial({color:lin('#A9C6D1'), transparent:true, opacity:0.32, roughness:0.05, metalness:0.2, depthWrite:false}),0,1.5,0,1.9,3.0,0.04);
    box(g,1.94,0.08,0.07,'#2A2A2E',0,2.96,0,'stone'); box(g,1.94,0.08,0.07,'#2A2A2E',0,0,0,'stone'); box(g,0.06,3.0,0.07,'#2A2A2E',-0.95,0,0,'stone'); box(g,0.06,3.0,0.07,'#2A2A2E',0.95,0,0,'stone');
    box(g,0.04,0.9,0.05,'#D8D8D8',0,1.0,0.04,'stone'); scene.add(g); return g; };
  const L = mk(), R = mk(); L.position.set(l.x - 0.97, 0, zPlane); R.position.set(l.x + 0.97, 0, zPlane);
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.08,0.06), M_LIGHT); sensor.position.set(l.x, 3.25, zPlane); scene.add(sensor);
  return {l, L, R, zPlane, open:0};
});
function updateAutoDoors(dt){
  for (const d of autoDoors){
    const near = !inShop && Math.abs(P.pos.x - d.l.x) < 3.5 && P.pos.z > d.zPlane - 6.5 && P.pos.z < d.zPlane + 0.5;
    d.open += Math.sign((near ? 1 : 0) - d.open) * Math.min(Math.abs((near ? 1 : 0) - d.open), dt*1.6);
    d.L.position.x = d.l.x - 0.97 - d.open*1.85; d.R.position.x = d.l.x + 0.97 + d.open*1.85;
    // walking into the open doorway takes you inside
    if (!inShop && !riding && !flying && d.open > 0.85 && Math.abs(P.pos.x - d.l.x) < 1.6 && P.pos.z > d.l.z + 0.05 && keyFwd()){ d.open = 0; enterShop(d.l); }
  }
}
const keyFwd = () => (keys.KeyW || keys.ArrowUp || joy.y < -0.3);
/* =========================================================
   Loop
   ========================================================= */
const clock = new THREE.Clock(); let t = 0;
const angLerp = (a,b,k) => { const d = ((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a + d*k; };
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), ONE = new THREE.Vector3(1,1,1);
const flagBase = flagMesh.geometry.attributes.position.array.slice();
const camRay = new THREE.Vector3();

function frame(){
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  // player
  let movingNow = false;
  if (mode === 'play' && flying){
    let mx = (keys.KeyD||keys.ArrowRight?1:0) - (keys.KeyA||keys.ArrowLeft?1:0) + joy.x;
    let mz = (keys.KeyS||keys.ArrowDown?1:0) - (keys.KeyW||keys.ArrowUp?1:0) + joy.y;
    const up = (keys.Space?1:0) - (keys.KeyC||keys.ControlLeft?1:0) + flyUp;
    const sp = (keys.ShiftLeft||keys.ShiftRight) ? 70 : 28;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    drone.x += (rx*mx - fx*mz)*sp*dt; drone.z += (rz*mx - fz*mz)*sp*dt; drone.y += up*sp*0.6*dt;
    const dc = Math.hypot(drone.x-CX, drone.z-CZ); if (dc > 520){ drone.x = CX + (drone.x-CX)/dc*520; drone.z = CZ + (drone.z-CZ)/dc*520; }
    drone.y = Math.max(Math.max(3, terrainH(drone.x,drone.z)+6), Math.min(240, drone.y));
  } else if (mode === 'play' && riding){
    updateAutos(dt);
  } else if (mode === 'play' && liftState){
    /* the lift moves you */
  } else if (mode === 'play' && !cardOpen && !mapOpen){
    const turn = ((keys.KeyA||keys.ArrowLeft)?1:0) - ((keys.KeyD||keys.ArrowRight)?1:0) - (isCoarse ? joy.x*0.9 : joy.x);
    const fwdIn = ((keys.KeyW||keys.ArrowUp)?1:0) - ((keys.KeyS||keys.ArrowDown)?1:0) - joy.y;
    if (sitting && sitting.free && (Math.abs(fwdIn) > 0.1 || Math.abs(turn) > 0.1)) standUp();
    if (Math.abs(turn) > 0.05 && !sitting) P.rot += turn * dt * 2.4;
    const amt = Math.min(1, Math.abs(fwdIn));
    if (amt > 0.05 && !sitting){
      const run = alwaysRun || keys.ShiftLeft || keys.ShiftRight;
      const speed = (run ? 10.5 : 4.4) * amt * (fwdIn < 0 ? 0.55 : 1);
      const sgn = Math.sign(fwdIn);
      P.pos.x += Math.sin(P.rot)*speed*sgn*dt; P.pos.z += Math.cos(P.rot)*speed*sgn*dt;
      if (inShop) shopResolve(P.pos); else resolve(P.pos);
      P.walk += dt*speed*(run?1.35:1.9)*sgn; animatePerson(player, P.walk, run?1.25:1, t); movingNow = true;
      if (inShop && !inShop.floor && P.pos.z > inShop.dims.D/2 + 0.1) exitShop();
    } else if (Math.abs(turn) > 0.05 && !sitting){ P.walk += dt*4; animatePerson(player, P.walk, 0.35, t); }
    else if (!sitting) animatePerson(player, P.walk, 0, t);
    if (Date.now() - lastWave < 2500 && !sitting){ player.b.rSh.rotation.set(-2.5,0,0.3 + Math.sin(t*7)*0.2); player.b.rEl.rotation.x = -0.5; }
    if (!drag && (movingNow || Math.abs(turn) > 0.05)) yaw = angLerp(yaw, P.rot - Math.PI, Math.min(1, dt*(movingNow?3.2:5)));
  }
  if (!riding) updateAutos(dt);
  updateAnimals(dt);
  updateAutoDoors(dt);
  updateLift(dt);
  { const list = inShop ? (inShop.scene.userData.sitters||[]) : outdoorSitters; for (const st of list){ const d = Math.hypot(st.x-P.pos.x, st.z-P.pos.z); const tgt = d < 3.5 ? Math.atan2(P.pos.x-st.x, P.pos.z-st.z) : st.base + Math.sin(t*0.5+st.ph)*0.15; st.ch.g.rotation.y = angLerp(st.ch.g.rotation.y, tgt, Math.min(1,dt*3)); st.ch.b.rEl.rotation.x = -0.9 - Math.max(0,Math.sin(t*0.8+st.ph))*0.7; st.ch.b.head.rotation.x = Math.sin(t*0.6+st.ph)*0.06; } }
  if (inShop && inShop.scene.userData.fan) inShop.scene.userData.fan.rotation.y += dt*5;
  if (inShop){ const kp = inShop.scene.userData.keeper; if (kp) kp.g.rotation.y = angLerp(kp.g.rotation.y, Math.atan2(P.pos.x-kp.g.position.x, P.pos.z-kp.g.position.z), Math.min(1,dt*3)); }
  if (prod && prod.model) prod.model.rotation.y += dt*0.8;
  entranceMarkers.forEach(m=>{ m.rotation.y += dt*1.5; m.position.y = 4.6 + Math.sin(t*2)*0.12; });
  if (inShop) inShop.scene.children.forEach(o=>{ if (o.isSprite) o.visible = !document.body.classList.contains('dlg'); });
  if (!riding){ const gy = inShop ? 0 : (sitting && sitting.free ? sitting.y : groundY(P.pos.x,P.pos.z)); if (snapCam) P.y = gy; P.y += (gy - P.y)*Math.min(1, dt*(gy < P.y ? 9 : 14)); player.g.position.set(P.pos.x, P.y + (sitting ? -0.42 : 0), P.pos.z); player.g.rotation.y = P.rot; } else P.y = riding.pos.y || 0;
  player.g.visible = !flying && !(riding && insideView);
  viewBtn.hidden = !(riding && mode==='play');
  updatePeers(dt); if (mode==='play') sendPresence(t, movingNow);

  // NPCs
  let best = null, bestD = inShop ? -1 : 3.6;
  for (const n of npcs){
    const dx = P.pos.x-n.p.pos[0], dz = P.pos.z-n.p.pos[1], d = Math.hypot(dx,dz);
    const target = d < 7 ? Math.atan2(dx,dz) : n.baseRot + Math.sin(t*0.3+n.ph)*0.4;
    n.rot = angLerp(n.rot, target, Math.min(1, dt*3)); n.ch.g.rotation.y = n.rot;
    const wave = d < 4.5;
    animatePerson(n.ch, 0, 0, t);
    if (wave){ n.ch.b.rSh.rotation.set(-2.5, 0, 0.3 + Math.sin(t*7)*0.18); n.ch.b.rEl.rotation.x = -0.5; }
    if (n.label) n.label.visible = d < 40;
    n.marker.rotation.y += dt*1.6; n.marker.position.y = 2.75 + (reduceMotion?0:Math.sin(t*2+n.ph)*0.08);
    if (d < bestD){ best = n; bestD = d; }
  }
  // crowd
  for (const w of walkers){
    const pos = tmpV.copy(w.a).lerp(w.b, w.t); const dir = w.dir;
    const nx = (w.b.z-w.a.z)/w.len, nz = -(w.b.x-w.a.x)/w.len;
    pos.x += nx*w.off; pos.z += nz*w.off;
    const near = Math.hypot(pos.x-P.pos.x,pos.z-P.pos.z) < 1.3;
    if (!near){ w.t += dir*w.sp*dt/w.len; w.walk += dt*w.sp*3.4; }
    if (w.t > 1){ w.t = 1; w.dir = -1; w.off = -w.off; } if (w.t < 0){ w.t = 0; w.dir = 1; w.off = -w.off; }
    resolve(pos, 0.32); w.pos.lerp(pos, w.pos.lengthSq() ? Math.min(1, dt*10) : 1);
    w.ch.g.position.copy(w.pos); w.ch.g.rotation.y = Math.atan2((w.b.x-w.a.x)*dir,(w.b.z-w.a.z)*dir);
    animatePerson(w.ch, w.walk, near?0:1, t);
  }
  // pigeons
  { const pm = pigeons.mesh;
    pigeons.forEach((p,i)=>{
      const d = Math.hypot(p.hx-P.pos.x, p.hz-P.pos.z);
      if (d < 3.5 && p.fly <= 0) p.fly = 4;
      if (p.fly > 0){ p.fly -= dt; const k = Math.sin(Math.min(1,(4-p.fly)/4)*Math.PI); p.y = k*6; p.x = p.hx + Math.cos(t+i)*k*4; p.z = p.hz + Math.sin(t+i)*k*4; p.ry += dt*3; }
      else { p.x = p.hx; p.z = p.hz; p.y = 0; if (Math.sin(t*2+p.ph) > 0.97) p.ry += dt*4; }
      tmpM.compose(tmpV.set(p.x,p.y + Math.max(0,Math.sin(t*9+p.ph))*0.02*(p.fly>0?0:1),p.z), tmpQ.setFromEuler(tmpE.set(p.fly>0?0:Math.max(0,Math.sin(t*3+p.ph))*0.5,p.ry,0)), ONE);
      pm.setMatrixAt(i,tmpM);
    }); pm.instanceMatrix.needsUpdate = true; }
  // flag
  { const pa = flagMesh.geometry.attributes.position; for (let i=0;i<pa.count;i++){ const x = flagBase[i*3]; pa.array[i*3+2] = Math.sin(x*0.45 - t*3.2)*x*0.06 + Math.sin(flagBase[i*3+1]*0.6 + t*2)*0.15*(x/15); } pa.needsUpdate = true; flagMesh.geometry.computeVertexNormals(); }
  // kites
  for (const k of kites){
    k.m.position.set(k.base.x + Math.sin(t*k.sp+k.ph)*5, k.base.y + Math.sin(t*k.sp*1.7+k.ph)*2.5, k.base.z + Math.cos(t*k.sp*0.8+k.ph)*3);
    k.m.lookAt(camera.position); k.m.rotateZ(Math.sin(t*k.sp*2+k.ph)*0.45);
  }

  if (mode === 'play'){
    nearNpc = inShop || riding ? null : best;
    updateAction();
    if (!inShop){ const [a,f] = flying ? areaAt(drone.x,drone.z) : areaAt(P.pos.x,P.pos.z); if (a !== lastArea){ $('area').textContent = a; $('fact').textContent = f; lastArea = a; } }
    drawMap(); if (mapOpen && Math.floor(t*10)%3===0) drawBigMap();
  }

  // camera
  if (mode !== 'play'){
    tourU = (tourU + dt*(reduceMotion?0.002:0.0085)) % 1;
    camera.position.copy(tourPos.getPointAt(tourU));
    camera.lookAt(tourLook.getPointAt(tourU));
  } else if (liftState && (['boarding','choosing','closing','riding','arriving'].includes(liftState.phase) || (liftState.phase === 'leaving' && liftState.t < 0.9)) && (liftState.phase !== 'boarding' || liftState.t > 0.7)){
    const L = liftState.lift, back = L.carZ - L.out*0.75;
    const want = tmpV.set(L.x - 0.6, 2.05 + (liftState.phase==='riding' ? Math.sin(t*30)*0.004 : 0), back);
    if (snapCam){ camera.position.copy(want); snapCam = false; } else camera.position.lerp(want, Math.min(1, dt*6));
    camera.lookAt(L.x + 0.1, 1.2, L.zWall + L.out*1.5);
  } else if (riding && insideView){
    const a = riding, EYE = {auto:[0,1.6,0.22], scooter:[0,1.64,-0.12], jeep:[0.4,1.72,0.1], camel:[0,3.36,0.02]}[a.type] || [0,1.6,0];
    riding.g.updateMatrixWorld(true);
    const eye = riding.g.localToWorld(tmpV.set(EYE[0],EYE[1],EYE[2]));
    if (snapCam){ camera.position.copy(eye); snapCam = false; } else camera.position.lerp(eye, Math.min(1, dt*20));
    const look = yaw + Math.PI, lp = Math.max(-0.5, Math.min(0.6, pitch - 0.22));
    camera.lookAt(camera.position.x + Math.sin(look)*10, camera.position.y - Math.sin(lp)*10 - 1.0, camera.position.z + Math.cos(look)*10);
  } else if (flying){
    camera.position.lerp(drone, Math.min(1, dt*10));
    camera.lookAt(camera.position.x - Math.sin(yaw)*Math.cos(flyPitch)*10, camera.position.y - Math.sin(flyPitch)*10, camera.position.z - Math.cos(yaw)*Math.cos(flyPitch)*10);
  } else {
    const tgt = tmpV.set(P.pos.x, (P.y||0) + (riding ? (riding.type==='camel' ? 3.0 : 1.9) : 1.55), P.pos.z);
    let dd = dist;
    // keep the camera out of walls
    for (let s=0.6; s<=dist; s+=0.25){
      camRay.set(P.pos.x + Math.sin(yaw)*Math.cos(pitch)*s, tgt.y + Math.sin(pitch)*s, P.pos.z + Math.cos(yaw)*Math.cos(pitch)*s);
      let hit = false; if (!inShop) for (const c of colliders){ if (camRay.x>c.minX-0.25 && camRay.x<c.maxX+0.25 && camRay.z>c.minZ-0.25 && camRay.z<c.maxZ+0.25 && camRay.y < c.h && camRay.y > -5){ hit = true; break; } }
      if (hit){ dd = Math.max(1.1, s-0.35); break; }
    }
    const want = camRay.set(P.pos.x + Math.sin(yaw)*Math.cos(pitch)*dd, tgt.y + Math.sin(pitch)*dd, P.pos.z + Math.cos(yaw)*Math.cos(pitch)*dd);
    if (!inShop) want.y = Math.max(want.y, groundY(want.x,want.z) + 0.5);
    if (inShop){ const R2 = inShop.dims; want.x = Math.max(-R2.W/2+0.3, Math.min(R2.W/2-0.3, want.x)); want.z = Math.max(-R2.D/2+0.3, Math.min(R2.D/2+(inShop.floor?-0.3:0.6), want.z)); want.y = Math.min(R2.H-0.3, want.y); }
    if (snapCam){ camera.position.copy(want); snapCam = false; } else { const closer = want.distanceTo(tgt) < camera.position.distanceTo(tgt); camera.position.lerp(want, Math.min(1, dt*(closer ? 30 : 7))); }
    camera.lookAt(tgt.x, tgt.y + 0.25, tgt.z);
  }
  if (sky) sky.position.copy(camera.position);
  nightLamp.position.set(P.pos.x + 2, 6.5, P.pos.z + 3);
  if (nightGroup.visible){ nightGroup.userData.stars.position.copy(camera.position); nightGroup.userData.moon.position.copy(camera.position).add(tmpV.set(0.4,0.55,-0.75).normalize().multiplyScalar(1000)); }
  const focus = mode!=='play' ? tmpV.set(camera.position.x,0,camera.position.z) : flying ? tmpV.set(drone.x,0,drone.z) : P.pos;
  sunLight.target.position.set(focus.x, 0, focus.z);
  sunLight.position.set(focus.x + sunDir.x*300, sunDir.y*300, focus.z + sunDir.z*300);
  sunLight.shadow.camera.updateProjectionMatrix();

  if (composer) composer.render(); else renderer.render(activeScene, camera);
  requestAnimationFrame(frame);
}
function onResize(){ const w = innerWidth, h = innerHeight; camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); if (composer){ composer.setSize(w, h); } if (bloomPass) bloomPass.setSize(w/2, h/2); if (mapOpen){ sizeMap(); drawBigMap(); } }
addEventListener('resize', onResize); addEventListener('orientationchange', ()=>{ setTimeout(onResize, 150); setTimeout(onResize, 600); });
if (window.visualViewport) visualViewport.addEventListener('resize', onResize);
renderer.compile(scene, camera);
updateShutters();
requestAnimationFrame(frame);
setTimeout(()=>{ captureSatellite(); $('loading').classList.add('done'); intro.hidden = false; mode = 'intro'; }, 200);
window.__jp = { animals:()=>cows.map(c=>[c.beh, +c.pos.x.toFixed(1), +c.pos.z.toFixed(1), +c.sit.toFixed(2)]), honkAt:(x,z)=>scareAnimals(x,z,14), simAnimals:(sec)=>{ for (let i=0;i<sec*60;i++){ t += 1/60; updateAnimals(1/60); } }, exitHere:(i,x,z)=>{ const a = autos[i]; a.state='driven'; a.pos.set(x,0,z); a.heading = 0.4; riding = a; exitAuto(); }, sim:(sec)=>{ const n = Math.round(sec*60); for (let i=0;i<n;i++){ updateAutos(1/60); } }, autoInfo:(i)=>{ const a = autos[i]; return JSON.stringify({state:a.state, s:a.s, v:a.v, off:a.off, offT:a.offT, blockT:a.blockT, pos:[a.pos.x,a.pos.z], base:a.base && [a.base.x,a.base.z]}); }, setAuto:(i,sv)=>{ const a = autos[i]; a.s = sv; a.v = 0; }, traffic:()=>autos.map(a=>[+a.pos.x.toFixed(1),+a.pos.z.toFixed(1),+a.v.toFixed(1)]), logoRef:(v)=>logoUrl(v), liftPhase:()=>liftState&&liftState.phase, gotoFloor:(i)=>goToFloor(officeDoors[i]), tab:(x)=>{ tab = x; togglePanel(true); }, sitting:()=>!!sitting, ridingNow:()=>riding&&riding.type, lobby:(i)=>enterShop(lobbyDoors[i]), floor:(i)=>enterFloor(officeDoors[i]), roles:()=>showRoles(), lift:(t)=>openLift(t), gy:(x,z)=>groundY(x,z),  jeepGo:()=>rideJeep(), nearJeep:()=>{ P.pos.set(jeep.pos.x+2.5,0,jeep.pos.z); snapCam = true; }, nearCamel:i=>{ const c = camels[i]; P.pos.set(c.pos.x+2,0,c.pos.z); snapCam = true; }, look:(l)=>{ Object.assign(myLook,l); saveLook(); }, P:()=>[P.pos.x,P.y,P.pos.z], counts:()=>[shopDoors.length, officeDoors.length], enterDoorByName:(n)=>{ const d = shopDoors.find(x=>x.name===n); if (d) enterShop(d); return !!d; }, prods:()=>openProducts(), music:()=>Music.on, inside:(v)=>setInside(v), sendChat:(t)=>sendChat(t), nearScooter:i=>{ const a = scooters[i]; P.pos.set(a.pos.x+1.5, 0, a.pos.z+0.6); snapCam = true; }, nearAuto:i=>{ const a = autos[i]; P.pos.set(a.pos.x+3, 0, a.pos.z+0.5); resolve(P.pos); snapCam = true; }, door:i=>{ const d = shopDoors[i]; P.pos.set(d.x,0,d.z); P.rot = d.rot+Math.PI; yaw = d.rot; snapCam = true; return d.name; }, act:()=>doAction(), action:()=>action&&action.label, openMap, closeMap, doors:()=>shopDoors.length, autos:()=>autos.map(a=>[a.pos.x,a.pos.z,a.state]), key:(c,v)=>{keys[c]=v;}, fly:setFly, time:applyTime, tour:(u)=>{tourU=u;}, tp:(x,z,yw,pt,dst)=>{ P.pos.set(x,0,z); resolve(P.pos); yaw = yw; pitch = pt ?? 0.2; if (dst) dist = dst; snapCam = true; }, start, stats:()=>({calls:renderer.info.render.calls, tris:renderer.info.render.triangles, colliders:colliders.length}) };
})();
