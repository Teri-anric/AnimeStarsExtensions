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
    const baseCard = {
      card_id: cardId,
      anime_name: animeName,
      anime_link: new URL(animeLink, window.location.origin).pathname,
    };
    if (!cardId) return;

    // A broken quote in alt (for example `alt="Карточка " Ошибка""=""`)
    // becomes a separate empty attribute in the browser DOM. Preserve the ID
    // regardless; recover its title when the malformed attribute exposes it.
    const malformedTitle = imageElm
      ? [...imageElm.attributes]
        .map((attribute) => attribute.name)
        .find((attribute) => attribute.includes('"'))
        ?.replace(/"+$/, '')
        .trim()
      : '';
    const image = imageElm?.currentSrc || imageElm?.src;
    if (!image) {
      cardsById.set(cardId, baseCard);
      return;
    }

    const imagePath = new URL(image, window.location.origin).pathname;
    const imageMatch = imagePath.match(/^\/uploads\/cards_image\/\d+\/([^/]+)\//);
    const rank = imageMatch?.[1];
    const name = (imageElm.alt || '').replace(/^Карточка\s*/i, '').trim() || malformedTitle;
    if (!name || !rank) {
      cardsById.set(cardId, baseCard);
      return;
    }

    cardsById.set(cardId, {
      ...baseCard,
      name,
      rank,
      image: imagePath,
    });
  });

  const cards = [...cardsById.values()];
  if (!cards.length) return;

  chrome.runtime.sendMessage({
    action: 'sync_deck_snapshot_to_ass',
    anime_id: animeId,
    cards,
  });
});
