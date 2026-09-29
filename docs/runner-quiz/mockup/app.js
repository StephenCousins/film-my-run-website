<script>
const DATA = __DATA__;
const AX = DATA.axes, C = DATA.calibration;
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
const LABEL = {S:['Trail','Road'], M:['Feel','Data'], D:['Long','Short'], R:['Social','Racer']};

function score(ans) {
  return ['S','M','D','R'].map((a, k) => {
    let lo = 0, hi = 0, raw = 0;
    DATA.questions.forEach((q, qi) => {
      const v = q.answers.map(x => x.scores[a] || 0);
      lo += Math.min(...v); hi += Math.max(...v);
      raw += q.answers[ans[qi]].scores[a] || 0;
    });
    const s = 100 * (raw - lo) / (hi - lo);
    return Math.max(0, Math.min(100, Math.round(50 + C.spread * (s - C.mean[k]) / C.sd[k])));
  });
}
const ranked = s => [...DATA.types].sort((x, y) => Math.hypot(...x.target.map((v, i) => v - s[i])) - Math.hypot(...y.target.map((v, i) => v - s[i])));

let ans = [], busy = false;
const phone = $('#phone');
function render() {
  const i = ans.length, n = DATA.questions.length;
  if (i === n) return think();
  const q = DATA.questions[i];
  phone.innerHTML = `
    <div class="count"><span>Question ${i + 1} of ${n}</span><span>${Math.round(100 * i / n)}%</span></div>
    <div class="bar"><i style="width:${100 * i / n}%"></i></div>
    <div class="qtext">${esc(q.q)}</div>
    <div class="answers">${q.answers.map((a, k) => `<button id="ans${k}" data-k="${k}">${esc(a.text)}</button>`).join('')}</div>
    ${i ? '<button class="back" id="back">← Back</button>' : ''}`;
  phone.querySelectorAll('.answers button').forEach(b => b.onclick = () => {
    if (busy) return; busy = true; b.classList.add('picked');
    setTimeout(() => { ans.push(+b.dataset.k); busy = false; render(); }, 220);
  });
  const back = $('#back', phone); if (back) back.onclick = () => { ans.pop(); render(); };
}
function think() {
  phone.innerHTML = `<div class="thinking"><div class="dots"><i></i><i></i><i></i></div><span id="tmsg">Checking your splits…</span></div>`;
  const msgs = ['Checking your splits…', 'Reading the mud on your shoes…', 'Counting parkrun barcodes…'];
  let m = 0; const t = setInterval(() => { const el = $('#tmsg'); if (el) el.textContent = msgs[++m % msgs.length]; }, 550);
  setTimeout(() => { clearInterval(t); result(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1700);
}
function dna(s, col) {
  return `<div class="dna">${['S','M','D','R'].map((a, k) => `<div class="row"><span>${LABEL[a][0]}</span><div class="t"><i data-left="${s[k]}" style="left:50%;background:${col}"></i></div><span>${LABEL[a][1]}</span></div>`).join('')}</div>`;
}
function result() {
  const s = score(ans), [a, b] = ranked(s);
  phone.innerHTML = `<div class="reveal">
    <div class="badge" style="background:${a.colour}">${initials(a.name)}</div>
    <span class="eyebrow">You are a</span>
    <div class="name">${esc(a.name)}</div>
    <div class="line">${esc(a.line)}</div>
    <div class="streak">With a streak of <b>${esc(b.name)}</b></div>
    ${dna(s, a.colour)}
    <p style="margin:0;color:var(--ink2);font-size:14px">${esc(a.profile)}</p>
    <div class="streak">Mantra: <b>${esc(a.mantra)}</b></div>
    <div class="streak">Watch next: <a href="https://youtu.be/${a.film.id}" target="_blank" rel="noopener">${esc(a.film.title)}</a></div>
  </div>
  <div class="btnrow"><button class="btn" id="again">Take it again</button><a class="btn ghost" href="#type-${a.id}">Read the full type</a></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => phone.querySelectorAll('.dna i').forEach(i => i.style.left = i.dataset.left + '%')));
  $('#again').onclick = () => { ans = []; render(); };
}

$('#types').innerHTML = DATA.types.map(t => `
  <article class="type" id="type-${t.id}">
    <header><div class="badge" style="background:${t.colour}">${initials(t.name)}</div><div><h3>${esc(t.name)}</h3><div class="tl">${esc(t.line)}</div></div></header>
    <div class="mini">${['S','M','D','R'].map((a, k) => `<div>${t.target[k] >= 50 ? LABEL[a][1] : LABEL[a][0]}<div class="t"><i style="width:${Math.abs(t.target[k] - 50) * 2}%;background:${t.colour}"></i></div></div>`).join('')}</div>
    <p>${esc(t.profile)}</p>
    <ul>${t.traits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <dl><dt>Famous</dt><dd>${esc(t.famous)}</dd><dt>Ideal race</dt><dd>${esc(t.race)}</dd><dt>Mantra</dt><dd>${esc(t.mantra)}</dd><dt>Watch</dt><dd><a href="https://youtu.be/${t.film.id}" target="_blank" rel="noopener">${esc(t.film.title)}</a><br><span style="color:var(--mute)">or </span><a href="https://youtu.be/${t.filmAlt.id}" target="_blank" rel="noopener">${esc(t.filmAlt.title)}</a></dd></dl>
  </article>`).join('');

const chipName = (a, v) => `${v > 0 ? LABEL[a][1] : LABEL[a][0]} ${v > 0 ? '+' : '−'}${Math.abs(v)}`;
$('#qs').innerHTML = DATA.questions.map((q, i) => `
  <div class="qrow"><h3>${i + 1}. ${esc(q.q)}</h3><ol>${q.answers.map(a => `<li><span class="txt">${esc(a.text)}</span>${Object.entries(a.scores).filter(([, v]) => v).map(([k, v]) => `<span class="chip">${chipName(k, v)}</span>`).join('')}</li>`).join('')}</ol></div>`).join('');

render();
</script>
