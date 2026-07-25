chrome.storage.sync.get(['custom-hosts'], (data) => {
  const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
  if (!hosts.includes(window.location.hostname)) return;

  const match = window.location.pathname.match(
    /^\/user\/[^/]+\/anime_progress\/(\d+)\/(?:[^/]+\/?)*$/,
  );
  if (!match) return;

  const animeId = parseInt(match[1], 10);
  const title = document.querySelector('.anime-deck__title');
  const animeLink = title?.getAttribute('href');
  const animeName = title?.textContent?.trim();
  if (!animeId || !animeLink || !animeName) return;

  const cardsById = new Map();
  document.querySelectorAll('.anime-deck__card[href]').forEach((elm) => {
    const href = new URL(elm.getAttribute('href'), window.location.origin);
    const cardId = parseInt(href.searchParams.get('id'), 10);
    const imageElm = elm.querySelector('img');
    const image = imageElm?.currentSrc || imageElm?.src;
    if (!cardId || !image) return;

    const imagePath = new URL(image, window.location.origin).pathname;
    const imageMatch = imagePath.match(/^\/uploads\/cards_image\/\d+\/([^/]+)\//);
    const rank = imageMatch?.[1];
    const name = (imageElm.alt || '').replace(/^Карточка\s*/i, '').trim();
    if (!name || !rank) return;

    cardsById.set(cardId, {
      card_id: cardId,
      name,
      rank,
      anime_name: animeName,
      anime_link: new URL(animeLink, window.location.origin).pathname,
      image: imagePath,
    });
  });

  const countText = document.querySelector('.anime-deck__count')?.textContent || '';
  const expectedMatch = countText.match(/(?:из|з)\s*([\d\s]+)/i);
  const expectedCount = expectedMatch ? parseInt(expectedMatch[1].replace(/\s/g, ''), 10) : 0;
  const cards = [...cardsById.values()];
  if (!expectedCount || cards.length !== expectedCount) {
    console.warn('Deck snapshot skipped: incomplete card list', { expectedCount, actual: cards.length });
    return;
  }

  chrome.runtime.sendMessage({
    action: 'sync_deck_snapshot_to_ass',
    anime_id: animeId,
    cards,
  });
});
