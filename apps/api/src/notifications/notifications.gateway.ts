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
  | 'chat.message'
  | 'chat.mention'
  | 'comment.added'
  | 'system.alert'
  | 'approval:new'
  | 'approval:decision'
  | 'forecast:ready';

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
    if (this.server) this.server.emit(event, payload);
  }

  /** Client subscribes to a room (e.g. tenant room) */
  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
  }

  /** Broadcast new approval request */
  notifyNewApproval(tenantId: string, requestId: string, message: string) {
    this.broadcastToTenant(tenantId, 'approval:new', { requestId, message });
  }

  /** Broadcast approval decision */
  notifyApprovalDecision(tenantId: string, requestId: string, status: 'approved' | 'rejected', message: string) {
    this.broadcastToTenant(tenantId, 'approval:decision', { requestId, status, message });
  }

  /** Broadcast low stock alert */
  notifyLowStock(tenantId: string, productId: string, productName: string, currentStock: number) {
    this.broadcastToTenant(tenantId, 'stock.low', { productId, productName, currentStock });
  }

  /** Broadcast forecast ready notification */
  notifyForecastReady(tenantId: string, userId: string, productId: string) {
    this.sendToUser(userId, 'forecast:ready', { productId });
  }
}
