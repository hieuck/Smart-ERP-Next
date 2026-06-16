import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3456';

export function initSocket(userId: string, tenantId?: string): Socket {
  if (socket?.connected) return socket;

  socket = io(`${API_URL}/notifications`, {
    transports: ['websocket'],
    auth: { userId, tenantId },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    // Join tenant room for targeted broadcasts
    if (tenantId) socket?.emit('join', { room: `tenant:${tenantId}` });
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
}

export const getSocket = (token?: string): Socket | null => socket;

export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function disconnectSocket(): void {
  closeSocket();
}

