(function (global) {
  var COLLECTION = 'classes';

  function getAll() {
    return db.collection(COLLECTION).get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) { list.push(doc.data()); });
      return list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    });
  }

  function genId() {
    return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getById(id) {
    return db.collection(COLLECTION).doc(id).get().then(function (doc) {
      return doc.exists ? doc.data() : null;
    });
  }

  function getByName(name) {
    return db.collection(COLLECTION).where('name', '==', name).limit(1).get().then(function (snap) {
      return snap.empty ? null : snap.docs[0].data();
    });
  }

  function isCompleted(cls) {
    return cls.status === 'completed';
  }

  function getActive() {
    return getAll().then(function (list) { return list.filter(function (c) { return !isCompleted(c); }); });
  }

  function getCompleted() {
    return getAll().then(function (list) { return list.filter(isCompleted); });
  }

  function getClassNames() {
    return getActive().then(function (list) { return list.map(function (c) { return c.name; }); });
  }

  // 같은 반 문서를 동시에 여러 곳에서 고칠 수 있어서(예: 학생 여러 명을 한 번에 반에
  // 배정), 단순 읽기->수정->쓰기 대신 트랜잭션으로 감싼다. 트랜잭션은 충돌이 감지되면
  // 자동으로 다시 시도하므로, 동시에 여러 번 호출돼도 변경 내용이 서로 덮어써지지 않는다.
  function updateClass(classId, mutator) {
    var ref = db.collection(COLLECTION).doc(classId);
    return db.runTransaction(function (transaction) {
      return transaction.get(ref).then(function (doc) {
        if (!doc.exists) return { cls: null, result: null };
        var cls = doc.data();
        var result = mutator(cls);
        transaction.set(ref, cls);
        return { cls: cls, result: result };
      });
    }).then(function (outcome) {
      return outcome.result !== undefined ? outcome.result : outcome.cls;
    });
  }

  function add(name) {
    name = (name || '').trim();
    if (!name) return Promise.resolve({ ok: false, message: '반 이름을 입력해 주세요.' });

    return getByName(name).then(function (existing) {
      if (existing) return { ok: false, message: '이미 존재하는 반입니다.' };
      var cls = { id: genId(), name: name, studentIds: [], status: 'active', completedAt: null, completedStudentIds: [] };
      return db.collection(COLLECTION).doc(cls.id).set(cls).then(function () { return { ok: true, class: cls }; });
    });
  }

  function completeClass(classId) {
    return updateClass(classId, function (cls) {
      cls.completedStudentIds = cls.studentIds.slice();
      cls.studentIds = [];
      cls.status = 'completed';
      cls.completedAt = new Date().toISOString();
    });
  }

  function revertClass(classId) {
    return updateClass(classId, function (cls) {
      cls.studentIds = (cls.completedStudentIds || []).slice();
      cls.completedStudentIds = [];
      cls.status = 'active';
      cls.completedAt = null;
    });
  }

  function removeClass(classId) {
    return db.collection(COLLECTION).doc(classId).delete();
  }

  function addStudentToClass(classId, studentId) {
    return updateClass(classId, function (cls) {
      if (cls.studentIds.indexOf(studentId) === -1) {
        cls.studentIds.push(studentId);
      }
    });
  }

  function removeStudentFromClass(classId, studentId) {
    return updateClass(classId, function (cls) {
      var idx = cls.studentIds.indexOf(studentId);
      if (idx !== -1) cls.studentIds.splice(idx, 1);
    });
  }

  // 학생 여러 명을 한 반에 한꺼번에 배정/제외할 때(엑셀 붙여넣기, 선택 삭제 등) 쓴다.
  // 학생 수만큼 addStudentToClass를 따로따로 호출하면 같은 반 문서를 동시에 여러 번
  // 고치게 돼 트랜잭션 충돌이 심해지고, 충돌이 재시도 한도를 넘으면 일부는 반영되지
  // 않은 채 조용히 유실된다. 반 하나당 트랜잭션 1번으로 끝내면 이 문제가 아예 생기지 않는다.
  function addStudentsToClass(classId, studentIds) {
    return updateClass(classId, function (cls) {
      var existing = {};
      cls.studentIds.forEach(function (id) { existing[id] = true; });
      studentIds.forEach(function (id) {
        if (!existing[id]) {
          cls.studentIds.push(id);
          existing[id] = true;
        }
      });
    });
  }

  function removeStudentsFromClass(classId, studentIds) {
    return updateClass(classId, function (cls) {
      var remove = {};
      studentIds.forEach(function (id) { remove[id] = true; });
      cls.studentIds = cls.studentIds.filter(function (id) { return !remove[id]; });
    });
  }

  function rosterIds(cls) {
    if (!cls) return [];
    return isCompleted(cls) ? (cls.completedStudentIds || []) : (cls.studentIds || []);
  }

  // ---- Attendance ----
  function getAttendanceDates(classId) {
    return getById(classId).then(function (cls) {
      return cls && cls.attendanceDates ? cls.attendanceDates.slice() : [];
    });
  }

  function getAttendance(classId, date) {
    return getById(classId).then(function (cls) {
      return (cls && cls.attendance && cls.attendance[date]) || {};
    });
  }

  function bulkMarkAttendance(classId, date, status) {
    return updateClass(classId, function (cls) {
      if (!date) return;
      if (!cls.attendanceDates) cls.attendanceDates = [];
      if (!cls.attendance) cls.attendance = {};
      if (cls.attendanceDates.indexOf(date) === -1) {
        cls.attendanceDates.push(date);
        cls.attendanceDates.sort();
      }
      if (!cls.attendance[date]) cls.attendance[date] = {};
      rosterIds(cls).forEach(function (sid) { cls.attendance[date][sid] = status; });
    });
  }

  function addAttendanceDate(classId, date) {
    return updateClass(classId, function (cls) {
      if (!date) return;
      if (!cls.attendanceDates) cls.attendanceDates = [];
      if (!cls.attendance) cls.attendance = {};
      if (cls.attendanceDates.indexOf(date) === -1) {
        cls.attendanceDates.push(date);
        cls.attendanceDates.sort();
      }
      if (!cls.attendance[date]) cls.attendance[date] = {};
    });
  }

  function setAttendance(classId, date, studentId, status) {
    return updateClass(classId, function (cls) {
      if (!date) return;
      if (!cls.attendance) cls.attendance = {};
      if (!cls.attendance[date]) cls.attendance[date] = {};
      cls.attendance[date][studentId] = status;
    });
  }

  function removeAttendanceDate(classId, date) {
    return updateClass(classId, function (cls) {
      if (cls.attendanceDates) {
        cls.attendanceDates = cls.attendanceDates.filter(function (d) { return d !== date; });
      }
      if (cls.attendance && cls.attendance[date] !== undefined) {
        delete cls.attendance[date];
      }
    });
  }

  // ---- Tests ----
  function genExamId() {
    return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function getExams(classId) {
    return getById(classId).then(function (cls) {
      return cls && cls.exams ? cls.exams.slice() : [];
    });
  }

  function addExam(classId, date, maxScore, name) {
    var createdExam = null;
    return updateClass(classId, function (cls) {
      if (!date) return;
      if (!cls.exams) cls.exams = [];
      createdExam = { id: genExamId(), date: date, maxScore: maxScore, name: name || '', scores: {} };
      cls.exams.push(createdExam);
      cls.exams.sort(function (a, b) { return a.date.localeCompare(b.date); });
    }).then(function () {
      return createdExam;
    });
  }

  function removeExam(classId, examId) {
    return updateClass(classId, function (cls) {
      if (!cls.exams) return;
      cls.exams = cls.exams.filter(function (e) { return e.id !== examId; });
    });
  }

  function setExamName(classId, examId, name) {
    return updateClass(classId, function (cls) {
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return;
      exam.name = name;
    });
  }

  function setExamDate(classId, examId, date) {
    return updateClass(classId, function (cls) {
      if (!date) return;
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return;
      exam.date = date;
      cls.exams.sort(function (a, b) { return a.date.localeCompare(b.date); });
    });
  }

  function setExamMaxScore(classId, examId, maxScore) {
    return updateClass(classId, function (cls) {
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return;
      exam.maxScore = maxScore;
    });
  }

  function setExamScore(classId, examId, studentId, score) {
    return updateClass(classId, function (cls) {
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return;
      if (!exam.scores) exam.scores = {};
      if (score === null || score === '') {
        delete exam.scores[studentId];
      } else {
        exam.scores[studentId] = score;
      }
    });
  }

  global.Classes = {
    getAll: getAll,
    getActive: getActive,
    getCompleted: getCompleted,
    getById: getById,
    getByName: getByName,
    getClassNames: getClassNames,
    rosterIds: rosterIds,
    add: add,
    addStudentToClass: addStudentToClass,
    removeStudentFromClass: removeStudentFromClass,
    addStudentsToClass: addStudentsToClass,
    removeStudentsFromClass: removeStudentsFromClass,
    completeClass: completeClass,
    revertClass: revertClass,
    removeClass: removeClass,
    getAttendanceDates: getAttendanceDates,
    getAttendance: getAttendance,
    bulkMarkAttendance: bulkMarkAttendance,
    addAttendanceDate: addAttendanceDate,
    setAttendance: setAttendance,
    removeAttendanceDate: removeAttendanceDate,
    getExams: getExams,
    addExam: addExam,
    removeExam: removeExam,
    setExamDate: setExamDate,
    setExamName: setExamName,
    setExamMaxScore: setExamMaxScore,
    setExamScore: setExamScore
  };
})(window);
