// Checkout link + click tracking (Google Ads secondary conversion "Clique no checkout").
window.CHECKOUT_URL = 'https://pay.hotmart.com/X108135579B';
window.trackCheckout = function (source) {
  try {
    if (window.gtag) {
      gtag('event', 'conversion', { send_to: 'AW-18529758132/bj2ECLnZ-aYdELTX1oNF', transport_type: 'beacon' });
      gtag('event', 'begin_checkout', { source: source || 'page' });
    }
  } catch (e) {}
};
document.querySelectorAll('[data-checkout]').forEach(function (a) {
  a.href = window.CHECKOUT_URL;
  a.addEventListener('click', function () { window.trackCheckout('page'); });
});
