// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBX6cmn4_h5d7GGEzS-cM6weq2y6GzQtmU",
  authDomain: "svarajya-2026.firebaseapp.com",
  projectId: "svarajya-2026",
  storageBucket: "svarajya-2026.firebasestorage.app",
  messagingSenderId: "381297558551",
  appId: "1:381297558551:web:8c85cad84eca05db6bc852",
  measurementId: "G-72YFK3SHGX",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();

export { auth };
