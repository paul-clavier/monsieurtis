import { Module } from "@nestjs/common";
import { PhotoStorageProvider } from "./s3.provider";

@Module({
    providers: [PhotoStorageProvider],
    exports: [PhotoStorageProvider],
})
export class S3Module {}
