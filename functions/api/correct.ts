import { handleCorrection, type Env } from '../../server/handler.ts';
export const onRequest: PagesFunction<Env> = ({request,env,waitUntil}) => handleCorrection(request,env,waitUntil);
