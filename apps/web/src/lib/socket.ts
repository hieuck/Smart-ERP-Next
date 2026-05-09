import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (userId?: string): Socket => {
  if (socket) return socket;

  socket = io('http://localhost:3000/notifications', {
    transports: ['websocket'],
    auth: { userId },
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const getSocket = () => socket;

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
