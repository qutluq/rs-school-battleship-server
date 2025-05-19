import { Ship } from "./game";

export type RoomPayload = {
  indexRoom: number;
};

export type RegistrationPayload = {
  name: string;
  password: string;
};

export type ShipPayload = {
  gameId: string;
  ships: Ship[];
  indexPlayer: number;
};

export type AttackPayload = {
  gameId: number;
  x: number;
  y: number;
  indexPlayer: number;
};
