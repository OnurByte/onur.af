if (
  document.querySelector('meta[name="portfolio-vitals"][content="enabled"]') &&
  navigator.doNotTrack !== '1'
) {
  void import('./vitals-observer')
    .then(({ startVitals }) => {
      startVitals();
    })
    .catch(() => {
      /* Optional metrics cannot interrupt navigation. */
    });
}
export {};
