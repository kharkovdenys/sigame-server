import path from "path";
import { Request, Response } from 'express';
import { Games } from "../services/socketService";


export const getImage = (req: Request, res: Response): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'image') {
        res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Images", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)));
    } else res.sendStatus(404);
};

export const getAudio = (req: Request, res: Response): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'voice') {
        res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Audio", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)));
    } else res.sendStatus(404);
};

export const getVideo = (req: Request, res: Response): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'video') {
        res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Video", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)));
    } else res.sendStatus(404);
};