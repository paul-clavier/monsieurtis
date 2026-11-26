import { TagDomainModule } from "@/domain/tag/tag.module";
import { Module } from "@nestjs/common";
import { TagController } from "./tag.controller";

@Module({
    imports: [TagDomainModule],
    controllers: [TagController],
})
export class TagApiModule {}
