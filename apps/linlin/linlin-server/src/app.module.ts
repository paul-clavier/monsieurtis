import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { IngredientApiModule } from "./presentation/api/ingredient/ingredient.module";

@Module({
    imports: [IngredientApiModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
