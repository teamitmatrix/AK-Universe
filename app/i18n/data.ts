import "server-only";
import { getVideoConfig } from "@/lib/video-config";
import { getT } from "./server";
import { translateData } from "./translate";

/** Catalogue data (config/*.ts) in the visitor's language. */
export async function localized<V>(value: V): Promise<V> {
  return translateData(value, await getT());
}

/** Video catalogue (texts of config/services-data.js + admin prices) in the visitor's language. */
export async function getLocalizedVideoConfig() {
  const [config, t] = await Promise.all([getVideoConfig(), getT()]);
  const localized = translateData(config, t);
  localized.services.forEach((service, i) => {
    // Quantities ("3 vidéos") are worded from qtyLabel; give every service one in the visitor's language.
    const label = config.services[i].qtyLabel || "Nombre de vidéos";
    service.qtyLabel ??= t(label);
    // Languages where "drop the final s" does not make the singular give both forms: "qty|<label>" → "Video|Videos".
    const key = `qty|${label}`;
    const forms = t.data(key);
    if (forms !== key && forms.includes("|")) {
      const [one, many] = forms.split("|");
      service.qtyWords = [one, many];
    }
  });
  return localized;
}
