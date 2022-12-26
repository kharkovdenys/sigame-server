import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import socket from "./src/services/socketService";
import resourcesRoutes from "./src/routes/getResources";
import { clear } from './src/services/fileService';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;
const io = new Server(server, {
    maxHttpBufferSize: 3e8, cors: { origin: "*" }, pingTimeout: 30000
});

app.use("/api/v1", resourcesRoutes);

clear();
socket(io);

server.listen(port, () => {
    console.log('listening on *:port');
});