/**
 * ============================================================
 * 页面渲染 + 交互逻辑（一般不需要改这个文件）
 * ============================================================
 * 职责：
 *   1. 读取 js/config.js 里的内容配置
 *   2. 按固定模板渲染成与原始页面完全一致的 DOM
 *   3. 绑定 3 个交互：导航高亮 / 滚动定位 / 一键复制
 *
 * 改内容 → 去改 js/config.js
 * 改样式 → 去改 css/style.css
 * ============================================================
 */
(function () {
  'use strict';

  var C = window.PRICE_CONFIG;

  /* ---------------- 渲染模板 ---------------- */

  function renderNav() {
    var links = C.nav.map(function (n) {
      var cls = n.active ? ' class="active"' : '';
      return '<a href="#' + n.id + '"' + cls + '>' + n.label + '</a>';
    }).join('\n  ');
    return '<div class="nav">\n  ' + links + '\n</div>';
  }

  function renderHeader() {
    return '<div class="header">\n' +
      '  <h1>' + C.brand.title + ' · <span>' + C.brand.sub + '</span></h1>\n' +
      '  <p>' + C.brand.slogan + '</p>\n' +
      '  <div class="tagline">' + C.brand.tagline + '</div>\n' +
      '</div>';
  }

  function renderSectionTitle(badgeCls, badgeText, title) {
    return '<div class="section-title"><span class="badge ' + badgeCls + '">' + badgeText + '</span> ' + title + '</div>';
  }

  /** 免费资源区：可点击跳转的外链卡片（链接由 config.js 管理） */
  function renderResources() {
    var R = C.freeResources;
    if (!R || !R.items || !R.items.length) return '';
    var cards = R.items.map(function (it) {
      if (it.show === false) return '';
      var target = it.newWindow ? ' target="_blank" rel="noopener noreferrer"' : '';
      var btn = it.btnText ? ' <span class="res-btn">' + it.btnText + '</span>' : '';
      return '<a class="res-card" href="' + it.url + '"' + target + '>' +
        '<div class="res-body">' +
        '<div class="res-name">' + it.name + '</div>' +
        '<div class="res-desc">' + (it.desc || '') + '</div>' +
        '</div>' +
        btn +
        '</a>';
    }).filter(function (x) { return x !== ''; });
    if (!cards.length) return '';
    return '<div class="section" id="resources">\n' +
      '  ' + renderSectionTitle('badge-free', R.badge || '免费', R.title || '免费资源') + '\n' +
      (R.subtitle ? '  <div class="res-subtitle">' + R.subtitle + '</div>\n' : '') +
      '  <div class="res-grid">\n    ' + cards.join('\n    ') + '\n  </div>\n' +
      '</div>';
  }

  function renderFree() {
    var items = C.free.items.map(function (it) {
      return '<div class="free-item"><span class="dot"></span><span class="name">' + it.name + '</span><span class="tag">' + C.free.itemTag + '</span></div>';
    }).join('\n    ');
    return '<div class="section" id="free">\n' +
      '  ' + renderSectionTitle('badge-free', C.free.badge, C.free.title) + '\n' +
      '  <div class="free-grid">\n    ' + items + '\n  </div>\n' +
      '</div>';
  }

  function renderSingle() {
    var items = C.single.items.map(function (it) {
      var right = it.price !== undefined && it.price !== null && it.price !== ''
        ? '<div class="price">' + it.price + '</div>'
        : '<span class="vb">' + it.vb + '</span>';
      return '<div class="item"><div class="left"><span class="num">' + it.num + '</span><span class="name">' + it.name + '</span></div>' + right + '</div>';
    }).join('\n    ');
    return '<div class="section" id="single">\n' +
      '  ' + renderSectionTitle('badge-item', C.single.badge, C.single.title) + '\n' +
      '  <div class="items">\n    ' + items + '\n  </div>\n' +
      '</div>';
  }

  function renderVip() {
    var feats = C.vip.features.map(function (f) {
      return '<div class="f">' + f + '</div>';
    }).join('\n      ');
    return '<div class="section" id="vip">\n' +
      '  ' + renderSectionTitle('badge-hot', C.vip.badge, C.vip.title) + '\n' +
      '  <div class="vip-wrap">\n' +
      '    <div class="vip-left">\n' +
      '      <h2>' + C.vip.name + ' <small>' + C.vip.sub + '</small></h2>\n' +
      '      <div class="price-big">' + C.vip.price + ' <small>' + C.vip.priceUnit + '</small></div>\n' +
      '      <div class="note">' + C.vip.note + '</div>\n' +
      '      <div class="slogan-box">\n' +
      '        <strong>' + C.vip.slogan + '</strong><br>\n' +
      '        ' + C.vip.sloganDetail + '\n' +
      '      </div>\n' +
      '    </div>\n' +
      '    <div class="vip-right">\n      ' + feats + '\n    </div>\n' +
      '  </div>\n' +
      '</div>';
  }

  function renderPremium() {
    var stats = C.premium.stats.map(function (s) {
      return '<span class="pi-stat"><strong>' + s.num + '</strong> ' + s.label + '</span>';
    }).join('\n        ');

    var cards = C.premium.cards.map(function (c) {
      var cls = c.rec ? ' class="card rec"' : ' class="card"';
      var feats = c.features.map(function (f) {
        var html = f.hl ? '<span class="hl">' + f.hl + '</span> ' + f.text : f.text;
        return '<li>' + html + '</li>';
      }).join('\n          ');
      return '<div' + cls + '>\n' +
        '      <div class="card-hd">\n' +
        '        <h3>' + c.name + '</h3>\n' +
        '        <div class="sub">' + c.sub + '</div>\n' +
        '        <div class="limit">' + c.limit + '</div>\n' +
        '      </div>\n' +
        '      <div class="card-p"><div class="p">' + c.price + ' <small>' + c.unit + '</small></div></div>\n' +
        '      <div class="card-bd">\n        <ul>\n          ' + feats + '\n        </ul>\n      </div>\n' +
        '    </div>';
    }).join('\n    ');

    return '<div class="section" id="premium">\n' +
      '  ' + renderSectionTitle('badge-premium', C.premium.badge, C.premium.title) + '\n' +
      '  <div class="premium-intro">\n' +
      '    <div class="pi-avatar">' + C.premium.avatar + '</div>\n' +
      '    <div class="pi-info">\n' +
      '      <div class="pi-name">' + C.premium.name + ' <span class="pi-tag">' + C.premium.tag + '</span></div>\n' +
      '      <div class="pi-stats">\n        ' + stats + '\n      </div>\n' +
      '      <div class="pi-desc">' + C.premium.desc + '</div>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '  <div class="card-grid">\n    ' + cards + '\n  </div>\n' +
      '</div>';
  }

  function renderCompare() {
    // 市场价分组
    var groupsHtml = C.compare.groups.map(function (g) {
      var list = g.items.map(function (it) {
        var cls = it.mark ? ' class="p-item ' + it.mark + '"' : ' class="p-item"';
        return '<div' + cls + '><span class="pn">' + it.name + '</span><span class="pp">' + it.price + '</span></div>';
      }).join('\n    ');
      return '  <div class="section-sub">' + g.icon + ' ' + g.title + '</div>\n' +
        '  <div class="price-list">\n    ' + list + '\n  </div>';
    }).join('\n\n  ');

    // 自己的价格高亮块
    var oursHtml = C.compare.ours.map(function (o, i) {
      var boxStyle = i > 0 ? ' style="margin-top:6px;border-color:#636e72;"' : '';
      var nameStyle = o.small ? ' style="font-size:13px;"' : '';
      var priceStyle = o.small ? ' style="font-size:16px;"' : '';
      var noteHtml = o.note ? '<div class="mj-note">' + o.note + '</div>' : '';
      return '  <div class="mj-box"' + boxStyle + '>\n' +
        '    <div class="mj-box-left">\n' +
        '      <div class="mj-name"' + nameStyle + '>' + o.name + '</div>\n' +
        '      <div class="mj-features">' + o.features + '</div>\n' +
        '    </div>\n' +
        '    <div class="mj-box-right">\n' +
        '      <div class="mj-price"' + priceStyle + '>' + o.price + '</div>\n' +
        (noteHtml ? '      ' + noteHtml + '\n' : '') +
        '    </div>\n' +
        '  </div>';
    }).join('\n');

    // 统计
    var statsHtml = C.compare.stats.map(function (s) {
      return '    <div class="s-item">\n      <div class="s-num">' + s.num + '</div>\n      <div class="s-label">' + s.label + '</div>\n    </div>';
    }).join('\n');

    return '<div class="section" id="compare">\n' +
      '  ' + renderSectionTitle('badge-compare', C.compare.badge, C.compare.title) + '\n\n' +
      groupsHtml + '\n\n' +
      '  <div class="divider-line"></div>\n\n' +
      '  <div class="section-sub" style="color:#e17055;">' + C.compare.oursTitle + '</div>\n' +
      oursHtml + '\n\n' +
      '  <div class="stats-row">\n' + statsHtml + '\n  </div>\n\n' +
      '  <div class="conclusion-box">\n' +
      '    <div class="cl-big">' + C.compare.conclusion.market + ' <span>' + C.compare.conclusion.sep + '</span> ' + C.compare.conclusion.ours + '</div>\n' +
      '    <div class="cl-sub">' + C.compare.conclusion.sub + '</div>\n' +
      '  </div>\n\n' +
      '  <div class="source">' + C.compare.source + '</div>\n' +
      '  <div class="copy-toast"></div>\n' +
      '</div>';
  }

  function renderBottom() {
    return '<div class="bottom-note">\n' +
      '  ' + C.bottomNote + '\n' +
      '</div>\n\n' +
      '<div class="case-link">\n' +
      '  <a href="' + C.caseLink.url + '" target="_blank" rel="noopener">\n' +
      '    ' + C.caseLink.text + '\n' +
      '  </a>\n' +
      '</div>';
  }

  function renderContact() {
    var parts = C.contact.items.map(function (it) {
      var cv;
      if (it.copy) {
        cv = '<span class="cv copy-btn" data-copy="' + it.value + '">' + it.value + ' <span class="copy-hint">点击复制</span></span>';
      } else {
        cv = '<span class="cv">' + it.value + '</span>';
      }
      return '<div class="contact-item"><span class="cl">' + it.label + '</span>' + cv + '</div>';
    });
    var html = parts.map(function (p, i) {
      return i > 0 ? '<div class="contact-divider"></div>\n  ' + p : '  ' + p;
    }).join('\n  ');
    return '<div class="contact-bar">\n' + html + '\n</div>';
  }

  function render() {
    var html = [
      renderNav(),
      renderHeader(),
      renderResources(),
      renderFree(),
      renderSingle(),
      renderVip(),
      renderPremium(),
      renderCompare(),
      renderBottom(),
      renderContact(),
      '<div class="footer">\n  ' + C.footer + '\n</div>'
    ].join('\n\n');
    document.getElementById('app').innerHTML = html;
  }

  /* ---------------- 交互（与原版一致） ---------------- */

  // ① 导航点击切换高亮
  function initNavClick() {
    var links = document.querySelectorAll('.nav a');
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        links.forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
      });
    });
  }

  // ② 滚动时高亮当前所在模块对应的导航项
  function initScrollSpy() {
    window.addEventListener('scroll', function () {
      var sections = document.querySelectorAll('.section');
      var navLinks = document.querySelectorAll('.nav a');
      var current = '';
      sections.forEach(function (s) {
        var top = s.offsetTop - 80;
        if (window.scrollY >= top) { current = s.id; }
      });
      navLinks.forEach(function (l) {
        l.classList.remove('active');
        if (l.getAttribute('href') === '#' + current) { l.classList.add('active'); }
      });
    });
  }

  // ③ 点击复制微信号/手机号 + toast 提示
  function initCopy() {
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = this.getAttribute('data-copy');
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        var toast = document.querySelector('.copy-toast') || (function () {
          var el = document.createElement('div');
          el.className = 'copy-toast';
          document.body.appendChild(el);
          return el;
        })();
        toast.textContent = '已复制: ' + text;
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 2000);
      });
    });
  }

  /* ---------------- 启动 ---------------- */

  document.title = C.pageTitle;
  render();
  initNavClick();
  initScrollSpy();
  initCopy();
})();
