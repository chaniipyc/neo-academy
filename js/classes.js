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

  function add(name) {
    name = (name || '').trim();
    if (!name) return Promise.resolve({ ok: false, message: '반 이름을 입력해 주세요.' });

    return getByName(name).then(function (existing) {
      if (existing) return { ok: false, message: '이미 존재하는 반입니다.' };
      var cls = { id: genId(), name: name, studentIds: [], status: 'active', completedAt: null, completedStudentIds: [] };
      return db.collection(COLLECTION).doc(cls.id).set(cls).then(function () { return { ok: true, class: cls }; });
    });
  }

  function saveClass(cls) {
    return db.collection(COLLECTION).doc(cls.id).set(cls).then(function () { return cls; });
  }

  function completeClass(classId) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      cls.completedStudentIds = cls.studentIds.slice();
      cls.studentIds = [];
      cls.status = 'completed';
      cls.completedAt = new Date().toISOString();
      return saveClass(cls);
    });
  }

  function revertClass(classId) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      cls.studentIds = (cls.completedStudentIds || []).slice();
      cls.completedStudentIds = [];
      cls.status = 'active';
      cls.completedAt = null;
      return saveClass(cls);
    });
  }

  function removeClass(classId) {
    return db.collection(COLLECTION).doc(classId).delete();
  }

  function addStudentToClass(classId, studentId) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      if (cls.studentIds.indexOf(studentId) === -1) {
        cls.studentIds.push(studentId);
        return saveClass(cls);
      }
      return cls;
    });
  }

  function removeStudentFromClass(classId, studentId) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      var idx = cls.studentIds.indexOf(studentId);
      if (idx !== -1) {
        cls.studentIds.splice(idx, 1);
        return saveClass(cls);
      }
      return cls;
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
    return getById(classId).then(function (cls) {
      if (!cls || !date) return null;
      if (!cls.attendanceDates) cls.attendanceDates = [];
      if (!cls.attendance) cls.attendance = {};
      if (cls.attendanceDates.indexOf(date) === -1) {
        cls.attendanceDates.push(date);
        cls.attendanceDates.sort();
      }
      if (!cls.attendance[date]) cls.attendance[date] = {};
      rosterIds(cls).forEach(function (sid) { cls.attendance[date][sid] = status; });
      return saveClass(cls);
    });
  }

  function addAttendanceDate(classId, date) {
    return getById(classId).then(function (cls) {
      if (!cls || !date) return null;
      if (!cls.attendanceDates) cls.attendanceDates = [];
      if (!cls.attendance) cls.attendance = {};
      if (cls.attendanceDates.indexOf(date) === -1) {
        cls.attendanceDates.push(date);
        cls.attendanceDates.sort();
      }
      if (!cls.attendance[date]) cls.attendance[date] = {};
      return saveClass(cls);
    });
  }

  function setAttendance(classId, date, studentId, status) {
    return getById(classId).then(function (cls) {
      if (!cls || !date) return null;
      if (!cls.attendance) cls.attendance = {};
      if (!cls.attendance[date]) cls.attendance[date] = {};
      cls.attendance[date][studentId] = status;
      return saveClass(cls);
    });
  }

  function removeAttendanceDate(classId, date) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      if (cls.attendanceDates) {
        cls.attendanceDates = cls.attendanceDates.filter(function (d) { return d !== date; });
      }
      if (cls.attendance && cls.attendance[date] !== undefined) {
        delete cls.attendance[date];
      }
      return saveClass(cls);
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
    return getById(classId).then(function (cls) {
      if (!cls || !date) return null;
      if (!cls.exams) cls.exams = [];
      var exam = { id: genExamId(), date: date, maxScore: maxScore, name: name || '', scores: {} };
      cls.exams.push(exam);
      cls.exams.sort(function (a, b) { return a.date.localeCompare(b.date); });
      return saveClass(cls).then(function () { return exam; });
    });
  }

  function removeExam(classId, examId) {
    return getById(classId).then(function (cls) {
      if (!cls || !cls.exams) return null;
      cls.exams = cls.exams.filter(function (e) { return e.id !== examId; });
      return saveClass(cls);
    });
  }

  function setExamName(classId, examId, name) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return null;
      exam.name = name;
      return saveClass(cls);
    });
  }

  function setExamDate(classId, examId, date) {
    return getById(classId).then(function (cls) {
      if (!cls || !date) return null;
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return null;
      exam.date = date;
      cls.exams.sort(function (a, b) { return a.date.localeCompare(b.date); });
      return saveClass(cls);
    });
  }

  function setExamMaxScore(classId, examId, maxScore) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return null;
      exam.maxScore = maxScore;
      return saveClass(cls);
    });
  }

  function setExamScore(classId, examId, studentId, score) {
    return getById(classId).then(function (cls) {
      if (!cls) return null;
      var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
      if (!exam) return null;
      if (!exam.scores) exam.scores = {};
      if (score === null || score === '') {
        delete exam.scores[studentId];
      } else {
        exam.scores[studentId] = score;
      }
      return saveClass(cls);
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
