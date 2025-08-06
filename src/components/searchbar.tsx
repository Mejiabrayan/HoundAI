import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  download_url?: string;
};

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

    if (suggestionsCache.has(searchQuery)) {
      const cachedSuggestions = suggestionsCache.get(searchQuery)!;
      setSuggestions(cachedSuggestions);
      setShowSuggestions(cachedSuggestions.length > 0);
      return;
    }

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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, fetchSuggestions]);

  const fetchArticles = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

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

  const performSearch = useCallback(() => {
    setShowSuggestions(false);
    fetchArticles(query);
  }, [query, fetchArticles]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    fetchArticles(suggestion);
  }, [fetchArticles]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    performSearch();
  }, [performSearch]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    performSearch();
  }, [performSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

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

  const articlesList = useMemo(() => (
    articles.map((article, index) => (
      <ArticleCard key={`${article.doi || article.title}-${index}`} article={article} />
    ))
  ), [articles]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="relative max-w-l mx-auto mb-6">
        <div className="flex items-center gap-2 relative">
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search articles..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-900/1 backdrop-blur-lg ring-[0.5px] transition-colors ring-slate-900/12 hover:bg-white border-none placeholder:text-slate-500 shadow-[0_1px_1px_-0.5px,0_2px_2px_-1px,0_4px_4px_-2px,0_8px_8px_-4px] shadow-slate-900/4 inset-shadow-[0_1.5px_1px_theme(colors.white/90%),0_-1.5px_1px_theme(colors.white/80%),0_6px_6px_-3px_theme(colors.slate.900/8%),0_-4px_4px_-2px_theme(colors.slate.900/10%)]"
          />
          <Button
            type="button"
            size="sm"
            disabled={loadingArticles}
            onClick={handleButtonClick}
            className='bg-slate-900/1 backdrop-blur-lg ring-[0.5px] transition-colors ring-slate-900/12 hover:bg-white text-slate-500 shadow-[0_1px_1px_-0.5px,0_2px_2px_-1px,0_4px_4px_-2px,0_8px_8px_-4px] shadow-slate-900/4 inset-shadow-[0_1.5px_1px_theme(colors.white/90%),0_-1.5px_1px_theme(colors.white/80%),0_6px_6px_-3px_theme(colors.slate.900/8%),0_-4px_4px_-2px_theme(colors.slate.900/10%)]'
          >
            <span className="bg-gradient-to-b from-slate-950 to-slate-500 leading-4 text-transparent bg-clip-text drop-shadow-[0_1px_0_theme(colors.white/75%),0_1px_2px_theme(colors.slate.900/25%),0_-1px_0_theme(colors.slate.900/2%)]">
              {loadingArticles ? "..." : "Search"}
            </span>
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
            <Card
              key={i}
              className={`
                bg-background
                rounded-lg
                border-none
                transition-shadow
                duration-300
                ring-[0.5px]
                ring-slate-900/12
                shadow-sm
                p-6
                flex flex-col gap-4
              `}
            >
              <div className="mb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <div className="flex gap-2 mb-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-12 rounded" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </Card>
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

// ArticleCard styled like featured-article-component
const ArticleCard: React.FC<{ article: Article }> = React.memo(({ article }) => {
  const formatDate = useMemo(() => {
    return article.published_date
      ? new Date(article.published_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      : '';
  }, [article.published_date]);

  const articleUrl = useMemo(() => {
    return article.doi
      ? `https://doi.org/${article.doi}`
      : article.urls?.[0] || '#';
  }, [article.doi, article.urls]);

  const authorsText = useMemo(() => {
    return article.authors && article.authors.length > 0
      ? article.authors.map(author => author.name).join(', ')
      : null;
  }, [article.authors]);

  const truncatedAbstract = useMemo(() => {
    return article.abstract
      ? article.abstract.length > 150
        ? article.abstract.substring(0, 150) + '...'
        : article.abstract
      : null;
  }, [article.abstract]);

  return (
    <Card
      className={`
        bg-background
        rounded-lg
        border-none
        transition-shadow
        duration-300
        ring-[0.5px]
        ring-slate-900/12
        hover:bg-white
        overflow-hidden
      `}
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-serif font-light text-gray-800 leading-tight">
          <a
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-blue-600 transition-colors duration-200"
          >
            {article.title}
          </a>
        </CardTitle>
        {truncatedAbstract && (
          <CardDescription className="text-gray-600 text-sm">
            {truncatedAbstract}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4 font-serif">
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

        {/* Article metadata */}
        <div className="flex flex-col text-sm text-gray-500 space-y-1">
          {formatDate && (
            <span>{formatDate}</span>
          )}
          {authorsText && (
            <span className="truncate">
              {authorsText}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex flex-wrap gap-4 text-xs">
          {article.doi && (
            <a
              href={`https://doi.org/${article.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              DOI
            </a>
          )}
          {article.download_url && (
            <a
              href={article.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Download
            </a>
          )}
          {article.citation_count != null && (
            <span className="text-gray-500">
              Citations: {article.citation_count}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
});

ArticleCard.displayName = 'ArticleCard';

export default SearchBar;