import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums, ChatRoom, Message } from '@prisma/client';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Створення нового чатруму з вказівкою користувача, який створює
  async createChatRoom(data: CreateChatRoomDto, userId: string): Promise<ChatRoom> {
    return this.prisma.chatRoom.create({
      data: {
        ...data,
        type: data.type as $Enums.ChatRoomType,
        createdBy: { connect: { id: userId } },
      },
    });
  }

  // Отримання усіх чатрумів користувача
  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    return this.prisma.chatRoom.findMany({
      where: {
        OR: [
          { createdById: userId },
          { participants: { some: { userId } } }
        ]
      },
      include: {
        participants: true,
        createdBy: true,
      },
    });
  }

  // Отримання чатруму за ID, перевірка, що користувач має доступ
  async getChatRoomById(chatRoomId: string, userId: string): Promise<ChatRoom> {
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: {
        participants: true,
        createdBy: true,
      },
    });

    if (!chatRoom) throw new NotFoundException('ChatRoom not found');

    // Перевірка, чи є користувач учасником або створив чат
    const isParticipant = chatRoom.participants.some(p => p.userId === userId);
    if (chatRoom.createdById !== userId && !isParticipant) {
      throw new ForbiddenException('Access denied to chat room');
    }

    return chatRoom;
  }

  // Створення повідомлення у чаті
  async createMessage(data: CreateMessageDto, userId: string): Promise<Message> {
    return this.prisma.message.create({
      data: {
        content: data.content,
        type: (data.type || $Enums.MessageType.TEXT) as $Enums.MessageType,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        replyTo: data.replyToId ? { connect: { id: data.replyToId } } : undefined,
        chatRoom: { connect: { id: data.chatRoomId } },
        sender: { connect: { id: userId } },
      },
    });
  }

  // Отримання повідомлень за фільтрами (наприклад, chatRoomId)
  async getMessages(filters: { chatRoomId: string }, userId: string): Promise<Message[]> {
    // Можна додати перевірку доступу за userId, якщо треба
    return this.prisma.message.findMany({
      where: filters,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
        reactions: true,
        readBy: true,
      },
    });
  }

  // Оновлення повідомлення (перевірка автора)
  async updateMessage(messageId: string, dto: UpdateMessageDto, userId: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot edit others messages');

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        isEdited: true,
        editedAt: new Date(),
        // Не оновлюємо chatRoomId чи replyToId напряму,
        // Якщо потрібно оновити replyTo, можна додати логіку як нижче:
        // replyTo: dto.replyToId ? { connect: { id: dto.replyToId } } : undefined,
      },
    });
  }

  // Видалення повідомлення (перевірка автора)
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete others messages');

    await this.prisma.message.delete({ where: { id: messageId } });
  }

  // Позначити повідомлення як прочитане користувачем
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    // Створюємо запис, якщо його ще немає
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { readAt: new Date() },
      create: { messageId, userId },
    });
  }

  // Додати реакцію до повідомлення
  async addReaction(messageId: string, reaction: string, userId: string): Promise<void> {
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_reaction: { messageId, userId, reaction } },
      update: {},
      create: { messageId, userId, reaction },
    });
  }

  // Підрахунок непрочитаних повідомлень користувача
  async getUnreadMessagesCount(userId: string): Promise<number> {
    // Підрахунок повідомлень, де немає запису про прочитання користувачем
    return this.prisma.message.count({
      where: {
        NOT: {
          readBy: {
            some: { userId }
          }
        },
        chatRoom: {
          participants: {
            some: { userId }
          }
        }
      }
    });
  }
}
