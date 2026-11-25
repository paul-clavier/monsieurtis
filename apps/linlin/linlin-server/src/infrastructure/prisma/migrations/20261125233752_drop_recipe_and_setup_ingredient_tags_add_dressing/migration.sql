-- DropForeignKey
ALTER TABLE "SetupIngredientTag" DROP CONSTRAINT "SetupIngredientTag_setupId_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "SetupIngredientTag" DROP CONSTRAINT "SetupIngredientTag_tagName_fkey";

-- DropForeignKey
ALTER TABLE "_RecipeToSetup" DROP CONSTRAINT "_RecipeToSetup_A_fkey";

-- DropForeignKey
ALTER TABLE "_RecipeToSetup" DROP CONSTRAINT "_RecipeToSetup_B_fkey";

-- AlterTable
ALTER TABLE "Setup" ADD COLUMN     "dressing" TEXT;

-- DropTable
DROP TABLE "Recipe";

-- DropTable
DROP TABLE "SetupIngredientTag";

-- DropTable
DROP TABLE "_RecipeToSetup";
