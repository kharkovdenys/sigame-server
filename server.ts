import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import resourcesRoutes from './src/routes/getResources';
import uploadRoutes from './src/routes/upload';
import { clear } from './src/services/fileService';
import socket from './src/services/socketService';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;
const io = new Server(server);

app.use(cors());
app.use("/api/v1", resourcesRoutes);
app.use("/api/v1", uploadRoutes);

clear();
socket(io);

server.listen(port, () => {
    console.log('listening on *:port');
});