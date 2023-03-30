import { Router } from 'express';

import { beforeUpload, upload, uploadFile } from '../controllers/fileUploader';

const router = Router();

router.post('/upload/pack/:id', beforeUpload, upload.single('file'), uploadFile);

export default router;