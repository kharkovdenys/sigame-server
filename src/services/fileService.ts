import AdmZip from 'adm-zip';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { access, readdir, rename, rm } from 'fs/promises';
import getAudioDurationInSeconds from 'get-audio-duration';
import getVideoDurationInSeconds from 'get-video-duration';
import path from 'path';

import { Game } from '../classes/Game';
import iPackage from '../interfaces/iPackage';

function randomFileName(): string {
    const randomBytes = crypto.randomBytes(4).toString('hex');
    return `${randomBytes}-${Date.now()}`;
}

export async function loadZip(zipName: string, game: Game): Promise<void> {
    const oldPath = path.join("packs", `${zipName}.zip`);
    const newPath = path.join("packs", `${game.id}.zip`);
    await rename(oldPath, newPath);
    game.zip = new AdmZip(newPath);
}

export async function parserPack(game: Game): Promise<iPackage> {
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    };
    const parser = new XMLParser(options);
    const zip = game.zip;
    if (!zip) throw new Error("The game pack doesn't exist");
    const content = zip.readAsText("content.xml");
    const result = parser.parse(content);
    return result.package;
}

export async function getDuration(game: Game, type: 'video' | 'audio'): Promise<number> {
    const zip = game.zip;
    if (!zip) throw new Error("The game pack doesn't exist");
    try {
        const newfileName = randomFileName();
        const oldfileName = encodeURI((game?.currentQuestion?.atom[game.currentResource].text.substring(1) ?? '')).replace(/%5B/g, "[").replace(/%5D/g, "]");
        zip.extractEntryTo(path.join(type.charAt(0).toUpperCase() + type.slice(1), oldfileName), "packs/", false, true, false, newfileName);
        const duration = type === 'video' ?
            (await getVideoDurationInSeconds(path.join("packs", newfileName))) * 1000 :
            (await getAudioDurationInSeconds(path.join("packs", newfileName))) * 1000;
        await rm(path.join("packs", newfileName));
        return duration;
    } catch (err) {
        console.error(`Error getting ${type} duration: ${err}`);
        return 0;
    }
}

export async function clear(): Promise<void> {
    const files = await readdir('packs');
    for (const file of files) {
        if (file !== '.gitkeep') {
            try {
                await rm(path.join('packs', file));
            } catch (err) {
                console.error(`Failed to delete file ${file}: ${err}`);
            }
        }
    }
}

async function checkFileExists(filepath: string): Promise<boolean> {
    try {
        await access(filepath, 0);
        return true;
    } catch {
        return false;
    }
}

export async function deleteZip(gameId: string): Promise<void> {
    const zipPath = path.join('packs', `${gameId}.zip`);
    try {
        if (await checkFileExists(zipPath))
            await rm(zipPath);
    } catch (err) {
        console.error(`Failed to delete zip ${gameId}: ${err}`);
    }
}