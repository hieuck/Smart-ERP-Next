import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
// @ts-ignore
import { ActivityPayload, SOCKET_NAMESPACE } from '@smart-erp/socket-types';

@WebSocketGateway({
  namespace: SOCKET_NAMESPACE,
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development, configure in production
      callback(null, true);
    },
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      // Attach user info to socket data for later use
      client.data.user = { sub: payload.sub, tenantId: payload.tenantId };
      // Join a room identified by tenantId to receive tenant-specific broadcasts
      client.join(`tenant:${payload.tenantId}`);
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id}, tenant: ${payload.tenantId}`);
    } catch (err) {
      this.logger.error(`Connection refused: ${(err as any).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): string {
    return 'pong';
  }

  /**
   * Emit an activity to all clients belonging to the same tenant.
   */
  emitActivity(tenantId: string, payload: ActivityPayload) {
    this.server.to(`tenant:${tenantId}`).emit('activity', payload);
  }

  emitNotification(userId: string, notification: { type: string; title: string; body: string; data?: any }) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    // Also support token in handshake query (for WebSocket clients that cannot set headers)
    const token = client.handshake.query.token as string;
    if (token) {
      return token;
    }
    return null;
  }
}
