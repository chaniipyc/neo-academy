(function (global) {
  var COLLECTION = 'admissions';
  var DOC_ID = 'board';

  function genId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function defaultBoard() {
    return { candidates: [], exams: [] };
  }

  function getBoard() {
    return db.collection(COLLECTION).doc(DOC_ID).get().then(function (doc) {
      return doc.exists ? doc.data() : defaultBoard();
    });
  }

  // 여러 명이 동시에 이름을 추가하거나 점수를 입력해도 서로 덮어쓰지 않도록
  // (반별 관리와 동일하게) 트랜잭션으로 감싼다. 문서가 아직 없으면 만들면서 시작한다.
  function updateBoard(mutator) {
    var ref = db.collection(COLLECTION).doc(DOC_ID);
    return db.runTransaction(function (transaction) {
      return transaction.get(ref).then(function (doc) {
        var board = doc.exists ? doc.data() : defaultBoard();
        var result = mutator(board);
        transaction.set(ref, board);
        return result !== undefined ? result : board;
      });
    });
  }

  function addCandidate(name) {
    name = (name || '').trim();
    if (!name) return Promise.resolve({ ok: false, message: '이름을 입력해 주세요.' });
    var created = null;
    return updateBoard(function (board) {
      created = { id: genId('a'), name: name, date: '' };
      board.candidates.push(created);
    }).then(function () { return { ok: true, candidate: created }; });
  }

  function removeCandidate(id) {
    return updateBoard(function (board) {
      board.candidates = board.candidates.filter(function (c) { return c.id !== id; });
    });
  }

  function setCandidateDate(id, date) {
    return updateBoard(function (board) {
      var c = board.candidates.filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      c.date = date;
    });
  }

  function addExam(name, maxScore) {
    name = (name || '').trim();
    if (!name) return Promise.resolve({ ok: false, message: '시험명을 입력해 주세요.' });
    var created = null;
    return updateBoard(function (board) {
      created = { id: genId('e'), name: name, maxScore: maxScore || 100, scores: {} };
      board.exams.push(created);
    }).then(function () { return { ok: true, exam: created }; });
  }

  function removeExam(examId) {
    return updateBoard(function (board) {
      board.exams = board.exams.filter(function (e) { return e.id !== examId; });
    });
  }

  function setExamName(examId, name) {
    return updateBoard(function (board) {
      var e = board.exams.filter(function (x) { return x.id === examId; })[0];
      if (!e) return;
      e.name = name;
    });
  }

  function setExamMaxScore(examId, maxScore) {
    return updateBoard(function (board) {
      var e = board.exams.filter(function (x) { return x.id === examId; })[0];
      if (!e) return;
      e.maxScore = maxScore;
    });
  }

  function setScore(examId, candidateId, score) {
    return updateBoard(function (board) {
      var e = board.exams.filter(function (x) { return x.id === examId; })[0];
      if (!e) return;
      if (!e.scores) e.scores = {};
      if (score === null || score === '') {
        delete e.scores[candidateId];
      } else {
        e.scores[candidateId] = score;
      }
    });
  }

  global.Admissions = {
    getBoard: getBoard,
    addCandidate: addCandidate,
    removeCandidate: removeCandidate,
    setCandidateDate: setCandidateDate,
    addExam: addExam,
    removeExam: removeExam,
    setExamName: setExamName,
    setExamMaxScore: setExamMaxScore,
    setScore: setScore
  };
})(window);
