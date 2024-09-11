import React, { useState, useEffect } from 'react'
import { createGame, joinGame, listenToGameState } from '../helpers/gameStateHelper'

function Game() {
  const [gameId, setGameId] = useState(null)
  const [gameState, setGameState] = useState(null)

  useEffect(() => {
    if (gameId) {
      const unsubscribe = listenToGameState(gameId, (newState) => {
        setGameState(newState)
      })
      return () => unsubscribe()
    }
  }, [gameId])

  const handleCreateGame = () => {
    const newGameId = createGame({ status: 'waiting' })
    setGameId(newGameId)
  }

  const handleJoinGame = (id) => {
    joinGame(id, { id: 'player1', name: 'Player 1' })
    setGameId(id)
  }

  return (
    <div>
      <h1>Pokémon Guessing Game</h1>
      {!gameId ? (
        <div>
          <button onClick={handleCreateGame}>Create Game</button>
          <input type="text" placeholder="Game ID" />
          <button onClick={() => handleJoinGame(document.querySelector('input').value)}>Join Game</button>
        </div>
      ) : (
        <div>
          <h2>Game ID: {gameId}</h2>
          <pre>{JSON.stringify(gameState, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default Game