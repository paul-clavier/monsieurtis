import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import {
    SetupPhoto,
    SetupPhotoFilters,
} from "@monsieurtis/linlin-interfaces/domain/setup-photo.entity";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

export type SetupPhotoRow = Prisma.SetupPhotoModel;

export const mapSetupPhoto = (row: SetupPhotoRow): SetupPhoto => ({
    id: row.id,
    setupId: row.setupId,
    key: row.key,
    contentType: row.contentType,
});

@Injectable()
export class PrismaSetupPhotoRepository extends PrismaCommonRepository<
    SetupPhoto,
    SetupPhotoRow,
    Record<string, never>,
    SetupPhotoFilters,
    Prisma.SetupPhotoWhereInput
> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.setupPhoto;
    }

    protected mapBase = mapSetupPhoto;

    protected readonly filters = {
        setupId: (setupId: string) => ({ setupId }),
    };
}
