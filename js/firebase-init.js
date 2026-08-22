(function (global) {
  var firebaseConfig = {
    apiKey: "AIzaSyBy6881T3I38KgXk_NlbgeFmedZ1bR3ee4",
    authDomain: "neo-academy-cf615.firebaseapp.com",
    projectId: "neo-academy-cf615",
    storageBucket: "neo-academy-cf615.firebasestorage.app",
    messagingSenderId: "464078284191",
    appId: "1:464078284191:web:a3cbc5e4d8ea2c01cb89aa"
  };

  firebase.initializeApp(firebaseConfig);

  global.db = firebase.firestore();
  global.auth = firebase.auth();
  global.FIREBASE_CONFIG = firebaseConfig;
})(window);
