import React, { useState, useEffect, useCallback } from "react";
import { ref, set, onValue, update, remove, get } from "firebase/database";
import { db } from "./firebase";
import { v4 as uuidv4 } from "uuid";

const PokemonGuessingGame = () => {
  const [gameId, setGameId] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [gameData, setGameData] = useState(null);
  const [inputGameId, setInputGameId] = useState("");
  const [hasGuessed, setHasGuessed] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [score, setScore] = useState({ player1: 0, player2: 0 });
  const [pokemon, setPokemon] = useState({ name: "", image: "" });
  const [guess, setGuess] = useState("");

  // Fetch Pokémon data
  const fetchPokemon = useCallback(async () => {
    try {
      const randomId = Math.floor(Math.random() * 898) + 1;
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`
      );
      const data = await response.json();
      return {
        name: data.name,
        image: data.sprites.other["official-artwork"].front_default,
      };
    } catch (error) {
      console.error("Failed to fetch Pokémon data:", error);
      return { name: "Unknown", image: "" };
    }
  }, []);

  // Handle creating a new game
  const createGame = async () => {
    const newGameId = uuidv4(); // unik uuidv4
    const gameRef = ref(db, `games/${newGameId}`);
    // const pokemonData = await fetchPokemon();
    await set(gameRef, {
      player1: { guess: "", score: 0 },
      player2: { guess: "", score: 0 },
      currentRound: 1,
      status: "waiting",
      rounds: 0,
      // currentPokemon: pokemonData,
    });
    setGameId(newGameId);
    setCurrentPlayer("player1");
  };

  // Handle joining an existing game
  const joinGame = async () => {
    const gameRef = ref(db, `games/${inputGameId}`);
    const snapshot = await get(gameRef);
    const data = snapshot.val();
    if (data && data.status === "waiting") {
      const pokemonData = await fetchPokemon();
      setGameId(inputGameId);
      setCurrentPlayer("player2");
      await update(gameRef, { status: "ready", currentPokemon: pokemonData });
    } else {
      alert("Game not available or already started");
    }
    setInputGameId("");
  };

  // Handle player's guess
  const handleGuess = async () => {
    if (!hasGuessed && !gameFinished) {
      const gameRef = ref(db, `games/${gameId}`);
      await update(gameRef, { [`${currentPlayer}/guess`]: guess });
      setHasGuessed(true);
      setGuess(""); // Clear input after submission
    }
  };

  // Monitor game data
  useEffect(() => {
    if (gameId) {
      const gameRef = ref(db, `games/${gameId}`);
      onValue(gameRef, async (snapshot) => {
        const data = snapshot.val();
        setGameData(data);
        setPokemon(data?.currentPokemon || { name: "", image: "" });

        if (data?.player1?.guess && data?.player2?.guess && !gameFinished) {
          const correctAnswer = data.currentPokemon.name.toLowerCase();
          const player1Correct =
            data.player1.guess.toLowerCase() === correctAnswer;
          const player2Correct =
            data.player2.guess.toLowerCase() === correctAnswer;

          setScore({
            player1: player1Correct
              ? data.player1.score + 100
              : data.player1.score,
            player2: player2Correct
              ? data.player2.score + 100
              : data.player2.score,
          });

          // Check if the game should end after 5 rounds
          if (data.currentRound >= 5) {
            setGameFinished(true);
            setCountdown(10);
          } else {
            // Proceed to the next round
            await update(gameRef, {
              currentRound: data.currentRound + 1,
              rounds: data.rounds + 1,
              currentPokemon: await fetchPokemon(),
              player1: { ...data.player1, guess: "" },
              player2: { ...data.player2, guess: "" },
            });
            setHasGuessed(false); // Reset guess status for new round
          }
        }
      });
    }
  }, [gameId, gameFinished]);

  // Handle countdown and game deletion
  useEffect(() => {
    if (countdown === 0 && gameFinished) {
      const gameRef = ref(db, `games/${gameId}`);
      remove(gameRef)
        .then(() => {
          alert("Game finished and deleted.");
          setGameId("");
          setHasGuessed(false);
          setGameFinished(false);
        })
        .catch((error) => console.error("Failed to delete game:", error));
    } else {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, gameFinished, gameId]);

  return (
    <div>
      <h1>Pokémon Guessing Game</h1>
      {!gameId ? (
        <>
          <button onClick={createGame}>Create Game</button>
          <input
            type="text"
            placeholder="Enter Game ID"
            value={inputGameId}
            onChange={(e) => setInputGameId(e.target.value)}
          />
          <button onClick={joinGame}>Join Game</button>
        </>
      ) : (
        <>
          {gameData && (
            <>
              <div>GameId: {gameId}</div>
              {pokemon.image && (
                <div>
                  <h2>Guess the Pokémon</h2>
                  <img src={pokemon.image} alt={pokemon.name} />
                  <div>
                    Score - Player 1: {score.player1}, Player 2: {score.player2}
                  </div>
                </div>
              )}
              {!hasGuessed && !gameFinished && (
                <div>
                  <input
                    type="text"
                    placeholder="Enter your guess"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                  />
                  <button onClick={handleGuess}>Submit Guess</button>
                </div>
              )}
              {gameFinished && <p>Game Over. Countdown: {countdown}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PokemonGuessingGame;
