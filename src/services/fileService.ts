import extract from "extract-zip";
import { XMLParser } from "fast-xml-parser";
import { access, readdir, readFile, rm, unlink, writeFile } from "fs/promises";
import { constants } from 'fs';
import getAudioDurationInSeconds from "get-audio-duration";
import getVideoDurationInSeconds from "get-video-duration";
import path from "path";
import { Game } from "../classes/Game";
import iPackage from "../interfaces/iPackage";

export async function unpack(zipName: string, folderName: string): Promise<void> {
    const onEntry = function (entry: { fileName: string; }): void {
        entry.fileName = decodeURI(entry.fileName);
    };
    await extract(path.join(__dirname, "../../packs/", zipName + ".zip"), { dir: path.join(__dirname, "../../packs/", folderName), onEntry });
    await unlink("packs/" + zipName + ".zip");
}

export async function parserPack(folderName: string): Promise<iPackage> {
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    };
    const parser = new XMLParser(options);
    return (parser.parse(await readFile("packs/" + folderName + "/content.xml"))).package;
}

export async function writeZip(zipName: string, file: string): Promise<void> {
    await writeFile("packs/" + zipName + ".zip", file);
}

export async function existsZip(zipName: string): Promise<boolean> {
    return access("packs/" + zipName + ".zip", constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

export async function getVideoDuration(game: Game): Promise<number> {
    return new Promise((resolve) =>
        getVideoDurationInSeconds(path.join(__dirname, "../../packs", game.id, "Video", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1))).then((duration) => {
            resolve(duration * 1000);
        }).catch(() => { resolve(0); })
    );
}

export async function getAudioDuration(game: Game): Promise<number> {
    return new Promise((resolve) =>
        getAudioDurationInSeconds(path.join(__dirname, "../../packs", game.id, "Audio", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1))).then((duration) => {
            resolve(duration * 1000);
        }).catch(() => { resolve(0); })
    );
}

export async function clear(): Promise<void> {
    try {
        const files = await readdir('packs');
        for (const file of files)
            if (file !== '.gitkeep')
                await rm('packs/' + file, { recursive: true });
    } catch (err) {
        console.error(err);
    }
}

export async function deleteFolder(gameId: string): Promise<void> {
    try {
        await rm('packs/' + gameId, { recursive: true });
    } catch (err) {
        console.error(err);
    }
}