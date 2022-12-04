import { randomUUID } from "crypto";
import Player from "./Player";
import Round from "./Round";
import { unlink, readFile } from "fs/promises";
import extract from "extract-zip";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import PackInfo from "./PackInfo";
import iShowman from "../interfaces/iShowman";

export class Game {
    name: string;
    id: string;
    type: "open" | "private" = "open";
    password: string | undefined;
    maxPlayers: number;
    showman: iShowman;
    creator: string;
    players: Player[] = [];
    rounds: Round[] = [];
    packInfo: PackInfo | undefined;
    state = "waiting-ready";

    constructor(name: string, maxPlayers: number, password: string | undefined, showman: iShowman) {
        this.name = name;
        this.maxPlayers = maxPlayers;
        if (password) {
            this.password = password;
            this.type = "private";
        }
        this.showman = showman;
        this.creator = showman.id;
        this.id = randomUUID();
    }

    join(player: Player): boolean {
        if (this.players.length < this.maxPlayers)
            this.players.push(player);
        else {
            return false;
        }
        return true;
    }

    leave(id: string): boolean {
        //if (this.showman === id) {
        //    this.showman = undefined;
        //    return true;
        //}
        for (const i in this.players) {
            if (this.players[i].id === id) {
                if (this.state !== "waiting-ready")
                    this.players[i].id = undefined;
                else
                    this.players.splice(parseInt(i), 1);
                return true;
            }
        }
        return false;
    }

    changeReady(playerid: string): boolean {
        if (this.state !== "waiting-ready")
            return false;
        for (const i in this.players) {
            if (this.players[i].id === playerid) {
                if (this.players[i].state === "not-ready")
                    this.players[i].state = "ready";
                else
                    this.players[i].state = "not-ready";
                return true;
            }
        }
        return false;
    }

    start(userId: string): boolean {
        if (userId !== this.showman.id)
            return false;
        let ready = 0;
        if (this.state !== "waiting-ready")
            return false;
        for (const i in this.players) {
            if (this.players[i].state === "ready")
                ready += 1;
        }
        return ready === this.players.length && this.players.length > 1 ? true : false;
    }

    getRounds(): unknown[] {
        const rounds = [];
        for (const round of this.rounds) {
            rounds.push({ name: round.name, type: round.type });
        }
        return rounds;
    }

    getThemes(): unknown[] {
        const themes = [];
        for (const round of this.rounds) {
            for (const theme of round.themes) {
                themes.push({ name: theme.name });
            }
        }
        return themes;
    }

    getQuestionsRounds(roundid: number): unknown[] {
        const themes = [];
        for (const theme of this.rounds[roundid].themes) {
            const questionPrice = [];
            for (const question of theme.questions)
                questionPrice.push(question.price);
            themes.push({ name: theme.name, prices: questionPrice });
        }
        return themes;
    }

    async loadPack(): Promise<void> {
        await extract(path.join(__dirname, "../../packs/" + this.creator + ".zip"), { dir: path.join(__dirname, "../../packs/" + this.id) });
        await unlink("packs/" + this.creator + ".zip");
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        };
        const parser = new XMLParser(options);
        const pack = (parser.parse(await readFile("packs/" + this.id + "/content.xml"))).package;
        this.packInfo = new PackInfo(pack["@_name"], pack["@_version"], pack["@_date"], pack["@_difficulty"], pack["@_logo"], pack.info.authors.author);
        for (const round of pack.rounds.round) {
            this.rounds.push(new Round(round["@_name"], round["@_type"], round.themes.theme));
        }
    }
}