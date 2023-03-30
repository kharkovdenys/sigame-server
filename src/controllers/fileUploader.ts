import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

const uploadedFiles: Map<string, boolean> = new Map();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, 'packs/');
    },
    filename: (req, _file, cb) => {
        cb(null, `${req.params.id}.zip`);
    }
});

const upload = multer({ storage });

const beforeUpload = (req: Request, _res: Response, next: NextFunction): void => {
    uploadedFiles.set(req.params.id, false);
    next();
};

const uploadFile = async (req: Request, res: Response): Promise<void> => {
    uploadedFiles.set(req.params.id, true);
    res.sendStatus(200);
};

export { uploadedFiles, upload, beforeUpload, uploadFile };