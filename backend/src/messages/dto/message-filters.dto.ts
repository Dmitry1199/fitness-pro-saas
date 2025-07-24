import { IsOptional, IsUUID, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from './create-message.dto';

export class MessageFiltersDto {
  @ApiProperty({ description: 'Chat room ID to filter messages', required: false })
  @IsUUID()
  @IsOptional()
  chatRoomId?: string;

  @ApiProperty({ description: 'Message type filter', enum: MessageType, required: false })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({ description: 'Filter from date', required: false })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({ description: 'Filter to date', required: false })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiProperty({ description: 'Search query in message content', required: false })
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
