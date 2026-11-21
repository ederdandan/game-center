function (gc, fromHub, read, write) {
  var cur = read('adv-name');
  if (typeof cur === 'string' && cur.trim() && !fromHub) return;
  write('adv-name', gc.n);
}
