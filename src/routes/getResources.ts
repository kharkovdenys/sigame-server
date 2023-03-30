import { Router } from 'express';

import { getAudio, getImage, getVideo } from '../controllers/getResources';

const router = Router();

router.get('/image/:gameId', getImage);
router.get('/audio/:gameId', getAudio);
router.get('/video/:gameId', getVideo);

export default router;