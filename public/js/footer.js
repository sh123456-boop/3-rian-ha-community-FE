// File: public/js/footer.js
document.addEventListener('DOMContentLoaded', async () => {
  const host = document.getElementById('footer-placeholder');
  if (!host) return;

  try {
    const res = await fetch('/includes/footer.html', { headers: { 'Accept': 'text/html' } });
    host.innerHTML = await res.text();

    const termsLink = host.querySelector('#footer-terms-link');
    const privacyLink = host.querySelector('#footer-privacy-link');
    if (typeof window.buildApiUrl === 'function') {
      if (termsLink) termsLink.href = window.buildApiUrl('/v1/terms');
      if (privacyLink) privacyLink.href = window.buildApiUrl('/v1/privacy');
    }
  } catch (e) {
    console.error('Footer load failed:', e);
    return;
  }

  // 페이지 하단 안전 여백 확보(겹침 방지)
  document.body.classList.add('has-back-to-top-pad');

  // 맨 위로 버튼 동작
  const upBtn = document.getElementById('back-to-top');
  if (!upBtn) return;

  const toggleUpBtn = () => {
    if (window.scrollY > 200) upBtn.removeAttribute('hidden');
    else upBtn.setAttribute('hidden', '');
  };

  window.addEventListener('scroll', toggleUpBtn, { passive: true });
  toggleUpBtn();

  upBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
