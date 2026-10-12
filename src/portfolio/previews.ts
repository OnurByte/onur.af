import { notes, projects } from './content';

export const mottos = [
  'The creator originates.',
  'I am. I think. I will.',
  'To think is an act of choice.',
] as const;

const pages: Record<
  string,
  { key: string; title: string; description: string }
> = {
  '/': {
    key: 'home',
    title: 'Home',
    description:
      'Onur’s personal index: public notes, projects, reading, RSS feeds and PGP identity, collected in one place.',
  },
  '/donate': {
    key: 'donate',
    title: 'Donate',
    description:
      'Send a Monero donation to Onur. Choose an amount, open the payment details and follow the status of your donation.',
  },
  '/projects': {
    key: 'projects',
    title: 'Projects',
    description:
      'Explore Onur’s public project index, with source repositories, project status and details collected as they are published.',
  },
  '/notes': {
    key: 'notes',
    title: 'Notes',
    description:
      'Onur’s public writing index. Browse published notes and follow the RSS feed to receive new entries in your own reader.',
  },
  '/reading': {
    key: 'reading',
    title: 'Reading',
    description:
      'Onur’s reading index, with links to sources and their feeds when available. Export subscriptions as OPML for your reader.',
  },
  '/identity': {
    key: 'identity',
    title: 'Identity',
    description:
      'Find Onur’s public PGP key, published alternate addresses and the source repository for this personal website.',
  },
  '/rss': {
    key: 'rss',
    title: 'RSS',
    description:
      'Follow Onur’s public writing with RSS. Copy the feed address into your reader and receive new entries when they are published.',
  },
  '/pgp': {
    key: 'pgp',
    title: 'PGP',
    description:
      'Read or download Onur’s public PGP key and check its fingerprint before using it to verify identity or encrypt a message.',
  },
};

export function publicPreview(pathname: string) {
  const project = projects.find(
    (entry) => pathname === `/projects/${entry.slug}`,
  );
  if (project)
    return {
      key: `projects-${project.slug}`,
      title: project.name,
      description: project.summary,
    };
  const note = notes.find((entry) => pathname === `/notes/${entry.slug}`);
  if (note)
    return {
      key: `notes-${note.slug}`,
      title: note.title,
      description: note.summary,
    };
  return pages[pathname];
}
