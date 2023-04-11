import { Request, Response } from 'express';
import path from 'path';

import { Games } from '../services/socketService';

const getResource = (req: Request, res: Response, type: string): void => {
    const gameId = req.params.gameId;
    const game = Games.get(gameId);

    if (!game || !game.zip || !game.currentQuestion || !game.currentQuestion.atom) {
        res.sendStatus(404);
        return;
    }

    const currentResource = game.currentResource;
    const currentAtom = game.currentQuestion.atom[currentResource];

    if (!currentAtom || currentAtom.type !== type) {
        res.sendStatus(404);
        return;
    }

    const folder = type.charAt(0).toUpperCase() + type.slice(1) + (type === 'image' ? 's' : '');
    const file = encodeURI(currentAtom.text.substring(1)).replace(/%5B/g, "[").replace(/%5D/g, "]");
    const filePath = path.join(folder, file);
    const fileData = game.zip.readFile(filePath);

    if (!fileData) {
        res.sendStatus(404);
        return;
    }

    res.send(fileData);
};

const getImage = (req: Request, res: Response): void => {
    getResource(req, res, 'image');
};

const getAudio = (req: Request, res: Response): void => {
    getResource(req, res, 'audio');
};

const getVideo = (req: Request, res: Response): void => {
    getResource(req, res, 'video');
};

export { getImage, getAudio, getVideo };