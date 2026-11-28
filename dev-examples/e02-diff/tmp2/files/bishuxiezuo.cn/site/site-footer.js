(function () {
  'use strict';

  function language() {
    if (window.NBSite) return window.NBSite.publicLanguage();
    try {
      return (localStorage.getItem('lf_lang') || localStorage.getItem('lf_clang') || 'zh') === 'en' ? 'en' : 'zh';
    } catch (_error) { return 'zh'; }
  }

  function copy(key, lang) {
    var text = {
      zh: {
        tag: '为长篇连载而生的 AI 辅助创作平台。世界自洽地生长，而你始终执笔。',
        product: '产品', world: '世界状态机', pricing: '定价', tools: '免费工具', roadmap: '开发计划',
        service: '服务说明', docs: '使用文档', billing: '购买与退款', community: '社群与联系',
        company: '公司与规则', about: '关于我们', terms: '服务条款', privacy: '隐私政策', prefs: '访问统计偏好',
        rights: '© 2026 观微致远（青岛）数字科技有限公司 · 保留所有权利'
      },
      en: {
        tag: 'An AI-assisted creation platform built for long-form serial fiction. The world grows coherently while you hold the pen.',
        product: 'Product', world: 'World Engine', pricing: 'Pricing', tools: 'Free Tools', roadmap: 'Roadmap',
        service: 'Service information', docs: 'Docs', billing: 'Purchase & Refunds', community: 'Community & Contact',
        company: 'Company & Policies', about: 'About', terms: 'Terms of Service', privacy: 'Privacy Policy', prefs: 'Analytics Preferences',
        rights: '© 2026 Novelbuilt. All rights reserved.'
      }
    };
    return text[lang][key];
  }

  function render(root) {
    var lang = language();
    root.classList.add('site-footer');
    root.innerHTML = '<div class="wrap"><div class="foot-grid">'
      + '<div class="foot-brand"><a class="brand" href="home.html"><span class="cn">' + (lang === 'en' ? 'Novelbuilt' : '笔枢写作') + '</span>' + (lang === 'en' ? '' : '<span class="en">Novelbuilt</span>') + '</a><p>' + copy('tag', lang) + '</p></div>'
      + '<div><h5>' + copy('product', lang) + '</h5><a href="world-state.html">' + copy('world', lang) + '</a><a href="pricing.html">' + copy('pricing', lang) + '</a><a href="tools.html">' + copy('tools', lang) + '</a><a href="roadmap.html">' + copy('roadmap', lang) + '</a></div>'
      + '<div><h5>' + copy('service', lang) + '</h5><a href="docs.html">' + copy('docs', lang) + '</a><a href="billing-policy.html">' + copy('billing', lang) + '</a><a href="community.html">' + copy('community', lang) + '</a></div>'
      + '<div><h5>' + copy('company', lang) + '</h5><a href="about.html">' + copy('about', lang) + '</a><a href="terms.html">' + copy('terms', lang) + '</a><a href="privacy.html">' + copy('privacy', lang) + '</a><button class="foot-link-button" type="button" data-privacy-preferences>' + copy('prefs', lang) + '</button></div>'
      + '</div><div class="foot-bot"><div class="foot-filing"><span>' + copy('rights', lang) + '</span>' + (lang === 'en' ? '' : '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鲁ICP备2026032348号-2</a><a href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37021202001888" target="_blank" rel="noopener noreferrer">鲁公网安备37021202001888号</a>') + '</div><span class="motto">Forge worlds that remember.</span></div></div>';
    var preferences = root.querySelector('[data-privacy-preferences]');
    if (preferences) preferences.addEventListener('click', function () {
      if (window.LFPrivacy) window.LFPrivacy.open();
    });
  }

  function mount() {
    var root = document.getElementById('site-footer');
    if (!root) return;
    render(root);
    window.addEventListener('storage', function (event) {
      if (event.key === 'lf_lang' || event.key === 'lf_clang') render(root);
    });
    document.addEventListener('click', function (event) {
      if (event.target.closest('#langBtn')) window.setTimeout(function () { render(root); }, 0);
    });
  }

  window.LFSiteFooter = { mount: mount };
  mount();
}());
