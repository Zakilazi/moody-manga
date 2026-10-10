
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const coverCache = {};

app.get('/cover', async (req, res) => {
  const title = req.query.title;

  if (!title) {
    return res.json({ url: null });
  }

  if (coverCache[title]) {
    return res.json({ url: coverCache[title] });
  }

  const query = `
    query ($search: String) {
      Media(search: $search, type: MANGA) {
        coverImage {
          large
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        variables: { search: title }
      })
    });

    const data = await response.json();
    const url = data.data?.Media?.coverImage?.large || null;

    coverCache[title] = url;
    res.json({ url });

  } catch (err) {
    console.error('Cover fetch failed:', err.message);
    res.json({ url: null });
  }
});


app.use(express.static('public'));
app.use(express.json());

function loadItems() {
  const raw =fs.readFileSync('./data.json','utf-8');
  return JSON.parse(raw);
}
function saveItems(items) {
  fs.writeFileSync('./data.json',JSON.stringify(items,null,2));
}

app.get('/', (req, res) => {
  res.send('Hello from your manga site server!');
});
app.get('/recommendations', (req, res) => {
  const items = loadItems();
  const { genre, mood, search, page } = req.query;
  let results = items;

  if (genre) {
    results = results.filter(item => item.genres.includes(genre));
  }

  if (mood) {
    results = results.filter(item => item.mood === mood);
  }
   if (search) {
    const term = search.toLowerCase();
    results = results.filter(item => item.title.toLowerCase().includes(term));
  }
  const currentPage = parseInt(page) || 1;
  const pageSize = 10;
  const totalresults = results.length;
  const totalPages = Math.ceil(results.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedResults = results.slice(startIndex, startIndex + pageSize);
  res.json({ results: paginatedResults, totalresults, totalPages, currentPage });
});

app.post('/add-manga', async (req, res) => {
  const { title, mood} = req.body;

  if (!title || !mood) {
    return res.status(400).json({ error : 'title and mood are required'});
  }
  const query = `
  query ($search: String) {
    Media(search: $search, type: MANGA) {
      genres
      coverImage {
        large
      }
    }
  }
`;
try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, variables: { search: title } })
    });

    const data = await response.json();
    const media = data.data?.Media;

    if (!media) {
      return res.status(404).json({ error: 'Manga not found on AniList' });
    }

    const newEntry = {
      title: title,
      type: 'manga',
      genres: media.genres.map(g => g.toLowerCase()),
      mood: mood,
      cover: media.coverImage?.large || null
    };

    const items = loadItems();
    items.push(newEntry);
    saveItems(items);

    res.json({ success: true, entry: newEntry });

  } catch (err) {
    console.error('Add manga failed:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
app.get('/random', (req, res) => {
  const items = loadItems();
  const { genre, mood } = req.query;

  let results = items;

  if (genre) {
    results = results.filter(item => item.genres.includes(genre));
  }

  if (mood) {
    results = results.filter(item => item.mood === mood);
  }

  if (results.length === 0) {
    return res.json({ item: null });
  }

  const randomIndex = Math.floor(Math.random() * results.length);
  res.json({ item: results[randomIndex] });
});
const detailsCache = {};

app.get('/details', async (req, res) => {
  const title = req.query.title;

  if (!title) {
    return res.json({ details: null });
  }

  if (detailsCache[title]) {
    return res.json({ details: detailsCache[title] });
  }

  const query = `
    query ($search: String) {
      Media(search: $search, type: MANGA) {
        description(asHtml: false)
        status
        chapters
        volumes
        averageScore
        startDate { year }
        staff(perPage: 3) {
          edges {
            role
            node { name { full } }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, variables: { search: title } })
    });

    const data = await response.json();
    const media = data.data?.Media;

    if (!media) {
      return res.json({ details: null });
    }

    const edges = media.staff?.edges || [];
    const writer = edges.find(e => e.role && e.role.includes('Story')) || edges[0];

    let synopsis = (media.description || '').replace(/<[^>]*>/g, '').trim();
    if (synopsis.length > 400) {
      synopsis = synopsis.slice(0, 400) + '...';
    }

    const details = {
      status: media.status ? media.status.replace(/_/g, ' ').toLowerCase() : null,
      chapters: media.chapters,
      volumes: media.volumes,
      score: media.averageScore,
      year: media.startDate?.year || null,
      author: writer?.node?.name?.full || null,
      synopsis: synopsis || null
    };

    detailsCache[title] = details;
    res.json({ details });

  } catch (err) {
    console.error('Details fetch failed:', err.message);
    res.json({ details: null });
  }
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
