import { ref, set, onValue, push } from 'firebase/database';
import { db } from '../config/firebaseConfig';

export const createGame = (gameData) => {
  const gameRef = ref(db, 'games');
  const newGameRef = push(gameRef);
  set(newGameRef, gameData);
  return newGameRef.key;
};

export const joinGame = (gameId, playerData) => {
  const playerRef = ref(db, `games/${gameId}/players/${playerData.id}`);
  set(playerRef, playerData);
};

export const listenToGameState = (gameId, callback) => {
  const gameRef = ref(db, `games/${gameId}`);
  return onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

// Add more functions as needed for game logic