// Checkout link + click tracking. CHECKOUT_URL is set once the Hotmart product exists.
window.CHECKOUT_URL = 'https://pay.hotmart.com/X108135579B';
document.querySelectorAll('[data-checkout]').forEach(function (a) {
  a.href = window.CHECKOUT_URL;
  a.addEventListener('click', function () { try { window.gtag && gtag('event', 'begin_checkout', { source: 'page' }); } catch (e) {} });
});
