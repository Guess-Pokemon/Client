import React, { useState, useEffect, useCallback } from "react";
import {
  ref,
  set,
  onValue,
  update,
  remove,
  get,
  runTransaction,
} from "firebase/database";
import { db } from "../config/firebaseConfig";
import { v4 as uuidv4 } from "uuid";
import Loader from "../components/Loader";
import { RiFileCopyLine } from "react-icons/ri";
import { MdDone } from "react-icons/md";
import Swal from "sweetalert2";
import { Howl, Howler } from "howler";

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
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize sounds
  const sounds = {
    joinGame: new Howl({ src: ["/sounds/joinGame.wav"], html5: true }),
    timeout: new Howl({ src: ["/sounds/timeOut.wav"], html5: true }),
    wrong: new Howl({ src: ["/sounds/wrong.wav"], html5: true }),
    correct: new Howl({ src: ["/sounds/correct.wav"], html5: true }),
    gameOver: new Howl({ src: ["/sounds/gameOver.wav"], html5: true }),
  };

  const playSound = (soundName) => {
    if (soundName in sounds) {
      sounds[soundName].play();
    }
  };

  const stopSound = (soundName) => {
    if (soundName in sounds) {
      sounds[soundName].stop();
    }
  };

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
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Game not available or already started",
      });
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
          if (
            currentData === null ||
            currentData.status !== "ready" ||
            currentData[currentPlayer].guess
          ) {
            return;
          }

          currentData[currentPlayer].guess = selectedOption;
          currentData[currentPlayer].timeTaken =
            Date.now() - currentData.roundStartTime;

          if (currentData.player1.guess && currentData.player2.guess) {
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
          }

          return currentData;
        });

        setHasGuessed(true);
        setSelectedOption("");

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

          currentData[currentPlayer].guess = "";
          currentData[currentPlayer].timeTaken =
            Date.now() - currentData.roundStartTime;

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

        if (
          data?.currentPokemon &&
          data.currentPokemon.correct.image !== currentImageSrc
        ) {
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
          showEndGameAlert(data);
          if (soundEnabled) {
            playSound("gameOver");
          }
          localStorage.removeItem("role");
          localStorage.removeItem("gameId");
        } else if (data?.status === "ready") {
          setHasGuessed(data[currentPlayer]?.guess !== "");
          setCountdown(30);

          if (
            data[currentPlayer]?.guess === "" &&
            (data.player1.guess !== "" || data.player2.guess !== "")
          ) {
            const Toast = Swal.mixin({
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 4000,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
              },
            });
            Toast.fire({
              icon: "info",
              title: "Your opponent has already submitted their guess.",
            });
          }
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
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
    });
    Toast.fire({
      icon: "success",
      title: "Game ID has been copied to clipboard.",
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const showEndGameAlert = (data) => {
    const player1Wins = data.finalScores.player1 > data.finalScores.player2;
    const player2Wins = data.finalScores.player2 > data.finalScores.player1;
    const isDraw = data.finalScores.player1 === data.finalScores.player2;

    const winnerImage =
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJSXjCSs_Gaeq5JffAPcLx_jO9lQ2xyGkCvw&s";
    const loserImage =
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy5QrEjvQ1XKDIGoLIMikTXibvbQ7IO7orKQ&s";
    const drawImage =
      "https://i.pinimg.com/736x/fe/92/e5/fe92e5f1db324cac2e036ab2af869e59.jpg";

    if (isDraw) {
      Swal.fire({
        title: "It's a Draw!",
        imageUrl: drawImage,
        imageAlt: "Draw Image",
        timer: 4000,
        showConfirmButton: false,
      });
    } else {
      if (data.player1.username === username) {
        Swal.fire({
          title: player1Wins ? "You Win!" : "You Lose!",
          imageUrl: player1Wins ? winnerImage : loserImage,
          imageAlt: "Result Image",
          timer: 4000,
          showConfirmButton: false,
        });
      }

      if (data.player2.username === username) {
        Swal.fire({
          title: player2Wins ? "You Win!" : "You Lose!",
          imageUrl: player2Wins ? winnerImage : loserImage,
          imageAlt: "Result Image",
          timer: 4000,
          showConfirmButton: false,
        });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="py-4 px-4 mx-auto max-w-screen-xl">
        <h1 className="text-5xl font-bold mb-8 dark:text-white">
          Pokémon Guessing Game
        </h1>
      </div>
      {!gameId ? (
        <div className="py-8 px-4 mx-auto max-w-screen-xl">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-start">
              <button
                onClick={createNewGame}
                className="bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Create Game
              </button>
            </div>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0 items-center">
              <div className="relative w-full sm:w-2/3">
                <input
                  type="text"
                  placeholder="Enter Game ID"
                  value={inputGameId}
                  onChange={(e) => setInputGameId(e.target.value)}
                  className="block w-full p-4 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                />
              </div>
              <button
                onClick={joinExistingGame}
                className="bg-green-700 hover:bg-green-800 text-white font-medium rounded-lg text-sm px-4 py-3 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 mx-auto max-w-screen-xl">
          <div className="mb-4 text-xl dark:text-white">
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
              <p className="font-bold text-2xl dark:text-white">
                Waiting for another player to join...
              </p>
            </div>
          ) : gameData?.status === "ready" ? (
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 mx-auto w-full max-w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center dark:text-white">
                Guess the Pokémon{" "}
                <span className="text-lg font-semibold">
                  (Round {gameData.currentRound}/5)
                </span>
              </h2>

              <div className="relative w-full h-64 mx-auto mb-4 md:mb-6">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <Loader />
                  </div>
                )}
                {imageError && (
                  <p className="text-red-500 text-center dark:text-white">
                    Error loading image. Please try again.
                  </p>
                )}
                {!imageLoading && !imageError && (
                  <img
                    src={currentImageSrc}
                    alt="Pokemon to guess"
                    className="w-full h-full object-contain rounded-lg shadow-inner"
                  />
                )}
              </div>

              <div className="text-xl mb-4 md:mb-6 text-center dark:text-white">
                Time remaining:{" "}
                <span className="font-semibold">{countdown} seconds</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 md:mb-6">
                {pokemon.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedOption(option)}
                    className={`p-2 sm:p-4 rounded-lg border border-transparent text-sm sm:text-lg font-medium ${
                      selectedOption === option
                        ? "bg-blue-500 text-white shadow-lg"
                        : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                    }`}
                    disabled={hasGuessed || gameFinished}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {!hasGuessed && !gameFinished && (
                <div className="flex justify-center mb-4 md:mb-6">
                  <button
                    onClick={handleGuess}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-md transition-colors duration-300"
                    disabled={!selectedOption}
                  >
                    Submit Guess
                  </button>
                </div>
              )}

              <div className="text-lg text-center dark:text-white">
                <h3 className="text-xl font-bold mb-4 dark:text-white">
                  Final Scores
                </h3>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                    <span className="font-semibold text-lg">
                      {gameData?.player1?.username}
                    </span>
                    <span className="font-normal text-lg text-gray-700 dark:text-gray-300">
                      {score.player1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">
                      {gameData?.player2?.username}
                    </span>
                    <span className="font-normal text-lg text-gray-700 dark:text-gray-300">
                      {score.player2}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : gameData?.status === "finished" ? (
            <div className="p-6 mx-auto max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <h2 className="text-4xl font-bold mb-4 text-center dark:text-white">
                Game Over!
              </h2>
              <div className="text-xl font-semibold mb-4 text-center dark:text-white">
                Final Scores:
              </div>
              <div className="text-lg dark:text-white">
                <div className="flex justify-between mb-2 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
                  <span className="font-medium">
                    {gameData?.player1?.username}:
                  </span>
                  <span>{gameData.finalScores.player1}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="font-medium">
                    {gameData?.player2?.username}:
                  </span>
                  <span>{gameData.finalScores.player2}</span>
                </div>
              </div>
              <div className="text-xl font-bold mt-4 text-center dark:text-white">
                {gameData.finalScores.player1 > gameData.finalScores.player2
                  ? `${gameData?.player1?.username} wins!`
                  : gameData.finalScores.player2 > gameData.finalScores.player1
                  ? `${gameData?.player2?.username} wins!`
                  : "It's a tie!"}
              </div>
              <div className="text-md mt-4 text-center dark:text-white">
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
