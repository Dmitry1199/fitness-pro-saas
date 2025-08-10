import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums, ChatRoom, Message } from '@prisma/client';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Створення нового чатруму
  async createChatRoom(data: CreateChatRoomDto, userId: string): Promise<ChatRoom> {
    if (!data.name) {
      throw new BadRequestException('Chat room name is required');
    }

    // Спочатку створюємо чатрум
    const chatRoom = await this.prisma.chatRoom.create({
      data: {
        name: data.name,
        type: data.type as $Enums.ChatRoomType,
        description: data.description,
        createdBy: { connect: { id: userId } },
      },
    });

    // Додаємо учасників (через таблицю ChatRoomParticipant)
    if (data.participantIds && data.participantIds.length > 0) {
      const participantsData = data.participantIds.map(pid => ({
        chatRoomId: chatRoom.id,
        userId: pid,
      }));
      await this.prisma.chatRoomParticipant.createMany({
        data: participantsData,
        skipDuplicates: true,
      });
    }

    return chatRoom;
  }

  // Отримання усіх чатрумів користувача
  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    return this.prisma.chatRoom.findMany({
      where: {
        OR: [
          { createdById: userId },
          { participants: { some: { userId } } }
        ],
      },
      include: {
        participants: {
          include: { user: true },
        },
        createdBy: true,
      },
    });
  }

  // Отримання чатруму за ID, з перевіркою доступу
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

  // Створення повідомлення
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
    });
  }

  // Отримання повідомлень за фільтрами з пагінацією
  async getMessages(filters: Partial<{ chatRoomId: string; type: string; fromDate: string; toDate: string; search: string; page: number; limit: number }>, userId: string): Promise<Message[]> {
    if (!filters.chatRoomId) {
      throw new BadRequestException('chatRoomId is required');
    }

    // Перевірка доступу
    await this.getChatRoomById(filters.chatRoomId, userId);

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
      where.content = { contains: filters.search, mode: 'insensitive' };
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    return this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        sender: true,
        reactions: true,
        readBy: true,
      },
    });
  }

  // Оновлення повідомлення
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

  // Видалення повідомлення
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete others messages');

    await this.prisma.message.delete({ where: { id: messageId } });
  }

  // Позначити повідомлення як прочитане
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { readAt: new Date() },
      create: { messageId, userId },
    });
  }

  // Додати або оновити реакцію
  async addReaction(messageId: string, reaction: string, userId: string): Promise<void> {
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_reaction: { messageId, userId, reaction } },
      update: {},
      create: { messageId, userId, reaction },
    });
  }

  // Підрахунок непрочитаних повідомлень
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
