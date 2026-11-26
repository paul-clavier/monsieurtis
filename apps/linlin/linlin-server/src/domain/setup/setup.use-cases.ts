import { PHOTO_STORAGE, SETUP_REPOSITORY } from "@/domain/injection-tokens";
import type { PhotoStorage } from "@/domain/setup-photo/photo-storage.client";
import { CommonUseCases } from "@monsieurtis/core";
import {
    Setup,
    SetupCreate,
    SetupFilters,
    SetupRelations,
    SetupUpdate,
} from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import { Inject, Injectable } from "@nestjs/common";
import { SetupAlreadyExistsError, SetupNotFoundError } from "./setup.error";
import type { SetupRepository } from "./setup.repository";

@Injectable()
export class SetupUseCases extends CommonUseCases<
    Setup,
    SetupFilters,
    SetupRelations,
    SetupCreate,
    SetupUpdate
> {
    constructor(
        @Inject(SETUP_REPOSITORY)
        repository: SetupRepository,
        @Inject(PHOTO_STORAGE)
        private readonly photoStorage: PhotoStorage,
    ) {
        super(repository);
    }

    override async create(data: SetupCreate): Promise<string> {
        await this.assertCreatable([data]);
        return super.create(data);
    }

    override async createMany(data: SetupCreate[]): Promise<string[]> {
        await this.assertCreatable(data);
        return super.createMany(data);
    }

    override async update(id: string, data: SetupUpdate): Promise<string> {
        if (data.name !== undefined) {
            await this.assertNamesAvailable([data.name], id);
        }
        return super.update(id, data);
    }

    override async delete(id: string): Promise<string> {
        const [deletedId] = await this.deleteWithPhotos([id]);
        return deletedId ?? id;
    }

    override deleteMany(ids: string[]): Promise<string[]> {
        return this.deleteWithPhotos(ids);
    }

    private async assertCreatable(data: SetupCreate[]): Promise<void> {
        await this.assertNamesAvailable(data.map((setup) => setup.name));
        await this.assertSetupsExist(
            data.flatMap((setup) => setup.subSetupIds),
        );
    }

    private async assertNamesAvailable(
        names: string[],
        exceptId?: string,
    ): Promise<void> {
        const seen = new Set<string>();
        for (const name of names) {
            if (seen.has(name)) throw new SetupAlreadyExistsError(name);
            seen.add(name);
        }
        if (names.length === 0) return;
        const existing = await this.repository.getAll({
            filters: names.map((name) => ({ name })),
        });
        const conflict = existing.find((setup) => setup.id !== exceptId);
        if (conflict) throw new SetupAlreadyExistsError(conflict.name);
    }

    private async assertSetupsExist(ids: string[]): Promise<void> {
        const uniqueIds = [...new Set(ids)];
        const setups = await Promise.all(
            uniqueIds.map((id) => this.repository.getOne(id)),
        );
        const missingIndex = setups.findIndex((setup) => setup === null);
        if (missingIndex !== -1) {
            throw new SetupNotFoundError({ id: uniqueIds[missingIndex] });
        }
    }

    private async deleteWithPhotos(ids: string[]): Promise<string[]> {
        const setups = await Promise.all(
            ids.map((id) =>
                this.repository.getOne(id, { include: ["photos"] }),
            ),
        );
        const photoKeys: string[] = [];
        setups.forEach((setup, index) => {
            if (!setup) throw new SetupNotFoundError({ id: ids[index] });
            photoKeys.push(...setup.photos.map((photo) => photo.key));
        });
        const deletedIds = await super.deleteMany(ids);
        await this.photoStorage.delete(photoKeys);
        return deletedIds;
    }
}
