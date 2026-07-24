import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TicketItemDto {
  @ApiProperty()
  @IsString()
  menuItemId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsInt()
  price: number;

  @ApiProperty()
  @IsInt()
  quantity: number;
}

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  houseId: string;

  @ApiProperty({
    enum: [
      'food',
      'transfer',
      'cleaning',
      'towels',
      'minibar',
      'gates',
      'custom',
    ],
  })
  @IsEnum([
    'food',
    'transfer',
    'cleaning',
    'towels',
    'minibar',
    'gates',
    'custom',
  ])
  type: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  geo?: string;

  @ApiPropertyOptional({ enum: ['cook', 'cleaning', 'driver', 'admin'] })
  @IsEnum(['cook', 'cleaning', 'driver', 'admin'])
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  guestCount?: number;

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketItemDto)
  @IsOptional()
  items?: TicketItemDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  desiredAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  km?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  priceFix?: number;
}
