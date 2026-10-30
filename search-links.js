// Vercel-only add-on: the Scout's search button opens job sites with the search
// already filled in from the profile, instead of copying a prompt for Claude.
// Nothing runs on its own; links are built only when the person clicks.
(function () {
  var es = function () { return document.documentElement.lang === 'es'; };
  var tx = function (en, sp) { return es() ? sp : en; };

  function profile() {
    try { return (JSON.parse(localStorage.getItem('jobdesk-local-v1') || '{}').profile || {}).main || {}; }
    catch (e) { return {}; }
  }
  function list(s) {
    return String(s || '').split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function indeedHost(p) {
    var c = String(p.currency || '').toUpperCase();
    return { CAD: 'ca.indeed.com', CLP: 'cl.indeed.com', GBP: 'uk.indeed.com', AUD: 'au.indeed.com', EUR: 'www.indeed.com' }[c] || 'www.indeed.com';
  }
  function sites(role, loc, p) {
    var e = encodeURIComponent, remote = (p.workModes || []).indexOf('Remote') >= 0;
    var g = role + ' jobs' + (loc ? ' ' + loc : '') + (remote ? ' OR remote' : '');
    var out = [
      ['Google Jobs', 'https://www.google.com/search?ibp=htl;jobs&q=' + e(g)],
      ['LinkedIn', 'https://www.linkedin.com/jobs/search/?keywords=' + e(role) + '&location=' + e(loc)],
      ['Indeed', 'https://' + indeedHost(p) + '/jobs?q=' + e(role) + '&l=' + e(loc)],
      [tx('Employer pages', 'Páginas de empleadores'), 'https://www.google.com/search?q=' + e('"' + role + '" careers ' + loc + ' -site:linkedin.com -site:indeed.com')]
    ];
    if (String(p.currency || '').toUpperCase() === 'CAD')
      out.push(['Job Bank', 'https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=' + e(role) + '&locationstring=' + e(loc)]);
    if (remote) out.push(['We Work Remotely', 'https://weworkremotely.com/remote-jobs/search?term=' + e(role)]);
    return out;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function render(btn) {
    var p = profile(), roles = list(p.targets).slice(0, 5);
    var loc = String(p.base || '').trim() || list(p.regions)[0] || '';
    var box = document.getElementById('sl-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'sl-box';
      box.style.cssText = 'display:flex;flex-direction:column;gap:10px;padding:12px 0 4px';
      btn.closest('.rsrow').insertAdjacentElement('afterend', box);
    }
    if (!roles.length) {
      box.innerHTML = '<p class="small">' + tx('Add the roles you want in your Profile first, then search again.', 'Primero agrega los cargos que buscas en tu Perfil y vuelve a buscar.') +
        ' <a href="#profile">' + tx('Go to Profile', 'Ir al Perfil') + '</a></p>';
      return;
    }
    box.innerHTML = '<p class="small muted">' + tx('Open a site, then add the roles you like under “Add a role yourself”.', 'Abre un sitio y luego agrega los cargos que te gusten en “Añade un cargo tú mismo”.') +
      (loc ? ' ' + tx('Location', 'Ubicación') + ': <b>' + esc(loc) + '</b>' : '') + '</p>' +
      roles.map(function (r) {
        return '<div class="sp"><b>' + esc(r) + '</b><span class="acts">' + sites(r, loc, p).map(function (s) {
          return '<a class="btn sm alt" target="_blank" rel="noopener" href="' + esc(s[1]) + '">' + esc(s[0]) + '</a>';
        }).join('') + '</span></div>';
      }).join('');
  }

  // Capture phase so the page's own "copy prompt" handler never runs.
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-runsearch]');
    if (!btn) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    render(btn);
  }, true);

  // Relabel the button; the page re-renders often, so keep it in sync.
  function label() {
    var b = document.getElementById('rs-btn'), want = tx('Search jobs', 'Buscar empleos');
    if (b && b.textContent !== want) b.textContent = want;
  }
  new MutationObserver(label).observe(document.documentElement, { childList: true, subtree: true });
  label();
})();
