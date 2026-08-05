import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckInDto {
  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @Min(1)
  @IsOptional()
  guestCount?: number;

  @ApiPropertyOptional({ example: 'ru' })
  @IsString()
  @IsOptional()
  lang?: string;
}
