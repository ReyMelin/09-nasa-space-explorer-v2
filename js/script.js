// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Make element references set during init so startup is safe whether the script
// is loaded at the end of <body> or earlier. Functions below use these variables.
let getImageBtn;
let gallery;
let dateSelector;
let getFactBtn;
let didYouKnow;
let didYouKnowText;
let allItems = []; // Store all fetched items for filtering

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

// Format a date string (YYYY-MM-DD) to "Month Day, Year" format
// Example: "2021-04-15" becomes "April 15, 2021"
function formatDate(dateString) {
  // If no date provided, return empty string
  if (!dateString) return '';
  
  // Create a Date object from the date string
  const date = new Date(dateString + 'T00:00:00');
  
  // Get the month name, day, and year
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  
  // Format the date using toLocaleDateString
  return date.toLocaleDateString('en-US', options);
}

// Initialize when DOM is ready (or immediately if already ready)
function init() {
  getImageBtn = document.getElementById('getImageBtn');
  gallery = document.getElementById('gallery');
  dateSelector = document.getElementById('dateSelector');
  getFactBtn = document.getElementById('getFactBtn');
  didYouKnow = document.getElementById('didYouKnow');
  didYouKnowText = document.getElementById('didYouKnowText');

  if (!getImageBtn || !gallery || !dateSelector || !getFactBtn || !didYouKnow) {
    console.warn('Missing required elements — skipping initialization.');
    return;
  }

  // Fetch data on page load to populate the date selector
  loadDataAndPopulateDates();

  // Click handler for "Get Space Facts" button
  getFactBtn.addEventListener('click', () => {
    // Get a random fact and update the text
    const fact = randomFact();
    didYouKnowText.textContent = fact;

    // If the fact box is already visible, reset and show new fact
    if (didYouKnow.classList.contains('visible')) {
      // Reset to hidden state
      didYouKnow.classList.remove('visible');
      didYouKnow.classList.add('hidden');

      // Wait for reset animation to complete (1.2 seconds), then show with new fact
      setTimeout(() => {
        didYouKnow.classList.remove('hidden');
        didYouKnow.classList.add('visible');
      }, 1200);
    } else {
      // Show the fact box - button slides left, fact scrolls in from right
      didYouKnow.classList.remove('hidden');
      didYouKnow.classList.add('visible');
    }
  });

  // Click handler to fetch and display APOD data
  getImageBtn.addEventListener('click', async () => {
    try {
      // Simple loading state
      getImageBtn.disabled = true;
      dateSelector.disabled = true;
      getImageBtn.textContent = 'Loading...';

      // Show a short loading message in the gallery while the fetch runs
      gallery.innerHTML = `<div class="placeholder"><div class="placeholder-icon">🔄</div><p>Loading space photos…</p></div>`;

      // Fetch data only if we haven't already
      if (allItems.length === 0) {
        allItems = await fetchCdnJson(apodData);
        // Populate the date selector with available dates
        populateDateSelector(allItems);
      }

      // Get the selected date from the dropdown
      const selectedDate = dateSelector.value;

      // Filter items by selected date (or show all if no date selected)
      const itemsToDisplay = selectedDate 
        ? allItems.filter(item => item.date === selectedDate)
        : allItems;

      // Render the gallery with the filtered array
      renderGallery(itemsToDisplay);
    } catch (err) {
      // Show a simple error placeholder in the gallery
      gallery.innerHTML = '<div class="placeholder"><p>Error loading images. Check the console for details.</p></div>';
    } finally {
      getImageBtn.disabled = false;
      dateSelector.disabled = false;
      getImageBtn.textContent = 'Get Space Images';
    }
  });

  // When user changes the date selector, automatically update the gallery
  dateSelector.addEventListener('change', () => {
    // Only filter if we have data already loaded
    if (allItems.length > 0) {
      const selectedDate = dateSelector.value;
      
      // Filter items by selected date (or show all if no date selected)
      const itemsToDisplay = selectedDate 
        ? allItems.filter(item => item.date === selectedDate)
        : allItems;
      
      // Render the filtered gallery
      renderGallery(itemsToDisplay);
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

  // Media: show image when available, otherwise show a simple link
  if (item.media_type === 'image' && item.url) {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.title ? item.title : 'Untitled';
    // Keep images accessible and responsive
    img.loading = 'lazy';
    wrapper.appendChild(img);
  } else if (item.url) {
    // For videos or other media types show a thumbnail (if available)
    if (item.thumbnail_url) {
      // Create an image element for the thumbnail
      const thumb = document.createElement('img');
      thumb.src = item.thumbnail_url;
      thumb.alt = item.title ? item.title : 'Untitled';
      // Keep thumbnails accessible and lazy-loaded
      thumb.loading = 'lazy';

      // Wrap the thumbnail in a link so users can open the full item
      const thumbLink = document.createElement('a');
      thumbLink.href = item.url;
      thumbLink.target = '_blank';
      thumbLink.rel = 'noopener noreferrer';
      thumbLink.appendChild(thumb);

      // Add the linked thumbnail to the card
      wrapper.appendChild(thumbLink);
    } else {
      // Fallback: show a simple text link if no thumbnail is available
      const linkText = document.createElement('span');
      linkText.textContent = 'Open';
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(linkText);
      wrapper.appendChild(link);
    }
  }

  // Title - display in bold and centered directly under the image
  const title = item.title ? item.title : 'Untitled';
  const titleEl = document.createElement('h3');
  titleEl.className = 'gallery-item-title';
  titleEl.textContent = title;
  wrapper.appendChild(titleEl);

  // Date - display in bold and blue below the title
  // Format the date to "Month Day, Year" format
  const date = formatDate(item.date);
  const dateEl = document.createElement('p');
  dateEl.className = 'gallery-item-date';
  dateEl.textContent = date;
  wrapper.appendChild(dateEl);

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

// Populate the date selector dropdown with available dates from the API
function populateDateSelector(items) {
  // Clear existing options except the first "Select a date..." option
  dateSelector.innerHTML = '<option value="">All dates</option>';
  
  // Get all unique dates from the items
  const dates = items.map(item => item.date).filter(date => date);
  
  // Sort dates in descending order (newest first)
  dates.sort((a, b) => b.localeCompare(a));
  
  // Add an option for each date
  for (const date of dates) {
    const option = document.createElement('option');
    option.value = date;
    // Format the date for display
    option.textContent = formatDate(date);
    dateSelector.appendChild(option);
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
  // Format the date to "Month Day, Year" format
  modalTitle.textContent = item.title || 'Untitled';
  modalDate.textContent = formatDate(item.date);
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

// Fetch data on page load and populate the date selector
async function loadDataAndPopulateDates() {
  try {
    // Disable the date selector while loading
    dateSelector.disabled = true;
    
    // Fetch the data from the API
    allItems = await fetchCdnJson(apodData);
    
    // Populate the date selector with available dates
    populateDateSelector(allItems);
    
    // Enable the date selector after data is loaded
    dateSelector.disabled = false;
  } catch (err) {
    // If there's an error, show a message in the console
    console.error('Failed to load dates on page load:', err);
    
    // Re-enable the date selector even if there was an error
    dateSelector.disabled = false;
  }
}