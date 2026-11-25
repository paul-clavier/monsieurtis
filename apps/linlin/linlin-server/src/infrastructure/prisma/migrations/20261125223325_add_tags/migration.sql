-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "capacity" INTEGER,

    CONSTRAINT "Setup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupIngredient" (
    "setupId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "SetupIngredient_pkey" PRIMARY KEY ("setupId","ingredientId")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "capacity" INTEGER,
    "time" INTEGER NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagCategory" (
    "name" TEXT NOT NULL,

    CONSTRAINT "TagCategory_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Tag" (
    "name" TEXT NOT NULL,
    "categoryName" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "SetupIngredientTag" (
    "setupId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "tagName" TEXT NOT NULL,

    CONSTRAINT "SetupIngredientTag_pkey" PRIMARY KEY ("setupId","ingredientId","tagName")
);

-- CreateTable
CREATE TABLE "_IngredientToTag" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IngredientToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SetupSubSetups" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_SetupSubSetups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SetupToTag" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SetupToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RecipeToSetup" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_RecipeToSetup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Setup_name_key" ON "Setup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_name_key" ON "Recipe"("name");

-- CreateIndex
CREATE INDEX "Tag_categoryName_idx" ON "Tag"("categoryName");

-- CreateIndex
CREATE INDEX "SetupIngredientTag_tagName_idx" ON "SetupIngredientTag"("tagName");

-- CreateIndex
CREATE INDEX "_IngredientToTag_B_index" ON "_IngredientToTag"("B");

-- CreateIndex
CREATE INDEX "_SetupSubSetups_B_index" ON "_SetupSubSetups"("B");

-- CreateIndex
CREATE INDEX "_SetupToTag_B_index" ON "_SetupToTag"("B");

-- CreateIndex
CREATE INDEX "_RecipeToSetup_B_index" ON "_RecipeToSetup"("B");

-- AddForeignKey
ALTER TABLE "SetupIngredient" ADD CONSTRAINT "SetupIngredient_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "Setup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupIngredient" ADD CONSTRAINT "SetupIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_categoryName_fkey" FOREIGN KEY ("categoryName") REFERENCES "TagCategory"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupIngredientTag" ADD CONSTRAINT "SetupIngredientTag_setupId_ingredientId_fkey" FOREIGN KEY ("setupId", "ingredientId") REFERENCES "SetupIngredient"("setupId", "ingredientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupIngredientTag" ADD CONSTRAINT "SetupIngredientTag_tagName_fkey" FOREIGN KEY ("tagName") REFERENCES "Tag"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToTag" ADD CONSTRAINT "_IngredientToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToTag" ADD CONSTRAINT "_IngredientToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SetupSubSetups" ADD CONSTRAINT "_SetupSubSetups_A_fkey" FOREIGN KEY ("A") REFERENCES "Setup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SetupSubSetups" ADD CONSTRAINT "_SetupSubSetups_B_fkey" FOREIGN KEY ("B") REFERENCES "Setup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SetupToTag" ADD CONSTRAINT "_SetupToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Setup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SetupToTag" ADD CONSTRAINT "_SetupToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecipeToSetup" ADD CONSTRAINT "_RecipeToSetup_A_fkey" FOREIGN KEY ("A") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecipeToSetup" ADD CONSTRAINT "_RecipeToSetup_B_fkey" FOREIGN KEY ("B") REFERENCES "Setup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
