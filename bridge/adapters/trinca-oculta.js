function (gc, fromHub, read, write) {
  // Multi-perfil: reaproveita o perfil de mesmo nome ou o perfil 'gc-hub'; senão cria um.
  var K = 'trinca-oculta.profiles.v1';
  var st = read(K);
  if (!st || typeof st !== 'object' || !Array.isArray(st.profiles)) st = { activeId: null, profiles: [] };
  if (st.profiles.length && !fromHub) return;
  var lower = gc.n.toLowerCase();
  var target = null;
  st.profiles.forEach(function (q) {
    if (!target && q && typeof q.name === 'string' && q.name.toLowerCase() === lower) target = q;
  });
  st.profiles.forEach(function (q) {
    if (!target && q && q.id === 'gc-hub') target = q;
  });
  if (!target) {
    target = { id: 'gc-hub', name: gc.n, avatar: { type: 'emoji', value: '🙂' },
      stats: { played: 0, wins: 0, losses: 0, draws: 0 }, createdAt: Date.now() };
    st.profiles.push(target);
  }
  target.name = gc.n;
  if (gc.p) target.avatar = { type: 'photo', value: gc.p };
  else if (gc.e && gc.e.length <= 8) target.avatar = { type: 'emoji', value: gc.e };
  st.activeId = target.id;
  write(K, st);
}
