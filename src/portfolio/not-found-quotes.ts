export const notFoundQuotes = [
  {
    text: 'Emotions are not tools of cognition.',
    source: 'https://courses.aynrand.org/lexicon/Reason/',
  },
  {
    text: 'A creative man is motivated by the desire to achieve, not by the desire to beat others.',
    source: 'https://courses.aynrand.org/lexicon/Competition/',
  },
  {
    text: 'The smallest minority on earth is the individual.',
    source:
      'https://ari.aynrand.org/issues/culture-and-society/culture-and-society-more/racism/',
  },
  {
    text: 'Your mind is your only judge of truth',
    source: 'https://courses.aynrand.org/lexicon/independence/',
  },
] as const;

export function encodeQuote(text: string, encoding: 'binary' | 'base64') {
  const bytes = Buffer.from(text, 'utf8');
  return encoding === 'base64'
    ? bytes.toString('base64')
    : [...bytes].map((byte) => byte.toString(2).padStart(8, '0')).join(' ');
}
