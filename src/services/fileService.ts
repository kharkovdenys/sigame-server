import AdmZip from 'adm-zip';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { readdir, rename, rm, writeFile } from 'fs/promises';
import getAudioDurationInSeconds from 'get-audio-duration';
import getVideoDurationInSeconds from 'get-video-duration';

import { Game } from '../classes/Game';
import iPackage from '../interfaces/iPackage';

function randomFileName(): string {
    const randomBytes = crypto.randomBytes(4).toString('hex');
    return `${randomBytes}-${Date.now()}`;
}

export async function loadZip(zipName: string, game: Game): Promise<void> {
    await rename("packs/" + zipName + ".zip", "packs/" + game.id + ".zip");
    game.zip = new AdmZip("packs/" + game.id + ".zip");
}

export async function parserPack(game: Game): Promise<iPackage> {
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    };
    const parser = new XMLParser(options);
    const zip = game.zip;
    if (!zip) throw new Error("The game pack doesn't exist");
    return (parser.parse(zip.readAsText("content.xml"))).package;
}

export async function writeZip(zipName: string, file: string): Promise<void> {
    await writeFile("packs/" + zipName + ".zip", file);
}

export async function getVideoDuration(game: Game): Promise<number> {
    const zip = game.zip;
    if (!zip) throw new Error("The game pack doesn't exist");
    const fileName = randomFileName();
    zip.extractEntryTo("Video/" + encodeURI((game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)), "packs/", false, true, false, fileName);
    return new Promise((resolve) =>
        getVideoDurationInSeconds("packs/" + fileName).then((duration) => {
            resolve(duration * 1000);
        }).catch(() => { resolve(0); }).then(() => rm("packs/" + fileName).catch(() => null))
    );
}

export async function getAudioDuration(game: Game): Promise<number> {
    const zip = game.zip;
    if (!zip) throw new Error("The game pack doesn't exist");
    const fileName = randomFileName();
    zip.extractEntryTo("Audio/" + encodeURI((game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)), "packs/", false, true, false, fileName);
    return new Promise((resolve) =>
        getAudioDurationInSeconds("packs/" + fileName).then((duration) => {
            resolve(duration * 1000);
        }).catch(() => { resolve(0); }).then(() => rm("packs/" + fileName).catch(() => null))
    );
}

export async function clear(): Promise<void> {
    try {
        const files = await readdir('packs');
        for (const file of files)
            if (file !== '.gitkeep')
                await rm('packs/' + file);
    } catch (err) {
        console.error(err);
    }
}

export async function deleteZip(gameId: string): Promise<void> {
    try {
        await rm('packs/' + gameId + '.zip');
    } catch (err) {
        console.error(err);
    }
}