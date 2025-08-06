import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const apiKey = import.meta.env.PUBLIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key is not configured on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiUrl = `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&apiKey=${apiKey}`;
    const response = await fetch(apiUrl);

    // Handle rate limiting and other error codes
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      if (response.status === 429) {
        errorMsg = 'Rate limit exceeded. Please try again later.';
      } else if (response.status === 401 || response.status === 403) {
        errorMsg = 'Invalid or unauthorized API key.';
      }
      console.error('Error fetching scholarly articles:', errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    // Provide more detailed error information for debugging
    console.error('Error fetching scholarly articles:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}