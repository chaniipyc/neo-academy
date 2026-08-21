(function (global) {
  var KEY = 'neo_academy_classes';
  var SEED_FLAG_KEY = 'neo_academy_classes_seeded_v1';
  var DEFAULT_CLASS_NAMES = ['수학A', '수학B', '수학C', '국어A', '국어B', '국어C', '영어A', '영어B', '영어C'];

  function getAll() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    } catch (e) {
      return [];
    }
  }

  function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function genId() {
    return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getById(id) {
    return getAll().filter(function (c) { return c.id === id; })[0] || null;
  }

  function getByName(name) {
    return getAll().filter(function (c) { return c.name === name; })[0] || null;
  }

  function isCompleted(cls) {
    return cls.status === 'completed';
  }

  function getActive() {
    return getAll().filter(function (c) { return !isCompleted(c); });
  }

  function getCompleted() {
    return getAll().filter(isCompleted);
  }

  function getClassNames() {
    return getActive().map(function (c) { return c.name; });
  }

  function add(name) {
    name = (name || '').trim();
    if (!name) return { ok: false, message: '반 이름을 입력해 주세요.' };
    var list = getAll();
    if (list.some(function (c) { return c.name === name; })) {
      return { ok: false, message: '이미 존재하는 반입니다.' };
    }
    var cls = { id: genId(), name: name, studentIds: [], status: 'active', completedAt: null, completedStudentIds: [] };
    list.push(cls);
    saveAll(list);
    return { ok: true, class: cls };
  }

  function completeClass(classId) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    cls.completedStudentIds = cls.studentIds.slice();
    cls.studentIds = [];
    cls.status = 'completed';
    cls.completedAt = new Date().toISOString();
    saveAll(list);
  }

  function revertClass(classId) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    cls.studentIds = (cls.completedStudentIds || []).slice();
    cls.completedStudentIds = [];
    cls.status = 'active';
    cls.completedAt = null;
    saveAll(list);
  }

  function addStudentToClass(classId, studentId) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    if (cls.studentIds.indexOf(studentId) === -1) {
      cls.studentIds.push(studentId);
      saveAll(list);
    }
  }

  function removeStudentFromClass(classId, studentId) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    var idx = cls.studentIds.indexOf(studentId);
    if (idx !== -1) {
      cls.studentIds.splice(idx, 1);
      saveAll(list);
    }
  }

  function rosterIds(cls) {
    if (!cls) return [];
    return isCompleted(cls) ? (cls.completedStudentIds || []) : (cls.studentIds || []);
  }

  // ---- Attendance ----
  function getAttendanceDates(classId) {
    var cls = getById(classId);
    return cls && cls.attendanceDates ? cls.attendanceDates.slice() : [];
  }

  function getAttendance(classId, date) {
    var cls = getById(classId);
    return (cls && cls.attendance && cls.attendance[date]) || {};
  }

  function bulkMarkAttendance(classId, date, status) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls || !date) return;
    if (!cls.attendanceDates) cls.attendanceDates = [];
    if (!cls.attendance) cls.attendance = {};
    if (cls.attendanceDates.indexOf(date) === -1) {
      cls.attendanceDates.push(date);
      cls.attendanceDates.sort();
    }
    if (!cls.attendance[date]) cls.attendance[date] = {};
    rosterIds(cls).forEach(function (sid) { cls.attendance[date][sid] = status; });
    saveAll(list);
  }

  function addAttendanceDate(classId, date) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls || !date) return;
    if (!cls.attendanceDates) cls.attendanceDates = [];
    if (!cls.attendance) cls.attendance = {};
    if (cls.attendanceDates.indexOf(date) === -1) {
      cls.attendanceDates.push(date);
      cls.attendanceDates.sort();
    }
    if (!cls.attendance[date]) cls.attendance[date] = {};
    saveAll(list);
  }

  function setAttendance(classId, date, studentId, status) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls || !date) return;
    if (!cls.attendance) cls.attendance = {};
    if (!cls.attendance[date]) cls.attendance[date] = {};
    cls.attendance[date][studentId] = status;
    saveAll(list);
  }

  function removeAttendanceDate(classId, date) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    if (cls.attendanceDates) {
      cls.attendanceDates = cls.attendanceDates.filter(function (d) { return d !== date; });
    }
    if (cls.attendance && cls.attendance[date] !== undefined) {
      delete cls.attendance[date];
    }
    saveAll(list);
  }

  // ---- Tests ----
  function genExamId() {
    return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function getExams(classId) {
    var cls = getById(classId);
    return cls && cls.exams ? cls.exams.slice() : [];
  }

  function addExam(classId, date, maxScore, name) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls || !date) return null;
    if (!cls.exams) cls.exams = [];
    var exam = { id: genExamId(), date: date, maxScore: maxScore, name: name || '', scores: {} };
    cls.exams.push(exam);
    cls.exams.sort(function (a, b) { return a.date.localeCompare(b.date); });
    saveAll(list);
    return exam;
  }

  function removeExam(classId, examId) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls || !cls.exams) return;
    cls.exams = cls.exams.filter(function (e) { return e.id !== examId; });
    saveAll(list);
  }

  function setExamName(classId, examId, name) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
    if (!exam) return;
    exam.name = name;
    saveAll(list);
  }

  function setExamDate(classId, examId, date) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls || !date) return;
    var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
    if (!exam) return;
    exam.date = date;
    cls.exams.sort(function (a, b) { return a.date.localeCompare(b.date); });
    saveAll(list);
  }

  function setExamMaxScore(classId, examId, maxScore) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
    if (!exam) return;
    exam.maxScore = maxScore;
    saveAll(list);
  }

  function setExamScore(classId, examId, studentId, score) {
    var list = getAll();
    var cls = list.filter(function (c) { return c.id === classId; })[0];
    if (!cls) return;
    var exam = (cls.exams || []).filter(function (e) { return e.id === examId; })[0];
    if (!exam) return;
    if (!exam.scores) exam.scores = {};
    if (score === null || score === '') {
      delete exam.scores[studentId];
    } else {
      exam.scores[studentId] = score;
    }
    saveAll(list);
  }

  function seedFromStudents() {
    if (localStorage.getItem(SEED_FLAG_KEY)) return;
    if (getAll().length > 0) {
      localStorage.setItem(SEED_FLAG_KEY, '1');
      return;
    }
    var students = (global.Students ? global.Students.getAll() : []);
    var list = DEFAULT_CLASS_NAMES.map(function (name) {
      var studentIds = students.filter(function (s) {
        var names = (s.currentClasses || '').split(',').map(function (c) { return c.trim(); });
        return names.indexOf(name) !== -1;
      }).map(function (s) { return s.id; });
      return { id: genId(), name: name, studentIds: studentIds, status: 'active', completedAt: null, completedStudentIds: [] };
    });
    saveAll(list);
    localStorage.setItem(SEED_FLAG_KEY, '1');
  }

  seedFromStudents();

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
