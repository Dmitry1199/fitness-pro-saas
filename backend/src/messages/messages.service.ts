import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { type CreateMessageDto, MessageType } from './dto/create-message.dto';
import { type CreateChatRoomDto, ChatRoomType } from './dto/create-chat-room.dto';
import type { UpdateMessageDto } from './dto/update-message.dto';
import type { MessageFiltersDto } from './dto/message-filters.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // --- Приватні допоміжні методи ---

  private async validateParticipants(participantIds: string[]) {
    const participants = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true },
    });

    if (participants.length !== participantIds.length) {
      throw new BadRequestException('Some participants not found');
    }
  }

  private async checkUserInChatRoom(chatRoomId: string, userId: string) {
    const participant = await this.prisma.chatRoomParticipant.findUnique({
      where: {
        chatRoomId_userId: {
          chatRoomId,
          userId,
        }
      }
    });
    if (!participant) {
      throw new ForbiddenException('Access denied to this chat room');
    }
  }

  private async findMessageById(messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  private generateChatRoomName(participants: { firstName: string; lastName: string }[], type: ChatRoomType): string {
    if (type === ChatRoomType.DIRECT) {
      return participants.map(p => `${p.firstName} ${p.lastName}`).join(', ');
    }
    return `Group Chat - ${new Date().toLocaleDateString()}`;
  }

  // --- Chat Room Management ---

  async createChatRoom(createChatRoomDto: CreateChatRoomDto, creatorId: string) {
    const { participantIds, type, name, description } = createChatRoomDto;

    await this.validateParticipants(participantIds);

    if (type === ChatRoomType.DIRECT && participantIds.length === 2) {
      // Знайти існуючу кімнату, де учасники рівно ці двоє
      const existingRoom = await this.prisma.chatRoom.findFirst({
        where: {
          type: ChatRoomType.DIRECT,
          participants: {
            every: { userId: { in: participantIds } }
          },
          participants: {
            some: { userId: { in: participantIds } }
          }
        },
        include: { _count: { select: { participants: true } } }
      });

      if (existingRoom && existingRoom._count.participants === 2) {
        return existingRoom;
      }
    }

    // Створити нову кімнату
    const participantsData = participantIds.map(userId => ({ userId }));

    const chatRoom = await this.prisma.chatRoom.create({
      data: {
        name: name || this.generateChatRoomName(await this.prisma.user.findMany({
          where: { id: { in: participantIds } },
          select: { firstName: true, lastName: true }
        }), type),
        type,
        description,
        createdById: creatorId,
        participants: { createMany: { data: participantsData } }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true, role: true }
            }
          }
        },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } }
      }
    });

    return chatRoom;
  }

  async getUserChatRooms(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true, role: true } } }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        _count: { select: { messages: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getChatRoomById(chatRoomId: string, userId: string) {
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true, role: true }
            }
          }
        },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    if (!chatRoom) throw new NotFoundException('Chat room not found');

    const isParticipant = chatRoom.participants.some(p => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Access denied to this chat room');

    return chatRoom;
  }

  // --- Message Management ---

  async createMessage(createMessageDto: CreateMessageDto, senderId: string) {
    const { chatRoomId, content, type, attachmentUrl, attachmentName, replyToId } = createMessageDto;

    await this.checkUserInChatRoom(chatRoomId, senderId);

    if (replyToId) {
      const replyMessage = await this.prisma.message.findUnique({ where: { id: replyToId } });
      if (!replyMessage || replyMessage.chatRoomId !== chatRoomId) {
        throw new BadRequestException('Reply message not found in this chat room');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        type: type || MessageType.TEXT,
        attachmentUrl,
        attachmentName,
        chatRoomId,
        senderId,
        replyToId
      },
      include: {
        sender: {
          select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true }
        },
        replyTo: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    await this.prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { updatedAt: new Date() }
    });

    return message;
  }

  async getMessages(filters: MessageFiltersDto, userId: string) {
    const { chatRoomId, type, fromDate, toDate, search, page = 1, limit = 20 } = filters;

    if (chatRoomId) await this.checkUserInChatRoom(chatRoomId, userId);

    const skip = (page - 1) * limit;
    const where: any = {};

    if (chatRoomId) where.chatRoomId = chatRoomId;
    if (type) where.type = type;
    if (search) where.content = { contains: search, mode: 'insensitive' };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true } },
          replyTo: { include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
          reactions: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          readBy: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.message.count({ where })
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateMessage(messageId: string, updateMessageDto: UpdateMessageDto, userId: string) {
    const message = await this.findMessageById(messageId);

    if (message.senderId !== userId && updateMessageDto.content) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const updateData: Partial<typeof message> = {};
    if (updateMessageDto.content) {
      updateData.content = updateMessageDto.content;
      updateData.isEdited = true;
      updateData.editedAt = new Date();
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: updateData,
      include: {
        sender: { select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true } },
        replyTo: { include: { sender: { select: { id: true, firstName: true, lastName: true } } } }
      }
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.findMessageById(messageId);

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    return this.prisma.message.delete({ where: { id: messageId } });
  }

  async markMessageAsRead(messageId: string, userId: string) {
    const message = await this.findMessageById(messageId);

    await this.checkUserInChatRoom(message.chatRoomId, userId);

    const existingRead = await this.prisma.messageRead.findUnique({
      where: { messageId_userId: { messageId, userId } }
    });

    if (!existingRead) {
      await this.prisma.messageRead.create({
        data: { messageId, userId, readAt: new Date() }
      });
    }

    return { success: true };
  }

  async addReaction(messageId: string, reaction: string, userId: string) {
    const message = await this.findMessageById(messageId);

    await this.checkUserInChatRoom(message.chatRoomId, userId);

    const existingReaction = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_reaction: { messageId, userId, reaction } }
    });

    if (existingReaction) {
      await this.prisma.messageReaction.delete({ where: { id: existingReaction.id } });
    } else {
      await this.prisma.messageReaction.create({ data: { messageId, userId, reaction } });
    }

    return { success: true };
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const userChatRooms = await this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      select: { id: true }
    });

    const chatRoomIds = userChatRooms.map(room => room.id);

    const unreadCount = await this.prisma.message.count({
      where: {
        chatRoomId: { in: chatRoomIds },
        senderId: { not: userId },
        readBy: { none: { userId } }
      }
    });

    return unreadCount;
  }
}
