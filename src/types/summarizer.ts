// Chrome built-in Summarizer API (on-device model). lib.dom does not ship
// these types yet, so the app declares only the surface it uses.

export type SummarizerAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

export interface SummarizerCreateOptions {
  readonly type: 'key-points' | 'tldr' | 'teaser' | 'headline';
  readonly format: 'plain-text' | 'markdown';
  readonly length: 'short' | 'medium' | 'long';
  readonly sharedContext?: string;
}

export interface SummarizerInstance {
  summarize(text: string): Promise<string>;
  destroy(): void;
}

export interface SummarizerApi {
  availability(): Promise<SummarizerAvailability>;
  create(options: SummarizerCreateOptions): Promise<SummarizerInstance>;
}

function isSummarizerApi(value: unknown): value is SummarizerApi {
  if (typeof value !== 'object' && typeof value !== 'function') return false;
  if (value === null) return false;
  const candidate = value as { readonly availability?: unknown; readonly create?: unknown };
  return typeof candidate.availability === 'function' && typeof candidate.create === 'function';
}

export function getSummarizerApi(): SummarizerApi | null {
  const scope = globalThis as { readonly Summarizer?: unknown };
  return isSummarizerApi(scope.Summarizer) ? scope.Summarizer : null;
}
