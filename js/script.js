// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Make element references set during init so startup is safe whether the script
// is loaded at the end of <body> or earlier. Functions below use these variables.
let getImageBtn;
let gallery;

// Small list of fun space facts. Add or edit facts here.
const SPACE_FACTS = [
  "A day on Venus is longer than a year on Venus.",
  "Neutron stars can spin 600 times per second.",
  "There are more stars in the universe than grains of sand on all Earth's beaches.",
  "Saturn's rings are mostly ice and are surprisingly thin—often only tens of meters thick.",
  "The footprints on the Moon will likely remain for millions of years—there's no wind to erase them."
];

// Return a random fact string
function randomFact() {
  return SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];
}

// Initialize when DOM is ready (or immediately if already ready)
function init() {
  getImageBtn = document.getElementById('getImageBtn');
  gallery = document.getElementById('gallery');

  // New: display a random Did You Know fact on load
  const didYouKnowText = document.getElementById('didYouKnowText');
  if (didYouKnowText) {
    didYouKnowText.textContent = randomFact();
  }

  if (!getImageBtn || !gallery) {
    console.warn('Missing #getImageBtn or #gallery — skipping initialization.');
    return;
  }

  // Click handler to fetch and display APOD data
  getImageBtn.addEventListener('click', async () => {
    try {
      // Simple loading state
      getImageBtn.disabled = true;
      const oldText = getImageBtn.textContent;
      getImageBtn.textContent = 'Loading...';

      // Show a short loading message in the gallery while the fetch runs
      gallery.innerHTML = `<div class="placeholder"><div class="placeholder-icon">🔄</div><p>Loading space photos…</p></div>`;

      const items = await fetchCdnJson(apodData);

      // Render the gallery with the fetched array
      renderGallery(items);
    } catch (err) {
      // Show a simple error placeholder in the gallery
      gallery.innerHTML = '<div class="placeholder"><p>Error loading images. Check the console for details.</p></div>';
    } finally {
      getImageBtn.disabled = false;
      getImageBtn.textContent = 'Fetch Space Images';
    }
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  // DOM already ready
  init();
}

// Fetch the JSON array and return it (throws on error)
async function fetchCdnJson(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Network error: ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json();
    if (!Array.isArray(data)) {
      throw new Error('Expected an array from the CDN JSON.');
    }
    return data;
  } catch (err) {
    console.error('Failed to fetch or parse CDN JSON:', err);
    throw err;
  }
}

// Create a gallery item element for one APOD entry
function createGalleryItem(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'gallery-item';

  // Make the whole card keyboard-focusable and announce it as interactive.
  // The click handler already opens the modal; this ensures keyboard users can do the same.
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute('aria-label', `${item.title || 'Item'} — ${item.date || ''} — Press Enter to open details`);

  // Title + date
  const meta = document.createElement('p');
  const title = item.title ? item.title : 'Untitled';
  const date = item.date ? item.date : '';
  meta.textContent = `${title} — ${date}`;
  wrapper.appendChild(meta);

  // Media: show image when available, otherwise show a simple link
  if (item.media_type === 'image' && item.url) {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = title;
    // Keep images accessible and responsive
    img.loading = 'lazy';
    wrapper.insertBefore(img, meta);
  } else if (item.url) {
    // For videos or other media types show a thumbnail (if available) that links to the item
    if (item.thumbnail_url) {
      // Create an image element for the thumbnail
      const thumb = document.createElement('img');
      thumb.src = item.thumbnail_url;
      thumb.alt = title;
      // Keep thumbnails accessible and lazy-loaded
      thumb.loading = 'lazy';

      // Wrap the thumbnail in a link so users can open the full item
      const thumbLink = document.createElement('a');
      thumbLink.href = item.url;
      thumbLink.target = '_blank';
      thumbLink.rel = 'noopener noreferrer';
      thumbLink.appendChild(thumb);

      // Insert the linked thumbnail before the metadata
      wrapper.insertBefore(thumbLink, meta);
    } else {
      // Fallback: show a simple text link if no thumbnail is available
      const linkText = document.createElement('span');
      linkText.textContent = 'Open';
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(linkText);
      wrapper.insertBefore(link, meta);
    }
  }

  // After building the item's DOM nodes, attach a click handler that opens the modal.
  // Ensure clicks on anchors (links) inside the item do not open the modal.
  wrapper.addEventListener('click', (e) => {
    // if the user clicked an anchor (open link) let the link work normally
    if (e.target.closest('a')) return;
    // otherwise open the modal with the item's details
    openModal(item);
  });

  // Keyboard activation: Enter or Space should open the modal (unless a link inside was focused)
  wrapper.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'Enter' || key === ' ') {
      // If the currently focused element inside the card is a link, let it handle activation.
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('a')) {
        return;
      }
      e.preventDefault();
      openModal(item);
    }
  });

  return wrapper;
}

// Clear gallery and render items
function renderGallery(items) {
  // Remove placeholder or previous content
  gallery.innerHTML = '';

  if (items.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.innerHTML = '<div class="placeholder-icon">🔭</div><p>No items found.</p>';
    gallery.appendChild(placeholder);
    return;
  }

  // Create and append each gallery item
  for (const item of items) {
    const el = createGalleryItem(item);
    gallery.appendChild(el);
  }
}

// Modal helpers & wiring
const modal = document.getElementById('modal');
const modalOverlay = document.getElementById('modalOverlay');
const modalCloseBtn = document.getElementById('modalClose');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

function openModal(item) {
  if (!modal) return;

  // Clear previous media
  modalMedia.innerHTML = '';

  // Title & date & explanation
  modalTitle.textContent = item.title || 'Untitled';
  modalDate.textContent = item.date || '';
  modalExplanation.textContent = item.explanation || '';

  // Determine media to show: prefer large image (hdurl) for images
  if (item.media_type === 'image' && (item.hdurl || item.url)) {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url;
    img.alt = item.title || 'Image';
    img.loading = 'lazy';
    modalMedia.appendChild(img);
  } else if (item.media_type === 'video') {
    // Show thumbnail if available (feed-provided or derive from YouTube), otherwise fallback text + link
    const thumbSrc = item.thumbnail_url || getYouTubeThumbnail(item.url);
    if (thumbSrc) {
      const img = document.createElement('img');
      img.src = thumbSrc;
      img.alt = item.title ? `${item.title} (video thumbnail)` : 'Video thumbnail';
      img.loading = 'lazy';
      modalMedia.appendChild(img);
    } else {
      // No thumbnail: show a simple message
      const p = document.createElement('p');
      p.textContent = 'Video (no thumbnail available).';
      modalMedia.appendChild(p);
    }

    // If recognized YouTube embed available, add a small "Play inline" button; otherwise add open link
    const embedUrl = getYouTubeEmbedUrl(item.url);
    const controls = document.createElement('div');
    controls.style.marginTop = '10px';

    if (embedUrl) {
      const playBtn = document.createElement('button');
      playBtn.textContent = 'Play inline';
      playBtn.style.marginRight = '10px';
      playBtn.addEventListener('click', () => {
        // Replace media with iframe using the safe embed URL and attributes
        modalMedia.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.width = '853';
        iframe.height = '480';
        iframe.src = embedUrl;
        iframe.title = item.title || 'Video';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.className = 'video-embed';
        modalMedia.appendChild(iframe);
      });
      controls.appendChild(playBtn);
    }

    // Always add an "Open in new tab" link for the video
    const openLink = document.createElement('a');
    openLink.href = item.url;
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.textContent = 'Open video in new tab';
    openLink.className = 'video-open-link';
    controls.appendChild(openLink);

    modalMedia.appendChild(controls);
  } else if (item.url) {
    // Fallback: show the media URL as a link
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open media';
    modalMedia.appendChild(link);
  }

  // Show modal
  modal.setAttribute('aria-hidden', 'false');

  // Focus the close button for accessibility
  if (modalCloseBtn) modalCloseBtn.focus();
}

function closeModal() {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  // clear media to stop playback if any
  if (modalMedia) modalMedia.innerHTML = '';
}

// Close behavior
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
    closeModal();
  }
});