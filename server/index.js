const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

const API_KEY = '66f35df566a3acd72efaa65058f0a56f72594183ddc4d0ce07544c46afdae12b'; // Replace with your actual SerpApi key

app.get('/search', async (req, res) => {
  const query = req.query.q;
  try {
    const response = await fetch(`https://serpapi.com/search.json?engine=google_scholar&q=${query}&api_key=${API_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching search results' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});