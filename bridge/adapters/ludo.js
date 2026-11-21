function (gc, fromHub, read, write) {
  var K = 'ludo:profile';
  var cur = read(K);
  if (!cur || typeof cur !== 'object') cur = null;
  var has = !!(cur && typeof cur.name === 'string' && cur.name.trim());
  if (has && !fromHub) return;
  var next = Object.assign({ avatar: '😀' }, cur || {}, { name: gc.n });
  if (gc.p) next.avatar = gc.p;
  else if (gc.e) next.avatar = gc.e;
  write(K, next);
}
