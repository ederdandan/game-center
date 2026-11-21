function (gc, fromHub, read, write) {
  var K = 'taco_chaos_user';
  var OPTS = ['😎', '⚡', '🐱', '🌮', '🍕', '👾', '🦄', '🦍', '🧙', '👑', '🦊', '🤖', '🦫', '🔥', '💀', '🤡', '🧀', '🚀'];
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  if (cur && cur.userId && cur.loggedIn && !fromHub) return;
  // Merge: preserva userId/stats/prefs. O jogo descarta perfil sem userId, então cria um se faltar.
  var next = Object.assign({}, cur || {}, { name: gc.n, loggedIn: true });
  if (!next.userId) next.userId = 'usr_' + Math.random().toString(36).slice(2, 11);
  if (gc.p) next.avatar = gc.p;
  else if (OPTS.indexOf(gc.e) >= 0) next.avatar = gc.e;
  else if (!next.avatar) next.avatar = OPTS[0];
  write(K, next);
}
