chrome.storage.sync.get(['custom-hosts'], (data) => {
  const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
  if (!hosts.includes(window.location.hostname)) return;

  const HISTORY_PATH = /\/trades\/history(?:\/|$)/;

  function toggleBigImages(enabled) {
    if (!HISTORY_PATH.test(window.location.pathname)) return;
    const historyList = document.querySelector('.history__list');
    if (!historyList) return;
    historyList.classList.toggle('big-images', Boolean(enabled));
  }

  chrome.storage.sync.get(['trades-history-big-images'], (settings) => {
    toggleBigImages(settings?.['trades-history-big-images'] === true);
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync' || !changes['trades-history-big-images']) return;
    toggleBigImages(changes['trades-history-big-images'].newValue === true);
  });
});
