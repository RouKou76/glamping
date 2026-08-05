import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['breakfast', 'lunch', 'dinner', 'minibar'] })
  @IsEnum(['breakfast', 'lunch', 'dinner', 'minibar'])
  category: string;

  @ApiPropertyOptional({
    enum: ['appetizers', 'first', 'hot', 'sides', 'desserts', 'drinks', 'main'],
  })
  @IsString()
  @IsOptional()
  subcat?: string;

  @ApiProperty()
  @IsInt()
  price: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPrice?: boolean;
}
