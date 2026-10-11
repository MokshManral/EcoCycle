// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCMBoFkG-sSffYc18nrCWJ9Gdnc723mFx0",
  authDomain: "ecocycle-aef08.firebaseapp.com",
  projectId: "ecocycle-aef08",
  storageBucket: "ecocycle-aef08.firebasestorage.app",
  messagingSenderId: "43343598936",
  appId: "1:43343598936:web:8af8d3686fc1474064412d",
  measurementId: "G-4PRRBPTTZE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;