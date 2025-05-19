export type Player = {
  name: string;
  password: string;
  index: number | string;
  wins: number;
};

export type Room = {
  roomId: number | string;
  roomUsers: { name: string; index: number | string }[];
};

export type Direction = "horizontal" | "vertical";

export type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: Direction;
  length: number;
  type: "small" | "medium" | "large" | "huge";
};

export type Game = {
  gameId: number | string;
  players: {
    player1: {
      index: number | string;
      ships: Ship[];
      shipsPlaced: boolean;
    };
    player2: {
      index: number | string;
      ships: Ship[];
      shipsPlaced: boolean;
    };
  };
  currentTurn: number | string | null;
  gameBoard: {
    player1: (null | "ship" | "hit" | "miss")[][];
    player2: (null | "ship" | "hit" | "miss")[][];
  };
  started: boolean;
  finished: boolean;
  winner: number | string | null;
};

export type Message = {
  type: string;
  data: any;
  id: number;
};

export const SHIP_LENGTHS = {
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
};

export const BOARD_SIZE = 10;
