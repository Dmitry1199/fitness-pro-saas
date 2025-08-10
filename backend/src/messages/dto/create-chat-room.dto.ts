import { IsString, IsEnum, IsOptional, IsArray, ArrayUnique } from 'class-validator';
import { ChatRoomType } from '@prisma/client';

export class CreateChatRoomDto {
  @IsString()
  name: string;

  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  participantIds?: string[];
}