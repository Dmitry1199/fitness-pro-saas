import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { MessageType } from '@prisma/client';

export class MessageFiltersDto {
  @IsOptional()
  @IsString()
  chatRoomId?: string;  // зроблено необов’язковим, щоб не було помилки у контролері

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}