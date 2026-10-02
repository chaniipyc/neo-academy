(function (global) {
  var COLLECTION = 'teachers';

  var SUBJECTS = [
    { key: 'math', label: '수학' },
    { key: 'english', label: '영어' }
  ];

  function getAll() {
    return db.collection(COLLECTION).get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) { list.push(doc.data()); });
      return list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    });
  }

  function getBySubject(subject) {
    return getAll().then(function (list) {
      return list.filter(function (t) { return t.subject === subject; });
    });
  }

  function getById(id) {
    return db.collection(COLLECTION).doc(id).get().then(function (doc) {
      return doc.exists ? doc.data() : null;
    });
  }

  function genId() {
    return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function add(name, subject) {
    name = (name || '').trim();
    if (!name) return Promise.resolve({ ok: false, message: '선생님 성함을 입력해 주세요.' });
    return getBySubject(subject).then(function (list) {
      var dup = list.some(function (t) { return t.name === name; });
      if (dup) return { ok: false, message: '같은 과목에 이미 등록된 선생님입니다.' };
      var teacher = { id: genId(), name: name, subject: subject, studentIds: [], createdAt: new Date().toISOString() };
      return db.collection(COLLECTION).doc(teacher.id).set(teacher).then(function () {
        return { ok: true, teacher: teacher };
      });
    });
  }

  function remove(id) {
    return db.collection(COLLECTION).doc(id).delete();
  }

  // 반별 관리와 같은 이유로, 담당 학생 명단은 선생님 문서 하나당 트랜잭션 한 번으로 고친다.
  function updateTeacher(id, mutator) {
    var ref = db.collection(COLLECTION).doc(id);
    return db.runTransaction(function (transaction) {
      return transaction.get(ref).then(function (doc) {
        if (!doc.exists) return null;
        var teacher = doc.data();
        if (!teacher.studentIds) teacher.studentIds = [];
        mutator(teacher);
        transaction.set(ref, teacher);
        return teacher;
      });
    });
  }

  function addStudents(id, studentIds) {
    return updateTeacher(id, function (teacher) {
      studentIds.forEach(function (sid) {
        if (teacher.studentIds.indexOf(sid) === -1) teacher.studentIds.push(sid);
      });
    });
  }

  function removeStudents(id, studentIds) {
    return updateTeacher(id, function (teacher) {
      teacher.studentIds = teacher.studentIds.filter(function (sid) { return studentIds.indexOf(sid) === -1; });
    });
  }

  global.Teachers = {
    SUBJECTS: SUBJECTS,
    getAll: getAll,
    getBySubject: getBySubject,
    getById: getById,
    add: add,
    remove: remove,
    addStudents: addStudents,
    removeStudents: removeStudents
  };
})(window);
