import type { FeedCard, SavedIdea } from '../types';
import { getAllIdeas, getDueIdeas, getIdea, removeIdea, saveIdea } from '../db';
import { bookLink } from './books';
import { firstReviewDue, nextReview } from './review';
import { coverUrl } from './sources';

const TRIVIA_LINK = 'https://opentdb.com/';

type IdeaFields = Omit<SavedIdea, 'savedAt' | 'reviewStep' | 'reviewDueAt'>;

// Maps a feed card to what the Library keeps. Goal cards hold no idea.
export function ideaFromCard(card: FeedCard, now: number): SavedIdea | null {
  if (card.kind === 'review') return card.idea;
  const fields = ideaFields(card);
  return fields ? { ...fields, savedAt: now, reviewStep: 0, reviewDueAt: firstReviewDue(now) } : null;
}

function ideaFields(card: FeedCard): IdeaFields | null {
  switch (card.kind) {
    case 'article':
      return { id: card.id, kind: 'article', text: card.article.title, sourceTitle: card.feedTitle, sourceLink: card.article.link, imageUrl: card.article.imageUrls[0] };
    case 'book-idea':
      return { id: card.id, kind: 'book-idea', text: card.idea.text, sourceTitle: `${card.book.title}, ${card.book.author}`, sourceLink: bookLink(card.book.gutenbergId), imageUrl: coverUrl(card.book.gutenbergId) };
    case 'quote':
      return { id: card.id, kind: 'quote', text: card.text, sourceTitle: `${card.book.title}, ${card.book.author}`, sourceLink: bookLink(card.book.gutenbergId), imageUrl: coverUrl(card.book.gutenbergId) };
    case 'topic':
    case 'daily':
      return { id: card.id, kind: 'topic', text: card.topic.extract, sourceTitle: card.topic.title, sourceLink: card.topic.pageUrl, imageUrl: card.topic.thumbnailUrl };
    case 'quiz':
      return { id: card.id, kind: 'quiz', text: `${card.quiz.question} Answer: ${card.quiz.correct}`, sourceTitle: card.quiz.categoryName, sourceLink: TRIVIA_LINK };
    default:
      return null;
  }
}

// Saves the card's idea, or removes it when it is already saved. Resolves
// true when the idea is saved after the call.
export async function toggleSavedIdea(card: FeedCard): Promise<boolean> {
  const idea = ideaFromCard(card, Date.now());
  if (!idea) return false;
  if (await getIdea(idea.id)) {
    await removeIdea(idea.id);
    return false;
  }
  await saveIdea(idea);
  return true;
}

export async function isIdeaSaved(id: string): Promise<boolean> {
  return (await getIdea(id)) !== undefined;
}

export async function answerReview(ideaId: string, remembered: boolean): Promise<void> {
  const idea = await getIdea(ideaId);
  if (idea) await saveIdea(nextReview(idea, remembered, Date.now()));
}

export async function listSavedIdeas(): Promise<SavedIdea[]> {
  return (await getAllIdeas()).sort((a, b) => b.savedAt - a.savedAt);
}

export function listDueReviews(limit: number): Promise<SavedIdea[]> {
  return getDueIdeas(Date.now(), limit);
}

export { removeIdea as removeSavedIdea };
