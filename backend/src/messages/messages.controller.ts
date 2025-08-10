import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { MessagesService } from './messages.service';
import type { CreateMessageDto } from './dto/create-message.dto';
import type { CreateChatRoomDto, ChatRoomType } from './dto/create-chat-room.dto';
import type { UpdateMessageDto } from './dto/update-message.dto';
import type { MessageFiltersDto } from './dto/message-filters.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Chat Rooms Endpoints

  @Post('chat-rooms')
  @ApiOperation({ summary: 'Create a new chat room' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Chat room created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  async createChatRoom(
    @Body() body: { name: string; type: string; participantIds: string[] },
    @Request() req: any,
  ) {
    if (!body.name) throw new BadRequestException('Chat room name is required');

    // Перевірка, чи тип валідний згідно з ChatRoomType
    if (!Object.values(ChatRoomType).includes(body.type as ChatRoomType)) {
      throw new BadRequestException(`Invalid chat room type: ${body.type}`);
    }

    const createChatRoomDto: CreateChatRoomDto = {
      name: body.name,
      type: body.type as ChatRoomType,
      participantIds: body.participantIds || [],
    };

    return this.messagesService.createChatRoom(createChatRoomDto, req.user.userId);
  }

  @Get('chat-rooms')
  @ApiOperation({ summary: 'Get user chat rooms' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Chat rooms retrieved successfully' })
  async getUserChatRooms(@Request() req: any) {
    return this.messagesService.getUserChatRooms(req.user.userId);
  }

  @Get('chat-rooms/:chatRoomId')
  @ApiOperation({ summary: 'Get chat room details' })
  @ApiParam({ name: 'chatRoomId', description: 'Chat room ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Chat room details retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Chat room not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  async getChatRoom(
    @Param('chatRoomId', ParseUUIDPipe) chatRoomId: string,
    @Request() req: any,
  ) {
    return this.messagesService.getChatRoomById(chatRoomId, req.user.userId);
  }

  // Messages Endpoints

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Message sent successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid message data' })
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.createMessage(createMessageDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get messages with filters' })
  @ApiQuery({ name: 'chatRoomId', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Messages retrieved successfully' })
  async getMessages(
    @Query() filters: MessageFiltersDto,
    @Request() req: any,
  ) {
    return this.messagesService.getMessages(filters, req.user.userId);
  }

  @Put(':messageId')
  @ApiOperation({ summary: 'Update a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message updated successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not allowed to edit this message' })
  async updateMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.updateMessage(messageId, updateMessageDto, req.user.userId);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Message deleted successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not allowed to delete this message' })
  async deleteMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ) {
    await this.messagesService.deleteMessage(messageId, req.user.userId);
  }

  // Additional endpoints for reactions and marking read can be added similarly
}