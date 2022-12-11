import extract from "extract-zip";
import { XMLParser } from "fast-xml-parser";
import { access, constants, readdir, readFile, rm, unlink, writeFile } from "fs/promises";
import path from "path";

export async function unpack(zipName: string, folderName: string): Promise<void> {
    await extract(path.join(__dirname, "../../packs/", zipName + ".zip"), { dir: path.join(__dirname, "../../packs/", folderName) });
    await unlink("packs/" + zipName + ".zip");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parserPack(folderName: string): Promise<any> {
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