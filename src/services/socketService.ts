import { Game } from "../classes/Game";
import { Server } from "socket.io";
import Player from "../classes/Player";
import { deleteFolder, existsZip, writeZip } from "./fileService";
import { chooseQuestions, clickQuestion, clickTheme, showRoundThemes } from "./gameService";
import Timer from "../classes/Timer";

export const Games: Map<string, Game> = new Map();
const Leave: Map<string, NodeJS.Timeout> = new Map();

export default function socket(io: Server): void {
    io.on("connection", (socket) => {
        console.log(socket.id);

        socket.on('disconnect', () => {
            for (const game of Games) {
                const name = game[1].leave(socket.id);
                if (name !== false) {
                    const timer = setTimeout(() => {
                        socket.to(game[1].id).emit('leave-game', socket.id);
                        if (!game[1].players.filter(p => p.id).length && !game[1].showman.id) {
                            game[1].timer?.pause();
                            game[1].answering?.pause();
                            Games.delete(game[0]);
                            deleteFolder(game[0]);
                        }
                        Leave.delete(name);
                    }, 5000);
                    Leave.set(name, timer);
                }
            }
        });

        socket.on('leave-room', (gameid) => {
            const game = Games.get(gameid);
            if (gameid && game && game.leave(socket.id)) {
                socket.to(gameid).emit('leave-game', socket.id);
                socket.leave(gameid);
                if (!game.players.filter(p => p.id).length && !game.showman.id) {
                    game.timer?.pause();
                    game.answering?.pause();
                    Games.delete(game.id);
                    deleteFolder(game.id);
                }
            }
        });

        socket.on('change-ready', (data, callback) => {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (!game) {
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
                if (!game) {
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
                if (!game) {
                    callback({ status: 'failed' });
                    return;
                }
                if (game.start(socket.id)) {
                    game.state = 'show-themes';
                    game.maxPlayers = game.players.length;
                    await callback({ status: 'success' });
                    const themes = game.getThemes();
                    io.to(data.gameId).emit('start', { themes, gameState: game.state, maxPlayers: game.maxPlayers });
                    game.timer = new Timer(() => showRoundThemes(io, game), 1000 * themes.length);
                    return;
                }
            }
            callback({ status: 'failed' });
        });

        socket.on('skip', async (data, callback) => {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (!game) {
                    callback({ status: 'failed' });
                    return;
                }
                if (game.answering) {
                    game.answering.pause();
                    game.answering.remaining = 0;
                    game.answering.resume();
                    game.answering = undefined;
                    callback({ status: 'success' });
                    return;
                }
                if (game.timer) {
                    game.timer.pause();
                    game.timer.remaining = 0;
                    game.timer.resume();
                    game.timer = undefined;
                    callback({ status: 'success' });
                    return;
                }
            }
            callback({ status: 'failed' });
        });

        socket.on('choose-player', function (data) {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (!game) return;
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
                if (!game) return;
                if (game.state === 'choose-questions' && game.players.filter(p => p.id === socket.id && p.name === game.chooser).length) {
                    if (game.rounds[game.currentRound].themes[data.j].questions[data.i].price !== undefined) {
                        game.timer?.pause();
                        game.timer = undefined;
                        clickQuestion(io, game, data.i, data.j);
                    }
                }
            }
        });

        socket.on('send-answer-result', function (data) {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (!game) return;
                if (game.state === 'answering' && game.showman.id === socket.id) {
                    if (data.result) {
                        game.answering?.pause();
                        game.answering = undefined;
                        if (game.timer)
                            game.timer.remaining = 0;
                        game.chooser = data.chooser;
                        game.timer?.resume();
                        game.players.forEach(p => {
                            if (p.name === data.chooser) {
                                p.score = p.score + parseInt((game.currentQuestion?.price ?? '0').toString());
                                io.to(game.id).emit('player-change-score', { playerName: p.name, score: p.score });
                            }
                        });
                    }
                    else {
                        game.answering?.pause();
                        if (game.answering)
                            game.answering.remaining = 0;
                        game.answering?.resume();
                        game.answering = undefined;
                    }
                }
            }
        });

        socket.on('click-for-answer', function (data) {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (!game) return;
                if (game.state === 'show-question') {
                    if ((game.cooldown.get(socket.id) ?? 0) < Date.now()) {
                        game.cooldown.set(socket.id, Date.now() + 5000);
                    }
                }
                if (game.state === 'can-answer') {
                    if ((game.cooldown.get(socket.id) ?? 0) < Date.now() && !game.clicked.has(socket.id) && !game.answering) {
                        game.clicked.add(socket.id);
                        game.timer?.pause();
                        game.state = 'answering';
                        io.to(game.showman.id ?? '').emit('correct-answer', game.currentQuestion?.answer);
                        const player = game.players.filter(p => p.id === socket.id)[0];
                        io.to(game.id).emit('answering', { gameState: game.state, chooser: player ? player.name : '' });
                        game.answering = new Timer(() => {
                            game.state = 'can-answer';
                            io.to(game.id).emit('can-answer', { gameState: game.state, timing: (game.timer?.remaining ?? 0) / 1000 });
                            game.timer?.resume();
                            console.log(socket.id);
                            game.players.forEach(p => {
                                if (p.id === socket.id) {
                                    p.score -= game.currentQuestion?.price ?? 0;
                                    io.to(game.id).emit('player-change-score', { playerName: p.name, score: p.score });
                                }
                            });
                            game.answering = undefined;
                        }, 30000);
                    }
                }
            }
        });

        socket.on('choose-theme', function (data) {
            if (data.gameId) {
                const game = Games.get(data.gameId);
                if (!game) return;
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
                if (!game) return;
                if (game.state === 'rates') {
                    const player = game.players.filter(p => p.id === socket.id)[0];
                    if (player && player.state !== "Not a finalist" && !game.rates.get(player.name) && player.score >= data.score && player.score > 0) {
                        game.rates.set(player.name, data.score);
                        if (game.rates.size === game.players.filter(p => p.state !== 'Not a finalist').length && game.timer) {
                            game.timer.pause();
                            game.timer.remaining = 0;
                            game.timer.resume();
                        }
                    }
                }
            }
        });

        socket.on('get-game-list', function (callback) {
            const gameList = [];
            for (const [, game] of Games.entries()) {
                gameList.push({ id: game.id, name: game.name, players: game.players.filter(p => p.id).length, maxPlayers: game.maxPlayers, rounds: game.rounds.length });
            }
            callback(gameList);
        });

        socket.on('create-game', async function (data, callback) {
            if (!data.showmanName || !(await existsZip(socket.id)) || !data.name || !data.maxPlayers)
                callback({ status: 'failed' });
            const game = new Game(data.name, data.maxPlayers, data.password, { id: socket.id, name: data.showmanName });
            Games.set(game.id, game);
            socket.join(game.id);
            try {
                await game.loadPack();
                callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, gameState: game.state, packInfo: game.packInfo?.getString() });
                game.loading = false;
            } catch {
                Games.delete(game.id);
                callback({ status: 'failed' });
            }

        });

        socket.on('join-game', function (data, callback) {
            const { gameId } = data;
            const game = Games.get(gameId);
            if (!game || !data.name || !data.type) {
                callback({ status: 'failed' });
                return;
            }
            clearTimeout(Leave.get(data.name));
            let join;
            if (data.type === 'player') {
                const player = new Player(socket.id, data.name.trim());
                join = game.join(player);
                if (join) {
                    socket.join(gameId);
                    socket.to(game.id).emit('player-joined', { players: game.players, chooser: game.chooser });
                }
            }
            else {
                const showman = { id: socket.id, name: data.name.trim() };
                join = game.joinShowman(showman);
                if (join) {
                    socket.join(gameId);
                    socket.to(gameId).emit('showman-joined', showman);
                }
            }
            if (join) {
                callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, players: game.players, gameState: game.state, packInfo: game.packInfo?.getString(), themes: game.getThemes(), roundName: game.rounds[game.currentRound].name, chooser: game.chooser, questions: game.getQuestionsRounds(), typeRound: game.rounds[game.currentRound].type });
                return;
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