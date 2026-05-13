import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

export type NotificationEvent =
  | 'user.registered'
  | 'order.created'
  | 'order.status_changed'
  | 'order.payment_received'
  | 'stock.low'
  | 'stock.adjusted'
  | 'lead.created'
  | 'lead.converted'
  | 'system.alert';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: 'notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** socketId → { userId, tenantId } */
  private clients = new Map<string, { userId: string; tenantId: string }>();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId as string;
    const tenantId = client.handshake.auth.tenantId as string;
    if (userId) {
      this.clients.set(client.id, { userId, tenantId });
    }
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
  }

  /** Broadcast to all clients of a tenant */
  broadcastToTenant(tenantId: string, event: NotificationEvent, payload: any) {
    for (const [socketId, meta] of this.clients.entries()) {
      if (meta.tenantId === tenantId) {
        this.server.to(socketId).emit(event, payload);
      }
    }
  }

  /** Send to a specific user (all their sockets) */
  sendToUser(userId: string, event: NotificationEvent, payload: any) {
    for (const [socketId, meta] of this.clients.entries()) {
      if (meta.userId === userId) {
        this.server.to(socketId).emit(event, payload);
      }
    }
  }

  /** Broadcast to all connected clients (admin use) */
  broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
  }

  /** Client subscribes to a room (e.g. tenant room) */
  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
  }
}
