(function (global) {
  var overlay = null;

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal-card">' +
        '<h2 class="heading-md withdraw-title">퇴원 처리</h2>' +
        '<p class="body-md placeholder-desc withdraw-desc"></p>' +
        '<form class="withdraw-form">' +
          '<label class="auth-field">' +
            '<span class="caption">퇴원 날짜</span>' +
            '<input type="date" name="date" class="text-input" required>' +
          '</label>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn-secondary withdraw-cancel">취소</button>' +
            '<button type="submit" class="btn-danger">퇴원 처리</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  // 퇴원 날짜를 물어보고, 확인하면 'YYYY-MM-DD', 취소하면 null을 돌려준다.
  function ask(studentName, className) {
    if (!overlay) buildModal();
    var form = overlay.querySelector('.withdraw-form');
    overlay.querySelector('.withdraw-desc').textContent =
      studentName + ' 학생을 "' + className + '" 반에서 퇴원 처리합니다. 수강 수업 이력에 퇴원 날짜와 함께 기록됩니다.';
    form.date.value = todayIso();
    overlay.hidden = false;
    form.date.focus();

    return new Promise(function (resolve) {
      function close(result) {
        overlay.hidden = true;
        form.removeEventListener('submit', onSubmit);
        overlay.querySelector('.withdraw-cancel').removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onBackdrop);
        resolve(result);
      }
      function onSubmit(e) {
        e.preventDefault();
        if (!form.date.value) return;
        close(form.date.value);
      }
      function onCancel() { close(null); }
      function onBackdrop(e) { if (e.target === overlay) close(null); }

      form.addEventListener('submit', onSubmit);
      overlay.querySelector('.withdraw-cancel').addEventListener('click', onCancel);
      overlay.addEventListener('click', onBackdrop);
    });
  }

  function apply(cls, student, isoDate) {
    var current = Students.splitClasses(student.currentClasses).filter(function (c) { return c !== cls.name; });
    var history = Students.splitClasses(student.classHistory);
    history.push(cls.name + '(퇴원 ' + isoDate.replace(/-/g, '.') + ')');
    return Classes.removeStudentFromClass(cls.id, student.id).then(function () {
      return Students.update(student.id, Object.assign({}, student, {
        currentClasses: Students.joinClasses(current),
        classHistory: Students.joinClasses(history)
      }));
    });
  }

  global.Withdraw = { ask: ask, apply: apply };
})(window);
