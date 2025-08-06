import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Article = {
  title: string;
  doi?: string;
  urls?: string[];
  authors?: { name: string }[];
  abstract?: string;
  field_of_study?: string;
  document_type?: string;
  language?: { name: string };
  published_date?: string;
  citation_count?: number;
};

// Cache for suggestions to avoid repeated API calls
const suggestionsCache = new Map<string, string[]>();
const articlesCache = new Map<string, Article[]>();

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced fetch suggestions function
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Check cache first
    if (suggestionsCache.has(searchQuery)) {
      const cachedSuggestions = suggestionsCache.get(searchQuery)!;
      setSuggestions(cachedSuggestions);
      setShowSuggestions(cachedSuggestions.length > 0);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingSuggestions(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/suggestions?q=${encodeURIComponent(searchQuery)}`,
        { signal: controller.signal }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the results
      suggestionsCache.set(searchQuery, data);
      
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error("Error fetching suggestions:", err);
        setError("Failed to fetch suggestions");
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounced effect for suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, fetchSuggestions]);

  // Fetch articles function
  const fetchArticles = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Check cache first
    if (articlesCache.has(searchQuery)) {
      setArticles(articlesCache.get(searchQuery)!);
      return;
    }

    setLoadingArticles(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the results
      articlesCache.set(searchQuery, data.results);
      
      setArticles(data.results);
    } catch (err) {
      console.error("Error fetching articles:", err);
      setError("Failed to fetch articles");
      setArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  // Handle outside clicks to hide suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Centralized search function
  const performSearch = useCallback(() => {
    setShowSuggestions(false);
    fetchArticles(query);
  }, [query, fetchArticles]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    fetchArticles(suggestion);
  }, [fetchArticles]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    performSearch();
  }, [performSearch]);

  // Handle button click
  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    performSearch();
  }, [performSearch]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  // Handle key down events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      performSearch();
    }
  }, [performSearch]);

  // Memoized suggestions list
  const suggestionsList = useMemo(() => (
    suggestions.map((suggestion, index) => (
      <div
        key={index}
        className="px-4 py-2 hover:bg-muted cursor-pointer transition-colors"
        onClick={() => handleSuggestionClick(suggestion)}
      >
        {suggestion}
      </div>
    ))
  ), [suggestions, handleSuggestionClick]);

  // Memoized articles list
  const articlesList = useMemo(() => (
    articles.map((article, index) => (
      <ArticleCard key={index} article={article} />
    ))
  ), [articles]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="relative max-w-l mx-auto mb-6">
        <div className="flex items-center gap-2 relative">
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search articles..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-900/1 backdrop-blur-lg ring-[0.5px] transition-colors ring-slate-900/12 hover:bg-white border-none"
          />
          <Button
            type="button"
            size="sm"
            disabled={loadingArticles}
            onClick={handleButtonClick}
            className='bg-slate-900/1 backdrop-blur-lg ring-[0.5px] transition-colors ring-slate-900/12 hover:bg-white text-slate-500 '
          >
            {loadingArticles ? "..." : "Search"}
          </Button>
          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 top-full z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {loadingSuggestions ? (
                <div className="p-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : suggestionsList.length > 0 ? (
                suggestionsList
              ) : (
                <div className="px-4 py-2 text-muted-foreground">
                  No suggestions found
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Error message */}
      {error && (
        <div className="text-center text-destructive mb-4">
          {error}
        </div>
      )}

      {/* Loading state for articles */}
      {loadingArticles && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-background rounded-lg shadow-sm">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Articles results */}
      {!loadingArticles && articles.length > 0 && (
        <div className="space-y-4">
          {articlesList}
        </div>
      )}

      {/* No results message */}
      {!loadingArticles && articles.length === 0 && query && (
        <div className="text-center text-muted-foreground">
          No results found. Please try a different search term.
        </div>
      )}
    </div>
  );
};

// Separate ArticleCard component for better performance
const ArticleCard: React.FC<{ article: Article }> = React.memo(({ article }) => {
  const formatDate = useMemo(() => {
    return article.published_date 
      ? new Date(article.published_date).toLocaleDateString()
      : null;
  }, [article.published_date]);

  const articleUrl = useMemo(() => {
    return article.doi 
      ? `https://doi.org/${article.doi}` 
      : article.urls?.[0] || '#';
  }, [article.doi, article.urls]);

  const authorsText = useMemo(() => {
    return article.authors?.map(author => author.name).join(', ') || 'Unknown Author';
  }, [article.authors]);

  const truncatedAbstract = useMemo(() => {
    return article.abstract 
      ? article.abstract.length > 200 
        ? article.abstract.substring(0, 200) + '...'
        : article.abstract
      : 'No abstract available';
  }, [article.abstract]);

  return (
    <div className="p-4 bg-background rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-xl font-medium font-serif mb-2">
        <a 
          href={articleUrl}
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-black hover:underline"
        >
          {article.title}
        </a>
      </h3>
      
      <p className="text-sm text-gray-600 mb-2">{authorsText}</p>
      
      <p className="text-gray-700 mb-3">{truncatedAbstract}</p>
      
      <div className="flex flex-wrap gap-2 mb-2">
        {article.field_of_study && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {article.field_of_study}
          </span>
        )}
        {article.document_type && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            {article.document_type}
          </span>
        )}
        {article.language?.name && (
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            {article.language.name}
          </span>
        )}
      </div>
      
      <div className="text-sm text-gray-500">
        {formatDate && `Published: ${formatDate}`}
        {article.citation_count && ` | Citations: ${article.citation_count}`}
      </div>
    </div>
  );
});

ArticleCard.displayName = 'ArticleCard';

export default SearchBar;