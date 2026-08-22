(function (global) {
  var EMAIL_SUFFIX = '@neoacademy.local';
  var currentUser = null;
  var currentRole = null;
  var authReadyResolvers = [];
  var authReady = new Promise(function (resolve) { authReadyResolvers.push(resolve); });

  function toEmail(idOrEmail) {
    idOrEmail = (idOrEmail || '').trim();
    return idOrEmail.indexOf('@') !== -1 ? idOrEmail : idOrEmail + EMAIL_SUFFIX;
  }

  function idFromEmail(email) {
    var idx = (email || '').indexOf(EMAIL_SUFFIX);
    return idx !== -1 ? email.slice(0, idx) : email;
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      currentUser = null;
      currentRole = null;
      authReadyResolvers.forEach(function (resolve) { resolve(); });
      authReadyResolvers = [];
      return;
    }
    db.collection('users').doc(user.uid).get().then(function (doc) {
      currentUser = user;
      currentRole = doc.exists ? doc.data().role : null;
      authReadyResolvers.forEach(function (resolve) { resolve(); });
      authReadyResolvers = [];
    });
  });

  function getTeachers() {
    return db.collection('users').where('role', '==', 'teacher').get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) {
        var data = doc.data();
        list.push({ id: data.displayId, createdAt: data.createdAt, uid: doc.id });
      });
      list.sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); });
      return list;
    });
  }

  function addTeacher(id, password) {
    id = (id || '').trim();
    password = (password || '').trim();

    if (!id || !password) {
      return Promise.resolve({ ok: false, message: 'ID와 비밀번호를 모두 입력해 주세요.' });
    }

    return db.collection('users').where('displayId', '==', id).get().then(function (snap) {
      if (!snap.empty) {
        return { ok: false, message: '이미 존재하는 ID입니다.' };
      }

      var secondaryApp = firebase.initializeApp(FIREBASE_CONFIG, 'Secondary-' + Date.now());
      var secondaryAuth = secondaryApp.auth();

      return secondaryAuth.createUserWithEmailAndPassword(toEmail(id), password)
        .then(function (cred) {
          return db.collection('users').doc(cred.user.uid).set({
            role: 'teacher',
            displayId: id,
            createdAt: new Date().toISOString()
          });
        })
        .then(function () {
          return secondaryAuth.signOut();
        })
        .then(function () {
          return secondaryApp.delete();
        })
        .then(function () {
          return { ok: true };
        })
        .catch(function (err) {
          var message = err.code === 'auth/email-already-in-use'
            ? '이미 존재하는 ID입니다.'
            : (err.code === 'auth/weak-password' ? '비밀번호는 6자 이상이어야 합니다.' : '계정 생성에 실패했습니다.');
          return { ok: false, message: message };
        });
    });
  }

  function deleteTeacher(uid) {
    return db.collection('users').doc(uid).delete();
  }

  function getSession() {
    if (!currentUser || !currentRole) return null;
    return { role: currentRole, id: idFromEmail(currentUser.email), uid: currentUser.uid };
  }

  function logout() {
    return auth.signOut();
  }

  function login(idOrEmail, password) {
    return auth.signInWithEmailAndPassword(toEmail(idOrEmail), password)
      .then(function (cred) {
        return db.collection('users').doc(cred.user.uid).get();
      })
      .then(function (doc) {
        if (!doc.exists) {
          return auth.signOut().then(function () {
            return { ok: false, message: '계정 권한 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.' };
          });
        }
        currentRole = doc.data().role;
        return { ok: true, role: currentRole };
      })
      .catch(function () {
        return { ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
      });
  }

  function requireLogin(loginUrl) {
    return authReady.then(function () {
      if (!getSession()) {
        location.replace(loginUrl);
        return new Promise(function () {});
      }
    });
  }

  function requireAdmin(loginUrl) {
    return authReady.then(function () {
      var session = getSession();
      if (!session || session.role !== 'admin') {
        location.replace(loginUrl);
        return new Promise(function () {});
      }
    });
  }

  function redirectIfLoggedIn(root) {
    return authReady.then(function () {
      var session = getSession();
      if (session) {
        location.replace(root + (session.role === 'admin' ? 'admin.html' : 'index.html'));
        return new Promise(function () {});
      }
    });
  }

  global.Auth = {
    ready: function () { return authReady; },
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
