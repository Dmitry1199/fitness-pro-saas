import { ChatRoomType } from "@prisma/client";
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

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
