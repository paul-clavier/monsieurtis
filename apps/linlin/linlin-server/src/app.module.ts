import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { IngredientApiModule } from "./presentation/api/ingredient/ingredient.module";
import { SetupPhotoApiModule } from "./presentation/api/setup-photo/setup-photo.module";
import { SetupViewApiModule } from "./presentation/api/setup-view/setup-view.module";
import { SetupApiModule } from "./presentation/api/setup/setup.module";
import { TagApiModule } from "./presentation/api/tag/tag.module";
import { DomainExceptionFilter } from "./presentation/errors/domain-exception.filter";

@Module({
    imports: [
        IngredientApiModule,
        SetupApiModule,
        SetupPhotoApiModule,
        SetupViewApiModule,
        TagApiModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        { provide: APP_FILTER, useClass: DomainExceptionFilter },
    ],
})
export class AppModule {}
