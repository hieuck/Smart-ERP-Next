// @ts-nocheck
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;
  const token = await SecureStore.getItemAsync('access_token');
  socket = io(process.env.EXPO_PUBLIC_API_URL, {
    transports: ['websocket'],
    auth: { token },
  });
  return socket;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    getSocket().then(setSocket);
  }, []);
  return { socket };
}
