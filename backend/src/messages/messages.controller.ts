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
import type { CreateChatRoomDto } from './dto/create-chat-room.dto';
import type { UpdateMessageDto } from './dto/update-message.dto';
import type { MessageFiltersDto } from './dto/message-filters.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Chat Rooms

  @Post('chat-rooms')
  @ApiOperation({ summary: 'Create a new chat room' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Chat room created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  async createChatRoom(@Body() createChatRoomDto: CreateChatRoomDto, @Request() req: any) {
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
  async getChatRoom(@Param('chatRoomId', ParseUUIDPipe) chatRoomId: string, @Request() req: any) {
    return this.messagesService.getChatRoomById(chatRoomId, req.user.userId);
  }

  // Messages

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Message sent successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid message data' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied to chat room' })
  async createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req: any) {
    if (!createMessageDto.chatRoomId) {
      throw new BadRequestException('chatRoomId is required');
    }
    return this.messagesService.createMessage(createMessageDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get messages with filtering and pagination' })
  @ApiQuery({ name: 'chatRoomId', required: true, description: 'Filter by chat room ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by message type' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in message content' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Messages retrieved successfully' })
  async getMessages(@Query() filters: MessageFiltersDto, @Request() req: any) {
    if (!filters.chatRoomId) {
      throw new BadRequestException('chatRoomId query parameter is required');
    }
    return this.messagesService.getMessages(filters, req.user.userId);
  }

  @Put(':messageId')
  @ApiOperation({ summary: 'Update a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot edit this message' })
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
  @ApiResponse({ status: HttpStatus.OK, description: 'Message deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot delete this message' })
  async deleteMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @Request() req: any) {
    return this.messagesService.deleteMessage(messageId, req.user.userId);
  }

  // Message Actions

  @Post(':messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message marked as read' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async markMessageAsRead(@Param('messageId', ParseUUIDPipe) messageId: string, @Request() req: any) {
    return this.messagesService.markMessageAsRead(messageId, req.user.userId);
  }

  @Post(':messageId/reactions')
  @ApiOperation({ summary: 'Add or remove reaction to message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reaction added/removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async addReaction(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() body: { reaction: string },
    @Request() req: any,
  ) {
    return this.messagesService.addReaction(messageId, body.reaction, req.user.userId);
  }

  // User Statistics

  @Get('stats/unread-count')
  @ApiOperation({ summary: 'Get unread messages count for user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unread count retrieved successfully' })
  async getUnreadMessagesCount(@Request() req: any) {
    const count = await this.messagesService.getUnreadMessagesCount(req.user.userId);
    return { unreadCount: count };
  }

  // Direct Chat Creation Helper

  @Post('direct-chat')
  @ApiOperation({ summary: 'Create or get existing direct chat with another user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Direct chat created or retrieved' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid user ID' })
  async createDirectChat(@Body() body: { participantId: string }, @Request() req: any) {
    if (!body.participantId) {
      throw new BadRequestException('participantId is required');
    }
    const createChatRoomDto: CreateChatRoomDto = {
      type: 'DIRECT' as any,
      participantIds: [req.user.userId, body.participantId],
    };

    return this.messagesService.createChatRoom(createChatRoomDto, req.user.userId);
  }

  // Search Messages

  @Get('search')
  @ApiOperation({ summary: 'Search messages across all user chat rooms' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Search results retrieved successfully' })
  async searchMessages(
    @Query('q') query: string,
    @Query() pagination: { page?: number; limit?: number },
    @Request() req: any,
  ) {
    const filters: MessageFiltersDto = {
      chatRoomId: '', // Якщо треба пошук по всіх чатах, можна в сервісі врахувати пустий chatRoomId
      search: query,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
    };

    return this.messagesService.getMessages(filters, req.user.userId);
  }

  // Bulk Actions

  @Post('bulk/mark-read')
  @ApiOperation({ summary: 'Mark multiple messages as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Messages marked as read' })
  async markMultipleMessagesAsRead(@Body() body: { messageIds: string[] }, @Request() req: any) {
    if (!body.messageIds || !Array.isArray(body.messageIds) || body.messageIds.length === 0) {
      throw new BadRequestException('messageIds must be a non-empty array');
    }

    const results = await Promise.allSettled(
      body.messageIds.map(messageId => this.messagesService.markMessageAsRead(messageId, req.user.userId)),
    );

    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    return {
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failedCount,
    };
  }
}
