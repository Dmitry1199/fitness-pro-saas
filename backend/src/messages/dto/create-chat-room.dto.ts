import { ChatRoomType } from '@prisma/client';

async createChatRoom(
  @Body() body: { name: string; type: string; participantIds: string[] },
  @Request() req: any,
) {
  if (!body.name) throw new BadRequestException('Chat room name is required');

  // Приведення типу до верхнього регістру для порівняння з enum (якщо приймаються в нижньому)
  const typeUpper = body.type.toUpperCase();

  if (!Object.values(ChatRoomType).includes(typeUpper as ChatRoomType)) {
    throw new BadRequestException(`Invalid chat room type: ${body.type}`);
  }

  const createChatRoomDto: CreateChatRoomDto = {
    name: body.name,
    type: typeUpper as ChatRoomType,
    participantIds: body.participantIds || [],
  };

  return this.messagesService.createChatRoom(createChatRoomDto, req.user.userId);
}