import React, { useState, useEffect, useCallback } from "react";
import { ref, set, onValue, update, remove, get } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { v4 as uuidv4 } from "uuid";
import Loader from "../components/Loader";
import { RiFileCopyLine } from "react-icons/ri";
import { MdDone } from "react-icons/md";

const PokemonGuessingGame = () => {
  const [gameId, setGameId] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [gameData, setGameData] = useState(null);
  const [inputGameId, setInputGameId] = useState("");
  const [hasGuessed, setHasGuessed] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [score, setScore] = useState({ player1: 0, player2: 0 });
  const [pokemon, setPokemon] = useState({ correct: {}, options: [] });
  const [selectedOption, setSelectedOption] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const fetchPokemon = useCallback(async () => {
    try {
      const pokemonIds = new Set();
      while (pokemonIds.size < 4) {
        pokemonIds.add(Math.floor(Math.random() * 898) + 1);
      }

      const pokemonData = await Promise.all(
        Array.from(pokemonIds).map(async (id) => {
          const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${id}`
          );
          const data = await response.json();
          return {
            id: data.id,
            name: data.name,
            image: data.sprites.other["official-artwork"].front_default,
          };
        })
      );

      const correctPokemon = pokemonData[Math.floor(Math.random() * 4)];
      return {
        correct: correctPokemon,
        options: pokemonData.map((p) => p.name),
      };
    } catch (error) {
      console.error("Failed to fetch Pokémon data:", error);
      return { correct: { name: "Unknown", image: "" }, options: [] };
    }
  }, []);

  const createNewGame = async () => {
    const newGameId = uuidv4();
    localStorage.setItem("gameId", newGameId);
    const pokemonData = await fetchPokemon();
    const gameRef = ref(db, `games/${newGameId}`);
    const gameData = {
      player1: { username, guess: "", score: 0 },
      player2: { username: "", guess: "", score: 0 },
      currentRound: 1,
      status: "waiting",
      currentPokemon: pokemonData,
      roundStartTime: null,
    };
    await set(gameRef, gameData);
    setGameId(newGameId);
    setCurrentPlayer("player1");
    localStorage.setItem("role", "player1");
  };

  const joinExistingGame = async () => {
    const gameRef = ref(db, `games/${inputGameId}`);
    const snapshot = await get(gameRef);
    const data = snapshot.val();
    if (data && data.status === "waiting" && !data.player2.username) {
      const roundStartTime = Date.now();
      localStorage.setItem("gameId", inputGameId);
      await update(gameRef, {
        status: "ready",
        "player2/username": username,
        roundStartTime,
      });
      setGameId(inputGameId);
      setCurrentPlayer("player2");
      localStorage.setItem("role", "player2");
    } else {
      alert("Game not available or already started");
    }
    setInputGameId("");
  };

  const handleGuess = async () => {
    if (!gameId) {
      console.error("Game ID is missing");
      return;
    }
    if (!hasGuessed && !gameFinished && gameData.status === "ready") {
      console.log("😁😁😁😁😁😁");
      const gameRef = ref(db, `games/${gameId}`);
      const timeTaken = Date.now() - gameData.roundStartTime;
      const updates = {};
      updates[`${currentPlayer}/guess`] = selectedOption;
      console.log(currentPlayer, "<<<current player😂😂😂😂");

      updates[`${currentPlayer}/timeTaken`] = timeTaken;
      try {
        console.log("INI MASUK TRY");

        await update(gameRef, updates);
      } catch (err) {
        console.log(err, "<<< error di trycatch handleguess");
      }
      setHasGuessed(true);
      setSelectedOption("");

      const updatedGameData = (await get(gameRef)).val();
      if (updatedGameData.player1.guess && updatedGameData.player2.guess) {
        await progressToNextRound(updatedGameData);
      }
    }
  };

  const progressToNextRound = async (currentGameData) => {
    const gameRef = ref(db, `games/${gameId}`);
    const correctAnswer =
      currentGameData.currentPokemon.correct.name.toLowerCase();
    const player1Correct =
      currentGameData.player1.guess.toLowerCase() === correctAnswer;
    const player2Correct =
      currentGameData.player2.guess.toLowerCase() === correctAnswer;

    const calculateScore = (currentScore, isCorrect) => {
      return isCorrect ? currentScore + 100 : currentScore;
    };

    const newScore = {
      player1: calculateScore(currentGameData.player1.score, player1Correct),
      player2: calculateScore(currentGameData.player2.score, player2Correct),
    };

    if (currentGameData.currentRound >= 5) {
      setGameFinished(true);
      setCountdown(10);
      await update(gameRef, {
        status: "finished",
        finalScores: newScore,
      });
    } else {
      const newPokemonData = await fetchPokemon();
      await update(gameRef, {
        currentRound: currentGameData.currentRound + 1,
        currentPokemon: newPokemonData,
        player1: {
          username: `${currentGameData.player1.username}`,
          guess: "",
          score: newScore.player1,
        },
        player2: {
          username: `${currentGameData.player2.username}`,
          guess: "",
          score: newScore.player2,
        },
        roundStartTime: Date.now(),
      });
      setHasGuessed(false);
      setCountdown(30);
    }
  };

  useEffect(() => {
    if (gameId) {
      const gameRef = ref(db, `games/${gameId}`);
      setCurrentPlayer(localStorage.getItem("role"));
      const unsubscribe = onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        setGameData(data);
        setPokemon(data?.currentPokemon || { correct: {}, options: [] });
        setScore({
          player1: data?.player1?.score || 0,
          player2: data?.player2?.score || 0,
        });

        if (
          data?.status === "ready" &&
          data?.player1?.guess &&
          data?.player2?.guess
        ) {
          progressToNextRound(data);
        }
      });

      return () => unsubscribe();
    }
  }, [gameId, fetchPokemon]);

  useEffect(() => {
    if (gameId && gameData?.roundStartTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - gameData.roundStartTime) / 1000);
        const remainingTime = Math.max(30 - elapsed, 0);
        setCountdown(remainingTime);

        if (remainingTime <= 0) {
          clearInterval(timer);
          progressToNextRound(gameData);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameId, gameData]);

  useEffect(() => {
    if (countdown === 0 && gameFinished) {
      const gameRef = ref(db, `games/${gameId}`);
      remove(gameRef)
        .then(() => {
          alert("Game finished and deleted.");
          localStorage.removeItem("gameId");
          localStorage.removeItem("role");
          setGameId("");
          setHasGuessed(false);
          setGameFinished(false);
          setScore({ player1: 0, player2: 0 });
        })
        .catch((error) => console.error("Failed to delete game:", error));
    }
  }, [countdown, gameFinished, gameId]);

  const fetchGameData = async (storedGameId) => {
    const gameRef = ref(db, `games/${storedGameId}`);
    const snapshot = await get(gameRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      setGameData(data);
    } else {
      console.error("Game not found");
    }
  };

  useEffect(() => {
    const storedGameId = localStorage.getItem("gameId");
    if (storedGameId) {
      setGameId(storedGameId);
      fetchGameData(storedGameId);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(gameId);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-5xl font-bold mb-8">Pokémon Guessing Game</h1>
      {!gameId ? (
        <div className="space-y-4">
          <button
            onClick={createNewGame}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Game
          </button>
          <div>
            <input
              type="text"
              placeholder="Enter Game ID"
              value={inputGameId}
              onChange={(e) => setInputGameId(e.target.value)}
              className="border-2 border-gray-300 bg-white h-10 px-5 rounded-lg text-sm focus:outline-none"
            />
            <button
              onClick={joinExistingGame}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-2"
            >
              Join Game
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-xl">
            Game ID: {gameId}
            <button
              onClick={handleCopy}
              className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {isCopied ? <MdDone /> : <RiFileCopyLine />}
            </button>
          </div>
          {gameData?.status === "waiting" ? (
            <div className="flex flex-col items-center my-10">
              <div className="my-5">
                <Loader />
              </div>
              <p className="font-bold text-2xl">
                Waiting for another player to join...
              </p>
            </div>
          ) : gameData?.status === "ready" ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Guess the Pokémon (Round {gameData.currentRound}/5)
              </h2>
              <img
                src={pokemon.correct.image}
                alt="Pokemon to guess"
                className="w-64 h-64 object-contain mx-auto mb-4"
              />
              <div className="text-xl mb-4">
                Time remaining: {countdown} seconds
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {pokemon.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedOption(option)}
                    className={`p-2 rounded ${
                      selectedOption === option
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                    disabled={hasGuessed || gameFinished}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {!hasGuessed && !gameFinished && (
                <button
                  onClick={handleGuess}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  disabled={!selectedOption}
                >
                  Submit Guess
                </button>
              )}
              <div className="mt-4">
                <div>
                  Score - {gameData?.player1?.username}: {score.player1}
                </div>
                <div>
                  Score - {gameData?.player2?.username}: {score.player2}
                </div>
              </div>
            </div>
          ) : gameData?.status === "finished" ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
              <div className="text-xl mb-4">Final Scores:</div>
              <div className="text-lg">
                <div>
                  {gameData?.player1?.username}: {gameData.finalScores.player1}
                </div>
                <div>
                  {gameData?.player2?.username}: {gameData.finalScores.player2}
                </div>
              </div>
              <div className="mt-4">
                {gameData.finalScores.player1 > gameData.finalScores.player2
                  ? `${gameData?.player1?.username}` + " wins!"
                  : gameData.finalScores.player2 > gameData.finalScores.player1
                  ? `${gameData?.player2?.username}` + " wins!"
                  : "It's a tie!"}
              </div>
              <div className="mt-4">
                The game will be deleted in {countdown} seconds.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PokemonGuessingGame;
