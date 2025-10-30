/**
 * AI service constants including SSE formatting
 */

const SSE_FORMAT = {
  DATA_PREFIX: 'data: ',
  DONE_MESSAGE: 'data: [DONE]\n\n',
  NEWLINE: '\n\n',
} as const;

export const formatSSEChunk = (content: string): string => {
  const data = JSON.stringify({ choices: [{ delta: { content } }] });
  return `${SSE_FORMAT.DATA_PREFIX}${data}${SSE_FORMAT.NEWLINE}`;
};

export const formatSSEDone = (): string => SSE_FORMAT.DONE_MESSAGE;
