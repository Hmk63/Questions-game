// اتصال الجوالات بالموقع: يربط وضع «كل لاعب على جواله» بـ Supabase Realtime (Presence).
// يوفّر نفس واجهة claude.use('room') اللي تستخدمها اللعبة، فكود اللعبة ما يتغير.
(function () {
  if (window.claude && window.claude.use) return; // داخل Claude: نستخدم الغرفة المدمجة
  var SUPABASE_URL = 'https://ddxbnmctuyrrccnvwndo.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_Em8IhbBIjgPOqUuCuI7K0w_2ScV7bbj'; // مفتاح عام، مصمم للمتصفح
  var client = null;
  function getClient() {
    if (!client && window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { params: { eventsPerSecond: 10 } } });
    }
    return client;
  }
  var myPeer = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function makeRoom(name, channel) {
    var me = {}, subs = [], cache = [], prev = {};
    function snapshot() {
      var st = channel.presenceState(), out = [], seen = {};
      Object.keys(st).forEach(function (key) {
        var metas = st[key]; if (!metas || !metas.length) return;
        var m = Object.assign({}, metas[metas.length - 1]); delete m.presence_ref;
        var p = m.p || {}, j = JSON.stringify(p);
        var keep = prev[key] && prev[key].j === j ? prev[key].obj : Object.freeze(p);
        prev[key] = { j: j, obj: keep }; seen[key] = 1;
        out.push({ peer: key, by: null, isMe: key === myPeer, sameTab: key === myPeer, kind: 'viewer', guest: false, presence: key === myPeer ? Object.freeze(Object.assign({}, me)) : keep, updatedAt: Date.now() });
      });
      if (!seen[myPeer]) out.push({ peer: myPeer, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze(Object.assign({}, me)), updatedAt: Date.now() });
      return out;
    }
    function fire() { cache = snapshot(); subs.forEach(function (f) { try { f({ peers: cache, joined: [], left: [], updated: [] }); } catch (e) {} }); }
    channel.on('presence', { event: 'sync' }, fire);
    var trackT = null;
    function track() { clearTimeout(trackT); trackT = setTimeout(function () { channel.track({ p: me }).catch(function () {}); }, 60); }
    return {
      name: name,
      presence: function (patch) {
        me = Object.assign({}, me, patch);
        Object.keys(patch).forEach(function (k) { if (patch[k] === null) delete me[k]; });
        track(); fire(); return Promise.resolve();
      },
      peers: function () { return cache; },
      onPeers: function (f) { subs.push(f); setTimeout(function () { f({ peers: cache, joined: cache, left: [], updated: [] }); }, 0); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
      connected: function () { return true; },
      leave: function () { return client.removeChannel(channel).then(function () {}); },
      emit: function () { return Promise.resolve(); },
      on: function () { return function () {}; }
    };
  }

  var roomApi = {
    join: function (name) {
      return new Promise(function (resolve, reject) {
        var c = getClient(); if (!c) return reject({ code: 'not_granted' });
        var channel = c.channel(name, { config: { presence: { key: myPeer } } });
        var room = makeRoom(name, channel), done = false;
        var t = setTimeout(function () { if (!done) { done = true; reject({ code: 'upstream_error' }); } }, 10000);
        channel.subscribe(function (status) {
          if (status === 'SUBSCRIBED' && !done) { done = true; clearTimeout(t); resolve(room); }
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !done) { done = true; clearTimeout(t); reject({ code: 'upstream_error' }); }
        });
      });
    }
  };
  window.claude = { use: function (n) { return Promise.resolve(n === 'room' && getClient() ? roomApi : null); } };
})();
