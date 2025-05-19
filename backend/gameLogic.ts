import { BOARD_SIZE, Game, Ship } from "./types/index.js";

export function createGameBoard(): (null | "ship" | "hit" | "miss")[][] {
  const board = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board.push(Array(BOARD_SIZE).fill(null));
  }
  return board;
}

export function isValidShipPlacement(
  ships: Ship[],
  ship: Ship,
  board: (null | "ship" | "hit" | "miss")[][]
): boolean {
  const { x, y } = ship.position;
  const { direction, length } = ship;

  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    return false;
  }

  if (direction === "horizontal") {
    if (x + length > BOARD_SIZE) {
      return false;
    }

    for (let i = 0; i < length; i++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + i + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < BOARD_SIZE &&
            ny >= 0 &&
            ny < BOARD_SIZE &&
            board[ny][nx] === "ship"
          ) {
            return false;
          }
        }
      }
    }
  } else {
    if (y + length > BOARD_SIZE) {
      return false;
    }

    for (let i = 0; i < length; i++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + dx;
          const ny = y + i + dy;
          if (
            nx >= 0 &&
            nx < BOARD_SIZE &&
            ny >= 0 &&
            ny < BOARD_SIZE &&
            board[ny][nx] === "ship"
          ) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

export function placeShips(
  ships: Ship[],
  board: (null | "ship" | "hit" | "miss")[][]
): boolean {
  const tempBoard = board.map((row) => [...row]);

  for (const ship of ships) {
    const { x, y } = ship.position;
    const { direction, length } = ship;

    if (!isValidShipPlacement(ships, ship, tempBoard)) {
      return false;
    }

    if (direction === "horizontal") {
      for (let i = 0; i < length; i++) {
        tempBoard[y][x + i] = "ship";
      }
    } else {
      for (let i = 0; i < length; i++) {
        tempBoard[y + i][x] = "ship";
      }
    }
  }

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      board[y][x] = tempBoard[y][x];
    }
  }

  return true;
}

export function isShipDestroyed(
  ship: Ship,
  board: (null | "ship" | "hit" | "miss")[][]
): boolean {
  const { x, y } = ship.position;
  const { direction, length } = ship;

  if (direction === "horizontal") {
    for (let i = 0; i < length; i++) {
      if (board[y][x + i] !== "hit") {
        return false;
      }
    }
  } else {
    for (let i = 0; i < length; i++) {
      if (board[y + i][x] !== "hit") {
        return false;
      }
    }
  }

  return true;
}

export function markCellsAroundShip(
  ship: Ship,
  board: (null | "ship" | "hit" | "miss")[][]
): { x: number; y: number }[] {
  const { x, y } = ship.position;
  const { direction, length } = ship;
  const missedCells: { x: number; y: number }[] = [];

  if (direction === "horizontal") {
    for (let i = -1; i <= length; i++) {
      for (let j = -1; j <= 1; j++) {
        const nx = x + i;
        const ny = y + j;
        if (
          nx >= 0 &&
          nx < BOARD_SIZE &&
          ny >= 0 &&
          ny < BOARD_SIZE &&
          board[ny][nx] !== "hit"
        ) {
          board[ny][nx] = "miss";
          missedCells.push({ x: nx, y: ny });
        }
      }
    }
  } else {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= length; j++) {
        const nx = x + i;
        const ny = y + j;
        if (
          nx >= 0 &&
          nx < BOARD_SIZE &&
          ny >= 0 &&
          ny < BOARD_SIZE &&
          board[ny][nx] !== "hit"
        ) {
          board[ny][nx] = "miss";
          missedCells.push({ x: nx, y: ny });
        }
      }
    }
  }

  return missedCells;
}

export function areAllShipsDestroyed(
  ships: Ship[],
  board: (null | "ship" | "hit" | "miss")[][]
): boolean {
  for (const ship of ships) {
    if (!isShipDestroyed(ship, board)) {
      return false;
    }
  }
  return true;
}
