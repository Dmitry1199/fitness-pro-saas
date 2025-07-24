import { IsString, IsOptional, IsUUID, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ChatRoomType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  SUPPORT = 'SUPPORT',
}

export class CreateChatRoomDto {
  @ApiProperty({ description: 'Chat room name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Chat room type',
    enum: ChatRoomType,
    default: ChatRoomType.DIRECT
  })
  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @ApiProperty({ description: 'Participant user IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiProperty({ description: 'Chat room description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
