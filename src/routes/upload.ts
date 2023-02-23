import { Router } from 'express';

import { before, upload, uploadPack } from '../controllers/upload';

const router = Router();

router.post('/upload/pack/:id', before, upload.single('file'), uploadPack);

export default router;