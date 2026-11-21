function (gc, fromHub, read, write) {
  var K = 'serpente_arena_profile_v1';
  var PRESETS = ['🐍', '🐉', '🦎', '🐲', '🦖', '🐊', '🐢', '🦊', '🐸', '🐱', '🤖', '👾'];
  var cur = read(K);
  var has = !!(cur && typeof cur.name === 'string' && cur.name.trim());
  if (has && !fromHub) return;
  var avatar = gc.p ? { type: 'photo', value: gc.p }
    : PRESETS.indexOf(gc.e) >= 0 ? { type: 'emoji', value: gc.e }
    : (has && cur.avatar) || { type: 'emoji', value: PRESETS[0] };
  write(K, Object.assign({}, has ? cur : {}, { name: gc.n.slice(0, 12), avatar: avatar }));
}
