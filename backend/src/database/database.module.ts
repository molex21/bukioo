import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './databse.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
