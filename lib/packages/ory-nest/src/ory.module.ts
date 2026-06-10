import { DynamicModule, Module, Provider } from "@nestjs/common";

import { KetoCheckClient } from "@monsieurtis/ory";
import { KetoAccessGuard } from "./guards/keto-access.guard";

export const KETO_CLIENT = "MONSIEURTIS_ORY_KETO_CLIENT";
export const ORY_CONFIG = "MONSIEURTIS_ORY_CONFIG";

export interface OryModuleOptions {
    /** Keto read URL, e.g. `http://keto-read.identity.svc:80` (in-cluster). */
    ketoReadUrl: string;
    /** Public origin of Crocus, e.g. `https://auth.monsieurtis.com`. Used for 302 on deny. */
    publicAuthOrigin: string;
}

@Module({})
export class OryModule {
    static forRoot(options: OryModuleOptions): DynamicModule {
        const providers: Provider[] = [
            {
                provide: KETO_CLIENT,
                useValue: {
                    readUrl: options.ketoReadUrl,
                } satisfies KetoCheckClient,
            },
            {
                provide: ORY_CONFIG,
                useValue: { publicAuthOrigin: options.publicAuthOrigin },
            },
            KetoAccessGuard,
        ];

        return {
            module: OryModule,
            providers,
            exports: providers,
            global: true,
        };
    }
}
