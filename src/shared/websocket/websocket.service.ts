// src/shared/websocket/websocket.service.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { logger } from '@/shared/utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userSockets: Map<string, AuthenticatedSocket> = new Map(); // socketId -> socket

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: this.getAllowedOrigins(),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private getAllowedOrigins(): string[] {
    switch (config.environment) {
      case 'production':
        return ['https://app.amda.com', 'https://admin.amda.com'];
      case 'staging':
        return ['https://staging-app.amda.com'];
      case 'development':
        return [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:4200',
          'http://localhost:5000',
        ];
      default:
        return ['*'];
    }
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;
        socket.userId = decoded.userId || decoded.id;
        socket.userRole = decoded.role;

        logger.info(`User authenticated via WebSocket: ${socket.userId}`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Client connected: ${socket.id}, User: ${socket.userId}`);

      // Store user connection
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        this.userSockets.set(socket.id, socket);

        // Join user-specific room
        socket.join(`user:${socket.userId}`);

        // Send connection confirmation
        socket.emit('connected', {
          message: 'Connected successfully',
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle notification acknowledgments
      socket.on('notification:read', async (data: { notificationId: string }) => {
        try {
          // Import here to avoid circular dependency
          //   const { NotificationService } = await import(
          //     '@/modules/notifications/services/notification.service'
          //   );

          // Mark notification as read
          // You'll need to inject the service properly in a real implementation
          logger.info(
            `Notification marked as read via WebSocket: ${data.notificationId} by user ${socket.userId}`
          );

          socket.emit('notification:read:success', {
            notificationId: data.notificationId,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          logger.error('Error marking notification as read:', error);
          socket.emit('notification:read:error', {
            notificationId: data.notificationId,
            error: error.message,
          });
        }
      });

      // Handle notification subscription requests
      socket.on('notifications:subscribe', (data: { types?: string[] }) => {
        const types = data.types || [];
        types.forEach(type => {
          socket.join(`notification:${type}`);
        });

        socket.emit('notifications:subscribed', {
          types,
          timestamp: new Date().toISOString(),
        });

        logger.info(`User ${socket.userId} subscribed to notification types: ${types.join(', ')}`);
      });

      // Handle disconnection
      socket.on('disconnect', reason => {
        logger.info(`Client disconnected: ${socket.id}, User: ${socket.userId}, Reason: ${reason}`);

        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          this.userSockets.delete(socket.id);
        }
      });

      // Handle errors
      socket.on('error', error => {
        logger.error(`WebSocket error for user ${socket.userId}:`, error);
      });
    });
  }

  /**
   * Send notification to specific user
   */
  async sendNotificationToUser(
    userId: string,
    notification: {
      id: string;
      type: string;
      subject: string;
      content: string;
      priority: string;
      createdAt: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const socketId = this.connectedUsers.get(userId);

      if (!socketId) {
        logger.debug(`User ${userId} not connected via WebSocket`);
        return false;
      }

      this.io.to(`user:${userId}`).emit('notification:new', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Real-time notification sent to user ${userId}: ${notification.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending WebSocket notification:', error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notification: {
      id: string;
      type: string;
      subject: string;
      content: string;
      priority: string;
      createdAt: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<{ sent: number; total: number }> {
    let sentCount = 0;

    const connectedUserIds = userIds.filter(userId => this.connectedUsers.has(userId));

    if (connectedUserIds.length === 0) {
      logger.debug('No users connected via WebSocket for bulk notification');
      return { sent: 0, total: userIds.length };
    }

    const rooms = connectedUserIds.map(userId => `user:${userId}`);

    this.io.to(rooms).emit('notification:new', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    sentCount = connectedUserIds.length;
    logger.info(`Bulk real-time notification sent to ${sentCount} users`);

    return { sent: sentCount, total: userIds.length };
  }

  /**
   * Broadcast notification to all users of a specific type
   */
  async broadcastNotification(
    notificationType: string,
    notification: {
      id: string;
      type: string;
      subject: string;
      content: string;
      priority: string;
      createdAt: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    this.io.to(`notification:${notificationType}`).emit('notification:broadcast', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Broadcast notification sent for type: ${notificationType}`);
  }

  /**
   * Send notification status update
   */
  async sendNotificationUpdate(
    userId: string,
    update: {
      notificationId: string;
      status: string;
      action: 'read' | 'deleted' | 'archived';
      timestamp: Date;
    }
  ): Promise<boolean> {
    try {
      const socketId = this.connectedUsers.get(userId);

      if (!socketId) {
        return false;
      }

      this.io.to(`user:${userId}`).emit('notification:update', {
        ...update,
        timestamp: update.timestamp.toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('Error sending notification update:', error);
      return false;
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
// Frontend usage example (JavaScript/TypeScript)
/*
import { io, Socket } from 'socket.io-client';

class NotificationClient {
  private socket: Socket;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.connect();
  }

  private connect(): void {
    this.socket = io('http://localhost:3000', {
      auth: { token: this.token },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket.on('connected', (data) => {
      console.log('Connected to notification service:', data);
    });

    this.socket.on('notification:new', (notification) => {
      console.log('New notification:', notification);
      this.showNotificationToUser(notification);
    });

    this.socket.on('notification:update', (update) => {
      console.log('Notification update:', update);
      this.updateNotificationInUI(update);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });
  }

  subscribeToNotificationTypes(types: string[]): void {
    this.socket.emit('notifications:subscribe', { types });
  }

  markNotificationAsRead(notificationId: string): void {
    this.socket.emit('notification:read', { notificationId });
  }

  private showNotificationToUser(notification: any): void {
    // Show browser notification or update UI
    new Notification(notification.subject, {
      body: notification.content,
      icon: '/notification-icon.png',
    });
  }

  private updateNotificationInUI(update: any): void {
    // Update notification in UI based on action
    const element = document.getElementById(`notification-${update.notificationId}`);
    if (element && update.action === 'read') {
      element.classList.add('read');
    }
  }
}

// Usage
const notificationClient = new NotificationClient('your-jwt-token');
notificationClient.subscribeToNotificationTypes(['payment_reminder', 'system_maintenance']);
*/
