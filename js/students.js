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
    'address', 'currentClasses', 'classHistory', 'notes'
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

    var headerWords = ['이름', '성함', '학생 이름', '학생명'];
    if (headerWords.indexOf((rows[0][0] || '').trim()) !== -1) {
      rows.shift();
    }

    return rows.map(function (cols) {
      var record = {};
      FIELD_ORDER.forEach(function (key, i) { record[key] = (cols[i] || '').trim(); });
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

  var SEED_FLAG_KEY = 'neo_academy_dummy_seeded_v1';

  var DUMMY_STUDENT_SEED = [
    { name: '신윤경', school: '상록중학교', grade: '중2', studentPhone: '010-5177-6708', parentPhone: '010-2856-6147', address: '서울시 송파구 잠실동', currentClasses: '수학C', classHistory: '', notes: '' },
    { name: '이서훈', school: '상록초등학교', grade: '초5', studentPhone: '010-9363-4571', parentPhone: '010-1170-6868', address: '경기도 부천시 상동', currentClasses: '수학A', classHistory: '', notes: '' },
    { name: '전채영', school: '푸른중학교', grade: '중3', studentPhone: '010-4305-2063', parentPhone: '010-4498-6553', address: '서울시 송파구 잠실동', currentClasses: '국어B, 영어A', classHistory: '', notes: '' },
    { name: '오도결', school: '네오초등학교', grade: '초2', studentPhone: '010-5971-9020', parentPhone: '010-5656-7391', address: '서울시 성북구 길음동', currentClasses: '영어C, 수학B', classHistory: '', notes: '' },
    { name: '최준아', school: '네오초등학교', grade: '초6', studentPhone: '010-7280-2391', parentPhone: '010-8613-9191', address: '서울시 동작구 사당동', currentClasses: '국어A, 영어A', classHistory: '', notes: '' },
    { name: '홍지진', school: '네오고등학교', grade: '고2', studentPhone: '010-2433-1099', parentPhone: '010-5891-1439', address: '서울시 송파구 잠실동', currentClasses: '영어A', classHistory: '', notes: '' },
    { name: '최지찬', school: '한빛중학교', grade: '중3', studentPhone: '010-5699-3069', parentPhone: '010-5637-3499', address: '서울시 성북구 길음동', currentClasses: '국어C, 영어B, 수학A', classHistory: '', notes: '' },
    { name: '안우빈', school: '은성고등학교', grade: '고3', studentPhone: '010-0078-7610', parentPhone: '010-5830-9751', address: '서울시 양천구 목동', currentClasses: '국어C, 수학B', classHistory: '', notes: '' },
    { name: '한소아', school: '네오초등학교', grade: '초2', studentPhone: '010-2078-5145', parentPhone: '010-0654-3522', address: '경기도 고양시 일산동구', currentClasses: '영어B, 수학A', classHistory: '', notes: '' },
    { name: '전재서', school: '푸른고등학교', grade: '고2', studentPhone: '010-8659-0637', parentPhone: '010-9530-2856', address: '서울시 노원구 상계동', currentClasses: '수학B', classHistory: '', notes: '' },
    { name: '박하준', school: '네오고등학교', grade: '고2', studentPhone: '010-0822-5452', parentPhone: '010-5179-9027', address: '경기도 고양시 일산동구', currentClasses: '국어A', classHistory: '2024 여름방학 수학 심화반', notes: '' },
    { name: '한채영', school: '상록초등학교', grade: '초3', studentPhone: '010-7934-5411', parentPhone: '010-9271-3676', address: '서울시 종로구 평창동', currentClasses: '영어B, 수학A', classHistory: '', notes: '' },
    { name: '전윤영', school: '푸른초등학교', grade: '초1', studentPhone: '010-7978-2673', parentPhone: '010-3283-2673', address: '서울시 종로구 평창동', currentClasses: '수학C, 영어C, 국어A', classHistory: '', notes: '알레르기 있음 (땅콩)' },
    { name: '신수아', school: '새싹초등학교', grade: '초1', studentPhone: '010-6188-9532', parentPhone: '010-2248-5931', address: '서울시 노원구 상계동', currentClasses: '수학A, 영어A, 국어B', classHistory: '', notes: '' },
    { name: '양윤진', school: '은성초등학교', grade: '초4', studentPhone: '010-2243-8025', parentPhone: '010-0247-0668', address: '서울시 송파구 잠실동', currentClasses: '수학C, 국어C, 영어A', classHistory: '', notes: '' },
    { name: '홍은서', school: '한빛초등학교', grade: '초3', studentPhone: '010-1374-7372', parentPhone: '010-3371-1387', address: '경기도 고양시 일산동구', currentClasses: '영어B, 국어B', classHistory: '2025 겨울방학 특강 수학 완성반', notes: '' },
    { name: '고준안', school: '한빛중학교', grade: '중3', studentPhone: '010-0657-8656', parentPhone: '010-8471-2105', address: '서울시 강동구 천호동', currentClasses: '국어B', classHistory: '', notes: '' },
    { name: '최예민', school: '은성초등학교', grade: '초6', studentPhone: '010-6714-6223', parentPhone: '010-1663-7866', address: '서울시 강남구 대치동', currentClasses: '국어C, 영어B', classHistory: '', notes: '' },
    { name: '서다원', school: '상록중학교', grade: '중3', studentPhone: '010-5893-8847', parentPhone: '010-9350-0336', address: '서울시 노원구 상계동', currentClasses: '수학B, 영어C, 국어A', classHistory: '', notes: '결석 시 사전 연락 필수' },
    { name: '배도안', school: '한빛고등학교', grade: '고3', studentPhone: '010-5722-0917', parentPhone: '010-2419-6478', address: '서울시 마포구 합정동', currentClasses: '국어C, 수학C', classHistory: '2025 겨울방학 특강 수학 완성반', notes: '' },
    { name: '안민찬', school: '네오중학교', grade: '중2', studentPhone: '010-4513-0744', parentPhone: '010-9816-7830', address: '서울시 종로구 평창동', currentClasses: '영어C', classHistory: '', notes: '' },
    { name: '황수안', school: '한빛고등학교', grade: '고3', studentPhone: '010-0598-9880', parentPhone: '010-4547-5066', address: '서울시 종로구 평창동', currentClasses: '수학A, 영어A, 국어A', classHistory: '', notes: '' },
    { name: '홍하영', school: '네오초등학교', grade: '초5', studentPhone: '010-6545-8960', parentPhone: '010-3315-2903', address: '서울시 성북구 길음동', currentClasses: '영어C, 국어C, 수학B', classHistory: '2024 겨울방학 영어 문법 특강', notes: '' },
    { name: '임수호', school: '푸른초등학교', grade: '초6', studentPhone: '010-7957-5371', parentPhone: '010-7938-2058', address: '서울시 광진구 자양동', currentClasses: '국어B, 영어A, 수학A', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '' },
    { name: '황지진', school: '한빛고등학교', grade: '고3', studentPhone: '010-4761-3343', parentPhone: '010-0239-8065', address: '서울시 서초구 반포동', currentClasses: '영어A, 국어A, 수학B', classHistory: '', notes: '' },
    { name: '홍시슬', school: '네오초등학교', grade: '초2', studentPhone: '010-6981-0561', parentPhone: '010-8876-7121', address: '서울시 강동구 천호동', currentClasses: '영어B, 수학B', classHistory: '2025 여름방학 국어 독해 특강', notes: '' },
    { name: '조민준', school: '상록중학교', grade: '중3', studentPhone: '010-7925-6933', parentPhone: '010-2984-5444', address: '경기도 성남시 분당구', currentClasses: '영어B, 국어B, 수학B', classHistory: '', notes: '알레르기 있음 (땅콩)' },
    { name: '서수아', school: '상록초등학교', grade: '초5', studentPhone: '010-2862-3095', parentPhone: '010-3659-4410', address: '경기도 안양시 동안구', currentClasses: '국어A, 수학A, 영어A', classHistory: '', notes: '' },
    { name: '이민원', school: '푸른초등학교', grade: '초5', studentPhone: '010-6556-3537', parentPhone: '010-9330-2444', address: '경기도 부천시 상동', currentClasses: '수학B', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '픽업 필요 (학부모 요청)' },
    { name: '강은아', school: '상록고등학교', grade: '고2', studentPhone: '010-2727-8936', parentPhone: '010-3013-4486', address: '경기도 고양시 일산동구', currentClasses: '국어C, 영어B', classHistory: '', notes: '' },
    { name: '오채진', school: '한빛초등학교', grade: '초4', studentPhone: '010-6167-2484', parentPhone: '010-9977-7611', address: '경기도 용인시 수지구', currentClasses: '국어C, 수학A', classHistory: '', notes: '' },
    { name: '이준진', school: '푸른고등학교', grade: '고2', studentPhone: '010-4810-5843', parentPhone: '010-5224-4977', address: '경기도 부천시 상동', currentClasses: '영어C, 국어C', classHistory: '', notes: '' },
    { name: '문민진', school: '네오중학교', grade: '중1', studentPhone: '010-2946-0951', parentPhone: '010-1939-8142', address: '경기도 고양시 일산동구', currentClasses: '영어C, 수학A, 국어C', classHistory: '', notes: '' },
    { name: '한현준', school: '푸른중학교', grade: '중3', studentPhone: '010-1328-3989', parentPhone: '010-3598-9164', address: '서울시 노원구 상계동', currentClasses: '수학B, 영어C, 국어B', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '' },
    { name: '송예호', school: '푸른고등학교', grade: '고3', studentPhone: '010-1267-0696', parentPhone: '010-5542-2009', address: '경기도 부천시 상동', currentClasses: '영어B, 수학B, 국어C', classHistory: '', notes: '' },
    { name: '윤은훈', school: '한빛중학교', grade: '중1', studentPhone: '010-7628-3356', parentPhone: '010-0223-2506', address: '서울시 종로구 평창동', currentClasses: '국어B, 수학B', classHistory: '', notes: '' },
    { name: '장준찬', school: '은성초등학교', grade: '초1', studentPhone: '010-2722-9628', parentPhone: '010-0526-2162', address: '서울시 양천구 목동', currentClasses: '국어C, 영어A, 수학B', classHistory: '', notes: '' },
    { name: '서채슬', school: '한빛초등학교', grade: '초3', studentPhone: '010-9977-8368', parentPhone: '010-0119-5018', address: '서울시 종로구 평창동', currentClasses: '영어B, 수학B', classHistory: '2025 겨울방학 특강 수학 완성반', notes: '' },
    { name: '박현현', school: '상록초등학교', grade: '초1', studentPhone: '010-1729-7756', parentPhone: '010-3727-9573', address: '서울시 노원구 상계동', currentClasses: '국어C, 수학B', classHistory: '', notes: '' },
    { name: '오현결', school: '네오초등학교', grade: '초3', studentPhone: '010-0485-0046', parentPhone: '010-9470-3237', address: '서울시 강남구 대치동', currentClasses: '영어B, 수학A', classHistory: '', notes: '' },
    { name: '한지서', school: '한빛고등학교', grade: '고1', studentPhone: '010-3521-7265', parentPhone: '010-6289-8073', address: '경기도 부천시 상동', currentClasses: '수학A, 영어C', classHistory: '', notes: '' },
    { name: '송수현', school: '네오중학교', grade: '중3', studentPhone: '010-3305-3185', parentPhone: '010-8401-6960', address: '서울시 노원구 상계동', currentClasses: '수학B, 국어B', classHistory: '', notes: '시력 저하로 앞자리 배정 요청' },
    { name: '오하훈', school: '한빛중학교', grade: '중1', studentPhone: '010-4225-6652', parentPhone: '010-6668-3156', address: '서울시 강동구 천호동', currentClasses: '수학C', classHistory: '', notes: '차량 등하원 이용' },
    { name: '홍재서', school: '한빛고등학교', grade: '고3', studentPhone: '010-2037-4728', parentPhone: '010-6329-8306', address: '서울시 노원구 상계동', currentClasses: '수학A, 영어B', classHistory: '', notes: '' },
    { name: '이채영', school: '은성초등학교', grade: '초5', studentPhone: '010-0985-2862', parentPhone: '010-3552-4486', address: '서울시 마포구 합정동', currentClasses: '영어A, 수학B, 국어B', classHistory: '', notes: '' },
    { name: '홍현린', school: '은성중학교', grade: '중1', studentPhone: '010-0680-2932', parentPhone: '010-5040-0653', address: '서울시 강동구 천호동', currentClasses: '국어B, 수학C', classHistory: '', notes: '' },
    { name: '김준현', school: '은성초등학교', grade: '초3', studentPhone: '010-4753-8550', parentPhone: '010-9047-0201', address: '서울시 동작구 사당동', currentClasses: '국어A, 수학C', classHistory: '', notes: '결석 시 사전 연락 필수' },
    { name: '양지린', school: '한빛초등학교', grade: '초6', studentPhone: '010-3919-5671', parentPhone: '010-4758-0786', address: '서울시 노원구 상계동', currentClasses: '수학A, 영어C, 국어B', classHistory: '2025 상반기 국어 논술반', notes: '' },
    { name: '문서슬', school: '상록중학교', grade: '중3', studentPhone: '010-9775-1544', parentPhone: '010-7563-3993', address: '서울시 서초구 반포동', currentClasses: '수학B, 국어B', classHistory: '2025 여름방학 국어 독해 특강', notes: '' },
    { name: '한서훈', school: '새싹초등학교', grade: '초6', studentPhone: '010-7925-0541', parentPhone: '010-4241-2150', address: '서울시 종로구 평창동', currentClasses: '영어B, 국어B', classHistory: '', notes: '' },
    { name: '김윤서', school: '한빛중학교', grade: '중3', studentPhone: '010-7952-2464', parentPhone: '010-6233-4540', address: '서울시 송파구 잠실동', currentClasses: '국어A, 영어C', classHistory: '2024 여름방학 수학 심화반', notes: '' },
    { name: '고채현', school: '한빛고등학교', grade: '고1', studentPhone: '010-2500-2150', parentPhone: '010-4129-8743', address: '서울시 성북구 길음동', currentClasses: '수학A, 영어C', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '' },
    { name: '문채윤', school: '상록중학교', grade: '중1', studentPhone: '010-8568-6424', parentPhone: '010-1334-0045', address: '경기도 용인시 수지구', currentClasses: '영어B', classHistory: '', notes: '' },
    { name: '손수빈', school: '상록중학교', grade: '중1', studentPhone: '010-9647-7849', parentPhone: '010-1148-1894', address: '경기도 고양시 일산동구', currentClasses: '국어C, 수학A, 영어B', classHistory: '', notes: '' },
    { name: '강유아', school: '네오고등학교', grade: '고1', studentPhone: '010-0656-3360', parentPhone: '010-2449-1866', address: '서울시 동작구 사당동', currentClasses: '국어B, 영어B', classHistory: '', notes: '알레르기 있음 (땅콩)' },
    { name: '문시우', school: '상록초등학교', grade: '초2', studentPhone: '010-5093-4101', parentPhone: '010-7907-1601', address: '서울시 종로구 평창동', currentClasses: '영어B', classHistory: '2025 상반기 국어 논술반', notes: '' },
    { name: '장은서', school: '푸른중학교', grade: '중1', studentPhone: '010-5221-2944', parentPhone: '010-5294-4959', address: '경기도 부천시 상동', currentClasses: '수학B', classHistory: '', notes: '' },
    { name: '오윤현', school: '상록초등학교', grade: '초3', studentPhone: '010-1726-0519', parentPhone: '010-3982-2628', address: '서울시 종로구 평창동', currentClasses: '영어C, 수학B, 국어B', classHistory: '', notes: '' },
    { name: '최민호', school: '상록고등학교', grade: '고1', studentPhone: '010-8634-2728', parentPhone: '010-3539-5364', address: '서울시 강남구 대치동', currentClasses: '수학B', classHistory: '', notes: '결석 시 사전 연락 필수' },
    { name: '송수호', school: '상록초등학교', grade: '초4', studentPhone: '010-6535-0735', parentPhone: '010-2114-4210', address: '서울시 서초구 반포동', currentClasses: '국어A', classHistory: '', notes: '' },
    { name: '한윤결', school: '네오초등학교', grade: '초5', studentPhone: '010-5474-4868', parentPhone: '010-9225-1271', address: '서울시 양천구 목동', currentClasses: '수학C', classHistory: '', notes: '' },
    { name: '문수서', school: '상록초등학교', grade: '초1', studentPhone: '010-3516-2589', parentPhone: '010-7928-3381', address: '서울시 동작구 사당동', currentClasses: '수학B', classHistory: '', notes: '' },
    { name: '안민린', school: '은성고등학교', grade: '고1', studentPhone: '010-0314-4439', parentPhone: '010-7926-8056', address: '서울시 강동구 천호동', currentClasses: '영어B, 국어B', classHistory: '2024 겨울방학 영어 문법 특강', notes: '시력 저하로 앞자리 배정 요청' },
    { name: '장현율', school: '푸른고등학교', grade: '고3', studentPhone: '010-3640-3218', parentPhone: '010-5932-5677', address: '서울시 양천구 목동', currentClasses: '영어A, 국어C', classHistory: '2024 여름방학 수학 심화반', notes: '' },
    { name: '한채찬', school: '새싹초등학교', grade: '초3', studentPhone: '010-1424-6475', parentPhone: '010-2501-9082', address: '서울시 동작구 사당동', currentClasses: '국어A, 수학A, 영어C', classHistory: '', notes: '픽업 필요 (학부모 요청)' },
    { name: '손지찬', school: '푸른초등학교', grade: '초2', studentPhone: '010-9426-6582', parentPhone: '010-7396-1213', address: '서울시 은평구 연신내동', currentClasses: '수학A, 국어B, 영어C', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '' },
    { name: '김재원', school: '한빛중학교', grade: '중2', studentPhone: '010-0149-7808', parentPhone: '010-5188-7492', address: '서울시 서초구 반포동', currentClasses: '국어B, 수학A, 영어B', classHistory: '', notes: '' },
    { name: '신유원', school: '상록초등학교', grade: '초5', studentPhone: '010-3156-7605', parentPhone: '010-5666-5138', address: '서울시 송파구 잠실동', currentClasses: '수학B', classHistory: '', notes: '' },
    { name: '손민결', school: '새싹초등학교', grade: '초6', studentPhone: '010-2451-9187', parentPhone: '010-8929-0432', address: '서울시 광진구 자양동', currentClasses: '국어B, 수학B', classHistory: '', notes: '' },
    { name: '조서훈', school: '한빛고등학교', grade: '고1', studentPhone: '010-5248-4503', parentPhone: '010-4596-4929', address: '경기도 안양시 동안구', currentClasses: '국어B, 영어A, 수학C', classHistory: '', notes: '' },
    { name: '송준찬', school: '네오초등학교', grade: '초5', studentPhone: '010-9970-9473', parentPhone: '010-9011-1538', address: '서울시 서초구 반포동', currentClasses: '영어A, 국어A, 수학C', classHistory: '', notes: '' },
    { name: '최하린', school: '네오고등학교', grade: '고3', studentPhone: '010-4069-9954', parentPhone: '010-0345-4469', address: '서울시 성북구 길음동', currentClasses: '수학C, 국어A', classHistory: '', notes: '' },
    { name: '오현진', school: '은성초등학교', grade: '초4', studentPhone: '010-3624-8432', parentPhone: '010-7606-2589', address: '경기도 성남시 분당구', currentClasses: '영어A, 국어B', classHistory: '', notes: '' },
    { name: '이우원', school: '은성초등학교', grade: '초4', studentPhone: '010-2343-0894', parentPhone: '010-9501-8719', address: '서울시 노원구 상계동', currentClasses: '영어B, 국어C', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '차량 등하원 이용' },
    { name: '양소우', school: '푸른중학교', grade: '중1', studentPhone: '010-7679-5642', parentPhone: '010-0744-5880', address: '서울시 성북구 길음동', currentClasses: '국어B, 수학B', classHistory: '', notes: '' },
    { name: '송현안', school: '네오고등학교', grade: '고1', studentPhone: '010-8638-5965', parentPhone: '010-5143-7094', address: '서울시 종로구 평창동', currentClasses: '수학C, 국어B, 영어A', classHistory: '', notes: '' },
    { name: '최시율', school: '푸른고등학교', grade: '고1', studentPhone: '010-1004-2051', parentPhone: '010-2048-3862', address: '서울시 성북구 길음동', currentClasses: '국어C, 영어A, 수학B', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '결석 시 사전 연락 필수' },
    { name: '양윤준', school: '한빛초등학교', grade: '초6', studentPhone: '010-3891-6410', parentPhone: '010-5741-5541', address: '서울시 강남구 대치동', currentClasses: '영어B, 국어C', classHistory: '', notes: '' },
    { name: '임지율', school: '네오초등학교', grade: '초3', studentPhone: '010-7471-9664', parentPhone: '010-2364-7509', address: '서울시 서초구 반포동', currentClasses: '영어C, 국어B, 수학C', classHistory: '2025 상반기 국어 논술반', notes: '' },
    { name: '양채진', school: '네오중학교', grade: '중1', studentPhone: '010-9555-8436', parentPhone: '010-5103-5796', address: '서울시 동작구 사당동', currentClasses: '수학B', classHistory: '', notes: '' },
    { name: '강채슬', school: '은성초등학교', grade: '초6', studentPhone: '010-3513-3565', parentPhone: '010-9870-5395', address: '서울시 강남구 대치동', currentClasses: '수학B, 국어A', classHistory: '2025 겨울방학 특강 수학 완성반', notes: '' },
    { name: '홍예진', school: '한빛초등학교', grade: '초6', studentPhone: '010-1837-3325', parentPhone: '010-4004-7324', address: '경기도 안양시 동안구', currentClasses: '국어A, 영어B, 수학B', classHistory: '', notes: '' },
    { name: '권지린', school: '한빛고등학교', grade: '고3', studentPhone: '010-1431-7585', parentPhone: '010-8086-9551', address: '경기도 용인시 수지구', currentClasses: '국어C, 수학B, 영어B', classHistory: '', notes: '' },
    { name: '신하아', school: '상록중학교', grade: '중1', studentPhone: '010-2571-6665', parentPhone: '010-1780-3548', address: '경기도 고양시 일산동구', currentClasses: '영어B', classHistory: '', notes: '' },
    { name: '한지아', school: '은성고등학교', grade: '고2', studentPhone: '010-0231-7409', parentPhone: '010-0475-2880', address: '서울시 종로구 평창동', currentClasses: '국어C', classHistory: '', notes: '' },
    { name: '임하경', school: '네오중학교', grade: '중2', studentPhone: '010-2166-3560', parentPhone: '010-4051-4466', address: '서울시 서초구 반포동', currentClasses: '국어A, 영어B', classHistory: '', notes: '' },
    { name: '한현린', school: '한빛초등학교', grade: '초5', studentPhone: '010-3377-9623', parentPhone: '010-4744-2079', address: '경기도 성남시 분당구', currentClasses: '수학B, 영어B', classHistory: '', notes: '' },
    { name: '윤윤민', school: '네오초등학교', grade: '초1', studentPhone: '010-1527-0331', parentPhone: '010-1380-1523', address: '경기도 용인시 수지구', currentClasses: '수학A, 영어C, 국어B', classHistory: '2025 여름방학 국어 독해 특강', notes: '' },
    { name: '한지현', school: '한빛초등학교', grade: '초2', studentPhone: '010-0569-4932', parentPhone: '010-5919-1347', address: '서울시 강남구 대치동', currentClasses: '국어B, 수학A', classHistory: '', notes: '' },
    { name: '손하결', school: '한빛중학교', grade: '중3', studentPhone: '010-9117-4301', parentPhone: '010-3052-6460', address: '서울시 양천구 목동', currentClasses: '국어C, 수학C', classHistory: '2025 여름방학 국어 독해 특강', notes: '' },
    { name: '정우찬', school: '네오고등학교', grade: '고1', studentPhone: '010-9747-1296', parentPhone: '010-7934-2632', address: '서울시 강동구 천호동', currentClasses: '수학B, 영어B', classHistory: '', notes: '' },
    { name: '윤하율', school: '은성고등학교', grade: '고1', studentPhone: '010-5768-7262', parentPhone: '010-7527-3448', address: '서울시 은평구 연신내동', currentClasses: '국어B', classHistory: '', notes: '' },
    { name: '김민진', school: '상록초등학교', grade: '초1', studentPhone: '010-0314-9749', parentPhone: '010-9976-8136', address: '경기도 부천시 상동', currentClasses: '영어C, 국어C', classHistory: '', notes: '시력 저하로 앞자리 배정 요청' },
    { name: '양소현', school: '푸른초등학교', grade: '초2', studentPhone: '010-8590-8414', parentPhone: '010-6981-4812', address: '경기도 부천시 상동', currentClasses: '수학A, 국어A', classHistory: '2024 겨울방학 영어 회화 캠프', notes: '' },
    { name: '권현슬', school: '상록고등학교', grade: '고1', studentPhone: '010-8753-1940', parentPhone: '010-6251-9757', address: '서울시 강남구 대치동', currentClasses: '국어C', classHistory: '', notes: '' },
    { name: '정우경', school: '한빛초등학교', grade: '초3', studentPhone: '010-1356-8039', parentPhone: '010-0350-3192', address: '서울시 은평구 연신내동', currentClasses: '수학B, 영어A', classHistory: '', notes: '' },
    { name: '박예안', school: '네오고등학교', grade: '고2', studentPhone: '010-0680-3425', parentPhone: '010-2780-6916', address: '서울시 종로구 평창동', currentClasses: '수학B', classHistory: '', notes: '' },
    { name: '김윤경', school: '네오중학교', grade: '중1', studentPhone: '010-1052-7869', parentPhone: '010-1259-2946', address: '서울시 노원구 상계동', currentClasses: '수학B, 영어B, 국어C', classHistory: '', notes: '' },
    { name: '홍다린', school: '상록고등학교', grade: '고1', studentPhone: '010-9659-7038', parentPhone: '010-4998-0819', address: '서울시 강남구 대치동', currentClasses: '수학A', classHistory: '', notes: '시력 저하로 앞자리 배정 요청' },
    { name: '장민원', school: '푸른초등학교', grade: '초5', studentPhone: '010-1485-4870', parentPhone: '010-8874-7804', address: '경기도 안양시 동안구', currentClasses: '국어A', classHistory: '', notes: '' },
  ];

  function seedDummyDataOnce() {
    try {
      if (localStorage.getItem(SEED_FLAG_KEY)) return;
      if (getAll().length === 0) {
        addMany(DUMMY_STUDENT_SEED);
      }
      localStorage.setItem(SEED_FLAG_KEY, '1');
    } catch (e) {}
  }

  seedDummyDataOnce();

  global.Students = {
    getAll: getAll,
    add: add,
    addMany: addMany,
    parsePaste: parsePaste,
    update: update,
    remove: remove,
    getById: getById,
    search: search
  };
})(window);
