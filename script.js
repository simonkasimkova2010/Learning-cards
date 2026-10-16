// ---------- Data ----------
const KEY = 'slovicka-v1';
const day = d => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD v lokálním čase

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.words) return d;
  } catch (e) {}
  return { words: [], log: {}, dir: 'cz-en' };
}
let S = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

// ---------- Pomocné funkce ----------
const $ = s => document.querySelector(s);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = t => t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const ask = w => (S.dir === 'cz-en' ? w.cz : w.en);
const ans = w => (S.dir === 'cz-en' ? w.en : w.cz);

let view = 'home';
let ses = null;
let msg = '';

function record(w, ok) {
  if (ok) { w.ok++; w.lvl = Math.min(5, w.lvl + 1); }
  else { w.bad++; w.lvl = Math.max(0, w.lvl - 1); }
  const k = day(new Date());
  const d = S.log[k] || (S.log[k] = { r: 0, c: 0 });
  d.r++;
  if (ok) d.c++;
  save();
}

function stats() {
  const W = S.words;
  const learned = W.filter(w => w.lvl >= 4).length;
  let r = 0, c = 0;
  Object.values(S.log).forEach(d => { r += d.r; c += d.c; });
  let streak = 0;
  const d = new Date();
  if (!S.log[day(d)]) d.setDate(d.getDate() - 1);
  while (S.log[day(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return { total: W.length, learned, r, acc: r ? Math.round((c / r) * 100) : 0, streak };
}

// ---------- Hra ----------
function start(mode) {
  const need = mode === 'quiz' ? 2 : 1;
  if (S.words.length < need) {
    msg = mode === 'quiz' ? 'Na kvíz potřebuješ aspoň 2 slovíčka.' : 'Nejdřív přidej nějaká slovíčka.';
    return go('home');
  }
  msg = '';
  const list = shuffle(S.words).sort((x, y) => x.lvl - y.lvl).slice(0, 10);
  ses = { mode, list, i: 0, ok: 0, flip: false, res: null, picked: null };
  prep();
  go('play');
}

function prep() {
  const s = ses;
  s.flip = false; s.res = null; s.picked = null;
  if (s.mode === 'quiz' && s.list[s.i]) {
    const w = s.list[s.i];
    const others = shuffle(S.words.filter(x => x.id !== w.id)).slice(0, 3).map(ans);
    s.opts = shuffle([ans(w), ...others]);
  }
}

function next() {
  ses.i++;
  prep();
  render();
}

// ---------- Obrazovky ----------
function home() {
  const st = stats();
  $('#app').innerHTML = `
    <h1>Naučme se <b>nová slova.</b></h1>
    <div class="chips">
      <button class="chip ${S.dir === 'cz-en' ? 'on' : ''}" data-a="dir" data-v="cz-en">CZ → EN</button>
      <button class="chip ${S.dir === 'en-cz' ? 'on' : ''}" data-a="dir" data-v="en-cz">EN → CZ</button>
    </div>
    ${st.total === 0 ? `
      <div class="box" style="margin:0 0 14px">
        <p>Zatím tu nemáš žádná slovíčka. Napiš si ta, která se chceš naučit, a hned si je procvičíš.</p>
        <button class="btn full" data-a="go" data-v="words">Přidat první slova</button>
      </div>` : ''}
    ${msg ? `<p class="feedback wrong">${msg}</p>` : ''}
    <div class="grid">
      <button class="tile lav" data-a="start" data-v="cards"><i>↗</i><span>Kartičky</span><small>otoč a ohodnoť se</small></button>
      <button class="tile sun" data-a="start" data-v="quiz"><i>↗</i><span>Kvíz</span><small>vyber správný překlad</small></button>
      <button class="tile mint" data-a="start" data-v="write"><i>↗</i><span>Psaní</span><small>napiš překlad sám</small></button>
      <button class="tile pink" data-a="go" data-v="words"><i>+</i><span>Přidat slova</span><small>${st.total} ve sbírce</small></button>
    </div>
    <div class="box">
      <div class="row"><span>Naučeno</span><b>${st.learned} / ${st.total}</b></div>
      <div class="meter"><i style="width:${st.total ? (st.learned / st.total) * 100 : 0}%"></i></div>
      <p class="muted" style="margin-top:12px">Série: ${st.streak} ${st.streak === 1 ? 'den' : 'dní'} v kuse</p>
    </div>`;
}

function words() {
  $('#app').innerHTML = `
    <h1>Moje <b>slovíčka</b></h1>
    <p class="muted" style="margin-bottom:12px">Jedno slovo na řádek. Česky a anglicky odděl znakem = nebo -<br>Například: pes = dog</p>
    <textarea id="bulk" placeholder="pes = dog&#10;kočka = cat"></textarea>
    <button class="btn full" data-a="add">Přidat do sbírky</button>
    <h2>Sbírka (${S.words.length})</h2>
    <div class="box" style="margin-top:0">
      ${S.words.length ? S.words.map(w => `
        <div class="word">
          <span><b>${esc(w.cz)}</b> &nbsp;·&nbsp; ${esc(w.en)}</span>
          <button class="x" data-a="del" data-v="${w.id}" aria-label="Smazat">✕</button>
        </div>`).join('') : '<p class="muted">Zatím tu nic není.</p>'}
    </div>
    ${S.words.length ? '<button class="btn ghost full" data-a="clear">Smazat všechna slova</button>' : ''}`;
}

function progress() {
  const st = stats();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString('cs-CZ', { weekday: 'short' }), r: (S.log[day(d)] || { r: 0 }).r });
  }
  const max = Math.max(1, ...days.map(d => d.r));
  const lv = [0, 1, 2, 3, 4, 5].map(n => S.words.filter(w => w.lvl === n).length);
  $('#app').innerHTML = `
    <h1>Tvůj <b>pokrok</b></h1>
    <div class="stats">
      <div class="box"><div class="big">${st.learned}</div><p>naučeno</p></div>
      <div class="box"><div class="big">${st.acc}%</div><p>úspěšnost</p></div>
      <div class="box"><div class="big">${st.streak}</div><p>dní v kuse</p></div>
    </div>
    <div class="box">
      <div class="row"><span>Posledních 7 dní</span><span class="muted">${st.r} odpovědí celkem</span></div>
      <div class="week">${days.map(d => `<div><i style="height:${(d.r / max) * 100}%"></i><small>${d.label}</small></div>`).join('')}</div>
    </div>
    <div class="box">
      <span>Úroveň slovíček</span>
      <p class="muted" style="margin-top:8px">Slovo je naučené od úrovně 4 z 5. Správná odpověď ho posune výš, chyba níž.</p>
      ${lv.map((n, i) => `
        <div class="row" style="margin-top:12px"><span class="muted">Úroveň ${i}</span><b>${n}</b></div>
        <div class="meter" style="margin-top:6px"><i style="width:${st.total ? (n / st.total) * 100 : 0}%"></i></div>`).join('')}
    </div>`;
}

function play() {
  const s = ses;
  if (s.i >= s.list.length) return end();
  const w = s.list[s.i];
  const head = `<div class="top"><button class="round" data-a="go" data-v="home" aria-label="Zpět">←</button><div class="bar"><i style="width:${(s.i / s.list.length) * 100}%"></i></div></div>`;
  let body = '';

  if (s.mode === 'cards') {
    body = `
      <button class="flip ${s.flip ? 'on' : ''}" data-a="flip">
        <span>${esc(s.flip ? ans(w) : ask(w))}</span>
        <small>${s.flip ? 'odpověď' : 'klepni pro otočení'}</small>
      </button>
      ${s.flip ? `<div class="two"><button class="btn no" data-a="know" data-v="0">Neznal jsem</button><button class="btn yes" data-a="know" data-v="1">Znal jsem</button></div>` : ''}`;
  }

  if (s.mode === 'quiz') {
    body = `<p class="q">${esc(ask(w))}</p>` + s.opts.map((o, i) => {
      let c = '';
      if (s.picked !== null) {
        if (norm(o) === norm(ans(w))) c = 'good';
        else if (i === s.picked) c = 'wrong';
      }
      return `<button class="opt ${c}" data-a="opt" data-v="${i}">${esc(o)}</button>`;
    }).join('');
  }

  if (s.mode === 'write') {
    body = `
      <p class="q">${esc(ask(w))}</p>
      <input id="inp" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="Napiš překlad" ${s.res ? 'disabled' : ''} value="${s.res ? esc(s.res.val) : ''}">
      ${s.res
        ? `<p class="feedback ${s.res.ok ? 'good' : 'wrong'}">${s.res.ok ? 'Správně!' : 'Správně je: ' + esc(ans(w))}</p><button class="btn full" data-a="next">Další</button>`
        : `<button class="btn full" data-a="check">Zkontrolovat</button>`}`;
  }

  $('#app').innerHTML = head + body;
  const inp = $('#inp');
  if (inp && !s.res) inp.focus();
}

function end() {
  const s = ses;
  $('#app').innerHTML = `
    <div class="end">
      <h1>Hotovo!</h1>
      <div class="big">${s.ok} / ${s.list.length}</div>
      <p class="muted">správných odpovědí</p>
      <button class="btn full" data-a="start" data-v="${s.mode}">Hrát znovu</button>
      <button class="btn ghost full" data-a="go" data-v="progress">Zobrazit pokrok</button>
    </div>`;
}

// ---------- Vykreslení ----------
function go(v) { view = v; render(); window.scrollTo(0, 0); }

function render() {
  ({ home, words, progress, play })[view]();
  const nav = $('#nav');
  nav.style.display = view === 'play' ? 'none' : 'flex';
  nav.innerHTML = [['home', 'Domů'], ['words', 'Slovíčka'], ['progress', 'Pokrok']]
    .map(([v, t]) => `<button class="${view === v ? 'on' : ''}" data-a="go" data-v="${v}">${t}</button>`).join('');
}

// ---------- Události ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]');
  if (!t) return;
  const v = t.dataset.v;
  const s = ses;

  switch (t.dataset.a) {
    case 'go': msg = ''; go(v); break;
    case 'start': start(v); break;
    case 'dir': S.dir = v; save(); render(); break;
    case 'flip': s.flip = !s.flip; render(); break;
    case 'know': {
      const ok = v === '1';
      record(s.list[s.i], ok);
      if (ok) s.ok++;
      next();
      break;
    }
    case 'opt': {
      if (s.picked !== null) return;
      const w = s.list[s.i];
      s.picked = Number(v);
      const ok = norm(s.opts[s.picked]) === norm(ans(w));
      record(w, ok);
      if (ok) s.ok++;
      render();
      setTimeout(next, 900);
      break;
    }
    case 'check': checkWrite(); break;
    case 'next': next(); break;
    case 'add': {
      const lines = $('#bulk').value.split('\n');
      lines.forEach(l => {
        const p = l.split(/\s*[=\-;\t]\s*/);
        if (p.length >= 2 && p[0].trim() && p[1].trim()) {
          S.words.push({ id: Date.now() + Math.random(), cz: p[0].trim(), en: p[1].trim(), lvl: 0, ok: 0, bad: 0 });
        }
      });
      save();
      render();
      break;
    }
    case 'del':
      S.words = S.words.filter(w => String(w.id) !== v);
      save();
      render();
      break;
    case 'clear':
      if (confirm('Opravdu smazat všechna slovíčka?')) {
        S.words = [];
        save();
        render();
      }
      break;
  }
});

function checkWrite() {
  const s = ses;
  const w = s.list[s.i];
  const val = $('#inp').value;
  const ok = norm(val) === norm(ans(w));
  s.res = { ok, val };
  record(w, ok);
  if (ok) s.ok++;
  render();
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !ses || view !== 'play' || ses.mode !== 'write') return;
  ses.res ? next() : checkWrite();
});

render();
