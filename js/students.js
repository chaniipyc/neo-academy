(function (global) {
  var KEY = 'neo_academy_students';

  function getAll() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    } catch (e) {
      return [];
    }
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

  function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function makeRecord(data, seed) {
    var record = { id: 's_' + Date.now() + '_' + seed + '_' + Math.random().toString(36).slice(2, 7) };
    FIELD_ORDER.forEach(function (key) { record[key] = data[key] || ''; });
    record.createdAt = new Date().toISOString();
    return record;
  }

  function add(data) {
    var list = getAll();
    var record = makeRecord(data, 0);
    list.push(record);
    saveAll(list);
    return record;
  }

  function addMany(records) {
    var list = getAll();
    var created = records.map(function (data, i) { return makeRecord(data, i); });
    saveAll(list.concat(created));
    return created;
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
    var list = getAll();
    var idx = list.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return null;
    var record = { id: id };
    FIELD_ORDER.forEach(function (key) { record[key] = data[key] || ''; });
    record.createdAt = list[idx].createdAt;
    list[idx] = record;
    saveAll(list);
    return list[idx];
  }

  function remove(id) {
    saveAll(getAll().filter(function (s) { return s.id !== id; }));
  }

  function getById(id) {
    return getAll().filter(function (s) { return s.id === id; })[0] || null;
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
    var all = getAll();
    if (!query) return all;
    var targetFields = (fields && fields.length) ? fields : SEARCHABLE_FIELDS;
    return all.filter(function (s) {
      return targetFields.some(function (key) { return (s[key] || '').toLowerCase().indexOf(query) !== -1; });
    });
  }

  global.Students = {
    getAll: getAll,
    add: add,
    addMany: addMany,
    parsePaste: parsePaste,
    update: update,
    remove: remove,
    getById: getById,
    search: search,
    splitClasses: splitClasses,
    joinClasses: joinClasses
  };
})(window);
