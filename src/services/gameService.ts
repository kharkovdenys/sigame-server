import { Server } from "socket.io";
import { Game } from "../classes/Game";
import Timer from "../classes/Timer";

export function showRoundThemes(io: Server, game: Game): void {
    game.state = 'show-round-themes';
    const themes = game.getRoundThemes();
    game.setCountQuestionsRounds();
    io.to(game.id).emit('show-round-themes', { gameState: game.state, themes, roundName: game.rounds[game.currentRound].name });
    setTimeout(() => whichPlayerStarts(io, game), 2000 * (themes.length + 1));
}

export function whichPlayerStarts(io: Server, game: Game): void {
    let min = game.players[0].score, count = 1;
    for (let i = 1; i < game.players.length; i++) {
        if (min === game.players[i].score) {
            count++;
        } else {
            if (min > game.players[i].score) {
                min = game.players[i].score;
                count = 1;
            }
        }
    }
    if (count !== 1) {
        game.state = 'choose-player-start';
        io.to(game.id).emit('choose-player-start', { gameState: game.state, questions: game.getQuestionsRounds() });
        game.timer = new Timer(() => {
            game.chooser = game.players.filter(p => p.score === min)[Math.floor(Math.random() * count)].name;
            chooseQuestions(io, game);
        }, 30000);
    }
    else {
        io.to(game.id).emit('questions', { questions: game.getQuestionsRounds() });
        for (const player of game.players) {
            if (player.score === min) {
                game.chooser = player.name;
                break;
            }
        }
        chooseQuestions(io, game);
    }
}

export function chooseQuestions(io: Server, game: Game): void {
    game.state = 'choose-questions';
    io.to(game.id).emit('choose-questions', { gameState: game.state, chooser: game.chooser });
    game.timer = new Timer(() => {
        const random = Math.floor(Math.random() * game.countQuestions);
        let k = 0;
        for (const [j, theme] of game.rounds[game.currentRound].themes.entries()) {
            for (const [i, question] of theme.questions.entries()) {
                if (typeof question.price !== 'undefined') {
                    if (k === random) {
                        clickQuestion(io, game, i, j);
                        return;
                    }
                    k++;
                }
            }
        }
    }, 30000);
}

export function clickQuestion(io: Server, game: Game, i: number, j: number): void {
    game.currentQuestion = game.rounds[game.currentRound].themes[j].questions[i];
    game.rounds[game.currentRound].themes[j].questions[i].price = undefined;
    game.state = 'question-i-j';
    io.to(game.id).emit('question-i-j', { i, j, gameState: game.state });
    game.countQuestions--;
    if (game.countQuestions)
        game.timer = new Timer(() => {
            chooseQuestions(io, game);
        }, 1000);
    else {
        if (game.rounds.length - 1 > game.currentRound) {
            game.currentRound++;
            game.timer = new Timer(() => {
                showRoundThemes(io, game);
            }, 1000);
        }
    }
}