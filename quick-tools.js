// Vercel-only add-on: a "Quick tools" tab with non-AI versions of the Matcher and Coach.
// A keyword match against the profile, and fill-in letter templates. The Matcher and
// Coach tabs keep their "copy prompt" buttons for the real AI versions.
(function () {
  if (typeof PAGES === 'undefined' || typeof renderPage !== 'function') return;

  var tx = function (en, sp) { return LANG === 'es' ? sp : en; };
  var e = function (s) { return esc(s == null ? '' : String(s)); };
  var list = function (s) {
    return (Array.isArray(s) ? s : String(s || '').split(/[,;\n]/)).map(function (x) { return String(x).trim(); }).filter(Boolean);
  };
  var norm = function (s) { return ' ' + String(s || '').toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, ' ') + ' '; };
  var STOP = ' and or the of for with to in a an de del la el y en para con los las ';

  var Q = { roleId: '', title: '', company: '', text: '', result: null, letter: '', follow: '' };

  if (typeof ES === 'object') ES['Quick tools'] = 'Herramientas rápidas';
  ICON.quick = '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>';
  PAGES.splice(PAGES.findIndex(function (p) { return p[0] === 'team'; }), 0, ['quick', 'Quick tools']);
  var st = document.createElement('style');
  st.textContent = '@media (max-width:640px){nav.tabs{grid-template-columns:repeat(6,minmax(0,1fr))!important}}' +
    '.qt-hit{color:var(--good)}.qt-miss{color:var(--muted)}.qt-bad{color:var(--bad)}.qt-score{font-size:34px;font-weight:600;line-height:1}';
  document.head.appendChild(st);

  // ---- keyword match ----
  // Light stemming so "leading" matches "lead" and "managers" matches "manager".
  var stem = function (w) { return w.length > 4 ? w.replace(/(ing|ers|ed|es|s)$/, '') : w; };
  var stems = function (s) { return s.trim().split(' ').map(stem); };
  function has(text, term) {
    var t = norm(term);
    if (text.indexOf(t) >= 0) return true;
    var words = stems(t).filter(function (w) { return w.length > 2 && STOP.indexOf(' ' + w + ' ') < 0; });
    var pool = ' ' + stems(text).join(' ') + ' ';
    return words.length > 0 && words.every(function (w) { return pool.indexOf(' ' + w + ' ') >= 0; });
  }
  function match() {
    var p = P(), text = norm(Q.title + ' ' + Q.text);
    var groups = [
      [tx('Roles you want', 'Cargos que buscas'), list(p.targets)],
      [tx('Skills', 'Habilidades'), list(p.skills)],
      [tx('Industries', 'Industrias'), list(p.industryList && p.industryList.length ? p.industryList : p.industries)]
    ].map(function (g) {
      return { name: g[0], hit: g[1].filter(function (t) { return has(text, t); }), miss: g[1].filter(function (t) { return !has(text, t); }) };
    });
    var total = groups.reduce(function (n, g) { return n + g.hit.length + g.miss.length; }, 0);
    var hits = groups.reduce(function (n, g) { return n + g.hit.length; }, 0);
    var places = list(p.base).slice(0, 1).concat(list(p.regions));
    if ((p.workModes || []).indexOf('Remote') >= 0) places.push('remote');
    return {
      groups: groups, total: total, hits: hits,
      score: total ? Math.round(hits / total * 100) : null,
      avoid: list(p.avoid).filter(function (t) { return has(text, t); }),
      place: places.length ? places.filter(function (t) { return has(text, t); }) : null
    };
  }
  function resultHtml(r) {
    if (r.total === 0) return '<p class="small">' + tx('Your Profile has no roles, skills or industries yet, so there is nothing to compare.', 'Tu Perfil aún no tiene cargos, habilidades ni industrias, así que no hay nada que comparar.') + ' <a href="#profile">' + tx('Go to Profile', 'Ir al Perfil') + '</a></p>';
    var verdict = r.avoid.length ? ['qt-bad', tx('Contains something you skip', 'Contiene algo que evitas')]
      : r.score >= 50 ? ['qt-hit', tx('Worth a closer look', 'Vale la pena mirarlo')]
      : r.score >= 25 ? ['', tx('Partial match', 'Coincidencia parcial')]
      : ['qt-miss', tx('Weak match', 'Coincidencia débil')];
    return '<div class="row" style="gap:14px;align-items:flex-end"><span class="qt-score">' + r.score + '%</span><span><b class="' + verdict[0] + '">' + verdict[1] + '</b><br><span class="small muted">' +
      tx(r.hits + ' of ' + r.total + ' profile keywords found', r.hits + ' de ' + r.total + ' palabras clave del perfil encontradas') + '</span></span></div>' +
      r.groups.filter(function (g) { return g.hit.length + g.miss.length; }).map(function (g) {
        return '<div class="small"><b>' + g.name + ':</b> ' + g.hit.map(function (t) { return '<span class="qt-hit">✓ ' + e(t) + '</span>'; }).concat(g.miss.map(function (t) { return '<span class="qt-miss">· ' + e(t) + '</span>'; })).join(', ') + '</div>';
      }).join('') +
      (r.avoid.length ? '<div class="small qt-bad"><b>' + tx('Skip words found', 'Palabras a evitar encontradas') + ':</b> ' + r.avoid.map(e).join(', ') + '</div>' : '') +
      (r.place ? '<div class="small"><b>' + tx('Location', 'Ubicación') + ':</b> ' + (r.place.length ? '<span class="qt-hit">✓ ' + r.place.map(e).join(', ') + '</span>' : '<span class="qt-miss">' + tx('none of your places mentioned', 'no menciona ninguno de tus lugares') + '</span>') + '</div>' : '') +
      '<p class="small muted">' + tx('This only counts words. It cannot tell that two different titles mean the same job. For a real read, use the Matcher.', 'Esto solo cuenta palabras. No sabe que dos cargos con distinto nombre pueden ser el mismo trabajo. Para una evaluación real, usa el Matcher.') + '</p>';
  }

  // ---- templates ----
  function letter() {
    var p = P(), r = Q.result || match();
    var strengths = r.groups[1].hit.length ? r.groups[1].hit : list(p.skills).slice(0, 4);
    var title = Q.title || tx('[role]', '[cargo]'), co = Q.company || tx('[company]', '[empresa]');
    var bg = String(p.background || '').trim();
    var name = String(p.name || '').trim() || tx('[your name]', '[tu nombre]');
    return LANG === 'es'
      ? 'Estimado equipo de ' + co + ':\n\nMe interesa postular al cargo de ' + title + '.' + (bg ? ' ' + bg : '') + '\n\n' +
        (strengths.length ? 'Lo que aportaría: ' + strengths.join(', ') + '.\n\n' : '') +
        co + ' me atrae porque [una razón concreta sobre la empresa].\n\n' +
        'En mi experiencia, [un logro breve con un resultado o número].\n\n' +
        'Me encantaría conversar sobre cómo puedo aportar. Gracias por su tiempo.\n\n' + name
      : 'Dear ' + co + ' hiring team,\n\nI am applying for the ' + title + ' role.' + (bg ? ' ' + bg : '') + '\n\n' +
        (strengths.length ? 'What I would bring: ' + strengths.join(', ') + '.\n\n' : '') +
        co + ' stands out to me because [one specific reason about the company].\n\n' +
        'For example, [one short achievement with a result or number].\n\n' +
        'I would welcome the chance to talk about how I can help. Thank you for your time.\n\n' + name;
  }

  // ---- page ----
  function page() {
    var rs = roles().filter(function (r) { return !r.profileId || r.profileId === (P().activeProfile || r.profileId); });
    var opts = '<option value="">' + tx('— Pick a saved role, or type below —', '— Elige un cargo guardado o escribe abajo —') + '</option>' +
      rs.map(function (r) { return '<option value="' + e(r.id) + '"' + (Q.roleId === r.id ? ' selected' : '') + '>' + e(r.title) + ' · ' + e(r.company) + '</option>'; }).join('');
    return '<section class="box" style="border-color:var(--accent)"><h1>' + tx('Quick tools', 'Herramientas rápidas') + '</h1><p class="muted">' +
      tx('Simple versions of the Matcher and Coach that work without AI: a keyword check and fill-in templates. Rougher than the real thing, but instant and free.',
         'Versiones simples del Matcher y el Coach que funcionan sin IA: una revisión por palabras clave y plantillas para completar. Más básicas, pero instantáneas y gratis.') + '</p></section>' +
      '<section class="box"><h2>' + tx('The role', 'El cargo') + '</h2>' +
      '<label class="f">' + tx('Saved role', 'Cargo guardado') + '<select data-qsel>' + opts + '</select></label>' +
      '<div class="fgrid"><label class="f">' + tx('Title', 'Cargo') + '<input type="text" data-qf="title" value="' + e(Q.title) + '"></label>' +
      '<label class="f">' + tx('Company', 'Empresa') + '<input type="text" data-qf="company" value="' + e(Q.company) + '"></label></div>' +
      '<label class="f">' + tx('Job posting', 'Aviso de empleo') + '<span class="hint2">' + tx('Paste the full posting text. The more text, the better the check.', 'Pega el texto completo del aviso. Mientras más texto, mejor la revisión.') + '</span><textarea rows="7" data-qf="text">' + e(Q.text) + '</textarea></label></section>' +
      '<div class="cols"><section class="box"><div class="rsrow"><h2>' + tx('Keyword match', 'Coincidencia por palabras') + '</h2><button class="btn sm" data-qrun>' + tx('Check', 'Revisar') + '</button></div>' +
      (Q.result ? resultHtml(Q.result) : '<p class="empty">' + tx('Paste a posting and press Check.', 'Pega un aviso y pulsa Revisar.') + '</p>') + '</section>' +
      '<section class="box"><div class="rsrow"><h2>' + tx('Letter templates', 'Plantillas de cartas') + '</h2><span class="row"><button class="btn sm" data-qletter>' + tx('Cover letter', 'Carta de presentación') + '</button><button class="btn sm alt" data-qfollow>' + tx('Follow-up', 'Seguimiento') + '</button></span></div>' +
      (Q.letter ? '<textarea rows="14" data-qf="letter">' + e(Q.letter) + '</textarea><div class="row"><button class="btn alt sm" data-qcopy>' + tx('Copy', 'Copiar') + '</button><span class="saved" id="qt-msg" role="status"></span></div><p class="small muted">' + tx('Replace the parts in [brackets] before sending.', 'Reemplaza las partes entre [corchetes] antes de enviar.') + '</p>'
        : '<p class="empty">' + tx('Builds a draft from your Profile and the role above. You edit the rest.', 'Arma un borrador con tu Perfil y el cargo de arriba. Tú editas el resto.') + '</p>') + '</section></div>';
  }

  var orig = renderPage;
  window.renderPage = function () {
    if (route !== 'quick') return orig();
    var pg = document.getElementById('page');
    var typing = document.activeElement && ['TEXTAREA', 'INPUT', 'SELECT'].indexOf(document.activeElement.tagName) >= 0 && pg.contains(document.activeElement);
    document.getElementById('tabs').innerHTML = PAGES.map(function (p) { return '<a href="#' + p[0] + '" ' + (route === p[0] ? 'aria-current="page"' : '') + '>' + svg(p[0]) + p[1] + '</a>'; }).join('');
    if (!typing) pg.innerHTML = page();
  };
  function redraw() { var a = document.activeElement; if (a && a.blur) a.blur(); window.renderPage(); }

  document.addEventListener('input', function (ev) {
    var f = ev.target.dataset && ev.target.dataset.qf;
    if (f) Q[f] = ev.target.value;
  });
  document.addEventListener('change', function (ev) {
    if (!ev.target.matches || !ev.target.matches('[data-qsel]')) return;
    var r = S.roles[ev.target.value] || {};
    Q.roleId = ev.target.value; Q.title = r.title || ''; Q.company = r.company || ''; Q.result = null;
    redraw();
  });
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-qrun],[data-qletter],[data-qfollow],[data-qcopy]');
    if (!t) return;
    if (t.dataset.qrun !== undefined) { Q.result = match(); redraw(); }
    else if (t.dataset.qletter !== undefined) { Q.result = Q.result || match(); Q.letter = letter(); redraw(); }
    else if (t.dataset.qfollow !== undefined) {
      var r = S.roles[Q.roleId] || {};
      Q.letter = fuNote({ title: Q.title || tx('[role]', '[cargo]'), company: Q.company || tx('[company]', '[empresa]'), appliedAt: r.appliedAt });
      redraw();
    } else if (t.dataset.qcopy !== undefined) {
      var m = document.getElementById('qt-msg');
      navigator.clipboard.writeText(Q.letter).then(function () { if (m) m.textContent = tx('Copied', 'Copiado'); }, function () { if (m) m.textContent = tx('Select the text and copy it', 'Selecciona el texto y cópialo'); });
    }
  });

  // The page already ran its first route before this script loaded.
  if (location.hash === '#quick') setRoute(); else render();
})();
