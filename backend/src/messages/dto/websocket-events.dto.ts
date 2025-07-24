import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinChatRoomDto {
  @ApiProperty({ description: 'Chat room ID to join' })
  @IsUUID()
  chatRoomId: string;
}

export class LeaveChatRoomDto {
  @ApiProperty({ description: 'Chat room ID to leave' })
  @IsUUID()
  chatRoomId: string;
}

export class TypingIndicatorDto {
  @ApiProperty({ description: 'Chat room ID' })
  @IsUUID()
  chatRoomId: string;

  @ApiProperty({ description: 'Is user typing' })
  @IsBoolean()
  isTyping: boolean;
}

export class OnlineStatusDto {
  @ApiProperty({ description: 'User online status' })
  @IsBoolean()
  isOnline: boolean;

  @ApiProperty({ description: 'Last seen timestamp', required: false })
  @IsOptional()
  lastSeen?: Date;
}

export class MessageReadDto {
  @ApiProperty({ description: 'Message ID that was read' })
  @IsUUID()
  messageId: string;

  @ApiProperty({ description: 'Chat room ID' })
  @IsUUID()
  chatRoomId: string;
}

export class MessageReactionDto {
  @ApiProperty({ description: 'Message ID to react to' })
  @IsUUID()
  messageId: string;

  @ApiProperty({ description: 'Reaction emoji' })
  @IsString()
  reaction: string;

  @ApiProperty({ description: 'Add or remove reaction' })
  @IsBoolean()
  add: boolean;
}
