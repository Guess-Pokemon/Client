import React, { useState, useEffect, useCallback } from "react";
import { ref, set, onValue, update, remove, get, runTransaction } from "firebase/database";
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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState("");

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

  const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

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
      const gameRef = ref(db, `games/${gameId}`);
      try {
        await runTransaction(gameRef, (currentData) => {
          if (currentData === null || currentData.status !== "ready" || currentData[currentPlayer].guess) {
            return;
          }
          
          currentData[currentPlayer].guess = selectedOption;
          currentData[currentPlayer].timeTaken = Date.now() - currentData.roundStartTime;

          if (currentData.player1.guess && currentData.player2.guess) {
            const correctAnswer = currentData.currentPokemon.correct.name.toLowerCase();
            const player1Correct = currentData.player1.guess.toLowerCase() === correctAnswer;
            const player2Correct = currentData.player2.guess.toLowerCase() === correctAnswer;

            currentData.player1.score += player1Correct ? 100 : 0;
            currentData.player2.score += player2Correct ? 100 : 0;

            if (currentData.currentRound >= 5) {
              currentData.status = "finished";
              currentData.finalScores = {
                player1: currentData.player1.score,
                player2: currentData.player2.score,
              };
            } else {
              currentData.currentRound += 1;
              currentData.roundStartTime = Date.now();
              currentData.player1.guess = "";
              currentData.player2.guess = "";
              currentData.status = "nextRound";
            }
          }

          return currentData;
        });

        setHasGuessed(true);
        setSelectedOption("");

        // If it's time for the next round, fetch new Pokemon
        const updatedData = (await get(gameRef)).val();
        if (updatedData.status === "nextRound") {
          const newPokemonData = await fetchPokemon();
          await update(gameRef, { 
            currentPokemon: newPokemonData,
            status: "ready",
            roundStartTime: Date.now()
          });
        }
      } catch (error) {
        console.error("Failed to submit guess:", error);
      }
    }
  };

  const handleEmptyGuess = async () => {
    if (gameId && !hasGuessed) {
      const gameRef = ref(db, `games/${gameId}`);
      try {
        await runTransaction(gameRef, (currentData) => {
          if (currentData === null || currentData.status !== "ready") {
            return;
          }

          // Set empty guess
          currentData[currentPlayer].guess = "";
          currentData[currentPlayer].timeTaken =
            Date.now() - currentData.roundStartTime;

          // Proceed with processing guesses
          const correctAnswer =
            currentData.currentPokemon.correct.name.toLowerCase();
          const player1Correct =
            currentData.player1.guess.toLowerCase() === correctAnswer;
          const player2Correct =
            currentData.player2.guess.toLowerCase() === correctAnswer;

          currentData.player1.score += player1Correct ? 100 : 0;
          currentData.player2.score += player2Correct ? 100 : 0;

          if (currentData.currentRound >= 5) {
            currentData.status = "finished";
            currentData.finalScores = {
              player1: currentData.player1.score,
              player2: currentData.player2.score,
            };
          } else {
            currentData.currentRound += 1;
            currentData.roundStartTime = Date.now();
            currentData.player1.guess = "";
            currentData.player2.guess = "";
            currentData.status = "nextRound";
          }

          return currentData;
        });

        setHasGuessed(true);
        setSelectedOption("");

        // If it's time for the next round, fetch new Pokemon
        const updatedData = (await get(gameRef)).val();
        if (updatedData.status === "nextRound") {
          const newPokemonData = await fetchPokemon();
          await update(gameRef, {
            currentPokemon: newPokemonData,
            status: "ready",
            roundStartTime: Date.now(),
          });
        }
      } catch (error) {
        console.error("Failed to handle empty guess:", error);
      }
    }
  };

  useEffect(() => {
    if (gameId) {
      const gameRef = ref(db, `games/${gameId}`);
      setCurrentPlayer(localStorage.getItem("role"));
      const unsubscribe = onValue(gameRef, async (snapshot) => {
        const data = snapshot.val();
        setGameData(data);
        setPokemon(data?.currentPokemon || { correct: {}, options: [] });

        if (data?.currentPokemon && data.currentPokemon.correct.image !== currentImageSrc) {
          setImageLoading(true);
          try {
            await preloadImage(data.currentPokemon.correct.image);
            setImageLoading(false);
            setImageError(false);
            setCurrentImageSrc(data.currentPokemon.correct.image);
          } catch (error) {
            console.error("Failed to preload image:", error);
            setImageLoading(false);
            setImageError(true);
          }
        }

        setScore({
          player1: data?.player1?.score || 0,
          player2: data?.player2?.score || 0,
        });

        if (data?.status === "finished") {
          setGameFinished(true);
          setCountdown(10);
        } else if (data?.status === "ready") {
          setHasGuessed(data[currentPlayer]?.guess !== "");
          setCountdown(30);
        }
      });

      return () => unsubscribe();
    }
  }, [gameId, currentPlayer, currentImageSrc]);

  useEffect(() => {
    if (gameId && gameData?.roundStartTime && !gameFinished) {
      const timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - gameData.roundStartTime) / 1000);
        const remainingTime = Math.max(30 - elapsed, 0);
        setCountdown(remainingTime);

        if (remainingTime <= 0) {
          clearInterval(timer);
          handleEmptyGuess();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameId, gameData, gameFinished]);

  useEffect(() => {
    if (gameId && gameFinished) {
      const timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 0) {
            clearInterval(timer);
            const gameRef = ref(db, `games/${gameId}`);
            remove(gameRef)
              .then(() => {
                setGameId("");
                setHasGuessed(false);
                setGameFinished(false);
                setScore({ player1: 0, player2: 0 });
              })
              .catch((error) => console.error("Failed to delete game:", error));
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameId, gameFinished]);

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
    setTimeout(() => setIsCopied(false), 2000);
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
              <div className="relative w-64 h-64 mx-auto mb-4">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader />
                  </div>
                )}
                {imageError && (
                  <p className="text-red-500 text-center">Error loading image. Please try again.</p>
                )}
                {!imageLoading && !imageError && (
                  <img
                    src={currentImageSrc}
                    alt="Pokemon to guess"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
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
                  ? `${gameData?.player1?.username} wins!`
                  : gameData.finalScores.player2 > gameData.finalScores.player1
                  ? `${gameData?.player2?.username} wins!`
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
