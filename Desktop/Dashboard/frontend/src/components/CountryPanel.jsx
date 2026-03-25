import React, { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import { ScrollArea } from "../components/ui/scroll-area";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  ExternalLink,
  Newspaper,
  RefreshCw,
  Clock,
  AlertCircle,
  Filter
} from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

// Human-readable labels and accent colours for each indicator filter badge
const INDICATOR_BADGE = {
  liberal:          { label: "Liberal Democracy",  color: "#3b82f6" },
  gender_inequality:{ label: "Gender Inequality",   color: "#a855f7" },
  populism:         { label: "Populism",            color: "#f97316" },
  combined:         { label: "Combined Index",      color: "#22c55e" },
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// News article skeleton loader
const ArticleSkeleton = () => (
  <div className="skeleton-card" data-testid="article-skeleton">
    <div className="skeleton-thumbnail" />
    <div className="skeleton-content">
      <div className="skeleton-line" style={{ width: "40%" }} />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line" style={{ width: "60%" }} />
    </div>
  </div>
);

// News article card component
const ArticleCard = ({ article }) => {
  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="article-card news-card"
      data-testid="news-article-card"
    >
      {article.urlToImage && (
        <img
          src={article.urlToImage}
          alt=""
          className="article-thumbnail"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}
      <div className="article-content">
        <div className="article-source">
          {article.source?.name || "News Source"}
        </div>
        <h4 className="article-title">{article.title}</h4>
        <div className="article-meta flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{formatDate(article.publishedAt)}</span>
          {article.author && (
            <>
              <span>•</span>
              <span className="truncate max-w-[120px]">{article.author}</span>
            </>
          )}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

// Empty state component
const EmptyState = ({ countryName }) => (
  <div className="empty-state" data-testid="empty-state">
    <Newspaper className="empty-state-icon" />
    <h3 className="empty-state-title">No news available</h3>
    <p className="empty-state-description">
      We couldn't find recent news articles for {countryName}.
      Try again later or explore another country.
    </p>
  </div>
);

// Error state component
const ErrorState = ({ error, onRetry }) => (
  <div className="empty-state" data-testid="error-state">
    <AlertCircle className="empty-state-icon text-red-400" />
    <h3 className="empty-state-title">Failed to load news</h3>
    <p className="empty-state-description mb-4">{error}</p>
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      data-testid="retry-button"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </div>
);

const CountryPanel = ({
  isOpen,
  onClose,
  country,
  indicatorName,
  selectedIndicator
}) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countryInfo, setCountryInfo] = useState(null);

  const fetchNews = useCallback(async () => {
    if (!country?.code) return;

    setLoading(true);
    setError(null);

    try {
      const params = { page_size: 25 };
      if (selectedIndicator) params.indicator = selectedIndicator;

      const response = await axios.get(`${API}/news/${country.code}`, { params });

      setNews(response.data.articles || []);
      setCountryInfo({
        name: response.data.country_name,
        flag: response.data.country_flag,
      });
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err.response?.data?.detail || "Failed to fetch news");
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [country?.code, selectedIndicator]);

  useEffect(() => {
    if (isOpen && country?.code) {
      fetchNews();
    }
  }, [isOpen, country?.code, fetchNews]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setNews([]);
      setCountryInfo(null);
      setError(null);
    }
  }, [isOpen]);

  const displayName = countryInfo?.name || country?.name || "Unknown Country";
  const displayFlag = countryInfo?.flag || "";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl p-0 [&>button]:text-slate-400 [&>button]:hover:text-slate-100 [&>button]:z-50"
        data-testid="country-panel"
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-800 p-6">
          <SheetHeader>
            <div className="country-header">
              {displayFlag && (
                <span className="country-flag" data-testid="country-flag">
                  {displayFlag}
                </span>
              )}
              <div>
                <SheetTitle className="country-name text-slate-50">
                  {displayName}
                </SheetTitle>
                <SheetDescription className="text-slate-400 mt-1">
                  Latest news and policy updates
                </SheetDescription>
              </div>
            </div>

            {/* Indicator filter badge */}
            {selectedIndicator && INDICATOR_BADGE[selectedIndicator] && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "10px",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  border: `1px solid ${INDICATOR_BADGE[selectedIndicator].color}40`,
                  background: `${INDICATOR_BADGE[selectedIndicator].color}18`,
                  color: INDICATOR_BADGE[selectedIndicator].color,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
                data-testid="indicator-filter-badge"
              >
                <Filter style={{ width: 11, height: 11 }} />
                Filtered: {INDICATOR_BADGE[selectedIndicator].label}
              </div>
            )}


            {/* Liberal Democracy Index Badge */}
            {country?.liberalIndex !== undefined && (
              <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800" data-testid="liberal-index-badge">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Liberal Democracy Index</span>
                  <span className="text-xs text-slate-500">{country.liberalYear}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="text-2xl font-bold text-slate-100">
                    {country.liberalIndex.toFixed(3)}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${country.liberalIndex * 100}%`,
                          background: country.liberalIndex < 0.25 ? '#dc2626' :
                            country.liberalIndex < 0.5 ? '#f97316' :
                              country.liberalIndex < 0.75 ? '#fbbf24' : '#22c55e'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>0</span>
                      <span>1</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetHeader>

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-12 text-slate-400 hover:text-slate-100"
            onClick={fetchNews}
            disabled={loading}
            data-testid="refresh-news-button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* News Content */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-6 space-y-4">
            {loading ? (
              // Loading skeletons
              <>
                <ArticleSkeleton />
                <ArticleSkeleton />
                <ArticleSkeleton />
                <ArticleSkeleton />
                <ArticleSkeleton />
              </>
            ) : error ? (
              // Error state
              <ErrorState error={error} onRetry={fetchNews} />
            ) : news.length > 0 ? (
              // News articles
              news.map((article, index) => (
                <ArticleCard
                  key={`${article.url}-${index}`}
                  article={article}
                />
              ))
            ) : (
              // Empty state
              <EmptyState countryName={displayName} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CountryPanel;
