(function (global) {
  // 학생들을 삭제된 학생 목록으로 옮긴다. 진행 중인 반 명단에서는 빼되,
  // 어느 반에서 빠졌는지 기억해 두었다가 복원할 때 되돌려 넣는다.
  function moveToTrash(ids) {
    var idSet = {};
    var classIdsById = {};
    ids.forEach(function (id) { idSet[id] = true; classIdsById[id] = []; });

    return Classes.getAll().then(function (classes) {
      // 반 하나당 트랜잭션 1번 — 학생 수만큼 동시에 같은 반 문서를 고치지 않도록.
      var ops = classes
        .filter(function (c) { return (c.studentIds || []).some(function (id) { return idSet[id]; }); })
        .map(function (c) {
          var toRemove = c.studentIds.filter(function (id) { return idSet[id]; });
          toRemove.forEach(function (id) { classIdsById[id].push(c.id); });
          return Classes.removeStudentsFromClass(c.id, toRemove);
        });
      return Promise.all(ops);
    }).then(function () {
      return Students.markDeleted(classIdsById);
    });
  }

  function restore(student) {
    var classIds = student.deletedClassIds || [];
    return Classes.getAll().then(function (classes) {
      var byId = {};
      classes.forEach(function (c) { byId[c.id] = c; });
      var ops = classIds
        .filter(function (id) { return byId[id] && byId[id].status !== 'completed'; })
        .map(function (id) { return Classes.addStudentToClass(id, student.id); });
      return Promise.all(ops);
    }).then(function () {
      return Students.unmarkDeleted(student.id);
    });
  }

  function purge(ids) {
    return Students.removeMany(ids);
  }

  global.Trash = { moveToTrash: moveToTrash, restore: restore, purge: purge };
})(window);
