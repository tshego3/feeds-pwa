import { useEffect, useState } from 'react';
import type { FeedItem } from '../types';
import { fetchOGImageUrl } from '../feed';

/**
 * Resolves an article's hero image (mirrors native ImageResolver):
 *   1. the image the feed itself supplied
 *   2. the article page's og:image
 *
 * Feeds like MyBroadband and Daily Investor ship no images in their RSS, so
 * without the og:image step their cards render with no artwork at all.
 */
export function useResolvedImage(
  article: FeedItem,
  suppressHeroImage = false,
): string | undefined {
  const feedImage = article.imageUrls[0];
  const [ogImage, setOgImage] = useState<string>();

  useEffect(() => {
    setOgImage(undefined);
    if (suppressHeroImage || feedImage || !article.link) return;

    let cancelled = false;
    fetchOGImageUrl(article.link)
      .then((url) => {
        if (!cancelled && url) setOgImage(url);
      })
      .catch(() => {
        // Hero images are decorative; the card renders fine without one.
      });

    return () => {
      cancelled = true;
    };
  }, [article.link, feedImage, suppressHeroImage]);

  if (suppressHeroImage) return undefined;
  return feedImage ?? ogImage;
}
