import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AppId, canAccessApp, type KetoCheckClient } from "@monsieurtis/ory";

import { REQUIRE_APP_ACCESS_KEY } from "../decorators/require-app-access.decorator";
import { KETO_CLIENT, ORY_CONFIG } from "../ory.module";

interface OryConfig {
    publicAuthOrigin: string; // e.g. https://auth.monsieurtis.com
}

/**
 * Guard that enforces `app:<id>#access@user:<sub>` via Keto.
 *
 * Routes without `@RequireAppAccess(...)` are allowed (returns true).
 * Routes with it call Keto and on deny issue a 302 redirect to the canonical
 * Crocus denied page. We use a redirect (instead of throwing 403) because
 * apps in this monorepo render in the browser — we want the user to land
 * back on the SSO console, not on an API error page.
 *
 * For pure API routes (no browser context), wrap this guard or set
 * `response.headersSent` to disable the redirect and let the 403 propagate.
 */
@Injectable()
export class KetoAccessGuard implements CanActivate {
    private readonly logger = new Logger(KetoAccessGuard.name);

    constructor(
        private readonly reflector: Reflector,
        @Inject(KETO_CLIENT) private readonly keto: KetoCheckClient,
        @Inject(ORY_CONFIG) private readonly config: OryConfig,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const appId = this.reflector.getAllAndOverride<AppId | undefined>(
            REQUIRE_APP_ACCESS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!appId) return true; // no access requirement on this route

        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();

        // Expecting the OIDC strategy to have set `req.user.sub` to the Kratos
        // identity ID. Token middleware not yet ran? — fail closed.
        const sub: string | undefined = req.user?.sub;
        if (!sub) {
            this.logger.warn("KetoAccessGuard: no req.user.sub; rejecting");
            this.deny(res, appId, req.url);
            return false;
        }

        const allowed = await canAccessApp(this.keto, sub, appId).catch(
            (err) => {
                this.logger.error(
                    `Keto check error for ${sub} → ${appId}: ${err.message}`,
                );
                return false; // fail closed
            },
        );

        if (!allowed) {
            this.deny(res, appId, req.url);
            return false;
        }
        return true;
    }

    private deny(
        res: { redirect: (url: string) => void },
        appId: AppId,
        from: string,
    ) {
        const url = `${this.config.publicAuthOrigin}/denied?app=${encodeURIComponent(
            appId,
        )}&from=${encodeURIComponent(from)}`;
        res.redirect(url);
    }
}
