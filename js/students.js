(function (global) {
  var COLLECTION = 'students';

  function fetchAll() {
    return db.collection(COLLECTION).get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) { list.push(doc.data()); });
      return list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    });
  }

  // 삭제된 학생(deletedAt이 있는 문서)은 삭제된 학생 목록에서만 보이고, 나머지 모든 화면에서는 빠진다.
  function getAll() {
    return fetchAll().then(function (list) { return list.filter(function (s) { return !s.deletedAt; }); });
  }

  function getDeleted() {
    return fetchAll().then(function (list) {
      return list.filter(function (s) { return s.deletedAt; })
        .sort(function (a, b) { return b.deletedAt.localeCompare(a.deletedAt); });
    });
  }

  // classIdsById: { studentId: [삭제 시점에 빠진 반 id들] } — 복원할 때 그 반들로 되돌려 넣는다.
  function markDeleted(classIdsById) {
    var ids = Object.keys(classIdsById);
    var now = new Date().toISOString();
    var chunks = [];
    for (var i = 0; i < ids.length; i += 400) chunks.push(ids.slice(i, i + 400));
    return chunks.reduce(function (chain, chunk) {
      return chain.then(function () {
        var batch = db.batch();
        chunk.forEach(function (id) {
          batch.update(db.collection(COLLECTION).doc(id), { deletedAt: now, deletedClassIds: classIdsById[id] });
        });
        return batch.commit();
      });
    }, Promise.resolve());
  }

  function unmarkDeleted(id) {
    var del = firebase.firestore.FieldValue.delete();
    return db.collection(COLLECTION).doc(id).update({ deletedAt: del, deletedClassIds: del });
  }

  var FIELD_ORDER = [
    'name', 'school', 'grade', 'studentPhone', 'parentPhone',
    'address', 'currentClasses', 'classHistory', 'notes',
    'registeredAt', 'division', 'homeroom', 'classDays', 'tuition'
  ];

  var PASTE_FIELD_ORDER = [
    'registeredAt', 'division', 'name', 'school', 'address',
    'grade', 'homeroom', 'classDays', 'studentPhone', 'parentPhone', 'currentClasses', 'tuition'
  ];

  function genId(seed) {
    return 's_' + Date.now() + '_' + seed + '_' + Math.random().toString(36).slice(2, 7);
  }

  function makeRecord(data, seed) {
    var record = { id: genId(seed) };
    FIELD_ORDER.forEach(function (key) { record[key] = data[key] || ''; });
    record.createdAt = new Date().toISOString();
    record.counselRecords = [];
    return record;
  }

  function add(data) {
    var record = makeRecord(data, 0);
    return db.collection(COLLECTION).doc(record.id).set(record).then(function () { return record; });
  }

  function addMany(records) {
    var created = records.map(function (data, i) { return makeRecord(data, i); });
    var batch = db.batch();
    created.forEach(function (record) {
      batch.set(db.collection(COLLECTION).doc(record.id), record);
    });
    return batch.commit().then(function () { return created; });
  }

  function parsePaste(text) {
    var lines = (text || '').replace(/\r\n?/g, '\n').split('\n')
      .filter(function (line) { return line.trim() !== ''; });

    if (lines.length === 0) return [];

    var rows = lines.map(function (line) { return line.split('\t'); });

    var headerWords = ['등록일', '이름', '성함', '학생 이름', '학생명'];
    if (headerWords.indexOf((rows[0][0] || '').trim()) !== -1) {
      rows.shift();
    }

    return rows.map(function (cols) {
      var record = {};
      PASTE_FIELD_ORDER.forEach(function (key, i) { record[key] = (cols[i] || '').trim(); });
      return record;
    }).filter(function (record) { return record.name; });
  }

  function update(id, data) {
    return db.collection(COLLECTION).doc(id).get().then(function (doc) {
      if (!doc.exists) return null;
      var existing = doc.data();
      var record = { id: id };
      FIELD_ORDER.forEach(function (key) { record[key] = data[key] || ''; });
      record.createdAt = existing.createdAt;
      // 이 함수는 학생 정보 수정 폼이 전달한 필드로 문서를 통째로 다시 쓰는 방식이라,
      // 폼에 없는 상담 기록을 여기서 챙겨두지 않으면 이름/전화번호 등만 고쳐도
      // 상담 내역이 통째로 사라진다.
      record.counselRecords = existing.counselRecords || [];
      return db.collection(COLLECTION).doc(id).set(record).then(function () { return record; });
    });
  }

  // 같은 학생 문서를 상담 기록 추가/삭제 시 안전하게 고치기 위한 트랜잭션 헬퍼.
  function updateStudentDoc(id, mutator) {
    var ref = db.collection(COLLECTION).doc(id);
    return db.runTransaction(function (transaction) {
      return transaction.get(ref).then(function (doc) {
        if (!doc.exists) return null;
        var record = doc.data();
        var result = mutator(record);
        transaction.set(ref, record);
        return result !== undefined ? result : record;
      });
    });
  }

  function genCounselId() {
    return 'cs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function addCounselRecord(id, date, content) {
    var created = null;
    return updateStudentDoc(id, function (record) {
      if (!record.counselRecords) record.counselRecords = [];
      created = { id: genCounselId(), date: date || '', content: content || '', createdAt: new Date().toISOString() };
      record.counselRecords.push(created);
    }).then(function () { return created; });
  }

  function removeCounselRecord(id, counselId) {
    return updateStudentDoc(id, function (record) {
      record.counselRecords = (record.counselRecords || []).filter(function (r) { return r.id !== counselId; });
    });
  }

  function remove(id) {
    return db.collection(COLLECTION).doc(id).delete();
  }

  // 여러 명을 한꺼번에 삭제할 때(전체 선택 삭제 등) 학생 수만큼 개별 delete 요청을
  // 동시에 날리면 그중 하나만 실패해도 Promise.all 전체가 실패해 화면이 멈춘 것처럼
  // 보인다. batch 하나로 묶으면 요청 자체가 1번(400개 초과 시 여러 batch)이라 안전하다.
  function removeMany(ids) {
    var chunks = [];
    for (var i = 0; i < ids.length; i += 400) {
      chunks.push(ids.slice(i, i + 400));
    }
    return chunks.reduce(function (chain, chunk) {
      return chain.then(function () {
        var batch = db.batch();
        chunk.forEach(function (id) { batch.delete(db.collection(COLLECTION).doc(id)); });
        return batch.commit();
      });
    }, Promise.resolve());
  }

  function getById(id) {
    return db.collection(COLLECTION).doc(id).get().then(function (doc) {
      return doc.exists ? doc.data() : null;
    });
  }

  function splitClasses(str) {
    return (str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function joinClasses(list) {
    return (list || []).join(', ');
  }

  var SEARCHABLE_FIELDS = ['name', 'school', 'grade', 'currentClasses'];

  function search(query, fields) {
    query = (query || '').trim().toLowerCase();
    return getAll().then(function (all) {
      if (!query) return all;
      var targetFields = (fields && fields.length) ? fields : SEARCHABLE_FIELDS;
      return all.filter(function (s) {
        return targetFields.some(function (key) { return (s[key] || '').toLowerCase().indexOf(query) !== -1; });
      });
    });
  }

  global.Students = {
    getAll: getAll,
    getDeleted: getDeleted,
    markDeleted: markDeleted,
    unmarkDeleted: unmarkDeleted,
    add: add,
    addMany: addMany,
    parsePaste: parsePaste,
    update: update,
    remove: remove,
    removeMany: removeMany,
    addCounselRecord: addCounselRecord,
    removeCounselRecord: removeCounselRecord,
    getById: getById,
    search: search,
    splitClasses: splitClasses,
    joinClasses: joinClasses
  };
})(window);
