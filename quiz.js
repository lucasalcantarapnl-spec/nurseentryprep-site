// Quiz engine. mode "diagnostic": answer all, then score by section + offer.
// mode "practice": one section, explanation shown after each answer, review at the end.
// mode "exam": timed section like test day, no feedback until the end, score by subtopic.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function track(name, params) {
    try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {}
  }

  function isCorrect(q, given) {
    if (given == null) return false;
    if (q.type === 'multi') {
      const a = [...q.answer].sort().join(','), g = [...given].sort().join(',');
      return a === g;
    }
    if (q.type === 'fill') {
      const norm = (x) => String(x).trim().toLowerCase().replace(/\s+/g, ' ').replace(/^\$/, '');
      const a = norm(q.answer), g = norm(given);
      if (a === g) return true;
      const na = parseFloat(a), ng = parseFloat(g);
      return !isNaN(na) && !isNaN(ng) && Math.abs(na - ng) < 1e-9 && /^[-\d.,\s]+$/.test(g);
    }
    return q.answer === given;
  }

  window.runQuiz = function (root, data, opts) {
    const mode = opts.mode;
    const passages = {};
    (data.passages || []).forEach((p) => (passages[p.id] = p));
    const qs = data.questions;
    const answers = new Array(qs.length).fill(null);
    let i = 0;
    let timer = null, endAt = null;
    const token = (window.__qtok = (window.__qtok || 0) + 1);
    if (mode === 'exam' && opts.minutes) {
      endAt = Date.now() + opts.minutes * 60000;
      timer = setInterval(() => {
        if (window.__qtok !== token) { clearInterval(timer); return; }
        const el = document.getElementById('clock');
        const left = Math.max(0, endAt - Date.now());
        if (el) el.textContent = Math.floor(left / 60000) + ':' + String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
        if (left <= 0) finish();
      }, 1000);
    }
    track(mode === 'diagnostic' ? 'diagnostic_start' : 'practice_start', { section: data.section || '' });

    function render() {
      const q = qs[i];
      const p = q.passage_id ? passages[q.passage_id] : null;
      const done = mode === 'practice' && answers[i] !== null && answers[i].locked;
      let h = `<div class="qmeta"><span>Question ${i + 1} of ${qs.length}</span><span>${esc(q.section || data.section || '')}${mode === 'exam' ? ' · ⏱ <strong id="clock">' + opts.minutes + ':00</strong>' : ''}</span></div>
        <div class="progress"><span style="width:${(i / qs.length) * 100}%"></span></div>`;
      if (p) h += `<div class="passage">${p.title ? '<strong>' + esc(p.title) + '</strong>\n\n' : ''}${esc(p.text)}</div>`;
      h += `<div class="stem">${esc(q.stem)}</div>`;
      if (q.type === 'multi') h += `<p class="fine">Select all that apply.</p>`;
      const cur = answers[i] ? answers[i].v : null;
      if (q.type === 'fill') {
        h += `<input class="fill" id="fillv" value="${cur ? esc(cur) : ''}" ${done ? 'disabled' : ''} placeholder="Type your answer">`;
      } else {
        for (const [k, v] of Object.entries(q.choices)) {
          let cls = 'choice';
          const picked = q.type === 'multi' ? (cur || []).includes(k) : cur === k;
          if (picked) cls += ' sel';
          if (done) {
            const right = q.type === 'multi' ? q.answer.includes(k) : q.answer === k;
            if (right) cls += ' right'; else if (picked) cls += ' wrong';
          }
          h += `<button class="${cls}" data-k="${k}" ${done ? 'disabled' : ''}><strong>${k}.</strong> ${esc(v)}</button>`;
        }
      }
      if (done) {
        const ok = isCorrect(q, answers[i].v);
        h += `<div class="explain"><strong>${ok ? 'Correct.' : 'Not quite.'}</strong> Answer: ${esc(Array.isArray(q.answer) ? q.answer.join(', ') : q.answer)}. ${esc(q.explanation)}</div>`;
      }
      h += `<div class="nav"><button class="btn ghost" id="prev" ${i === 0 ? 'disabled' : ''}>Back</button>`;
      if (mode === 'practice' && !done) h += `<button class="btn" id="check">Check answer</button>`;
      else h += `<button class="btn" id="next">${i === qs.length - 1 ? 'See my results' : 'Next'}</button>`;
      h += `</div>`;
      root.innerHTML = h;

      root.querySelectorAll('.choice').forEach((b) =>
        b.addEventListener('click', () => {
          const k = b.dataset.k;
          if (q.type === 'multi') {
            const s = new Set((answers[i] && answers[i].v) || []);
            s.has(k) ? s.delete(k) : s.add(k);
            answers[i] = { v: [...s] };
          } else answers[i] = { v: k };
          render();
        })
      );
      const fv = $('#fillv', root);
      if (fv) fv.addEventListener('input', () => (answers[i] = { v: fv.value }));
      $('#prev', root).addEventListener('click', () => { i--; render(); });
      const chk = $('#check', root);
      if (chk) chk.addEventListener('click', () => { if (!answers[i]) answers[i] = { v: null }; answers[i].locked = true; render(); });
      const nx = $('#next', root);
      if (nx) nx.addEventListener('click', () => { if (i < qs.length - 1) { i++; render(); window.scrollTo(0, 0); } else finish(); });
    }

    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      if (timer) clearInterval(timer);
      const bySub = {};
      qs.forEach((q, n) => { const k = q.subtopic || 'Other'; bySub[k] = bySub[k] || { r: 0, t: 0 }; bySub[k].t++; if (isCorrect(q, answers[n] && answers[n].v)) bySub[k].r++; });
      const bySec = {};
      let right = 0;
      qs.forEach((q, n) => {
        const s = q.section || data.section || 'Total';
        bySec[s] = bySec[s] || { r: 0, t: 0 };
        bySec[s].t++;
        const ok = isCorrect(q, answers[n] && answers[n].v);
        if (ok) { bySec[s].r++; right++; }
      });
      const pct = Math.round((right / qs.length) * 100);
      track(mode === 'diagnostic' ? 'diagnostic_complete' : 'practice_complete', { score: pct });
      let h = `<h1>Your results</h1><div class="score-big">${pct}%</div><p>${right} of ${qs.length} correct.</p><div class="bars">`;
      let weakest = null;
      for (const [s, v] of Object.entries(bySec)) {
        const p = Math.round((v.r / v.t) * 100);
        if (!weakest || p < weakest.p) weakest = { s, p };
        h += `<div class="bar"><div class="qmeta"><span>${esc(s)}</span><span>${v.r}/${v.t} (${p}%)</span></div><div class="track"><div class="fill ${p < 50 ? 'low' : p < 75 ? 'mid' : ''}" style="width:${p}%"></div></div></div>`;
      }
      h += `</div>`;
      if (mode === 'exam') {
        h += `<h2>By topic</h2><div class="bars">`;
        for (const [s2, v] of Object.entries(bySub)) { const p2 = Math.round((v.r / v.t) * 100); h += `<div class="bar"><div class="qmeta"><span>${esc(s2)}</span><span>${v.r}/${v.t} (${p2}%)</span></div><div class="track"><div class="fill ${p2 < 50 ? 'low' : p2 < 75 ? 'mid' : ''}" style="width:${p2}%"></div></div></div>`; }
        h += `</div><p class="fine">Study the topics in red and orange first — the study guide in your PDF covers each one.</p>`;
        if (opts.nextLabel) h += `<button class="btn wide" id="nextsec">${esc(opts.nextLabel)}</button>`;
      }
      if (mode === 'diagnostic') {
        h += `<div class="offer"><h2 style="margin-top:0">Your weakest area right now: ${esc(weakest.s)}</h2>
          <p>This was only 20 questions. The real TEAS 7 has <strong>170 questions in 209 minutes</strong> — and according to ATI, about 4 in 10 test takers end up retaking it, paying the fee again ($110–$132) and waiting weeks for a new date.</p>
          <p>The full Practice Pack gives you <strong>2 complete timed exams</strong> with a score report by section and topic, every answer explained, a study guide and a day-by-day plan — so you can fix ${esc(weakest.s)} <em>before</em> test day, not after.</p>
          <p class="anchor">One retake: $110–$132</p>
          <p class="amount">$49 <span class="fine">one-time · instant access</span></p>
          <a class="btn wide big" href="${opts.checkout}" data-checkout>Get the full Practice Pack</a>
          <div class="guarantee"><strong>7-day money-back guarantee.</strong> If it's not for you, get every cent back. No questions asked.</div></div>`;
      }
      h += `<h2>Review your answers</h2>`;
      qs.forEach((q, n) => {
        const given = answers[n] && answers[n].v;
        const ok = isCorrect(q, given);
        h += `<details><summary>${ok ? '✅' : '❌'} Q${n + 1}. ${esc(q.stem.slice(0, 90))}${q.stem.length > 90 ? '…' : ''}</summary>
          <p>Your answer: ${esc(given == null || given === '' ? '—' : Array.isArray(given) ? given.join(', ') : given)} · Correct: ${esc(Array.isArray(q.answer) ? q.answer.join(', ') : q.answer)}</p><p>${esc(q.explanation)}</p></details>`;
      });
      root.innerHTML = h;
      window.scrollTo(0, 0);
      const ns = document.getElementById('nextsec');
      if (ns && opts.onNext) ns.addEventListener('click', () => opts.onNext({ right, total: qs.length }));
      if (opts.onFinish) opts.onFinish({ right, total: qs.length, section: data.section });
      root.querySelectorAll('[data-checkout]').forEach((a) => a.addEventListener('click', () => track('begin_checkout', { source: 'diagnostic' })));
    }
    render();
  };
})();
