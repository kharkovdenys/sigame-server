import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import socket from "./src/services/socketService";
import resourcesRoutes from "./src/routes/getResources";
import { clear } from './src/services/fileService';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e8, cors: { origin: "*" }
});

app.use("/api/v1", resourcesRoutes);

clear();
socket(io);

server.listen(3000, () => {
    console.log('listening on *:3000');
});