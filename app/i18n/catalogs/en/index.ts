import type { Catalog } from "../../translate";
import account from "./account";
import agents from "./agents";
import contact from "./contact";
import faq from "./faq";
import common from "./common";
import legal from "./legal";
import pages from "./pages";
import services from "./services";
import video from "./video";

/**
 * Texts of client components (sent to the browser).
 * Sign-in, sign-up, subscription, admin and chat-widget texts are still written per language inside their
 * components (app/components/auth, billing, admin, lib/chatbot/widgetText.ts) — add the new language there too.
 */
export const client: Catalog = { ...common, ...video, ...contact };

/** Server-only texts: pages, catalogue data, FAQ, legal pages, server messages. */
export const server: Catalog = { ...pages, ...agents, ...services, ...faq, ...legal, ...account };
