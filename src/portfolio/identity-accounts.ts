export const identityAccounts = {
  x: { label: '𝕏', profile: 'https://x.com/onurstirner', name: '@onurstirner' },
  github: {
    label: 'GitHub',
    profile: 'https://github.com/onurbyte',
    name: 'onurbyte',
  },
} as const;

/** Discord is a contact and presence source, not a signed identity account. */
export const discordUserId = '1434953668959932426';

export const identityStatementText = `I confirm that the X and GitHub accounts listed here are mine.\n${identityAccounts.x.profile}\n${identityAccounts.github.profile}\n`;
