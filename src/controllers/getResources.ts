import path from "path";
import { Games } from "../services/socketService";

export const getImage = (req: { params: { gameId: string; }; }, res: { sendFile: (arg0: string) => void; }): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'image') {
        res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Images", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)));
    }
};

export const getAudio = (req: { params: { gameId: string; }; }, res: { sendFile: (arg0: string) => void; }): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'voice') {
        res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Audio", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)));
    }
};

export const getVideo = (req: { params: { gameId: string; }; }, res: { sendFile: (arg0: string) => void; }): void => {
    const game = Games.get(req.params.gameId);
    if (game?.currentQuestion?.atom[game.currentResource].type === 'video') {
        res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Video", (game?.currentQuestion?.atom[game.currentResource].text ?? '').substring(1)));
    }
};