(function (global) {
  var COLLECTION = 'students';

  function getAll() {
    return db.collection(COLLECTION).get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) { list.push(doc.data()); });
      return list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    });
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
      var record = { id: id };
      FIELD_ORDER.forEach(function (key) { record[key] = data[key] || ''; });
      record.createdAt = doc.data().createdAt;
      return db.collection(COLLECTION).doc(id).set(record).then(function () { return record; });
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
    add: add,
    addMany: addMany,
    parsePaste: parsePaste,
    update: update,
    remove: remove,
    removeMany: removeMany,
    getById: getById,
    search: search,
    splitClasses: splitClasses,
    joinClasses: joinClasses
  };
})(window);
