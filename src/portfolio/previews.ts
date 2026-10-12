import { notes, projects } from './content';
import { siteDescription } from './seo';

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
    description: siteDescription,
  },
  '/donate': {
    key: 'donate',
    title: 'Donate',
    description: 'Support my work with Monero.',
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
      'RSS brings new writing to your feed reader. Add this address to subscribe.',
  },
  '/pgp': {
    key: 'pgp',
    title: 'PGP',
    description:
      'My public key for encrypted messages and signature verification.',
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
