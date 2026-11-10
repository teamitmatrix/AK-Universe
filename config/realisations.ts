/**
 * Public portfolio on /marketing/realisations.
 * Add only approved projects (publication rights for footage, people, music, client name).
 * Leave this list empty until assets are ready — do not invent entries.
 *
 * Files go under public/, e.g.:
 *   /assets/video/realisations/<id>.mp4
 *   /assets/img/realisations/<id>.jpg
 *   /assets/video/realisations/<id>.fr.vtt  (optional captions)
 */

export type Realisation = {
  id: string;
  title: string;
  /** Service type label shown on the card (e.g. "Vidéo entreprise"). */
  service: string;
  /** Optional link to the matching service page. */
  serviceSlug?: string;
  /** Short client-need / brief description. */
  need: string;
  /** Videographer or production credit. */
  credit: string;
  /** Complementary Instagram URL (not the only way to see the work). */
  instagram?: string;
  poster: string;
  video: string;
  /** Display duration before metadata loads, e.g. "1:24". */
  duration?: string;
  /** Optional WebVTT captions path. */
  captions?: string;
};

export const MARKETING_REALISATIONS: Realisation[] = [];
