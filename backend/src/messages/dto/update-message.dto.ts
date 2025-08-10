import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MessageType } from '@prisma/client';

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;
}