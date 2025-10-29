import type { Chapter } from '@/types/story';

export const formatChapterSummary = (
	chapter: Chapter,
	delimiter: string,
	includeNewlines = false,
): string => {
	const summary = chapter.summary?.trim();
	if (!summary) return '';

	const separator = includeNewlines ? ':\n' : ': ';
	return `Chapter ${chapter.order} - ${chapter.title}${separator}${summary}`;
};

export const formatChapterSummaries = (
	chapters: Chapter[],
	delimiter: string,
	includeNewlines = false,
): string => {
	return chapters
		.map((chapter) => formatChapterSummary(chapter, delimiter, includeNewlines))
		.filter(Boolean)
		.join(delimiter);
};
