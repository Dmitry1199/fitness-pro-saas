import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { $Enums, type ChatRoom, type Message } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import type { CreateChatRoomDto } from "./dto/create-chat-room.dto";
import type { CreateMessageDto } from "./dto/create-message.dto";
import type { MessageFiltersDto } from "./dto/message-filters.dto";
import type { UpdateMessageDto } from "./dto/update-message.dto";

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createChatRoom(
    data: CreateChatRoomDto,
    userId: string,
  ): Promise<ChatRoom> {
    const { participantIds, ...chatRoomData } = data;

    if (!chatRoomData.name) {
      throw new BadRequestException("Chat room name is required");
    }

    const chatRoom = await this.prisma.chatRoom.create({
      data: {
        ...chatRoomData,
        type: data.type as $Enums.ChatRoomType,
        createdBy: { connect: { id: userId } },
      },
    });

    if (participantIds?.length) {
      await this.prisma.chatRoomParticipant.createMany({
        data: participantIds.map((id) => ({
          chatRoomId: chatRoom.id,
          userId: id,
        })),
        skipDuplicates: true,
      });
    }

    return chatRoom;
  }

  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    return this.prisma.chatRoom.findMany({
      where: {
        OR: [{ createdById: userId }, { participants: { some: { userId } } }],
      },
      include: {
        participants: true,
        createdBy: true,
      },
    });
  }

  async getChatRoomById(chatRoomId: string, userId: string): Promise<ChatRoom> {
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: {
        participants: true,
        createdBy: true,
      },
    });

    if (!chatRoom) throw new NotFoundException("ChatRoom not found");

    const isParticipant = chatRoom.participants.some(
      (p) => p.userId === userId,
    );
    if (chatRoom.createdById !== userId && !isParticipant) {
      throw new ForbiddenException("Access denied to chat room");
    }

    return chatRoom;
  }

  async createMessage(
    data: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    const messageData: any = {
      content: data.content,
      type: data.type
        ? (data.type as $Enums.MessageType)
        : $Enums.MessageType.TEXT,
      attachmentUrl: data.attachmentUrl,
      attachmentName: data.attachmentName,
      chatRoom: { connect: { id: data.chatRoomId } },
      sender: { connect: { id: userId } },
    };

    if (data.replyToId) {
      messageData.replyTo = { connect: { id: data.replyToId } };
    }

    return this.prisma.message.create({
      data: messageData,
    });
  }

  async getMessages(
    filters: MessageFiltersDto,
    userId: string,
  ): Promise<Message[]> {
    if (!filters.chatRoomId) {
      throw new BadRequestException("chatRoomId is required");
    }

    // Можна додати перевірку доступу користувача

    return this.prisma.message.findMany({
      where: {
        chatRoomId: filters.chatRoomId,
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: true,
        reactions: true,
        readBy: true,
      },
    });
  }

  async updateMessage(
    messageId: string,
    dto: UpdateMessageDto,
    userId: string,
  ): Promise<Message> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.senderId !== userId)
      throw new ForbiddenException("Cannot edit others messages");

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        ...dto,
        isEdited: true,
        editedAt: new Date(),
      },
    });
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.senderId !== userId)
      throw new ForbiddenException("Cannot delete others messages");

    await this.prisma.message.delete({ where: { id: messageId } });
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { readAt: new Date() },
      create: { messageId, userId },
    });
  }

  async addReaction(
    messageId: string,
    reaction: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_reaction: { messageId, userId, reaction } },
      update: {},
      create: { messageId, userId, reaction },
    });
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        NOT: {
          readBy: {
            some: { userId },
          },
        },
        chatRoom: {
          participants: {
            some: { userId },
          },
        },
      },
    });
  }
}
