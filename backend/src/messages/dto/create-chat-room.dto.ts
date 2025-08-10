import { IsString, IsEnum, IsOptional, IsArray, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { ChatRoomType } from '@prisma/client';

export class CreateChatRoomDto {
  @IsString()
  name: string;  // обов’язкове поле, бо у Prisma schema воно required

  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  participantIds: string[];
}
