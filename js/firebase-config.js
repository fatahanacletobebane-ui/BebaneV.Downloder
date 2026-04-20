// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
    apiKey: "AIzaSyCW9ZZadm4WJ_FKtOjvkP1czsfImwzl98c",
    authDomain: "mozcoin.firebaseapp.com",
    databaseURL: "https://mozcoin-default-rtdb.firebaseio.com",
    projectId: "mozcoin",
    storageBucket: "mozcoin.firebasestorage.app",
    messagingSenderId: "1097811611947",
    appId: "1:1097811611947:web:476c4b2e12fc4c6529756e",
    measurementId: "G-9KCS6TG1CZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const analytics = firebase.analytics();

// Database references
const downloadsRef = database.ref('bebanev_downloader/downloads');
const usersRef = database.ref('bebanev_downloader/users');
const statsRef = database.ref('bebanev_downloader/stats');
const adsRef = database.ref('bebanev_downloader/ads');

console.log('🔥 BebaneV.Downloader - Firebase Initialized');
