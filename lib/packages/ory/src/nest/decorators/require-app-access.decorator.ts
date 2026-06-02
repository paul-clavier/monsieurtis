import { SetMetadata } from "@nestjs/common";

import { AppId } from "../../types";

export const REQUIRE_APP_ACCESS_KEY = "monsieurtis:require-app-access";

/**
 * Mark a controller method (or whole controller) as requiring `access` to an
 * app. The {@link KetoAccessGuard} reads this and rejects unauthorised users.
 *
 * @example
 *   @Controller("invoices")
 *   @RequireAppAccess("linlin")
 *   export class InvoiceController { ... }
 */
export const RequireAppAccess = (appId: AppId) =>
    SetMetadata(REQUIRE_APP_ACCESS_KEY, appId);
