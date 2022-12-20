import { Game } from "../classes/Game";
import { Server } from "socket.io";
import Player from "../classes/Player";
import { existsZip, writeZip } from "./fileService";
import { chooseQuestions, clickQuestion, clickTheme, showRoundThemes } from "./gameService";

export const Games: Map<string, Game> = new Map();

export default function socket(io: Server): void {
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
                if (game === undefined) {
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

        socket.on('change-score', (data, callback) => {
            if (data.gameId && data.playerName && data.score !== undefined) {
                const game = Games.get(data.gameId);
                if (game === undefined) {
                    callback({ status: 'failed' });
                    return;
                }
                if (game.showman.id === socket.id) {
                    if (game.players.filter(p => p.name === data.playerName).length) {
                        game.players.forEach((player) => {
                            if (player.name === data.playerName) {
                                player.score = parseInt(data.score);
                            }
                        });
                        io.to(data.gameId).emit('player-change-score', { playerName: data.playerName, score: data.score });
                        callback({ status: 'success' });
                        return;
                    }
                }
            }
            callback({ status: 'failed' });
        });

        socket.on('start', async (data, callback) => {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (game === undefined) {
                    callback({ status: 'failed' });
                    return;
                }
                if (game.start(socket.id)) {
                    game.state = 'show-themes';
                    game.maxPlayers = game.players.length;
                    await callback({ status: 'success' });
                    const themes = game.getThemes();
                    io.to(data.gameId).emit('start', { themes, gameState: game.state, maxPlayers: game.maxPlayers });
                    setTimeout(() => showRoundThemes(io, game), 1000 * themes.length);
                    return;
                }
            }
            callback({ status: 'failed' });
        });

        socket.on('choose-player', function (data) {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (game === undefined) {
                    return;
                }
                if (game.state === 'choose-player-start' && game.showman.id === socket.id) {
                    const { min } = game.minScore();
                    for (const player of game.players) {
                        if (player.name === data.playerName && player.score === min) {
                            game.chooser = player.name;
                            game.timer?.pause();
                            chooseQuestions(io, game);
                        }
                    }
                }
            }
        });

        socket.on('choose-question', function (data) {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (game === undefined) {
                    return;
                }
                if (game.state === 'choose-questions' && game.players.filter(p => p.id === socket.id && p.name === game.chooser).length) {
                    if (game.rounds[game.currentRound].themes[data.j].questions[data.i].price !== undefined) {
                        game.timer?.pause();
                        clickQuestion(io, game, data.i, data.j);
                    }
                }
            }
        });

        socket.on('choose-theme', function (data) {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (game === undefined) {
                    return;
                }
                if (game.state === 'choose-theme' && game.players.filter(p => p.id === socket.id && p.name === game.chooser).length) {
                    if (game.rounds[game.currentRound].themes[data.i].name !== '⠀') {
                        game.timer?.pause();
                        clickTheme(io, game, data.i);
                    }
                }
            }
        });

        socket.on('send-rate', function (data) {
            if (data.gameId && data.score !== undefined) {
                const game = Games.get(data.gameId);
                if (game === undefined) {
                    return;
                }
                if (game.state === 'rates') {
                    const player = game.players.filter(p => p.id === socket.id)[0];
                    if (player.state !== "Not a finalist" && game.rates.get(player.name) === undefined && player.score <= data.score && player.score > 0) {
                        game.rates.set(player.name, data.score);
                    }
                }
            }
        });

        socket.on('get-game-list', function (callback) {
            const gameList = [];
            for (const [, game] of Games.entries()) {
                gameList.push({ id: game.id, name: game.name, players: game.players.length, maxPlayers: game.maxPlayers, rounds: game.rounds.length });
            }
            callback(gameList);
        });

        socket.on('create-game', async function (data, callback) {
            if (data.showmanName === undefined || !existsZip(socket.id)
                || data.name === undefined || data.maxPlayers === undefined)
                callback({ status: 'failed' });
            const game = new Game(data.name, data.maxPlayers, data.password, { id: socket.id, name: data.showmanName });
            Games.set(game.id, game);
            socket.join(game.id);
            await game.loadPack();
            callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, gameState: game.state, packInfo: game.packInfo?.getString() });
        });

        socket.on('join-game', function (data, callback) {
            const { gameId } = data;
            const game = Games.get(gameId);
            if (game === undefined || data.name === undefined || data.type === undefined) {
                callback({ status: 'failed' });
                return;
            }
            if (data.type === 'player') {
                const player = new Player(socket.id, data.name.trim());
                const join = game.join(player);
                if (join) {
                    socket.join(gameId);
                    socket.to(game.id).emit('player-joined', player);
                    callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, players: game.players, gameState: game.state, packInfo: game.packInfo?.getString() });
                    return;
                }
            }
            else {
                const showman = { id: socket.id, name: data.name.trim() };
                const join = game.joinShowman(showman);
                if (join) {
                    socket.join(gameId);
                    socket.to(gameId).emit('showman-joined', showman);
                    callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, players: game.players, gameState: game.state, packInfo: game.packInfo?.getString() });
                    return;
                }
            }
            callback({ status: 'failed' });
        });

        socket.on("upload-pack", async (file, callback) => {
            try {
                await writeZip(socket.id, file);
            } catch {
                callback({ status: "failure" });
            }
            callback({ status: "success" });
        });
    });
}