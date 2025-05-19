import { WebSocket, WebSocketServer } from "ws";

import {
  areAllShipsDestroyed,
  createGameBoard,
  isShipDestroyed,
  markCellsAroundShip,
  placeShips,
} from "./gameLogic.js";
import {
  AttackPayload,
  Game,
  Message,
  Player,
  Room,
  RoomPayload,
  Ship,
  SHIP_LENGTHS,
  ShipPayload,
} from "./types/index.js";

const players: Map<number | string, Player> = new Map();
const playerConnections: Map<number | string, WebSocket> = new Map();
const rooms: Map<number | string, Room> = new Map();
const games: Map<number | string, Game> = new Map();

let nextPlayerId = 1;
let nextRoomId = 1;
let nextGameId = 1;

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀🚀🚀 WebSocket server is running on ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  sendRoomUpdate();
  sendWinnersUpdate();

  ws.on("message", (message: string) => {
    try {
      const parsedMessage: Message = JSON.parse(message);
      console.log("Received message:", parsedMessage);

      handleMessage(ws, parsedMessage);
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");

    handlePlayerDisconnect(ws);
  });
});

function handlePlayerDisconnect(ws: WebSocket) {
  let disconnectedPlayerIndex: number | string | undefined;
  playerConnections.forEach((connection, playerIndex) => {
    if (connection === ws) {
      disconnectedPlayerIndex = playerIndex;
    }
  });

  if (disconnectedPlayerIndex !== undefined) {
    playerConnections.delete(disconnectedPlayerIndex);

    rooms.forEach((room, roomId) => {
      const playerIndex = room.roomUsers.findIndex(
        (user) => user.index === disconnectedPlayerIndex
      );
      if (playerIndex !== -1) {
        room.roomUsers.splice(playerIndex, 1);
        if (room.roomUsers.length === 0) {
          rooms.delete(roomId);
        }
        sendRoomUpdate();
      }
    });

    games.forEach((game, gameId) => {
      if (
        game.players.player1.index === disconnectedPlayerIndex ||
        game.players.player2.index === disconnectedPlayerIndex
      ) {
        const winner =
          game.players.player1.index === disconnectedPlayerIndex
            ? game.players.player2.index
            : game.players.player1.index;

        game.finished = true;
        game.winner = winner;

        const winnerPlayer = players.get(winner);
        if (winnerPlayer) {
          winnerPlayer.wins++;
          sendWinnersUpdate();
        }

        sendToPlayersInGame(gameId, {
          type: "finish",
          data: {
            winPlayer: winner,
          },
          id: 0,
        });
      }
    });
  }
}

function handleMessage(ws: WebSocket, message: Message): void {
  const { type, data, id } = message;

  switch (type) {
    case "reg":
      handleRegistration(ws, data);
      break;
    case "create_room":
      handleCreateRoom(ws);
      break;
    case "add_user_to_room":
      handleAddUserToRoom(ws, data);
      break;
    case "add_ships":
      handleAddShips(ws, data);
      break;
    case "attack":
      handleAttack(ws, data);
      break;
    case "randomAttack":
      handleRandomAttack(ws, data);
      break;
    default:
      console.log(`Unknown message type: ${type}`);
  }
}

function handleRegistration(ws: WebSocket, data: any): void {
  const { name, password } = data;
  let playerIndex: number | string;
  let error = false;
  let errorText = "";

  let existingPlayer: Player | undefined;
  players.forEach((player) => {
    if (player.name === name) {
      existingPlayer = player;
    }
  });

  if (existingPlayer) {
    if (existingPlayer.password !== password) {
      error = true;
      errorText = "Invalid password";
      playerIndex = -1;
    } else {
      playerIndex = existingPlayer.index;
    }
  } else {
    playerIndex = nextPlayerId++;
    players.set(playerIndex, {
      name,
      password,
      index: playerIndex,
      wins: 0,
    });
  }

  if (!error) {
    playerConnections.set(playerIndex, ws);
  }

  const response = {
    type: "reg",
    data: JSON.stringify({
      name,
      index: playerIndex,
      error,
      errorText,
    }),
    id: 0,
  };

  ws.send(JSON.stringify(response));
  console.log("Registration response:", response);

  sendWinnersUpdate();
}

function handleCreateRoom(ws: WebSocket): void {
  let playerIndex: number | string | undefined;
  playerConnections.forEach((connection, index) => {
    if (connection === ws) {
      playerIndex = index;
    }
  });

  if (playerIndex === undefined) {
    console.error("Player not found");
    return;
  }

  const player = players.get(playerIndex);
  if (!player) {
    console.error("Player data not found");
    return;
  }

  const roomId = nextRoomId++;
  const newRoom: Room = {
    roomId,
    roomUsers: [{ name: player.name, index: playerIndex }],
  };

  rooms.set(roomId, newRoom);

  sendRoomUpdate();
}

function handleAddUserToRoom(ws: WebSocket, data: RoomPayload): void {
  const { indexRoom } = data;

  let playerIndex: number | string | undefined;
  playerConnections.forEach((connection, index) => {
    if (connection === ws) {
      playerIndex = index;
    }
  });

  if (playerIndex === undefined) {
    console.error("Player not found");
    return;
  }

  const player = players.get(playerIndex);
  if (!player) {
    console.error("Player data not found");
    return;
  }

  const room = rooms.get(indexRoom);
  if (!room) {
    console.error("Room not found");
    return;
  }

  room.roomUsers.push({ name: player.name, index: playerIndex });

  sendRoomUpdate();

  if (room.roomUsers.length === 2) {
    const gameId = nextGameId++;
    const player1Index = room.roomUsers[0].index;
    const player2Index = room.roomUsers[1].index;

    const game: Game = {
      gameId,
      players: {
        player1: {
          index: player1Index,
          ships: [],
          shipsPlaced: false,
        },
        player2: {
          index: player2Index,
          ships: [],
          shipsPlaced: false,
        },
      },
      currentTurn: null,
      gameBoard: {
        player1: createGameBoard(),
        player2: createGameBoard(),
      },
      started: false,
      finished: false,
      winner: null,
    };

    games.set(gameId, game);

    rooms.delete(indexRoom);
    sendRoomUpdate();

    const player1Connection = playerConnections.get(player1Index);
    const player2Connection = playerConnections.get(player2Index);

    if (player1Connection) {
      player1Connection.send(
        JSON.stringify({
          type: "create_game",
          data: {
            idGame: gameId,
            idPlayer: player1Index,
          },
          id: 0,
        })
      );
    }

    if (player2Connection) {
      player2Connection.send(
        JSON.stringify({
          type: "create_game",
          data: {
            idGame: gameId,
            idPlayer: player2Index,
          },
          id: 0,
        })
      );
    }
  }
}

function handleAddShips(ws: WebSocket, data: ShipPayload): void {
  const { gameId, ships, indexPlayer } = data;

  const game = games.get(gameId);
  if (!game) {
    console.error("Game not found");
    return;
  }

  const isPlayer1 = game.players.player1.index === indexPlayer;
  const isPlayer2 = game.players.player2.index === indexPlayer;

  if (!isPlayer1 && !isPlayer2) {
    console.error("Player not in this game");
    return;
  }

  const playerData = isPlayer1 ? game.players.player1 : game.players.player2;
  const board = isPlayer1 ? game.gameBoard.player1 : game.gameBoard.player2;

  for (const ship of ships) {
    if (!SHIP_LENGTHS[ship.type] || SHIP_LENGTHS[ship.type] !== ship.length) {
      console.error("Invalid ship length:", ship);
      return;
    }
  }

  if (!placeShips(ships, board)) {
    console.error("Invalid ship placement");
    return;
  }

  playerData.ships = ships;
  playerData.shipsPlaced = true;

  if (game.players.player1.shipsPlaced && game.players.player2.shipsPlaced) {
    game.started = true;

    game.currentTurn =
      Math.random() < 0.5 ? game.players.player1.index : game.players.player2.index;

    const player1Connection = playerConnections.get(game.players.player1.index);
    if (player1Connection) {
      player1Connection.send(
        JSON.stringify({
          type: "start_game",
          data: {
            ships: game.players.player1.ships,
            currentPlayerIndex: game.players.player1.index,
          },
          id: 0,
        })
      );
    }

    const player2Connection = playerConnections.get(game.players.player2.index);
    if (player2Connection) {
      player2Connection.send(
        JSON.stringify({
          type: "start_game",
          data: {
            ships: game.players.player2.ships,
            currentPlayerIndex: game.players.player2.index,
          },
          id: 0,
        })
      );
    }

    sendToPlayersInGame(gameId, {
      type: "turn",
      data: {
        currentPlayer: game.currentTurn,
      },
      id: 0,
    });
  }
}

function handleAttack(ws: WebSocket, data: AttackPayload): void {
  const { gameId, x, y, indexPlayer } = data;

  const game = games.get(gameId);
  if (!game) {
    console.error("Game not found");
    return;
  }

  if (game.currentTurn !== indexPlayer) {
    console.error("Not your turn");
    return;
  }

  if (!game.started || game.finished) {
    console.error("Game not in progress");
    return;
  }

  const isPlayer1 = game.players.player1.index === indexPlayer;
  const targetBoard = isPlayer1 ? game.gameBoard.player2 : game.gameBoard.player1;
  const targetShips = isPlayer1 ? game.players.player2.ships : game.players.player1.ships;
  const targetPlayer = isPlayer1
    ? game.players.player2.index
    : game.players.player1.index;

  if (targetBoard[y][x] === "hit" || targetBoard[y][x] === "miss") {
    console.error("Cell already attacked");
    return;
  }

  let status: "miss" | "killed" | "shot" = "miss";

  if (targetBoard[y][x] === "ship") {
    targetBoard[y][x] = "hit";
    status = "shot";

    const hitShip = targetShips.find((ship: Ship) => {
      const { position, direction, length } = ship;
      if (direction) {
        return y === position.y && x >= position.x && x < position.x + length;
      } else {
        return x === position.x && y >= position.y && y < position.y + length;
      }
    });

    if (hitShip && isShipDestroyed(hitShip, targetBoard)) {
      status = "killed";

      const missedCells = markCellsAroundShip(hitShip, targetBoard);

      for (const cell of missedCells) {
        sendToPlayersInGame(gameId, {
          type: "attack",
          data: {
            position: cell,
            currentPlayer: indexPlayer,
            status: "miss",
          },
          id: 0,
        });
      }

      if (areAllShipsDestroyed(targetShips, targetBoard)) {
        game.finished = true;
        game.winner = indexPlayer;

        const winnerPlayer = players.get(indexPlayer);
        if (winnerPlayer) {
          winnerPlayer.wins++;
          sendWinnersUpdate();
        }

        sendToPlayersInGame(gameId, {
          type: "finish",
          data: {
            winPlayer: indexPlayer,
          },
          id: 0,
        });
      }
    }
  } else {
    targetBoard[y][x] = "miss";

    game.currentTurn = targetPlayer;
  }

  sendToPlayersInGame(gameId, {
    type: "attack",
    data: {
      position: { x, y },
      currentPlayer: indexPlayer,
      status,
    },
    id: 0,
  });

  if (!game.finished && status === "miss") {
    sendToPlayersInGame(gameId, {
      type: "turn",
      data: {
        currentPlayer: game.currentTurn,
      },
      id: 0,
    });
  }
}

function handleRandomAttack(ws: WebSocket, data: any): void {
  const { gameId, indexPlayer } = data;

  const game = games.get(gameId);
  if (!game) {
    console.error("Game not found");
    return;
  }

  if (game.currentTurn !== indexPlayer) {
    console.error("Not your turn");
    return;
  }

  const isPlayer1 = game.players.player1.index === indexPlayer;
  const targetBoard = isPlayer1 ? game.gameBoard.player2 : game.gameBoard.player1;

  const availableCells: { x: number; y: number }[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (targetBoard[y][x] !== "hit" && targetBoard[y][x] !== "miss") {
        availableCells.push({ x, y });
      }
    }
  }

  if (availableCells.length === 0) {
    console.error("No available cells");
    return;
  }

  const randomIndex = Math.floor(Math.random() * availableCells.length);
  const { x, y } = availableCells[randomIndex];

  handleAttack(ws, { gameId, x, y, indexPlayer });
}

function sendRoomUpdate(): void {
  const roomsList = Array.from(rooms.values());
  const message = {
    type: "update_room",
    data: JSON.stringify(roomsList),
    id: 0,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });

  console.log("Room update sent:", message);
}

function sendWinnersUpdate(): void {
  const winnersList = Array.from(players.values())
    .map((player) => ({
      name: player.name,
      wins: player.wins,
    }))
    .sort((a, b) => b.wins - a.wins);

  const message = {
    type: "update_winners",
    data: JSON.stringify(winnersList),
    id: 0,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });

  console.log("Winners update sent:", message);
}

function sendToPlayersInGame(gameId: number | string, message: any): void {
  const game = games.get(gameId);
  if (!game) {
    console.error("Game not found");
    return;
  }

  const player1Connection = playerConnections.get(game.players.player1.index);
  const player2Connection = playerConnections.get(game.players.player2.index);

  const messageStr = JSON.stringify(message);

  if (player1Connection && player1Connection.readyState === WebSocket.OPEN) {
    player1Connection.send(messageStr);
  }

  if (player2Connection && player2Connection.readyState === WebSocket.OPEN) {
    player2Connection.send(messageStr);
  }

  console.log("Game message sent:", message);
}

process.on("SIGINT", () => {
  console.log("Shutting down server...");
  wss.close(() => {
    console.log("WebSocket server closed");
    process.exit(0);
  });
});
