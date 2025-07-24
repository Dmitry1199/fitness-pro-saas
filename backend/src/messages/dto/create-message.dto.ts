import { IsString, IsOptional, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',
}

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiProperty({ description: 'Chat room ID' })
  @IsUUID()
  chatRoomId: string;

  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    default: MessageType.TEXT
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @ApiProperty({ description: 'Attachment URL', required: false })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiProperty({ description: 'Attachment filename', required: false })
  @IsString()
  @IsOptional()
  attachmentName?: string;

  @ApiProperty({ description: 'Reply to message ID', required: false })
  @IsUUID()
  @IsOptional()
  replyToId?: string;
}
