let currentGenre = null;
let currentMood = null;
let currentSearch = '';
const sfxWords = ['ドン', 'バン', 'ゴゴゴ', 'ドキドキ', 'キラ', 'ズキューン', 'シーン', 'ビリビリ', 'ドサッ', 'ガーン'];
let currentPageNum = 1;
const defaultNotes = document.getElementById('notesContent').innerHTML;
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
 if ( currentGenre === genre) {
    currentGenre = null;
    button.classList.remove('active');
  } else {
    currentGenre = genre;
    highlightSelected('genre', button);
  }
  showSFX(button);
  fetchResults();
}

function setMood(mood, button) {
  if (currentMood === mood) {
    currentMood = null;
    button.classList.remove('active');
  } else {
    currentMood = mood;
    highlightSelected('mood', button);
  }
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
  let url = `/recommendations?page=${currentPageNum}&`;

  if (currentGenre) {
    url += `genre=${currentGenre}&`;
  }

  if (currentMood) {
    url += `mood=${currentMood}&`;
  }

  if (currentSearch) {
    url += `search=${encodeURIComponent(currentSearch)}`;
  }

  fetch(url)
    .then(response => response.json())
    .then(data => {
      displayResults(data.results);
      displayPagination(data.currentPage, data.totalPages);
    });
}

function displayResults(items) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  if (items.length === 0) {
    resultsDiv.innerHTML = '<p>No matches found. Try a different combination!</p>';
    return;
  }

  items.forEach((item, index) => {
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <img class="cover" alt="${item.title} cover">
    <h3>${item.title}</h3>
    <p><strong>Type:</strong> ${item.type}</p>
    <p><strong>Genres:</strong> ${item.genres.join(', ')}</p>
    <p><strong>Mood:</strong> ${item.mood}</p>
  `;
  resultsDiv.appendChild(panel); 
  panel.addEventListener('click', () => showDetails(item));
  fetch(`/cover?title=${encodeURIComponent(item.title)}`)
    .then(res => res.json())
    .then(data => {
      if (data.url) {
        panel.querySelector('.cover').src = data.url;
      }
    });
});
}
function changePage(direction){
  currentPageNum += direction;
  fetchResults();
}
function displayPagination(current, total) {
  document.getElementById('pageInfo').textContent = `Page ${current} of ${total}`;

  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  prevBtn.disabled = current <= 1;
  nextBtn.disabled = current >= total;
}
function getRandom() {
  let url = '/random?';

  if (currentGenre) {
    url += `genre=${currentGenre}&`;
  }

  if (currentMood) {
    url += `mood=${currentMood}`;
  }

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (!data.item) {
        displayResults([]);
      } else {
        displayResults([data.item]);
      }
      displayPagination(1, 1);
    });
}
function addNote(parent, label, value) {
  const p = document.createElement('p');
  p.className = 'fun-fact';

  const strong = document.createElement('strong');
  strong.textContent = label + ': ';

  p.appendChild(strong);
  p.appendChild(document.createTextNode(value));
  parent.appendChild(p);
}

function resetNotes() {
  document.getElementById('notesContent').innerHTML = defaultNotes;
}

function showDetails(item) {
  const notes = document.getElementById('notesContent');
  notes.innerHTML = '<p class="fun-fact">Loading details...</p>';

  fetch(`/details?title=${encodeURIComponent(item.title)}`)
    .then(res => res.json())
    .then(data => {
      notes.innerHTML = '';

      const heading = document.createElement('h3');
      heading.textContent = item.title;
      notes.appendChild(heading);

      const d = data.details;

      if (!d) {
        addNote(notes, 'Details', 'Not available right now.');
      } else {
        if (d.author) addNote(notes, 'Author', d.author);
        if (d.year) addNote(notes, 'Started', d.year);
        if (d.status) addNote(notes, 'Status', d.status);
        if (d.chapters) addNote(notes, 'Chapters', d.chapters);
        if (d.volumes) addNote(notes, 'Volumes', d.volumes);
        if (d.score) addNote(notes, 'Score', `${d.score}/100`);
        if (d.synopsis) addNote(notes, 'Synopsis', d.synopsis);
      }

      const backBtn = document.createElement('button');
      backBtn.className = 'nav-btn';
      backBtn.textContent = 'Back to notes';
      backBtn.onclick = resetNotes;
      notes.appendChild(backBtn);
    })
    .catch(() => {
      notes.innerHTML = '<p class="fun-fact">Could not load details.</p>';
    });
}