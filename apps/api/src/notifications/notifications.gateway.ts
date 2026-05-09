import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict to your frontend domain
    credentials: true,
  },
  namespace: 'notifications',
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, string> = new Map(); // socketId -> userId

  handleConnection(client: Socket) {
    // Extract user ID from handshake (you can pass JWT token)
    const userId = client.handshake.auth.userId;
    if (userId) {
      this.connectedClients.set(client.id, userId);
      console.log(`Client connected: ${client.id} (user ${userId})`);
    } else {
      console.log(`Client connected (anonymous): ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  // Send notification to a specific user
  sendNotificationToUser(userId: string, event: string, payload: any) {
    const targetSocketIds = Array.from(this.connectedClients.entries())
      .filter(([_, uid]) => uid === userId)
      .map(([sid]) => sid);

    targetSocketIds.forEach(socketId => {
      this.server.to(socketId).emit(event, payload);
    });
  }

  // Broadcast to all connected clients
  broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
  }
}
