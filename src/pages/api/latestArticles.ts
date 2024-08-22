import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  try {
    const apiKey = import.meta.env.PUBLIC_API_KEY;
    const response = await fetch(
      `https://api.core.ac.uk/v3/search/works?q=latest&apiKey=${apiKey}&limit=5&sort=publishedDate`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching latest articles:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}