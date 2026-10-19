import { configured, json, type Env } from '../../server/handler.ts';
export const onRequestGet: PagesFunction<Env> = ({env}) => json({ready:configured(env),siteKey:env.TURNSTILE_SITE_KEY || null,requireTurnstile:env.REQUIRE_TURNSTILE !== 'false'});
