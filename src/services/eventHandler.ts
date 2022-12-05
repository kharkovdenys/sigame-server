import { Game } from "../classes/Game";
import { Server } from "socket.io";
import { writeFile } from "fs/promises";
import Player from "../classes/Player";

const Games: Map<string, Game> = new Map();

export default function eventHandler(io: Server): void {
    io.on("connection", (socket) => {
        console.log(socket.id);

        socket.on('disconnect', () => {
            for (const game of Games) {
                if (game[1].leave(socket.id))
                    socket.to(game[1].id).emit('leave-game', socket.id);
            }
        });

        socket.on('leave-room', (gameid) => {
            if (gameid && Games.get(gameid)?.leave(socket.id)) {
                socket.to(gameid).emit('leave-game', socket.id);
                socket.leave(gameid);
            }
        });

        socket.on('change-ready', (data, callback) => {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (typeof game === "undefined") {
                    callback({ status: 'failed' });
                    return;
                }
                if (game.changeReady(socket.id)) {
                    io.to(data.gameId).emit('player-change-ready', socket.id);
                    callback({ status: 'success' });
                    return;
                }
            }
            callback({ status: 'failed' });
        });

        socket.on('start', async (data, callback) => {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (typeof game === "undefined") {
                    callback({ status: 'failed' });
                    return;
                }
                if (game.start(socket.id)) {
                    game.state = 'show-themes';
                    game.maxPlayers = game.players.length;
                    await callback({ status: 'success' });
                    io.to(data.gameId).emit('start', { themes: game.getThemes(), gameState: game.state, maxPlayers: game.maxPlayers });
                    return;
                }
            }
            callback({ status: 'failed' });
        });

        socket.on('get-game-list', function (callback) {
            const gameList = [];
            for (const [, game] of Games.entries()) {
                gameList.push({ id: game.id, name: game.name, players: game.players.length, maxPlayers: game.maxPlayers, rounds: game.rounds.length });
            }
            callback(gameList);
        });

        socket.on('create-game', async function (data, callback) {
            if (typeof data.showmanName === 'undefined'
                || typeof data.name === 'undefined'
                || typeof data.maxPlayers === 'undefined')
                callback({ status: 'failed' });
            const game = new Game(data.name, data.maxPlayers, data.password, { id: socket.id, name: data.showmanName });
            Games.set(game.id, game);
            socket.join(game.id);
            await game.loadPack();
            callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, gameState: game.state });
        });

        socket.on('join-game', function (data, callback) {
            const { gameId } = data;
            const game = Games.get(gameId);
            if (typeof game === "undefined" || typeof data.name === 'undefined' || typeof data.type === 'undefined') {
                callback({ status: 'failed' });
                return;
            }
            if (data.type === 'player') {
                const player = new Player(socket.id, data.name);
                const join = game.join(player);
                if (join) {
                    socket.join(gameId);
                    socket.to(game.id).emit('player-joined', player);
                    callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, players: game.players, gameState: game.state });
                    return;
                }
            }
            else {
                const showman = { id: socket.id, name: data.name };
                const join = game.joinShowman(showman);
                if (join) {
                    socket.join(gameId);
                    socket.to(gameId).emit('showman-joined', showman);
                    callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, players: game.players, gameState: game.state });
                    return;
                }
            }
            callback({ status: 'failed' });
        });

        socket.on("upload-pack", async (file, callback) => {
            try {
                await writeFile("packs/" + socket.id + ".zip", file);
            } catch {
                callback({ status: "failure" });
            }
            callback({ status: "success" });
        });
    });
}