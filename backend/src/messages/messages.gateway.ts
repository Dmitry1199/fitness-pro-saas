import { Logger } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import type { CreateMessageDto } from "./dto/create-message.dto";
import type {
  JoinChatRoomDto,
  MessageReadDto,
  TypingIndicatorDto,
} from "./dto/websocket-events.dto";
import type { MessagesService } from "./messages.service";

// Define the Notification interface here, or import it from a common file
// For example, if you put it in src/common/interfaces/notification.interface.ts
interface Notification {
  type: string;
  message: string;
  timestamp?: Date;
  // Add any other properties your notification object might have
  // e.g., senderId?: string;
  //       data?: Record<string, any>;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
  namespace: "/chat",
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private onlineUsers = new Map<string, string>(); // userId -> socketId
  private userSockets = new Map<string, string>(); // socketId -> userId

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userEmail = payload.email;

      this.onlineUsers.set(client.userId, client.id);
      this.userSockets.set(client.id, client.userId);

      this.logger.log(
        `User ${client.userEmail} (${client.userId}) connected with socket ${client.id}`,
      );

      this.server.emit("userOnline", {
        userId: client.userId,
        email: client.userEmail,
        timestamp: new Date(),
      });

      await this.joinUserChatRooms(client);
    } catch (error) {
      this.logger.error(
        `Authentication failed for socket ${client.id}:`,
        error,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.onlineUsers.delete(client.userId);
      this.userSockets.delete(client.id);

      this.logger.log(
        `User ${client.userEmail} (${client.userId}) disconnected`,
      );

      this.server.emit("userOffline", {
        userId: client.userId,
        email: client.userEmail,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage("joinChatRoom")
  async handleJoinChatRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinChatRoomDto,
  ) {
    try {
      await this.messagesService.getChatRoomById(
        data.chatRoomId,
        client.userId,
      );

      await client.join(data.chatRoomId);

      this.logger.log(
        `User ${client.userId} joined chat room ${data.chatRoomId}`,
      );

      client.emit("joinedChatRoom", {
        chatRoomId: data.chatRoomId,
        success: true,
      });

      client.to(data.chatRoomId).emit("userJoinedRoom", {
        userId: client.userId,
        chatRoomId: data.chatRoomId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to join chat room ${data.chatRoomId}:`, error);
      client.emit("error", {
        message: "Failed to join chat room",
        error: error.message,
      });
    }
  }

  @SubscribeMessage("leaveChatRoom")
  async handleLeaveChatRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatRoomId: string },
  ) {
    await client.leave(data.chatRoomId);

    this.logger.log(`User ${client.userId} left chat room ${data.chatRoomId}`);

    client.emit("leftChatRoom", {
      chatRoomId: data.chatRoomId,
      success: true,
    });

    client.to(data.chatRoomId).emit("userLeftRoom", {
      userId: client.userId,
      chatRoomId: data.chatRoomId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CreateMessageDto,
  ) {
    try {
      const message = await this.messagesService.createMessage(
        data,
        client.userId,
      );

      this.server.to(data.chatRoomId).emit("newMessage", {
        message,
        timestamp: new Date(),
      });

      this.logger.log(
        `Message sent by ${client.userId} to room ${data.chatRoomId}`,
      );
    } catch (error) {
      this.logger.error("Failed to send message:", error);
      client.emit("error", {
        message: "Failed to send message",
        error: error.message,
      });
    }
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingIndicatorDto,
  ) {
    try {
      await this.messagesService.getChatRoomById(
        data.chatRoomId,
        client.userId,
      );

      client.to(data.chatRoomId).emit("userTyping", {
        userId: client.userId,
        chatRoomId: data.chatRoomId,
        isTyping: data.isTyping,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error("Failed to handle typing indicator:", error);
    }
  }

  @SubscribeMessage("markMessageRead")
  async handleMarkMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: MessageReadDto,
  ) {
    try {
      await this.messagesService.markMessageAsRead(
        data.messageId,
        client.userId,
      );

      client.to(data.chatRoomId).emit("messageRead", {
        messageId: data.messageId,
        userId: client.userId,
        chatRoomId: data.chatRoomId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error("Failed to mark message as read:", error);
      client.emit("error", {
        message: "Failed to mark message as read",
        error: error.message,
      });
    }
  }

  @SubscribeMessage("addReaction")
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { messageId: string; reaction: string; chatRoomId: string },
  ) {
    try {
      await this.messagesService.addReaction(
        data.messageId,
        data.reaction,
        client.userId,
      );

      client.to(data.chatRoomId).emit("messageReaction", {
        messageId: data.messageId,
        userId: client.userId,
        reaction: data.reaction,
        chatRoomId: data.chatRoomId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error("Failed to add reaction:", error);
      client.emit("error", {
        message: "Failed to add reaction",
        error: error.message,
      });
    }
  }

  @SubscribeMessage("getOnlineUsers")
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const onlineUserIds = Array.from(this.onlineUsers.keys());
    client.emit("onlineUsers", {
      userIds: onlineUserIds,
      count: onlineUserIds.length,
    });
  }

  // Private helper methods
  private async joinUserChatRooms(client: AuthenticatedSocket) {
    try {
      const chatRooms = await this.messagesService.getUserChatRooms(
        client.userId,
      );

      for (const chatRoom of chatRooms) {
        await client.join(chatRoom.id);
        this.logger.log(
          `User ${client.userId} auto-joined chat room ${chatRoom.id}`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to join user chat rooms:", error);
    }
  }

  // Send notification to specific user
  sendNotificationToUser(userId: string, notification: Notification) {
    // Changed 'any' to 'Notification'
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit("notification", notification);
    }
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.onlineUsers.size;
  }
}