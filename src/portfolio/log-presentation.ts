import * as stylex from '@stylexjs/stylex';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import { logContent as styles } from '../styles/log-content';

/** Apply compiled presentation only to rendered markup, never signed Markdown. */
export function presentLogContent(html: string): string {
  return String(
    unified()
      .use(rehypeParse, { fragment: true })
      .use(() => (tree: Root) => {
        visit(tree, 'element', (node, index, parent) => {
          const tag = node.tagName;
          const classes = Array.isArray(node.properties.className)
            ? node.properties.className.map(String)
            : [];
          let previous: Element | undefined;
          for (
            let siblingIndex = (index ?? 0) - 1;
            siblingIndex >= 0;
            siblingIndex--
          ) {
            const sibling = parent?.children[siblingIndex];
            if (sibling?.type === 'element') {
              previous = sibling;
              break;
            }
          }
          const rootSibling = parent?.type === 'root' && Boolean(previous);
          const parentTag = parent?.type === 'element' ? parent.tagName : '';
          const attrs = stylex.attrs(
            rootSibling && styles.sibling,
            rootSibling && tag === 'h2' && styles.section,
            rootSibling && tag === 'h3' && styles.subsection,
            /^h[2-6]$/.test(tag) && styles.heading,
            tag === 'h2' && styles.h2,
            tag === 'h3' && styles.h3,
            tag === 'h4' && styles.h4,
            (tag === 'h5' || tag === 'h6') && styles.smallHeading,
            tag === 'h6' && styles.muted,
            tag === 'a' && styles.link,
            (tag === 'ul' || tag === 'ol') && styles.list,
            tag === 'ul' && styles.unordered,
            tag === 'ol' && styles.ordered,
            classes.includes('contains-task-list') && styles.tasks,
            ((tag === 'li' && previous?.tagName === 'li') ||
              (parentTag === 'li' &&
                (tag === 'ul' ||
                  tag === 'ol' ||
                  (tag === 'p' && previous?.tagName === 'p')))) &&
              styles.listSpacing,
            tag === 'input' &&
              node.properties.type === 'checkbox' &&
              styles.checkbox,
            (tag === 'strong' || tag === 'th') && styles.strong,
            tag === 'em' && styles.emphasis,
            tag === 'code' && parentTag !== 'pre' && styles.inlineCode,
            tag === 'pre' && styles.pre,
            tag === 'pre' && rootSibling && styles.preSibling,
            tag === 'blockquote' && styles.blockquote,
            tag === 'blockquote' &&
              node.properties['dataCallout'] !== undefined &&
              styles.callout,
            classes.includes('log-callout-title') && styles.calloutTitle,
            tag === 'hr' && styles.rule,
            tag === 'img' && styles.image,
            tag === 'table' && styles.table,
            (tag === 'td' || tag === 'th') && styles.cell,
            classes.includes('math-display') && styles.math,
            classes.includes('katex-display') && styles.mathDisplay,
            node.properties['dataFootnotes'] !== undefined && styles.footnotes,
          );
          if (attrs.class)
            node.properties.className = [...classes, ...attrs.class.split(' ')];
        });
      })
      .use(rehypeStringify)
      .processSync(html),
  );
}
