import { Request, Response } from 'express';
import multer from 'multer';

export const Files: Map<string, boolean> = new Map();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, 'packs/');
    },
    filename: (req, _file, cb) => {
        cb(null, req.params.id + '.zip');
    }
});

export const upload = multer({ storage: storage });

export const before = (req: Request, _res: Response, next: () => void): void => {
    Files.set(req.params.id, false);
    next();
};

export const uploadPack = async (req: Request, res: Response): Promise<void> => {
    Files.set(req.params.id, true);
    res.sendStatus(200);
};