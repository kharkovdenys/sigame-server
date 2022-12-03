import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import eventHandler from "./src/services/eventHandler";
import resourcesRoutes from "./src/routes/getResources";

const app = express();
const server = createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e8, cors: { origin: "*" }
});

app.use("/api/v1", resourcesRoutes);

eventHandler(io);

server.listen(3000, () => {
    console.log('listening on *:3000');
});