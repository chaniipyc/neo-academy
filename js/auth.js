(function (global) {
  var EMAIL_SUFFIX = '@neoacademy.local';
  var MIN_PASSWORD_LENGTH = 8;
  var currentUser = null;
  var currentRole = null;
  var currentDisplayId = null;
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

  function uniqueEmailFor(id) {
    return id + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + EMAIL_SUFFIX;
  }

  // 로그인 ID로 실제 인증에 쓸 이메일을 찾는다. usernames 문서가 있으면 그 값을 쓰고
  // (계정 생성/재설정 때 기록됨), 없으면(맨 처음 콘솔에서 직접 만든 관리자 계정 등)
  // 예전 방식대로 "아이디+@neoacademy.local"로 추정한다.
  function resolveEmail(idOrEmail) {
    idOrEmail = (idOrEmail || '').trim();
    if (idOrEmail.indexOf('@') !== -1) return Promise.resolve(idOrEmail);
    return db.collection('usernames').doc(idOrEmail).get().then(function (doc) {
      return doc.exists ? doc.data().email : toEmail(idOrEmail);
    });
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      currentUser = null;
      currentRole = null;
      currentDisplayId = null;
      authReadyResolvers.forEach(function (resolve) { resolve(); });
      authReadyResolvers = [];
      return;
    }
    db.collection('users').doc(user.uid).get().then(function (doc) {
      currentUser = user;
      currentRole = doc.exists ? doc.data().role : null;
      currentDisplayId = doc.exists ? doc.data().displayId : idFromEmail(user.email);
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

  function weakPasswordMessage() {
    return '비밀번호는 ' + MIN_PASSWORD_LENGTH + '자 이상이어야 합니다.';
  }

  function addTeacher(id, password) {
    id = (id || '').trim();
    password = (password || '').trim();

    if (!id || !password) {
      return Promise.resolve({ ok: false, message: 'ID와 비밀번호를 모두 입력해 주세요.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return Promise.resolve({ ok: false, message: weakPasswordMessage() });
    }

    return db.collection('users').where('displayId', '==', id).get().then(function (snap) {
      if (!snap.empty) {
        return { ok: false, message: '이미 존재하는 ID입니다.' };
      }

      var secondaryApp = firebase.initializeApp(FIREBASE_CONFIG, 'Secondary-' + Date.now());
      var secondaryAuth = secondaryApp.auth();
      var email = uniqueEmailFor(id);

      return secondaryAuth.createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
          return db.collection('users').doc(cred.user.uid).set({
            role: 'teacher',
            displayId: id,
            createdAt: new Date().toISOString()
          }).then(function () {
            return db.collection('usernames').doc(id).set({ email: email });
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
            : (err.code === 'auth/weak-password' ? weakPasswordMessage() : '계정 생성에 실패했습니다.');
          return { ok: false, message: message };
        });
    });
  }

  function deleteTeacher(uid) {
    return db.collection('users').doc(uid).delete();
  }

  // 관리자가 선생님 비밀번호를 새로 지정. 예전 계정은 로그인 권한만 없애고(기존 삭제와 동일),
  // 같은 로그인 ID로 새 계정을 만들어 usernames 매핑을 새 이메일로 갈아끼운다.
  function resetTeacherPassword(id, newPassword) {
    id = (id || '').trim();
    newPassword = (newPassword || '').trim();

    if (!newPassword) {
      return Promise.resolve({ ok: false, message: '새 비밀번호를 입력해 주세요.' });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return Promise.resolve({ ok: false, message: weakPasswordMessage() });
    }

    return db.collection('users').where('displayId', '==', id).get().then(function (snap) {
      if (snap.empty) {
        return { ok: false, message: '해당 계정을 찾을 수 없습니다.' };
      }
      var oldDocs = snap.docs;
      var createdAt = oldDocs[0].data().createdAt || new Date().toISOString();

      var secondaryApp = firebase.initializeApp(FIREBASE_CONFIG, 'Secondary-' + Date.now());
      var secondaryAuth = secondaryApp.auth();
      var email = uniqueEmailFor(id);

      return secondaryAuth.createUserWithEmailAndPassword(email, newPassword)
        .then(function (cred) {
          return db.collection('users').doc(cred.user.uid).set({
            role: 'teacher',
            displayId: id,
            createdAt: createdAt
          });
        })
        .then(function () {
          return db.collection('usernames').doc(id).set({ email: email });
        })
        .then(function () {
          return Promise.all(oldDocs.map(function (d) { return d.ref.delete(); }));
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
          var message = err.code === 'auth/weak-password' ? weakPasswordMessage() : '비밀번호 재설정에 실패했습니다.';
          return { ok: false, message: message };
        });
    });
  }

  // 로그인한 사용자가 스스로 비밀번호 변경 (현재 비밀번호 확인 필요)
  function changePassword(currentPassword, newPassword) {
    newPassword = (newPassword || '').trim();
    if (!currentPassword || !newPassword) {
      return Promise.resolve({ ok: false, message: '현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.' });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return Promise.resolve({ ok: false, message: weakPasswordMessage() });
    }

    var user = auth.currentUser;
    if (!user) return Promise.resolve({ ok: false, message: '로그인 상태가 아닙니다.' });

    var credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    return user.reauthenticateWithCredential(credential)
      .then(function () {
        return user.updatePassword(newPassword);
      })
      .then(function () {
        return { ok: true };
      })
      .catch(function (err) {
        var message = (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
          ? '현재 비밀번호가 올바르지 않습니다.'
          : (err.code === 'auth/weak-password' ? weakPasswordMessage() : '비밀번호 변경에 실패했습니다.');
        return { ok: false, message: message };
      });
  }

  function getSession() {
    if (!currentUser || !currentRole) return null;
    return { role: currentRole, id: currentDisplayId || idFromEmail(currentUser.email), uid: currentUser.uid };
  }

  function logout() {
    return auth.signOut();
  }

  function login(idOrEmail, password) {
    return resolveEmail(idOrEmail)
      .then(function (email) {
        return auth.signInWithEmailAndPassword(email, password);
      })
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
        currentDisplayId = doc.data().displayId;
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
    minPasswordLength: MIN_PASSWORD_LENGTH,
    getTeachers: getTeachers,
    addTeacher: addTeacher,
    deleteTeacher: deleteTeacher,
    resetTeacherPassword: resetTeacherPassword,
    changePassword: changePassword,
    getSession: getSession,
    login: login,
    logout: logout,
    requireLogin: requireLogin,
    requireAdmin: requireAdmin,
    redirectIfLoggedIn: redirectIfLoggedIn
  };
})(window);
