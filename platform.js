/* People of Jaipur — platform adapter for your own domain.
   The city code asks for "db", "user" and "room". On claude.ai those come from
   Claude's platform; here they come from Supabase (database, LinkedIn sign-in
   and realtime presence). Fill in config.js to switch everything on. */
(function(){
  'use strict';
  const cfg = window.JP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase){
    window.claude = Object.freeze({ use: async () => null });
    console.warn('People of Jaipur: add your Supabase URL and anon key to config.js to turn on sign-in, chat and live visitors.');
    return;
  }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {auth:{persistSession:true, detectSessionInUrl:true}});
  let session = null;
  const ready = sb.auth.getSession().then(({data})=>{ session = data.session; if (session) savePerson(); return session; });
  sb.auth.onAuthStateChange((_e, s)=>{ const had = !!session; session = s; if (!had && s) savePerson(); });
  async function savePerson(){
    try {
      const u = session.user, m = u.user_metadata || {};
      const fromProvider = m.name || m.full_name || [m.given_name, m.family_name].filter(Boolean).join(' ') || '';
      if (!fromProvider){ await sb.from('people').upsert({id:u.id, provider:(u.app_metadata && u.app_metadata.provider) || 'email'}, {onConflict:'id', ignoreDuplicates:true}); return; }
      await sb.from('people').upsert({ id:u.id, name: fromProvider, avatar: m.picture || m.avatar_url || '', provider: (u.app_metadata && u.app_metadata.provider) || '', updated_at: new Date().toISOString() });
    } catch(e){}
  }

  /* Companies must sign in with a work address; individuals and shops can use any email.
     The database enforces the same rule (see schema.sql, is_work_email). */
  const FREE_MAIL = new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.co.in','yahoo.in','ymail.com','rocketmail.com','outlook.com','outlook.in','hotmail.com','hotmail.co.in','live.com','live.in','msn.com','icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com','pm.me','zoho.com','zohomail.com','zohomail.in','rediffmail.com','yandex.com','yandex.ru','mail.com','gmx.com','gmx.net','tutanota.com','tuta.io','hey.com','fastmail.com']);
  const isWorkEmail = e => { const d = String(e || '').trim().toLowerCase().split('@')[1] || ''; return !!d && d.includes('.') && !FREE_MAIL.has(d); };
  const pendingRole = () => { try { return localStorage.getItem('jp-pending-role'); } catch(e){ return null; } };

  /* Sign in: a 6-digit code sent to your email. LinkedIn sign-in is optional (config.js). */
  function authModal(){
    const forCo = pendingRole() === 'company';
    const setCopy = () => {
      document.getElementById('jpIntro').textContent = forCo ? 'Registering a company needs your work email, like you@yourcompany.com. Gmail, Outlook and other personal addresses can’t register a company.' : 'We’ll email you a 6-digit code. No password needed.';
      document.getElementById('jpEmail').placeholder = forCo ? 'you@yourcompany.com' : 'you@example.com';
      document.getElementById('jpMsg').textContent = '';
    };
    if (document.getElementById('jpAuth')) { setCopy(); document.getElementById('jpAuth').hidden = false; return; }
    const css = document.createElement('style');
    css.textContent = `#jpAuth{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(40,16,10,.45);padding:16px}
#jpAuth .box{width:min(400px,100%);background:#FFF4EA;color:#3B1E19;border-radius:22px;padding:22px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:Hind,system-ui,sans-serif}
#jpAuth h2{font-family:'Rozha One',Georgia,serif;font-weight:400;font-size:26px;margin:0 0 4px}
#jpAuth p{margin:0 0 14px;font-size:15px;color:#7A4A40;line-height:1.45}
#jpAuth input{width:100%;font:inherit;font-size:17px;padding:11px 13px;border-radius:12px;border:1px solid rgba(59,30,25,.2);background:#F9E3D3;color:#3B1E19;margin-bottom:10px}
#jpAuth input.code{letter-spacing:.5em;text-align:center;font-size:22px}
#jpAuth button{width:100%;font:inherit;font-weight:600;font-size:16px;padding:12px;border-radius:14px;border:0;cursor:pointer;margin-top:4px}
#jpAuth .pri{background:#EE9C14;color:#3B1E19}#jpAuth .sec{background:#F9E3D3;color:#3B1E19}#jpAuth .li{background:#0A66C2;color:#fff}
#jpAuth .msg{min-height:1.2em;font-size:14px;color:#9B2D20;margin:6px 0 0}`;
    document.head.appendChild(css);
    const w = document.createElement('div'); w.id = 'jpAuth';
    w.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="jpAuthT">
      <div id="jpStep1"><h2 id="jpAuthT">Sign in to People of Jaipur</h2><p id="jpIntro"></p>
        <input id="jpEmail" type="email" autocomplete="email" placeholder="you@example.com"><button class="pri" id="jpSend">Email me a code</button>
        ${cfg.linkedin ? '<button class="li" id="jpLi">Continue with LinkedIn instead</button>' : ''}<button class="sec" id="jpCancel">Not now</button></div>
      <div id="jpStep2" hidden><h2>Check your email</h2><p id="jpSent"></p>
        <input id="jpCode" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······"><button class="pri" id="jpVerify">Verify and sign in</button><button class="sec" id="jpBack">Use a different email</button></div>
      <p class="msg" id="jpMsg"></p></div>`;
    document.body.appendChild(w);
    const $$ = id => document.getElementById(id), msg = t => { $$('jpMsg').textContent = t || ''; };
    let email = '';
    setCopy();
    $$('jpCancel').onclick = () => { w.hidden = true; };
    if ($$('jpLi')) $$('jpLi').onclick = () => sb.auth.signInWithOAuth({provider:'linkedin_oidc', options:{redirectTo: location.origin + location.pathname}});
    $$('jpSend').onclick = async () => {
      email = $$('jpEmail').value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ msg('Enter a valid email address.'); return; }
      if (pendingRole() === 'company' && !isWorkEmail(email)){ msg('Use your company email (like you@yourcompany.com). Personal addresses such as Gmail can’t register a company.'); return; }
      $$('jpSend').disabled = true; msg('');
      const {error} = await sb.auth.signInWithOtp({email, options:{shouldCreateUser:true}});
      $$('jpSend').disabled = false;
      if (error){ msg(/rate/i.test(error.message) ? 'Too many codes asked for. Wait a minute and try again.' : 'We couldn’t send the code. Check the address and try again.'); return; }
      $$('jpSent').textContent = `We sent a 6-digit code to ${email}. Paste it here. It expires in a few minutes.`; $$('jpStep1').hidden = true; $$('jpStep2').hidden = false; $$('jpCode').focus();
    };
    $$('jpBack').onclick = () => { $$('jpStep2').hidden = true; $$('jpStep1').hidden = false; msg(''); };
    $$('jpVerify').onclick = async () => {
      const token = $$('jpCode').value.replace(/\D/g,''); if (token.length !== 6){ msg('The code has 6 digits.'); return; }
      $$('jpVerify').disabled = true;
      const {error} = await sb.auth.verifyOtp({email, token, type:'email'});
      $$('jpVerify').disabled = false;
      if (error){ msg('That code didn’t work. Check it, or ask for a new one.'); return; }
      location.reload();
    };
  }
  window.JP_AUTH = Object.freeze({
    signIn: () => authModal(),
    signOut: async () => { await sb.auth.signOut(); location.reload(); },
    signedIn: () => !!session,
    email: () => (session && session.user.email) || '',
    isWorkEmail: (e) => isWorkEmail(e === undefined ? (session && session.user.email) : e),
    setName: async (name) => { await ready; if (!session || !name) return; try { await sb.from('people').upsert({id:session.user.id, name:String(name).slice(0,48), updated_at:new Date().toISOString()}); } catch(e){} },
  });

  /* user: who is here, and names for ids */
  const nameCache = {};
  const user = Object.freeze({
    id: async () => { await ready; return session ? session.user.id : null; },
    me: async () => { await ready; if (!session) return {id:null, name:'', avatar:''}; const m = session.user.user_metadata || {}; let name = m.name || m.full_name || ''; if (!name){ const {data} = await sb.from('people').select('name').eq('id', session.user.id).maybeSingle(); name = (data && data.name) || ''; } return {id:session.user.id, name, avatar: m.picture || ''}; },
    profiles: async (ids) => {
      const need = ids.filter(id => !(id in nameCache));
      if (need.length){ const {data} = await sb.from('people').select('id,name,avatar').in('id', need); (data || []).forEach(p => { nameCache[p.id] = p; }); need.forEach(id => { if (!nameCache[id]) nameCache[id] = {id, name:'', avatar:''}; }); }
      const out = {}; ids.forEach(id => { out[id] = nameCache[id]; }); return out;
    },
    isOwner: () => false, canEdit: () => !!session, can: () => null,
  });

  /* db: one row per person per collection, live updates through Supabase Realtime */
  const snapshotOf = rows => { const docs = rows.map(r => ({id:r.id, exists:true, data:() => r.data, metadata:{fromCache:false, hasPendingWrites:false}})); return {docs, size:docs.length, empty:!docs.length, docChanges:() => []}; };
  const db = Object.freeze({
    collection(path){
      return {
        path,
        onSnapshot(next, onErr){
          let alive = true, timer = null;
          const load = async () => { const {data, error} = await sb.from('docs').select('id,data').eq('collection', path).limit(5000); if (!alive) return; if (error){ onErr && onErr({code:'upstream_error', message:error.message}); return; } next(snapshotOf(data || [])); };
          const soon = () => { clearTimeout(timer); timer = setTimeout(load, 150); };
          load();
          const ch = sb.channel('docs-' + path + '-' + Math.random().toString(36).slice(2)).on('postgres_changes', {event:'*', schema:'public', table:'docs', filter:'collection=eq.' + path}, soon).subscribe();
          return () => { alive = false; sb.removeChannel(ch); };
        },
        doc(id){
          return {
            async set(data){ await ready; if (!session) throw {code:'not_granted', message:'Sign in first'}; const {error} = await sb.from('docs').upsert({collection:path, id, owner:session.user.id, data, updated_at:new Date().toISOString()}); if (error) throw {code: /row-level security|violates|permission/i.test(error.message) ? 'permission_denied' : 'upstream_error', message:error.message}; },
            async delete(){ await ready; if (!session) throw {code:'not_granted'}; const {error} = await sb.from('docs').delete().eq('collection', path).eq('id', id); if (error) throw {code:'upstream_error', message:error.message}; },
          };
        },
      };
    },
  });

  /* room: everyone walking the city right now */
  const myKey = Math.random().toString(36).slice(2, 12);
  let myState = {}, connected = false, peers = Object.freeze([]);
  const peerH = [], connH = [];
  const ch = sb.channel('city', {config:{presence:{key:myKey}}});
  function rebuild(){
    const st = ch.presenceState(), list = [];
    for (const key of Object.keys(st)){ const meta = st[key][st[key].length - 1] || {}; list.push(Object.freeze({peer:key, by: meta.by || null, isMe:key === myKey, sameTab:key === myKey, kind:'viewer', guest:false, presence:Object.freeze(meta.p || {}), updatedAt:Date.now()})); }
    peers = Object.freeze(list); const change = {peers, joined:[], left:[], updated:[]};
    peerH.forEach(h => { try { h(change); } catch(e){} });
  }
  ch.on('presence', {event:'sync'}, rebuild);
  const topicH = {};
  ['wave'].forEach(topic => ch.on('broadcast', {event:topic}, ({payload}) => {
    if (!payload) return; const msg = Object.freeze({topic, data:payload.data, peer:payload.from, by:payload.by || null, isMe:payload.from === myKey, sameTab:payload.from === myKey, kind:'viewer', guest:false});
    (topicH[topic] || []).forEach(h => { try { h(msg); } catch(e){} });
  }));
  ch.subscribe(status => { const c = status === 'SUBSCRIBED'; if (c !== connected){ connected = c; connH.forEach(h => h(c)); } if (c) push(true); });
  let lastPush = 0, queued = false;
  async function push(force){
    const now = Date.now();
    if (!force && now - lastPush < 250){ if (!queued){ queued = true; setTimeout(() => { queued = false; push(true); }, 260); } return; }
    lastPush = now; await ready;
    if (!session){ try { await ch.untrack(); } catch(e){} return; }   // visitors who haven't signed in stay invisible
    try { await ch.track({by: session.user.id, p: myState}); } catch(e){}
  }
  const room = Object.freeze({
    presence: async (patch) => { for (const k in patch){ if (patch[k] === null) delete myState[k]; else myState[k] = patch[k]; } push(false); },
    peers: () => peers,
    onPeers: (h) => { peerH.push(h); setTimeout(() => h({peers, joined:peers, left:[], updated:[]}), 0); return () => { const i = peerH.indexOf(h); if (i >= 0) peerH.splice(i, 1); }; },
    connected: () => connected,
    onConnection: (h) => { connH.push(h); setTimeout(() => h(connected), 0); return () => { const i = connH.indexOf(h); if (i >= 0) connH.splice(i, 1); }; },
    emit: async (topic, data) => { await ready; if (!session) throw {code:'not_permitted'}; await ch.send({type:'broadcast', event:topic, payload:{data, from:myKey, by:session.user.id}}); },
    on: (topic, h) => { (topicH[topic] = topicH[topic] || []).push(h); return () => { const a = topicH[topic], i = a.indexOf(h); if (i >= 0) a.splice(i,1); }; },
  });

  /* assets: company logos in a public Supabase Storage bucket */
  const assets = Object.freeze({
    upload: async (blob, opts) => {
      await ready; if (!session) throw {code:'not_granted'};
      const type = (opts && opts.type) || blob.type || 'image/png'; if (!/^image\/(png|jpeg|webp)$/.test(type)) throw {code:'invalid_request'};
      const path = `${session.user.id}/${Date.now()}.${type.split('/')[1].replace('jpeg','jpg')}`;
      const {error} = await sb.storage.from('logos').upload(path, blob, {contentType:type, upsert:false});
      if (error) throw {code:'upstream_error', message:error.message};
      const {data} = sb.storage.from('logos').getPublicUrl(path);
      return {id:data.publicUrl, url:data.publicUrl, sizeBytes:blob.size, contentType:type};
    },
  });
  /* Resumes: PDFs in a public bucket, each person only in their own folder. */
  window.JP_FILES = Object.freeze({
    uploadResume: async (file) => {
      await ready; if (!session) throw {code:'not_granted'};
      if (file.type !== 'application/pdf') throw {code:'invalid_request', message:'PDF only'};
      if (file.size > 5*1024*1024) throw {code:'too_large'};
      const path = `${session.user.id}/resume-${Date.now()}.pdf`;
      const {error} = await sb.storage.from('resumes').upload(path, file, {contentType:'application/pdf', upsert:false});
      if (error) throw {code:'upstream_error', message:error.message};
      return sb.storage.from('resumes').getPublicUrl(path).data.publicUrl;
    },
  });
  /* Connections, private links and direct messages: the database decides who can read what. */
  const socialH = [];
  const social = {
    onChange(h){ socialH.push(h); },
    async connections(){ await ready; if (!session) return []; const me = session.user.id;
      const {data} = await sb.from('connections').select('requester,addressee,status');
      return (data || []).map(r => { const other = r.requester === me ? r.addressee : r.requester; let st = 'none';
        if (r.status === 'accepted') st = 'connected'; else if (r.status === 'pending') st = r.requester === me ? 'outgoing' : 'incoming'; else if (r.status === 'declined') st = r.requester === me ? 'declined' : 'none';
        return {other, status:st}; }); },
    async request(id){ await ready; if (!session) throw {code:'not_granted'}; const me = session.user.id;
      const {data:rev} = await sb.from('connections').select('status').eq('requester', id).eq('addressee', me).maybeSingle();
      if (rev && rev.status === 'pending'){ await sb.from('connections').update({status:'accepted', updated_at:new Date().toISOString()}).eq('requester', id).eq('addressee', me); return; }
      const {error} = await sb.from('connections').insert({requester:me, addressee:id, status:'pending'}); if (error && !/duplicate/i.test(error.message)) throw {code:'upstream_error'}; },
    async respond(id, yes){ await ready; const me = session.user.id; await sb.from('connections').update({status: yes ? 'accepted' : 'declined', updated_at:new Date().toISOString()}).eq('requester', id).eq('addressee', me); },
    async remove(id){ await ready; const me = session.user.id; await sb.from('connections').delete().or(`and(requester.eq.${me},addressee.eq.${id}),and(requester.eq.${id},addressee.eq.${me})`); },
    async socialsOf(id){ const {data} = await sb.from('socials').select('data').eq('id', id).maybeSingle(); return data ? data.data : null; },
    async setSocials(obj){ await ready; if (!session) throw {code:'not_granted'}; await sb.from('socials').upsert({id:session.user.id, data:obj, updated_at:new Date().toISOString()}); },
    async messages(id){ await ready; if (!session) return []; const me = session.user.id;
      const {data} = await sb.from('messages').select('sender,body,created_at').or(`and(sender.eq.${me},recipient.eq.${id}),and(sender.eq.${id},recipient.eq.${me})`).order('created_at',{ascending:true}).limit(200);
      return (data || []).map(m => ({by:m.sender, x:m.body, t:new Date(m.created_at).getTime()})); },
    async send(id, text){ await ready; const {error} = await sb.from('messages').insert({sender:session.user.id, recipient:id, body:String(text).slice(0,1000)}); if (error) throw {code:'upstream_error'}; },
  };
  ready.then(() => { if (!session) return; const me = session.user.id;
    sb.channel('social-' + me).on('postgres_changes', {event:'*', schema:'public', table:'connections'}, () => socialH.forEach(h => h({})))
      .on('postgres_changes', {event:'INSERT', schema:'public', table:'messages'}, ({new:m}) => { const other = m.sender === me ? m.recipient : m.sender; socialH.forEach(h => h({dmWith:other})); }).subscribe(); });
  window.JP_SOCIAL = Object.freeze(social);

  const caps = {db, user, room, assets};
  window.claude = Object.freeze({ use: async (name) => caps[name] || null });

  /* Sign in / sign out in the menu */
  document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.menu'); if (!menu) return;
    const b = document.createElement('button'); b.className = 'mitem'; b.type = 'button';
    const label = () => { b.textContent = session ? `Sign out (${session.user.email || 'signed in'})` : 'Sign in'; };
    ready.then(label); label();
    b.addEventListener('click', () => session ? window.JP_AUTH.signOut() : window.JP_AUTH.signIn());
    menu.insertBefore(b, menu.querySelector('.mhelp'));
  });
})();
