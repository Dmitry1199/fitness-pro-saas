import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateMessageDto } from './create-message.dto';

export class UpdateMessageDto extends PartialType(CreateMessageDto) {
  @ApiProperty({ description: 'Updated message content', required: false })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Mark message as read', required: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiProperty({ description: 'Mark message as edited', required: false })
  @IsBoolean()
  @IsOptional()
  isEdited?: boolean;
}
