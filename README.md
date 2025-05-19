# Websocket Battleship Server

A real-time multiplayer Battleship game server implementation using WebSockets.

## Description

This project implements a backend server for a Battleship game using WebSockets. The server handles player authentication, game room management, ship placement, attack coordination, and game state updates in real-time.

## Features

- WebSocket-based real-time communication
- Player registration and authentication
- Game room creation and management
- Ship placement validation
- Turn-based gameplay mechanics
- In-memory data storage
- Optional single-player mode with AI bot

## Requirements

- Node.js v22.x.x (22.14.0 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/qutluq/rs-school-battleship-server.git
   cd rs-school-battleship-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Usage

**Production**

`npm run start`

* App served @ `http://localhost:8181` without nodemon

## WebSocket Communication Protocol

The server handles three types of responses:

### 1. Personal Responses
- `reg` - Player registration/login response

### 2. Game Room Responses
- `create_game` - Contains game ID and player ID
- `start_game` - Information about the game and player ship positions
- `turn` - Indicates which player's turn it is to shoot
- `attack` - Coordinates of shot and status (hit, miss, kill)
- `finish` - ID of the winner

### 3. Global Responses
- `update_room` - List of rooms and players in rooms
- `update_winners` - Score table sent to all players

## Game Flow

1. Player registers/logs in to the server
2. Player creates a game room or joins an existing one
3. Game starts when 2 players are connected and have placed their ships
4. Server determines the first player to move
5. Players take turns shooting at opponent's board
6. If a player hits a ship, they get an extra turn
7. Game ends when one player destroys all opponent's ships

## WebSocket Command Sequence

```
  Player1               Server                  Player2             
    reg         -->                    
                <--        reg     
                <--    update_room    
                <--   update_winners  
 create_room    -->
                <--    update_room    
                                      <--         reg
                           reg        -->
                <--    update_room    -->
                <--   update_winners  -->                       
                                      <--    add_user_to_room
                <--    update_room    -->
                <--    create_game    -->
   add_ships    -->
                                      <--       add_ships
                <--     start_game    -->  
                <--        turn       -->  
 attack (miss)  -->
                <--       attack      -->  
                <--        turn       -->
                                      <--     randomAttack (shoot)
                <--       attack      -->  
                <--        turn       -->
                                      <--     randomAttack (kill)
                <--       attack      -->  
                <--        turn       -->
                           ...          
                <--      finish       -->
                <--   update_winners  -->
```

## API Reference

### Client-to-Server Messages

| Message | Description | Parameters |
|---------|-------------|------------|
| `reg` | Register/login a player | `{login: string, password: string}` |
| `create_room` | Create a new game room | `{roomId: string}` |
| `add_user_to_room` | Join an existing room | `{roomId: string}` |
| `add_ships` | Send ship positions | `{ships: Ship[]}` |
| `attack` | Attack opponent's board | `{x: number, y: number}` |

### Server-to-Client Messages

| Message | Description | Data |
|---------|-------------|------|
| `reg` | Registration response | `{id: string, login: string, error?: string}` |
| `update_room` | Room list update | `{rooms: Room[]}` |
| `update_winners` | Winners scoreboard | `{winners: Winner[]}` |
| `create_game` | Game created | `{gameId: string, playerId: string}` |
| `start_game` | Game started | `{ships: Ship[], opponent: string}` |
| `turn` | Turn notification | `{player: string}` |
| `attack` | Attack result | `{x: number, y: number, hit: boolean, killed?: boolean, ship?: Ship}` |
| `finish` | Game ended | `{winner: string}` |

## Data Models

### Ship
```typescript
interface Ship {
  x: number;
  y: number;
  length: number;
  direction: 'horizontal' | 'vertical';
  hit?: number[];  // Indices of ship segments that are hit
}
```

### Room
```typescript
interface Room {
  id: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
}
```

### Winner
```typescript
interface Winner {
  name: string;
  wins: number;
}
```

## Implementation Details

- In-memory database for player credentials
- Room data storage for active games
- Ship placement validation
- Turn-based gameplay management
- Hit/miss/kill detection logic

## Optional Features

- Single-player mode with AI opponent
- Persistent leaderboard
- Custom game settings

## License

[MIT](#license)

Copyright <2025> <Arislan Makhmudov>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.