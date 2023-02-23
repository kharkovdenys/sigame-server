import { Request, Response } from 'express';

import { Games } from '../services/socketService';

export const getImage = (req: Request, res: Response): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'image' && game.zip) {
        res.send(game.zip.readFile("Images/" + encodeURI((game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1))));
    } else res.sendStatus(404);
};

export const getAudio = (req: Request, res: Response): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'voice' && game.zip) {
        res.send(game.zip.readFile("Audio/" + encodeURI((game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1))));
    } else res.sendStatus(404);
};

export const getVideo = (req: Request, res: Response): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'video' && game.zip) {
        res.send(game.zip.readFile("Video/" + encodeURI((game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1))));
    } else res.sendStatus(404);
};