// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDXfU7YfuxNvK-z1bXRiIhQqrC6Cc_NU0w",
  authDomain: "chance-express-pty.firebaseapp.com",
  projectId: "chance-express-pty",
  storageBucket: "chance-express-pty.firebasestorage.app",
  messagingSenderId: "637905076706",
  appId: "1:637905076706:web:c338400f6ba4cacbeef9bb",
  measurementId: "G-DWKYG0DE6C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);