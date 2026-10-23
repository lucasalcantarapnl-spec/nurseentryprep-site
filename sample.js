// Interactive 3-question sample on the landing page.
(function () {
  const box = document.getElementById('sampleq');
  if (!box) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  fetch('data/sample.json').then((r) => r.json()).then((qs) => {
    box.innerHTML = qs.map((q, i) => `<div class="sq card" data-i="${i}"><p class="fine">${esc(q.section)}</p><p class="stem">${esc(q.stem)}</p>` +
      Object.entries(q.choices).map(([k, v]) => `<button class="choice" data-k="${k}"><strong>${k}.</strong> ${esc(v)}</button>`).join('') +
      `<div class="explain" hidden></div></div>`).join('');
    box.querySelectorAll('.sq').forEach((card) => {
      const q = qs[+card.dataset.i];
      card.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
        card.querySelectorAll('.choice').forEach((x) => {
          x.disabled = true;
          if (x.dataset.k === q.answer) x.classList.add('right');
          else if (x === b) x.classList.add('wrong');
        });
        const ex = card.querySelector('.explain');
        ex.hidden = false;
        ex.innerHTML = `<strong>${b.dataset.k === q.answer ? 'Correct!' : 'Not quite.'}</strong> ${esc(q.explanation)}`;
        try { window.gtag && gtag('event', 'sample_answer', { section: q.section }); } catch (e) {}
      }));
    });
  });
})();
