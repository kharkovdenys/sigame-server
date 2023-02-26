import { Server } from 'socket.io';

import { Game } from '../classes/Game';
import Player from '../classes/Player';
import Timer from '../classes/Timer';
import { Files } from '../controllers/upload';
import { deleteZip } from './fileService';
import { chooseQuestions, clickQuestion, clickTheme, showRoundThemes } from './gameService';

export const Games: Map<string, Game> = new Map();
const Leave: Map<string, NodeJS.Timeout> = new Map();

export default function socket(io: Server): void {
    io.on("connection", (socket) => {
        console.log(socket.id);

        socket.on('disconnect', () => {
            Files.delete(socket.id);
            deleteZip(socket.id);
            for (const game of Games) {
                const name = game[1].leave(socket.id);
                if (name !== false) {
                    const timer = setTimeout(() => {
                        socket.to(game[1].id).emit('leave-game', socket.id);
                        if (!game[1].players.some(p => p.id) && !game[1].showman.id) {
                            game[1].timer?.pause();
                            game[1].answering?.pause();
                            Games.delete(game[0]);
                            io.to("game-list").emit("deleted-game", game[0]);
                            deleteZip(game[0]);
                        }
                        Leave.delete(name);
                    }, 5000);
                    Leave.set(name, timer);
                }
            }
        });

        socket.on('leave-room', (gameId) => {
            const game = Games.get(gameId);
            if (game && game.leave(socket.id)) {
                socket.to(gameId).emit('leave-game', socket.id);
                socket.leave(gameId);
                if (!game.players.some(p => p.id) && !game.showman.id) {
                    game.timer?.pause();
                    game.answering?.pause();
                    Games.delete(game.id);
                    io.to("game-list").emit("deleted-game", game.id);
                    deleteZip(game.id);
                }
            }
        });

        socket.on('change-ready', ({ gameId }, callback) => {
            const game = Games.get(gameId);
            if (!game) return callback({ status: 'failed', message: 'Game not found' });
            const status = game.changeReady(socket.id);
            if (status !== true) return callback({ status: 'failed', message: status.message });
            io.to(gameId).emit('player-change-ready', socket.id);
            callback({ status: 'success' });
        });

        socket.on('change-score', ({ gameId, playerName, score }, callback) => {
            if (!gameId || !playerName || isNaN(parseInt(score))) return callback({ status: 'failed', message: 'Incorrect data' });
            const game = Games.get(gameId);
            if (!game) return callback({ status: 'failed', message: 'Game not found' });
            if (game.showman.id !== socket.id) return callback({ status: 'failed', message: 'You have to be a showman' });
            const index = game.players.findIndex(p => p.name === playerName);
            if (index === -1) return callback({ message: 'This player was not found' });
            game.players[index].score = parseInt(score);
            io.to(gameId).emit('player-change-score', { playerName: playerName, score: score });
            callback({ status: 'success' });
        });

        socket.on('start', ({ gameId }, callback) => {
            const game = Games.get(gameId);
            if (!game) return callback({ status: 'failed', message: 'Game not found' });
            const status = game.start(socket.id);
            if (status !== true) return callback({ status: 'failed', message: status.message });
            game.state = 'show-themes';
            game.maxPlayers = game.players.length;
            const themes = game.getThemes();
            io.to(gameId).emit('start', { themes, gameState: game.state, maxPlayers: game.maxPlayers });
            game.timer = new Timer(() => showRoundThemes(io, game), 1000 * themes.length);
            callback({ status: 'success' });
        });

        socket.on('skip', ({ gameId }, callback) => {
            const game = Games.get(gameId);
            if (!game) return callback({ status: 'failed', message: 'Game not found' });
            if (game.showman.id !== socket.id) return callback({ status: 'failed', message: 'You have to be a showman' });
            if (game.pause) return callback({ status: 'failed', message: 'The game should not be paused' });
            if (game.answering) {
                game.answering.skip();
                game.answering = undefined;
                return callback({ status: 'success' });
            }
            if (game.timer) {
                game.timer.skip();
                game.timer = undefined;
                return callback({ status: 'success' });
            }
            callback({ status: 'failed', message: 'There was an error' });
        });

        socket.on('pause', ({ gameId }, callback) => {
            const game = Games.get(gameId);
            if (!game) return callback({ status: 'failed', message: 'Game not found' });
            if (game.showman.id !== socket.id) return callback({ status: 'failed', message: 'You have to be a showman' });
            if (game.answering) {
                game.pause ? game.answering.resume() : game.answering.pause();
                game.pause = game.pause ? false : true;
                io.to(game.id).emit('pause', game.pause);
                return callback({ status: 'success' });
            }
            if (game.timer) {
                game.pause ? game.timer.resume() : game.timer.pause();
                game.pause = game.pause ? false : true;
                io.to(game.id).emit('pause', game.pause);
                return callback({ status: 'success' });
            }
            callback({ status: 'failed', message: 'There was an error' });
        });

        socket.on('choose-player', ({ gameId, playerName }) => {
            const game = Games.get(gameId);
            if (!game || game.pause || !playerName || game.state !== 'choose-player-start' || game.showman.id !== socket.id) return;
            const { min } = game.minScore();
            for (const player of game.players) {
                if (player.name === playerName && player.score === min) {
                    game.chooser = player.name;
                    game.timer?.pause();
                    chooseQuestions(io, game);
                }
            }
        });

        socket.on('choose-question', ({ gameId, i, j }) => {
            const game = Games.get(gameId);
            if (!game || game.pause || i === undefined || j === undefined || game.state !== 'choose-questions' || !game.players.some(p => p.id === socket.id && p.name === game.chooser)) return;
            if (game.rounds[game.currentRound].themes[j].questions[i].price !== undefined) {
                game.timer?.pause();
                clickQuestion(io, game, i, j);
            }
        });

        socket.on('send-answer-result', ({ gameId, result, chooser }) => {
            const game = Games.get(gameId);
            if (!game || game.pause || !chooser || result === undefined || game.showman.id !== socket.id || game.state !== 'answering') return;
            if (result) {
                game.answering?.pause();
                game.answering = undefined;
                game.timer?.skip();
                game.chooser = chooser;
                game.players.forEach(p => {
                    if (p.name === chooser) {
                        p.score = p.score + parseInt((game.currentQuestion?.price ?? '0').toString());
                        io.to(game.id).emit('player-change-score', { playerName: p.name, score: p.score });
                    }
                });
            }
            else {
                game.answering?.skip();
                game.answering = undefined;
            }
        });

        socket.on('click-for-answer', function ({ gameId }) {
            const game = Games.get(gameId);
            if (!game || game.pause) return;
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
                    const player = game.players.find(p => p.id === socket.id);
                    io.to(game.id).emit('answering', { gameState: game.state, chooser: player ? player.name : '' });
                    game.answering = new Timer(() => {
                        game.state = 'can-answer';
                        io.to(game.id).emit('can-answer', { gameState: game.state, timing: (game.timer?.remaining ?? 0) / 1000 });
                        game.timer?.resume();
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
        });

        socket.on('choose-theme', ({ gameId, i }) => {
            const game = Games.get(gameId);
            if (!game || game.pause || i === undefined || game.state !== 'choose-theme' || !game.players.some(p => p.id === socket.id && p.name === game.chooser)) return;
            if (game.rounds[game.currentRound].themes[i].name !== '⠀') {
                game.timer?.pause();
                clickTheme(io, game, i);
            }
        });

        socket.on('send-rate', ({ gameId, score }) => {
            const game = Games.get(gameId);
            if (!game || game.state !== 'rates' || score === undefined) return;
            const player = game.players.find(p => p.id === socket.id);
            if (player && player.state !== "Not a finalist" && !game.rates.get(player.name) && player.score >= score && player.score > 0) {
                game.rates.set(player.name, score);
                if (game.rates.size === game.players.filter(p => p.state !== 'Not a finalist').length && game.timer)
                    game.timer.skip();
            }
        });

        socket.on('get-game-list', function (callback) {
            const gameList = [];
            for (const [, game] of Games.entries()) {
                gameList.push({ id: game.id, name: game.name, players: game.players.filter(p => p.id).length, maxPlayers: game.maxPlayers, rounds: game.rounds.length });
            }
            socket.join("game-list");
            callback(gameList);
        });

        socket.on('create-game', async function (data, callback) {
            if (!data.showmanName || !data.name || !data.maxPlayers) return callback({ status: 'failed', message: 'Incorrect data' });
            if (Files.get(socket.id) === false) return callback({ status: 'failed', message: 'The file has not yet been uploaded' });
            const game = new Game(data.name, data.maxPlayers, data.password, { id: socket.id, name: data.showmanName });
            Games.set(game.id, game);
            socket.join(game.id);
            try {
                await game.loadPack();
                socket.leave("game-list");
                io.to("game-list").emit("new-game", { id: game.id, name: game.name, players: game.players.filter(p => p.id).length, maxPlayers: game.maxPlayers, rounds: game.rounds.length });
                callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, gameState: game.state, packInfo: game.packInfo?.getString() });
                game.loading = false;
            } catch {
                Games.delete(game.id);
                callback({ status: 'failed', message: 'Failed to load pack' });
            }
        });

        socket.on('join-game', function ({ gameId, name, type }, callback) {
            const game = Games.get(gameId);
            if (!game) return callback({ status: 'failed', message: 'Game not found' });
            if (!name || !type) return callback({ status: 'failed', message: 'Incorrect data' });
            clearTimeout(Leave.get(name));
            let join;
            if (type === 'player') {
                const player = new Player(socket.id, name.trim());
                join = game.join(player);
                if (join) {
                    socket.join(gameId);
                    socket.to(game.id).emit('player-joined', { players: game.players, chooser: game.chooser });
                }
            }
            else {
                const showman = { id: socket.id, name: name.trim() };
                join = game.joinShowman(showman);
                if (join) {
                    socket.join(gameId);
                    socket.to(gameId).emit('showman-joined', showman);
                }
            }
            if (join) {
                socket.leave("game-list");
                return callback({ status: 'success', gameId: game.id, showman: game.showman, maxPlayers: game.maxPlayers, players: game.players, gameState: game.state, packInfo: game.packInfo?.getString(), themes: game.getThemes(), roundName: game.rounds[game.currentRound].name, chooser: game.chooser, questions: game.getQuestionsRounds(), typeRound: game.rounds[game.currentRound].type, pause: game.pause });
            }
            callback({ status: 'failed', message: 'There was an error' });
        });
    });
}