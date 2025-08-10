import { IsUUID } from 'class-validator';

export class MessageFiltersDto {
  @IsUUID()
  chatRoomId: string;
}