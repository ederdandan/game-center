function (gc, fromHub, read, write) {
  // Avatares do Sobrecarga são presets SVG (sem emoji): só a foto do hub é aproveitada.
  var K = 'sobrecarga2x_profile';
  var cur = read(K);
  var has = !!(cur && typeof cur === 'object' && cur.name && cur.avatar);
  if (has && !fromHub) return;
  var avatar = gc.p || (has && cur.avatar) || 'preset:sun';
  write(K, Object.assign({}, has ? cur : {}, { name: gc.n, avatar: avatar }));
}
