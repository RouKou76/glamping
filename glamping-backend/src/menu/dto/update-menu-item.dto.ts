import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMenuItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['breakfast', 'lunch', 'dinner', 'minibar'] })
  @IsEnum(['breakfast', 'lunch', 'dinner', 'minibar'])
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: ['appetizers', 'first', 'hot', 'sides', 'desserts', 'drinks', 'main'] })
  @IsString()
  @IsOptional()
  subcat?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPrice?: boolean;
}
