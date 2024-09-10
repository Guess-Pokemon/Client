import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBcS7yL8ubwZlWBWbxVghei3yeX_Tu7K_k",
  authDomain: "pokemon-guess-73272.firebaseapp.com",
  databaseURL:
    "https://pokemon-guess-73272-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "pokemon-guess-73272",
  storageBucket: "pokemon-guess-73272.appspot.com",
  messagingSenderId: "64567775952",
  appId: "1:64567775952:web:bab196f42e1f16edb904d5",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
