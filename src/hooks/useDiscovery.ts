import { useCallback, useEffect, useState } from 'react';
import type { BookRef, InterestId, Lesson, TopicSummary } from '../types';
import { booksFor, listBuiltBooks, loadBookCatalog, topicsForInterest } from '../learning';
import { toUserMessage } from './useLesson';

const PAGE = 12;

// Books (from the generated catalog) and topics (Wikipedia) for one interest.
export function useDiscovery(interest: InterestId) {
  const [books, setBooks] = useState<BookRef[]>([]);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [builtBooks, setBuiltBooks] = useState<Lesson[]>([]);
  const [catalogDate, setCatalogDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [catalog, built, topicList] = await Promise.all([
          loadBookCatalog(),
          listBuiltBooks(),
          topicsForInterest(interest, 0).catch(() => []),
        ]);
        if (!active) return;
        setBooks(booksFor(catalog, interest, 0, PAGE));
        setCatalogDate(catalog.catalogDate);
        setBuiltBooks(built);
        setTopics(topicList);
      } catch (err) {
        if (active) setErrorMessage(toUserMessage(err));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [interest, reloadCount]);

  const loadMore = useCallback(() => {
    void loadBookCatalog().then((catalog) => {
      setBooks((current) => [...current, ...booksFor(catalog, interest, current.length, PAGE)]);
    });
  }, [interest]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return { books, topics, builtBooks, catalogDate, isLoading, errorMessage, loadMore, reload };
}
