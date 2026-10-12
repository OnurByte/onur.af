export interface Project {
  slug: string;
  name: string;
  summary: string;
  description: string;
  repository: string;
  status: string;
  details: string[];
}

export interface Note {
  slug: string;
  title: string;
  date: string;
  summary: string;
  paragraphs: string[];
}

export interface ReadingEntry {
  name: string;
  url: string;
  source: string;
  summary: string;
  feed?: string;
}

export const projects: Project[] = [];
export const notes: Note[] = [];
export const reading: ReadingEntry[] = [];

export const publicEditorialPaths = [
  '/projects',
  '/notes',
  '/reading',
  '/identity',
  '/rss',
  '/pgp',
  ...projects.map((project) => `/projects/${project.slug}`),
  ...notes.map((note) => `/notes/${note.slug}`),
];
