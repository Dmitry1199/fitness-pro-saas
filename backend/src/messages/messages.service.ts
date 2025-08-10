import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums, ChatRoom, Message } from '@prisma/client';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createChatRoom(data: CreateChatRoomDto, userId: string): Promise<ChatRoom> {
    if (!data.name) {
      throw new BadRequestException('Chat room name is required');
    }
    return this.prisma.chatRoom.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type as $Enums.ChatRoomType,
        createdBy: { connect: { id: userId } },
        participants: {
          create: data.participantIds.map(id => ({ userId: id })),
        },
      },
      include: {
        participants: true,
        createdBy: true,
      },
    });
  }

  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    return this.prisma.chatRoom.findMany({
      where: {
        OR: [
          { createdById: userId },
          { participants: { some: { userId } } },
        ],
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

    if (!chatRoom) throw new NotFoundException('ChatRoom not found');

    const isParticipant = chatRoom.participants.some(p => p.userId === userId);
    if (chatRoom.createdById !== userId && !isParticipant) {
      throw new ForbiddenException('Access denied to chat room');
    }

    return chatRoom;
  }

  async createMessage(data: CreateMessageDto, userId: string): Promise<Message> {
    return this.prisma.message.create({
      data: {
        content: data.content,
        type: (data.type || $Enums.MessageType.TEXT) as $Enums.MessageType,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        replyToId: data.replyToId,
        chatRoom: { connect: { id: data.chatRoomId } },
        sender: { connect: { id: userId } },
      },
      include: {
        sender: true,
      },
    });
  }

  async getMessages(filters: MessageFiltersDto, userId: string): Promise<Message[]> {
    if (!filters.chatRoomId) {
      throw new BadRequestException('chatRoomId is required');
    }

    const where: any = {
      chatRoomId: filters.chatRoomId,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    if (filters.search) {
      where.content = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
        reactions: true,
        readBy: true,
      },
      skip,
      take: limit,
    });
  }

  async updateMessage(messageId: string, dto: UpdateMessageDto, userId: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot edit others messages');

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
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete others messages');

    await this.prisma.message.delete({ where: { id: messageId } });
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { readAt: new Date() },
      create: { messageId, userId },
    });
  }

  async addReaction(messageId: string, reaction: string, userId: string): Promise<void> {
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
          readBy: { some: { userId } },
        },
        chatRoom: {
          participants: { some: { userId } },
        },
      },
    });
  }
}