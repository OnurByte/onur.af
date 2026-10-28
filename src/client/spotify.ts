import type { Embed } from '../portfolio/embeds';
import { required } from '../portfolio/required';
import { parseSpotifyRefresh } from '../portfolio/spotify-refresh';
function mount(section: HTMLElement): () => void {
  const health = required(
    section.querySelector<HTMLElement>('[data-spotify-health]'),
  );
  const current = required(
    section.querySelector<HTMLElement>('[data-spotify-current]'),
  );
  const recent = required(
    section.querySelector<HTMLElement>('[data-spotify-recent]'),
  );
  const template = required(
    section.querySelector<HTMLTemplateElement>('[data-spotify-track-template]'),
  );
  const toggle = required(
    section.querySelector<HTMLButtonElement>('[data-spotify-toggle]'),
  );
  const heading = required(
    section.querySelector<HTMLElement>('#embed-spotify'),
  );
  const label = required(
    section.querySelector<HTMLElement>('[data-spotify-label]'),
  );
  const progress = required(
    current.querySelector<HTMLElement>('[data-spotify-progress]'),
  );
  const bar = required(progress.querySelector('progress'));
  const elapsedLabel = required(
    progress.querySelector<HTMLElement>('[data-spotify-elapsed]'),
  );
  const durationLabel = required(
    progress.querySelector<HTMLElement>('[data-spotify-duration]'),
  );
  const formatTime = (ms: number) =>
    `${String(Math.floor(ms / 60000))}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  function tick() {
    if (progress.hidden || document.hidden) return;
    const start = Number(progress.dataset['start']);
    const end = Number(progress.dataset['end']);
    const total = end - start;
    if (!Number.isFinite(total) || total <= 0) {
      progress.hidden = true;
      return;
    }
    const elapsed = Math.max(0, Math.min(total, Date.now() - start));
    bar.max = total;
    bar.value = elapsed;
    elapsedLabel.textContent = formatTime(elapsed);
    durationLabel.textContent = formatTime(total);
    bar.setAttribute(
      'aria-valuetext',
      `${formatTime(elapsed)} of ${formatTime(total)}`,
    );
  }
  tick();
  let progressTimer = setInterval(tick, 1000);
  let hasRecent = Boolean(recent.querySelector('li'));
  function updateDisclosure() {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    recent.hidden = !hasRecent || !open;
    toggle.hidden = !hasRecent;
    toggle.setAttribute(
      'aria-label',
      open ? 'Hide recent tracks' : 'Show recent tracks',
    );
  }
  section.addEventListener('click', (event) => {
    if (!hasRecent || !(event.target instanceof Element)) return;
    if (event.target.closest('a')) return;
    toggle.setAttribute(
      'aria-expanded',
      String(toggle.getAttribute('aria-expanded') !== 'true'),
    );
    updateDisclosure();
  });
  let lastPayload = '';
  let timer: ReturnType<typeof setTimeout>;
  let refreshing = false;
  function fill(container: HTMLElement, tracks: Embed['items']) {
    const list = required(container.querySelector('ul, ol'));
    const nodes = tracks.map((track) => {
      const fragment = template.content.cloneNode(true);
      if (!(fragment instanceof DocumentFragment))
        throw new Error('Invalid track template');
      const link = required(fragment.querySelector('a'));
      link.href = track.href;
      link.textContent = track.title;
      const detail = required(fragment.querySelector('span'));
      detail.textContent = track.detail ?? '';
      detail.hidden = !track.detail;
      return fragment;
    });
    list.replaceChildren(...nodes);
    if (container === current) {
      list.toggleAttribute('hidden', !tracks.length);
      current.hidden = !tracks.length;
      const playing = tracks.find((track) => track.kind === 'track');
      const playback = playing?.kind === 'track' ? playing.playback : undefined;
      progress.hidden = !playback;
      if (playback) {
        progress.dataset['start'] = String(playback.startedAt);
        progress.dataset['end'] = String(playback.endsAt);
        tick();
      }
    } else {
      hasRecent = Boolean(tracks.length);
      if (!hasRecent) toggle.setAttribute('aria-expanded', 'false');
      updateDisclosure();
    }
  }
  async function refresh() {
    clearTimeout(timer);
    if (!section.isConnected || document.hidden || refreshing) return;
    refreshing = true;
    try {
      const response = await fetch('/spotify.json', {
        cache: 'no-store',
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error('Spotify refresh failed');
      const value: unknown = await response.json();
      const embed = parseSpotifyRefresh(value);
      health.hidden =
        embed.status !== 'stale' && embed.status !== 'unavailable';
      health.textContent =
        embed.status === 'stale'
          ? 'Source unavailable; showing saved data.'
          : 'This source is currently unavailable.';

      const payload = JSON.stringify([
        embed.items,
        embed.recentTracks,
        embed.playbackState,
      ]);
      if (payload !== lastPayload) {
        fill(current, embed.items);
        fill(recent, embed.recentTracks);
        const playing = Boolean(embed.items.length);
        heading.textContent = playing
          ? 'Listening'
          : embed.playbackState === 'idle'
            ? 'Playing nothing'
            : 'Spotify';
        label.hidden = !playing && embed.playbackState !== 'idle';
        lastPayload = payload;
      }
    } catch {
      // Keep the observed history, but never leave an unverified song labelled current.
      health.hidden = false;
      health.textContent = 'Source unavailable; showing saved data.';
      fill(current, []);
      heading.textContent = 'Spotify';
      label.hidden = true;
      lastPayload = '';
    } finally {
      refreshing = false;
      if (document.body.contains(section))
        timer = setTimeout(() => {
          void refresh();
        }, 5000);
    }
  }
  void refresh();
  const onVisibility = () => {
    if (document.hidden) clearTimeout(timer);
    else void refresh();
  };
  document.addEventListener('visibilitychange', onVisibility);
  const onHide = () => {
    clearTimeout(timer);
    clearInterval(progressTimer);
  };
  window.addEventListener('pagehide', onHide);
  const onShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    clearInterval(progressTimer);
    tick();
    progressTimer = setInterval(tick, 1000);
    void refresh();
  };
  window.addEventListener('pageshow', onShow);
  return () => {
    onHide();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('pageshow', onShow);
  };
}

let active: HTMLElement | null = null;
let cleanup: (() => void) | undefined;
function sync(): void {
  const section = document.querySelector<HTMLElement>('#spotify-embed');
  if (section === active) return;
  cleanup?.();
  active = section;
  cleanup = section ? mount(section) : undefined;
}
sync();
new MutationObserver(sync).observe(document.body, {
  childList: true,
  subtree: true,
});
