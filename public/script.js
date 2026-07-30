let currentGenre = null;
let currentMood = null;
let currentSearch = '';

function addManga() {
  const title = document.getElementById('newTitle').value;
  const mood = document.getElementById('newMood').value;
  const statusEl = document.getElementById('addStatus');

  if (!title) {
    statusEl.textContent = 'Please enter a title.';
    return;
  }

  statusEl.textContent = 'Searching AniList...';

  fetch('/add-manga', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, mood })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        statusEl.textContent = `Error: ${data.error}`;
      } else {
        statusEl.textContent = `Added "${data.entry.title}"!`;
        document.getElementById('newTitle').value = '';
        fetchResults();
      }
    })
    .catch(() => {
      statusEl.textContent = 'Something went wrong.';
    });
}

const sfxWords = ['ドン', 'バン', 'ゴゴゴ', 'ドキドキ', 'キラ', 'ズキューン', 'シーン', 'ビリビリ', 'ドサッ', 'ガーン'];
document.getElementById('searchInput').addEventListener('input', (e) => {
  currentSearch = e.target.value;
  fetchResults();
});
function showSFX(button) {
  const word = sfxWords[Math.floor(Math.random() * sfxWords.length)];

  const sfx = document.createElement('div');
  sfx.className = 'sfx-text';
  sfx.textContent = word;

  const rect = button.getBoundingClientRect();
  sfx.style.left = `${rect.left + rect.width / 2}px`;
  sfx.style.top = `${rect.top}px`;

  document.body.appendChild(sfx);

  setTimeout(() => {
    sfx.remove();
  }, 700);
}

function setGenre(genre, button) {
  currentGenre = genre;
  highlightSelected('genre', button);
  showSFX(button);
  fetchResults();
}

function setMood(mood, button) {
  currentMood = mood;
  highlightSelected('mood', button);
  showSFX(button);
  fetchResults();
}

function highlightSelected(type, clickedButton) {
  const group = clickedButton.parentElement;
  const buttons = group.querySelectorAll('button');

  buttons.forEach(btn => btn.classList.remove('active'));
  clickedButton.classList.add('active');
}

function fetchResults() {
  let url = '/recommendations?';

  if (currentGenre) {
    url += `genre=${currentGenre}&`;
  }

  if (currentMood) {
    url += `mood=${currentMood}`;
  }

if (currentSearch) {
    url += `search=${encodeURIComponent(currentSearch)}`;
  }

  fetch(url)
    .then(response => response.json())
    .then(data => displayResults(data));
}

function displayResults(items) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  if (items.length === 0) {
    resultsDiv.innerHTML = '<p>No matches found. Try a different combination!</p>';
    return;
  }

  items.forEach((item,index) => {
    const panel = document.createElement('div');
    panel.className = 'panel'
    panel.innerHTML =  `
      <p class="page-number">Page ${index + 1} of ${items.length}</p>
      <img class="cover" alt="${item.title} cover">
      <h3>${item.title}</h3>
      <p><strong>Type:</strong> ${item.type}</p>
      <p><strong>Genres:</strong> ${item.genres.join(', ')}</p>
      <p><strong>Mood:</strong> ${item.mood}</p>
    `;
    resultsDiv.appendChild(panel);
    
    fetch(`/cover?title=${encodeURIComponent(item.title)}`)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          panel.querySelector('.cover').src = data.url;
        }
      });
  });
}
