import path from "path";

export const getImage = (req: { params: { gameId: string; }; }, res: { sendFile: (arg0: string) => void; }): void => {
    res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Images", ""));
};

export const getAudio = (req: { params: { gameId: string; }; }, res: { sendFile: (arg0: string) => void; }): void => {
    res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Audio", ""));
};

export const getVideo = (req: { params: { gameId: string; }; }, res: { sendFile: (arg0: string) => void; }): void => {
    res.sendFile(path.join(__dirname, "../../packs", req.params.gameId, "Video", ""));
};