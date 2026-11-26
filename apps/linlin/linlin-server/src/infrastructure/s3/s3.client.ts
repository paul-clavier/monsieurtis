import {
    S3_ACCESS_KEY_ID,
    S3_BUCKET,
    S3_ENDPOINT,
    S3_FORCE_PATH_STYLE,
    S3_REGION,
    S3_SECRET_ACCESS_KEY,
} from "@/app.constants";
import type {
    PhotoStorage,
    StoredPhoto,
} from "@/domain/setup-photo/photo-storage.client";
import {
    DeleteObjectsCommand,
    GetObjectCommand,
    NoSuchKey,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { splitArrayIntoChunks } from "@monsieurtis/core";
import { Injectable, OnModuleDestroy } from "@nestjs/common";

const DELETE_BATCH_SIZE = 1000;

@Injectable()
export class S3PhotoStorage implements PhotoStorage, OnModuleDestroy {
    private readonly client = new S3Client({
        endpoint: S3_ENDPOINT,
        region: S3_REGION,
        forcePathStyle: S3_FORCE_PATH_STYLE,
        credentials: {
            accessKeyId: S3_ACCESS_KEY_ID,
            secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
    });

    onModuleDestroy() {
        this.client.destroy();
    }

    async put(
        key: string,
        content: Uint8Array,
        contentType: string,
    ): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
                Body: content,
                ContentType: contentType,
            }),
        );
    }

    async get(key: string): Promise<StoredPhoto | null> {
        try {
            const object = await this.client.send(
                new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
            );
            if (!object.Body) return null;
            return {
                content: await object.Body.transformToByteArray(),
                contentType: object.ContentType ?? "application/octet-stream",
            };
        } catch (error) {
            if (error instanceof NoSuchKey) return null;
            throw error;
        }
    }

    async delete(keys: string[]): Promise<void> {
        for (const batch of splitArrayIntoChunks(keys, DELETE_BATCH_SIZE)) {
            await this.client.send(
                new DeleteObjectsCommand({
                    Bucket: S3_BUCKET,
                    Delete: { Objects: batch.map((Key) => ({ Key })) },
                }),
            );
        }
    }
}
