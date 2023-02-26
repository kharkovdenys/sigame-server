import AdmZip from 'adm-zip';
import { randomUUID } from 'crypto';

import iShowman from '../interfaces/iShowman';
import { loadZip, parserPack } from '../services/fileService';
import PackInfo from './PackInfo';
import Player from './Player';
import Question from './Question';
import Round from './Round';
import Timer from './Timer';

export class Game {
    name: string;
    id: string;
    type: "open" | "private" = "open";
    zip?: AdmZip;
    password?: string;
    maxPlayers: number;
    showman: iShowman;
    creator: string;
    players: Player[] = [];
    rounds: Round[] = [];
    packInfo?: PackInfo;
    currentRound = 0;
    state = "waiting-ready";
    timer?: Timer;
    answering?: Timer;
    chooser?: string;
    countQuestions = 0;
    currentQuestion?: Question;
    currentResource = 0;
    queue: Player[] = [];
    loading = true;
    currentQueue = 0;
    pause = false;
    rates: Map<string, number> = new Map();
    cooldown: Map<string, number> = new Map();
    clicked: Set<string> = new Set();

    constructor(name: string, maxPlayers: number, password: string | undefined, showman: iShowman) {
        this.name = name;
        this.maxPlayers = maxPlayers;
        if (password) {
            this.password = password;
            this.type = "private";
        }
        this.showman = showman;
        this.creator = showman.id ?? '';
        this.id = randomUUID();
    }

    join(player: Player): boolean {
        if (this.loading || this.showman.id === player.id || this.showman.name === player.name)
            return false;
        if (this.state === 'waiting-ready' && this.players.length < this.maxPlayers) {
            for (const iplayer of this.players) {
                if (iplayer.id === player.id || iplayer.name === player.name) {
                    return false;
                }
            }
            this.players.push(player);
            return true;
        } else {
            const sameNames = this.players.filter(p => p.name === player.name)[0];
            console.log(sameNames);
            if (sameNames) {
                if (!sameNames.id) {
                    this.players.forEach((p) => {
                        if (p.name === player.name) {
                            p.id = player.id;
                        }
                    });
                    return true;
                }
            } else {
                let flag = false;
                this.players.forEach((p) => {
                    if (!p.id) {
                        p.id = player.id;
                        if (p.name === this.chooser)
                            this.chooser = player.name;
                        p.name = player.name;
                        flag = true;
                        return;
                    }
                });
                if (flag)
                    return true;
            }
        }
        return false;
    }

    joinShowman(showman: iShowman): boolean {
        if (this.loading)
            return false;
        if (!this.showman.id) {
            for (const player of this.players) {
                if (player.id === showman.id) {
                    return false;
                }
            }
            this.showman = showman;
            return true;
        }
        return false;
    }

    leave(id: string): false | string {
        if (this.showman.id === id) {
            this.showman.id = '';
            const name = this.showman.name;
            this.showman.name = '⠀';
            return name;
        }
        for (const i in this.players) {
            if (this.players[i].id === id) {
                if (this.state !== "waiting-ready") {
                    this.players[i].id = undefined;
                    return this.players[i].name;
                }
                const name = this.players[i].name;
                this.players.splice(parseInt(i), 1);
                return name;
            }
        }
        return false;
    }

    changeReady(playerId: string): true | { message: string } {
        if (this.state !== "waiting-ready")
            return { message: 'The game has already started' };
        for (const i in this.players) {
            if (this.players[i].id === playerId) {
                this.players[i].state = this.players[i].state === "Not ready" ? "Ready" : "Not ready";
                return true;
            }
        }
        return { message: 'This player was not found' };
    }

    start(userId: string): true | { message: string } {
        if (userId !== this.showman.id)
            return { message: 'You have to be a showman' };
        let ready = 0;
        if (this.state !== "waiting-ready")
            return { message: 'The game has already started' };
        for (const i in this.players) {
            if (this.players[i].state === "Ready")
                ready += 1;
        }
        return ready === this.players.length && this.players.length > 1 ? true : { message: 'Not all players are ready' };
    }

    getThemes(): unknown[] {
        const themes = [];
        for (const round of this.rounds) {
            if (round.type !== 'final') {
                for (const theme of round.themes) {
                    themes.push({ name: theme.name });
                }
            }
        }
        return themes;
    }

    getRoundThemes(): unknown[] {
        const themes = [];
        if (this.rounds[this.currentRound].type !== 'final')
            for (const theme of this.rounds[this.currentRound].themes) {
                themes.push({ name: theme.name });
            }
        return themes;
    }

    minScore(): { min: number, count: number } {
        let min = this.players[0].score, count = 1;
        for (let i = 1; i < this.players.length; i++) {
            if (min === this.players[i].score) {
                count++;
            } else {
                if (min > this.players[i].score) {
                    min = this.players[i].score;
                    count = 1;
                }
            }
        }
        return { min, count };
    }

    getQuestionsRounds(): unknown[] {
        const themes = [];
        for (const theme of this.rounds[this.currentRound].themes) {
            const questionPrice = [];
            for (const question of theme.questions)
                questionPrice.push(question.used ? undefined : question.price);
            themes.push({ name: theme.name, prices: questionPrice });
        }
        return themes;
    }

    setCountQuestionsRounds(): void {
        this.countQuestions = 0;
        for (const theme of this.rounds[this.currentRound].themes) {
            for (const question of theme.questions) {
                if (!question.used)
                    this.countQuestions++;
            }
        }
    }

    async loadPack(): Promise<void> {
        try {
            await loadZip(this.creator, this);
            const pack = await parserPack(this);
            this.packInfo = new PackInfo(pack["@_name"], pack["@_version"], pack["@_date"], pack["@_difficulty"], pack["@_logo"], pack.info.authors.author);
            for (const round of pack.rounds.round) {
                this.rounds.push(new Round(round["@_name"], round["@_type"], round.themes.theme));
            }
        } catch {
            throw new Error('Unable to read game pack');
        }
    }
}