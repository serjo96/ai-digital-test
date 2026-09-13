import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module.js';
import { AppConfigModule } from './config/config.module.js';
import { PipelineModule } from './pipeline/pipeline.module.js';

@Module({ imports: [AppConfigModule, AiModule, PipelineModule] })
export class AppModule {}
