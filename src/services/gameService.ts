import { Server } from "socket.io";
import { Game } from "../classes/Game";
import Timer from "../classes/Timer";
import { getAudioDuration, getVideoDuration } from "./fileService";

export function showRoundThemes(io: Server, game: Game): void {
    game.state = 'show-round-themes';
    const themes = game.getRoundThemes();
    game.setCountQuestionsRounds();
    io.to(game.id).emit('show-round-themes', { gameState: game.state, themes, roundName: game.rounds[game.currentRound].name, typeRound: game.rounds[game.currentRound].type });
    game.timer = new Timer(() => whichPlayerStarts(io, game), 2000 * (themes.length + 1));
}

export function whichPlayerStarts(io: Server, game: Game): void {
    if (game.rounds[game.currentRound].type === 'default') {
        const { min, count } = game.minScore();
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
    } else {
        game.players.forEach(p => {
            if (p.score <= 0) {
                p.state = 'Not a finalist';
            }
        });
        io.to(game.id).emit('questions-final', { questions: game.getQuestionsRounds(), players: game.players });
        for (const player of game.players) {
            if (player.state !== 'Not a finalist') {
                game.queue.push(player);
            }
        }
        game.queue.sort((a, b) => a.score - b.score);
        if (game.queue.length > 0)
            chooseTheme(io, game);
        else {
            game.state = 'without-finale';
            io.to(game.id).emit('without-finale');
        }
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
                if (!question.used) {
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
    game.currentResource = 0;
    game.rounds[game.currentRound].themes[j].questions[i].used = true;
    game.state = 'question-i-j';
    io.to(game.id).emit('question-i-j', { i, j, gameState: game.state });
    game.countQuestions--;
    game.timer = new Timer(() => showQuestion(io, game), 1000);
}

export async function showQuestion(io: Server, game: Game): Promise<void> {
    const current = game.currentQuestion?.atom[game.currentResource];
    game.state = 'show-question';
    io.to(game.id).emit('show-question', { gameState: game.state, atom: { text: current?.type === 'default' || current?.type === 'say' ? current?.text : Date.now(), type: current?.type } });
    let time = 5000;
    if (current?.time)
        time = parseInt(current.time) * 1000;
    else
        switch (current?.type) {
            case 'default': { time = (current.text?.length ?? 20) * 200; break; }
            case 'say': { time = (current.text?.length ?? 20) * 200; break; }
            case 'video': { time = await getVideoDuration(game); break; }
            case 'voice': { time = await getAudioDuration(game); break; }
        }
    if ((game.currentQuestion?.atom.length ?? 0) - 1 > game.currentResource && game.currentQuestion?.atom[game.currentResource + 1].type !== 'marker') {
        game.timer = new Timer(() => {
            game.currentResource++;
            showQuestion(io, game);
        }, time);
        return;
    }
    if (game.rounds[game.currentRound].type === 'default')
        game.timer = new Timer(() => {
            canAnswer(io, game);
        }, time);
}

export async function canAnswer(io: Server, game: Game): Promise<void> {
    game.state = 'can-answer';
    game.clicked.clear();
    io.to(game.id).emit('can-answer', { gameState: game.state, timing: 15 });
    const time = 15000;
    game.timer = new Timer(() => {
        answer(io, game);
    }, time);
}

export async function answer(io: Server, game: Game): Promise<void> {
    game.state = 'answer';
    let answer, comment = '';
    if ((game.currentQuestion?.atom.length ?? 0) > 2 && game.currentQuestion?.atom[game.currentQuestion?.atom.length - 2].type === 'marker') {
        const current = game.currentQuestion?.atom[game.currentQuestion?.atom.length - 1];
        game.currentResource = game.currentQuestion?.atom.length - 1;
        answer = { text: current?.type === 'default' || current?.type === 'say' ? current?.text : Date.now().toString(), type: current?.type };
        comment = game.currentQuestion?.answer;
    }
    else
        answer = { type: 'say', text: game.currentQuestion?.answer };
    io.to(game.id).emit('answer', { gameState: game.state, atom: answer, comment });
    let time = 5000;
    switch (answer?.type) {
        case 'default': { time = (answer.text?.length ?? 20) * 200; break; }
        case 'say': { time = (answer.text?.length ?? 20) * 200; break; }
        case 'video': { time = await getVideoDuration(game); break; }
        case 'voice': { time = await getAudioDuration(game); break; }
    }
    if (game.countQuestions)
        game.timer = new Timer(() => {
            chooseQuestions(io, game);
        }, time);
    else {
        if (game.rounds.length - 1 > game.currentRound) {
            game.currentRound++;
            game.timer = new Timer(() => {
                showRoundThemes(io, game);
            }, time);
        }
    }
}

export function clickTheme(io: Server, game: Game, i: number): void {
    game.rounds[game.currentRound].themes[i].name = '⠀';
    game.state = 'theme-i';
    io.to(game.id).emit('theme-i', { i, gameState: game.state });
    game.countQuestions--;
    if (game.countQuestions !== 1)
        game.timer = new Timer(() => {
            chooseTheme(io, game);
        }, 1000);
    else {
        game.timer = new Timer(() => {
            game.state = 'rates';
            io.to(game.id).emit('rates', { gameState: game.state });
            game.timer = new Timer(() => {
                for (const player of game.players) {
                    if (player.state !== 'Not a finalist' && !game.rates.get(player.name)) {
                        game.rates.set(player.name, 1);
                    }
                }
                console.log([...game.rates.entries()]);
                const i = game.rounds[game.currentRound].themes.findIndex(t => t.name !== '⠀');
                if (i !== -1) {
                    game.currentQuestion = game.rounds[game.currentRound].themes[i].questions[0];
                    game.currentResource = 0;
                    showQuestion(io, game);
                    console.log('Answer', game.rounds[game.currentRound].themes[i].questions[0].answer);
                }
            }, 30000);
        }, 1000);
    }
}

export function chooseTheme(io: Server, game: Game): void {
    game.state = 'choose-theme';
    game.chooser = game.queue[game.currentQueue].name;
    io.to(game.id).emit('choose-theme', { gameState: game.state, chooser: game.chooser });
    if (game.currentQueue < game.queue.length - 1)
        game.currentQueue++;
    else
        game.currentQueue = 0;
    game.timer = new Timer(() => {
        const random = Math.floor(Math.random() * game.countQuestions);
        let k = 0;
        for (const [i, theme] of game.rounds[game.currentRound].themes.entries()) {
            if (theme.name !== '⠀') {
                if (k === random) {
                    clickTheme(io, game, i);
                    return;
                }
                k++;
            }
        }
    }, 30000);
}