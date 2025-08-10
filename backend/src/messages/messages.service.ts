import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums } from '@prisma/client';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Створення нового чату
   */
  async createChatRoom(data: CreateChatRoomDto) {
    return this.prisma.chatRoom.create({
      data: {
        ...data,
        type: data.type as $Enums.ChatRoomType,
      },
    });
  }

  /**
   * Отримання чату за ID
   */
  async getChatRoomById(id: string) {
    return this.prisma.chatRoom.findUnique({
      where: { id },
    });
  }

  /**
   * Створення нового повідомлення
   */
  async createMessage(data: CreateMessageDto) {
    return this.prisma.message.create({
      data: {
        ...data,
        type: (data.type || $Enums.MessageType.TEXT) as $Enums.MessageType,
      },
    });
  }

  /**
   * Отримання повідомлень чату
   */
  async getMessagesByChatId(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Видалення чату з повідомленнями
   */
  async deleteChatRoom(id: string) {
    await this.prisma.message.deleteMany({
      where: { chatId: id },
    });

    return this.prisma.chatRoom.delete({
      where: { id },
    });
  }
}
