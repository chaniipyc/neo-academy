(function () {
  var root = typeof SITE_ROOT !== 'undefined' ? SITE_ROOT : './';
  var active = typeof ACTIVE_CATEGORY !== 'undefined' ? ACTIVE_CATEGORY : null;
  var session = window.Auth ? window.Auth.getSession() : null;

  var categories = [
    {
      key: 'students',
      label: '학생 정보',
      items: [
        { label: '학생 정보', href: root + 'pages/students.html' }
      ]
    },
    {
      key: 'counsel',
      label: '상담',
      items: [
        { label: 'a', href: root + 'pages/counsel-a.html' },
        { label: 'b', href: root + 'pages/counsel-b.html' }
      ]
    },
    {
      key: 'class',
      label: '반별 관리',
      items: [
        { label: 'A', href: root + 'pages/class-a.html' },
        { label: 'B', href: root + 'pages/class-b.html' },
        { label: 'C', href: root + 'pages/class-c.html' },
        { label: 'D', href: root + 'pages/class-d.html' }
      ]
    }
  ];

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderAuthBar() {
    if (!session) {
      return '<a class="auth-link" href="' + root + 'login.html">로그인</a>';
    }

    var nameLabel = session.role === 'admin'
      ? escapeHtml(session.id) + ' (관리자)'
      : escapeHtml(session.id) + ' 선생님';

    var adminLink = session.role === 'admin'
      ? '<a class="auth-link" href="' + root + 'admin.html">관리자 페이지</a>'
      : '';

    return (
      '<span class="auth-name caption">' + nameLabel + '</span>' +
      adminLink +
      '<button type="button" class="auth-logout-btn" id="auth-logout-btn">로그아웃</button>'
    );
  }

  function renderHeader() {
    var mount = document.getElementById('site-header');
    if (!mount) return;

    var navItemsHtml = categories.map(function (cat) {
      var dropdownLinks = cat.items.map(function (item) {
        return '<a class="dropdown-link" href="' + item.href + '">' + item.label + '</a>';
      }).join('');

      var activeClass = active === cat.key ? ' is-active' : '';

      return (
        '<li class="nav-item">' +
          '<button type="button" class="nav-trigger' + activeClass + '">' + cat.label + '</button>' +
          '<div class="dropdown">' + dropdownLinks + '</div>' +
        '</li>'
      );
    }).join('');

    mount.innerHTML =
      '<header class="site-header">' +
        '<div class="header-top">' +
          '<div class="header-side"></div>' +
          '<a class="logo-link" href="' + root + 'index.html">' +
            '<img class="logo-img" src="' + root + 'assets/NEO_logo.png" alt="NEO ACADEMY">' +
          '</a>' +
          '<div class="header-side auth-bar">' + renderAuthBar() + '</div>' +
        '</div>' +
        '<nav class="main-nav">' +
          '<ul class="nav-list">' + navItemsHtml + '</ul>' +
        '</nav>' +
      '</header>';

    var logoutBtn = document.getElementById('auth-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        window.Auth.logout();
        location.href = root + 'index.html';
      });
    }

    if (!session) {
      var links = mount.querySelectorAll('.dropdown-link');
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function (e) {
          e.preventDefault();
          var goLogin = confirm('로그인 후 이용 가능한 기능입니다. 로그인 페이지로 이동할까요?');
          if (goLogin) {
            location.href = root + 'login.html';
          }
        });
      }
    }
  }

  function renderFooter() {
    var mount = document.getElementById('site-footer');
    if (!mount) return;

    mount.innerHTML =
      '<footer class="site-footer">' +
        '<p class="caption">© 2026 NEO ACADEMY. 원생관리 시스템.</p>' +
      '</footer>';
  }

  renderHeader();
  renderFooter();
})();
