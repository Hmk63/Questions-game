// اتصال الجوالات بالموقع عن طريق Supabase Realtime (رسائل Broadcast).
// يوفّر نفس واجهة claude.use('room') اللي تستخدمها اللعبة، فكود اللعبة ما يتغير.
// كل جهاز يرسل حالته عند كل تغيير ونبضة كل 6 ثواني؛ الجهاز اللي يسكت 20 ثانية ينحذف.
(function () {
  if (window.claude && window.claude.use) return; // داخل Claude: نستخدم الغرفة المدمجة
  var SUPABASE_URL = 'https://ddxbnmctuyrrccnvwndo.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_Em8IhbBIjgPOqUuCuI7K0w_2ScV7bbj'; // مفتاح عام، مصمم للمتصفح
  var BEAT_MS = 6000, DROP_MS = 20000;
  var client = null;
  var RT = window.__rt = { v: 'v3', status: 'ما بدأ', others: 0, err: '' };
  function show(){ var t='الاتصال: '+RT.status+' · أجهزة ثانية: '+RT.others+' · '+(window.supabase?'مكتبة '+(window.__sbver||'?'):'المكتبة ما انحملت')+' · '+RT.v+(RT.err?' · '+RT.err:''); var els=document.querySelectorAll('.rtStatus'); for(var i=0;i<els.length;i++) els[i].textContent=t; }
  setInterval(show, 1000);
  function getClient() {
    if (!client && window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { params: { eventsPerSecond: 20 } } });
    }
    return client;
  }
  var myPeer = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function makeRoom(name, channel) {
    var me = {}, others = {}, subs = [], cache = [], beat = null, prune = null, sendT = null;
    function freezeMe() { return Object.freeze(Object.assign({}, me)); }
    function snapshot() {
      var out = [{ peer: myPeer, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: freezeMe(), updatedAt: Date.now() }];
      Object.keys(others).forEach(function (k) {
        var o = others[k];
        out.push({ peer: k, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: o.obj, updatedAt: o.t });
      });
      return out;
    }
    function fire() { cache = snapshot(); RT.others = Object.keys(others).length; subs.forEach(function (f) { try { f({ peers: cache, joined: [], left: [], updated: [] }); } catch (e) {} }); }
    function send(extra) {
      var payload = Object.assign({ peer: myPeer, p: me }, extra || {});
      return channel.send({ type: 'broadcast', event: 'p', payload: payload }).then(function (r) { if (r && r !== 'ok') RT.err = 'إرسال: ' + r; }).catch(function (e) { RT.err = 'إرسال: ' + (e && e.message || e); });
    }
    function sendSoon() { clearTimeout(sendT); sendT = setTimeout(function () { send(); }, 50); }

    channel.on('broadcast', { event: 'p' }, function (msg) {
      var d = msg && msg.payload; if (!d || !d.peer || d.peer === myPeer) return;
      if (d.bye) { delete others[d.peer]; fire(); return; }
      var p = d.p || {}, j = JSON.stringify(p), old = others[d.peer];
      if (!old || old.j !== j) others[d.peer] = { j: j, obj: Object.freeze(p), t: Date.now(), seen: Date.now() };
      else old.seen = Date.now();
      if (d.hello) send(); // جهاز جديد دخل: نعرّفه بنفسنا
      fire();
    });

    function start() {
      send({ hello: true });
      beat = setInterval(function () { send(); }, BEAT_MS);
      prune = setInterval(function () {
        var now = Date.now(), changed = false;
        Object.keys(others).forEach(function (k) { if (now - others[k].seen > DROP_MS) { delete others[k]; changed = true; } });
        if (changed) fire();
      }, 3000);
      window.addEventListener('pagehide', function () { send({ bye: true }); });
    }

    return {
      name: name, _start: start,
      presence: function (patch) {
        me = Object.assign({}, me, patch);
        Object.keys(patch).forEach(function (k) { if (patch[k] === null) delete me[k]; });
        sendSoon(); fire(); return Promise.resolve();
      },
      peers: function () { return cache; },
      onPeers: function (f) { subs.push(f); setTimeout(function () { f({ peers: cache, joined: cache, left: [], updated: [] }); }, 0); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
      connected: function () { return true; },
      leave: function () { clearInterval(beat); clearInterval(prune); return send({ bye: true }).then(function () { return client.removeChannel(channel); }).then(function () {}); },
      emit: function () { return Promise.resolve(); },
      on: function () { return function () {}; }
    };
  }

  var roomApi = {
    join: function (name) {
      return new Promise(function (resolve, reject) {
        var c = getClient(); if (!c) return reject({ code: 'not_granted' });
        var channel = c.channel(name, { config: { broadcast: { self: false, ack: false } } });
        var room = makeRoom(name, channel), done = false;
        var t = setTimeout(function () { if (!done) { done = true; reject({ code: 'upstream_error' }); } }, 10000);
        RT.status = 'يتصل...';
        channel.subscribe(function (status, err) {
          RT.status = status === 'SUBSCRIBED' ? 'متصل' : status; if (err) RT.err = String(err.message || err).slice(0, 80);
          if (status === 'SUBSCRIBED' && !done) { done = true; clearTimeout(t); room._start(); resolve(room); }
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !done) { done = true; clearTimeout(t); reject({ code: 'upstream_error' }); }
        });
      });
    }
  };
  window.claude = { use: function (n) { return Promise.resolve(n === 'room' && getClient() ? roomApi : null); } };
})();
