function (gc, fromHub, read, write) {
  var K = 'murdoku_v2';
  var ICONS = ['🕵️', '🕵️‍♀️', '👮', '👮‍♀️', '🔍', '🎩', '🕶️', '🦉', '🐺', '🦅', '🦊', '🐈‍⬛', '🧠', '🗝️', '⚖️', '🌹'];
  var st = read(K);
  if (!st || typeof st !== 'object' || Array.isArray(st)) {
    if (read('murdoku_pwa_v1') !== null) return; // deixa a migração legada do próprio jogo agir
    st = {};
  }
  var p = st.profile && typeof st.profile === 'object' && typeof st.profile.name === 'string' ? st.profile : null;
  if (p && !fromHub) return;
  // Merge só no profile: preserva progresso, casos resolvidos, tema e som.
  var np = Object.assign({ icon: ICONS[0], photo: null, createdAt: Date.now() }, p || {}, { name: gc.n });
  if (gc.p) np.photo = gc.p;
  else if (ICONS.indexOf(gc.e) >= 0) { np.icon = gc.e; np.photo = null; }
  st.profile = np;
  write(K, st);
}
