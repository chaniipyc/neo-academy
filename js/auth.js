(function (global) {
  var ADMIN_ID = 'adminchanii';
  var ADMIN_PASSWORD = 'wldud00100';
  var TEACHERS_KEY = 'neo_academy_teachers';
  var SESSION_KEY = 'neo_academy_session';

  function getTeachers() {
    try {
      var raw = localStorage.getItem(TEACHERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveTeachers(list) {
    localStorage.setItem(TEACHERS_KEY, JSON.stringify(list));
  }

  function addTeacher(id, password) {
    id = (id || '').trim();
    password = (password || '').trim();

    if (!id || !password) {
      return { ok: false, message: 'ID와 비밀번호를 모두 입력해 주세요.' };
    }
    if (id === ADMIN_ID) {
      return { ok: false, message: '관리자 계정과 동일한 ID는 사용할 수 없습니다.' };
    }

    var teachers = getTeachers();
    if (teachers.some(function (t) { return t.id === id; })) {
      return { ok: false, message: '이미 존재하는 ID입니다.' };
    }

    teachers.push({ id: id, password: password, createdAt: new Date().toISOString() });
    saveTeachers(teachers);
    return { ok: true };
  }

  function deleteTeacher(id) {
    saveTeachers(getTeachers().filter(function (t) { return t.id !== id; }));
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function login(id, password) {
    id = (id || '').trim();
    password = (password || '').trim();

    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
      setSession({ role: 'admin', id: id });
      return { ok: true, role: 'admin' };
    }

    var teacher = getTeachers().filter(function (t) { return t.id === id; })[0];
    if (teacher && teacher.password === password) {
      setSession({ role: 'teacher', id: id });
      return { ok: true, role: 'teacher' };
    }

    return { ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  function requireLogin(loginUrl) {
    if (!getSession()) {
      location.replace(loginUrl);
    }
  }

  function requireAdmin(loginUrl) {
    var session = getSession();
    if (!session || session.role !== 'admin') {
      location.replace(loginUrl);
    }
  }

  function redirectIfLoggedIn(root) {
    var session = getSession();
    if (session) {
      location.replace(root + (session.role === 'admin' ? 'admin.html' : 'index.html'));
    }
  }

  global.Auth = {
    getTeachers: getTeachers,
    addTeacher: addTeacher,
    deleteTeacher: deleteTeacher,
    getSession: getSession,
    login: login,
    logout: logout,
    requireLogin: requireLogin,
    requireAdmin: requireAdmin,
    redirectIfLoggedIn: redirectIfLoggedIn
  };
})(window);
