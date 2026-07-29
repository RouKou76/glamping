import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TasksController } from '../tasks/tasks.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { HousesModule } from '../houses/houses.module';

@Module({
  imports: [GatewayModule, HousesModule],
  controllers: [TicketsController, TasksController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
