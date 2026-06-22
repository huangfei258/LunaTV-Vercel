/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any, no-empty */

'use client';

import { Search, X } from 'lucide-react';
import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';

import SearchResultFilter, { SearchFilterCategory } from '@/components/SearchResultFilter';
import SearchSuggestions from '@/components/SearchSuggestions';
import VideoCard, { VideoCardHandle } from '@/components/VideoCard';
import VirtualGrid from '@/components/VirtualGrid';

interface SearchSectionProps {
  onSearchChange?: (isSearching: boolean) => void;
}

export default function SearchSection({ onSearchChange }: SearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [useFluidSearch, setUseFluidSearch] = useState(true);
  const currentQueryRef = useRef<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingResultsRef = useRef<SearchResult[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;
  const totalSourcesRef = useRef(totalSources);
  totalSourcesRef.current = totalSources;

  const groupRefs = useRef<Map<string, React.RefObject<VideoCardHandle>>>(new Map());
  const groupStatsRef = useRef<Map<string, { douban_id?: number; episodes?: number; source_names: string[] }>>(new Map());

  const [filterAll, setFilterAll] = useState<{ source: string; title: string; year: string; yearOrder: 'none' | 'asc' | 'desc' }>({
    source: 'all', title: 'all', year: 'all', yearOrder: 'none',
  });
  const [filterAgg, setFilterAgg] = useState<{ source: string; title: string; year: string; yearOrder: 'none' | 'asc' | 'desc' }>({
    source: 'all', title: 'all', year: 'all', yearOrder: 'none',
  });

  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('defaultAggregateSearch');
      if (s !== null) return JSON.parse(s);
    }
    return true;
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => getDefaultAggregate() ? 'agg' : 'all');

  useEffect(() => {
    getSearchHistory().then(setSearchHistory);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fluidSearch');
      const def = (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
      setUseFluidSearch(saved !== null ? JSON.parse(saved) : def);
    }
    const unsub = subscribeToDataUpdates('searchHistoryUpdated', (h: string[]) => setSearchHistory(h));
    return unsub;
  }, []);

  const getGroupRef = (key: string) => {
    let ref = groupRefs.current.get(key);
    if (!ref) { ref = React.createRef<VideoCardHandle>(); groupRefs.current.set(key, ref); }
    return ref;
  };

  const computeGroupStats = (group: SearchResult[]) => {
    const episodes = (() => {
      const cm = new Map<number, number>();
      group.forEach(g => { const l = g.episodes?.length || 0; if (l > 0) cm.set(l, (cm.get(l) || 0) + 1); });
      let mx = 0, res = 0; cm.forEach((v, k) => { if (v > mx) { mx = v; res = k; } }); return res;
    })();
    const source_names = Array.from(new Set(group.map(g => g.source_name).filter(Boolean))) as string[];
    const douban_id = (() => {
      const cm = new Map<number, number>();
      group.forEach(g => { if (g.douban_id && g.douban_id > 0) cm.set(g.douban_id, (cm.get(g.douban_id) || 0) + 1); });
      let mx = 0, res: number | undefined; cm.forEach((v, k) => { if (v > mx) { mx = v; res = k; } }); return res;
    })();
    return { episodes, source_names, douban_id };
  };

  const sortBatchForNoOrder = (items: SearchResult[]) => {
    const q = currentQueryRef.current.trim();
    return items.slice().sort((a, b) => {
      const aExact = (a.title || '').trim() === q, bExact = (b.title || '').trim() === q;
      if (aExact && !bExact) return -1; if (!aExact && bExact) return 1;
      const aN = parseInt(a.year as any, 10), bN = parseInt(b.year as any, 10);
      const aV = !isNaN(aN), bV = !isNaN(bN);
      if (aV && !bV) return -1; if (!aV && bV) return 1;
      if (aV && bV) return bN - aN; return 0;
    });
  };

  const compareYear = (aYear: string, bYear: string, order: 'none' | 'asc' | 'desc') => {
    if (order === 'none') return 0;
    const aE = !aYear || aYear === 'unknown', bE = !bYear || bYear === 'unknown';
    if (aE && bE) return 0; if (aE) return 1; if (bE) return -1;
    const aN = parseInt(aYear, 10), bN = parseInt(bYear, 10);
    return order === 'asc' ? aN - bN : bN - aN;
  };

  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = [];
    searchResults.forEach(item => {
      const key = `${item.title.replaceAll(' ', '')}-${item.year || 'unknown'}-${item.episodes.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key) || [];
      if (arr.length === 0) keyOrder.push(key);
      arr.push(item); map.set(key, arr);
    });
    return keyOrder.map(key => [key, map.get(key) as SearchResult[]] as [string, SearchResult[]]);
  }, [searchResults]);

  useEffect(() => {
    aggregatedResults.forEach(([mapKey, group]) => {
      const stats = computeGroupStats(group);
      const prev = groupStatsRef.current.get(mapKey);
      if (!prev) { groupStatsRef.current.set(mapKey, stats); return; }
      const ref = groupRefs.current.get(mapKey);
      if (ref?.current) {
        if (prev.episodes !== stats.episodes) ref.current.setEpisodes(stats.episodes);
        const pn = (prev.source_names || []).join('|'), nn = (stats.source_names || []).join('|');
        if (pn !== nn) ref.current.setSourceNames(stats.source_names);
        if (prev.douban_id !== stats.douban_id) ref.current.setDoubanId(stats.douban_id);
        groupStatsRef.current.set(mapKey, stats);
      }
    });
  }, [aggregatedResults]);

  const filterOptions = useMemo(() => {
    const sourcesSet = new Map<string, string>();
    const titlesSet = new Set<string>();
    const yearsSet = new Set<string>();
    searchResults.forEach(item => {
      if (item.source && item.source_name) sourcesSet.set(item.source, item.source_name);
      if (item.title) titlesSet.add(item.title);
      if (item.year) yearsSet.add(item.year);
    });
    const srcOpts = [{ label: '全部来源', value: 'all' }, ...Array.from(sourcesSet.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([v, l]) => ({ label: l, value: v }))];
    const titleOpts = [{ label: '全部标题', value: 'all' }, ...Array.from(titlesSet).sort().map(t => ({ label: t, value: t }))];
    const years = Array.from(yearsSet);
    const knownYears = years.filter(y => y !== 'unknown').sort((a, b) => parseInt(b) - parseInt(a));
    const yearOpts = [{ label: '全部年份', value: 'all' }, ...knownYears.map(y => ({ label: y, value: y })), ...(years.includes('unknown') ? [{ label: '未知', value: 'unknown' }] : [])];
    return { categoriesAll: [{ key: 'source' as const, label: '来源', options: srcOpts }, { key: 'title' as const, label: '标题', options: titleOpts }, { key: 'year' as const, label: '年份', options: yearOpts }] as SearchFilterCategory[], categoriesAgg: [{ key: 'source' as const, label: '来源', options: srcOpts }, { key: 'title' as const, label: '标题', options: titleOpts }, { key: 'year' as const, label: '年份', options: yearOpts }] as SearchFilterCategory[] };
  }, [searchResults]);

  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll;
    const filtered = searchResults.filter(item => {
      if (source !== 'all' && item.source !== source) return false;
      if (title !== 'all' && item.title !== title) return false;
      if (year !== 'all' && item.year !== year) return false;
      return true;
    });
    if (yearOrder === 'none') return filtered;
    return filtered.sort((a, b) => {
      const yc = compareYear(a.year, b.year, yearOrder);
      if (yc !== 0) return yc;
      const aExact = a.title === searchQuery.trim(), bExact = b.title === searchQuery.trim();
      if (aExact && !bExact) return -1; if (!aExact && bExact) return 1;
      return yearOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    });
  }, [searchResults, filterAll, searchQuery]);

  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg;
    const filtered = aggregatedResults.filter(([_, group]) => {
      const gTitle = group[0]?.title ?? '', gYear = group[0]?.year ?? 'unknown';
      if (source !== 'all' && !group.some(item => item.source === source)) return false;
      if (title !== 'all' && gTitle !== title) return false;
      if (year !== 'all' && gYear !== year) return false;
      return true;
    });
    if (yearOrder === 'none') return filtered;
    return filtered.sort((a, b) => {
      const yc = compareYear(a[1][0].year, b[1][0].year, yearOrder);
      if (yc !== 0) return yc;
      const aExact = a[1][0].title === searchQuery.trim(), bExact = b[1][0].title === searchQuery.trim();
      if (aExact && !bExact) return -1; if (!aExact && bExact) return 1;
      return yearOrder === 'asc' ? a[1][0].title.localeCompare(b[1][0].title) : b[1][0].title.localeCompare(a[1][0].title);
    });
  }, [aggregatedResults, filterAgg, searchQuery]);

  const doSearch = useCallback((query: string) => {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;
    currentQueryRef.current = trimmed;
    setSearchQuery(trimmed);
    if (eventSourceRef.current) { try { eventSourceRef.current.close(); } catch {} eventSourceRef.current = null; }
    setSearchResults([]);
    setTotalSources(0);
    setCompletedSources(0);
    pendingResultsRef.current = [];
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    setIsLoading(true);
    setShowResults(true);
    setShowSuggestions(false);
    onSearchChangeRef.current?.(true);

    let currentFluid = useFluidSearch;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fluidSearch');
      currentFluid = saved !== null ? JSON.parse(saved) : (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
    }
    if (currentFluid) {
      const es = new EventSource(`/api/search/ws?q=${encodeURIComponent(trimmed)}`);
      eventSourceRef.current = es;
      es.onmessage = (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          if (currentQueryRef.current !== trimmed) return;
          switch (payload.type) {
            case 'start': setTotalSources(payload.totalSources || 0); setCompletedSources(0); break;
            case 'source_result': {
              setCompletedSources(prev => prev + 1);
              if (Array.isArray(payload.results) && payload.results.length > 0) {
                const incoming = sortBatchForNoOrder(payload.results);
                pendingResultsRef.current.push(...incoming);
                if (!flushTimerRef.current) {
                  flushTimerRef.current = window.setTimeout(() => {
                    const toAppend = pendingResultsRef.current;
                    pendingResultsRef.current = [];
                    startTransition(() => setSearchResults(prev => prev.concat(toAppend)));
                    flushTimerRef.current = null;
                  }, 80);
                }
              }
              break;
            }
            case 'source_error': setCompletedSources(prev => prev + 1); break;
            case 'complete':
              setCompletedSources(payload.completedSources || totalSourcesRef.current);
              if (pendingResultsRef.current.length > 0) {
                const toAppend = pendingResultsRef.current;
                pendingResultsRef.current = [];
                if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
                startTransition(() => setSearchResults(prev => prev.concat(toAppend)));
              }
              setIsLoading(false);
              try { es.close(); } catch {}
              if (eventSourceRef.current === es) eventSourceRef.current = null;
              break;
          }
        } catch {}
      };
      es.onerror = () => {
        setIsLoading(false);
        if (pendingResultsRef.current.length > 0) {
          const toAppend = pendingResultsRef.current;
          pendingResultsRef.current = [];
          if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
          startTransition(() => setSearchResults(prev => prev.concat(toAppend)));
        }
        try { es.close(); } catch {}
        if (eventSourceRef.current === es) eventSourceRef.current = null;
      };
    } else {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then(r => r.json()).then(data => {
          if (currentQueryRef.current !== trimmed) return;
          if (data.results && Array.isArray(data.results)) {
            setSearchResults(sortBatchForNoOrder(data.results));
            setTotalSources(1); setCompletedSources(1);
          }
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }
    addSearchHistory(query);
  }, [useFluidSearch, onSearchChangeRef, totalSourcesRef]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) { try { eventSourceRef.current.close(); } catch {} eventSourceRef.current = null; }
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      pendingResultsRef.current = [];
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(searchQuery);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    setShowSuggestions(!!v.trim());
  };

  const handleInputFocus = () => {
    if (searchQuery.trim()) setShowSuggestions(true);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    doSearch(suggestion);
  };

  const handleClear = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    if (eventSourceRef.current) { try { eventSourceRef.current.close(); } catch {} eventSourceRef.current = null; }
    setSearchResults([]);
    setShowResults(false);
    onSearchChangeRef.current?.(false);
  };

  return (
    <div>
      {/* 搜索框 */}
      <div className='mb-8'>
        <form onSubmit={handleSearch} className='max-w-2xl mx-auto'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500' />
            <input
              id='searchInput'
              type='text'
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder='搜索电影、电视剧...'
              autoComplete="off"
              className='w-full h-12 rounded-lg bg-gray-50/80 py-3 pl-10 pr-12 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white border border-gray-200/50 shadow-sm dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:bg-gray-700 dark:border-gray-700'
            />
            {searchQuery && (
              <button type='button' onClick={handleClear}
                className='absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                aria-label='清除'>
                <X className='h-5 w-5' />
              </button>
            )}
            <SearchSuggestions
              query={searchQuery}
              isVisible={showSuggestions}
              onSelect={handleSuggestionSelect}
              onClose={() => setShowSuggestions(false)}
              onEnterKey={() => doSearch(searchQuery)}
            />
          </div>
        </form>
      </div>

      {/* 结果区域 */}
      <div className='max-w-[95%] mx-auto overflow-visible'>
        {showResults ? (
          <section className='mb-12'>
            <div className='mb-4'>
              <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                搜索结果
                {totalSources > 0 && useFluidSearch && (
                  <span className='ml-2 text-sm font-normal text-gray-500 dark:text-gray-400'>
                    {completedSources}/{totalSources}
                  </span>
                )}
                {isLoading && useFluidSearch && (
                  <span className='ml-2 inline-block align-middle'>
                    <span className='inline-block h-3 w-3 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin'></span>
                  </span>
                )}
              </h2>
            </div>
            <div className='mb-8 flex items-center justify-between gap-3'>
              <div className='flex-1 min-w-0'>
                {viewMode === 'agg' ? (
                  <SearchResultFilter categories={filterOptions.categoriesAgg} values={filterAgg} onChange={(v) => setFilterAgg(v as any)} />
                ) : (
                  <SearchResultFilter categories={filterOptions.categoriesAll} values={filterAll} onChange={(v) => setFilterAll(v as any)} />
                )}
              </div>
              <label className='flex items-center gap-2 cursor-pointer select-none shrink-0'>
                <span className='text-xs sm:text-sm text-gray-700 dark:text-gray-300'>聚合</span>
                <div className='relative'>
                  <input type='checkbox' className='sr-only peer' checked={viewMode === 'agg'}
                    onChange={() => setViewMode(viewMode === 'agg' ? 'all' : 'agg')} />
                  <div className='w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                  <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4'></div>
                </div>
              </label>
            </div>
            {searchResults.length === 0 ? (
              isLoading ? (
                <div className='flex justify-center items-center h-40'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
                </div>
              ) : (
                <div className='text-center text-gray-500 py-8 dark:text-gray-400'>未找到相关结果</div>
              )
            ) : (
              <div key={`sr-${viewMode}`}>
                {viewMode === 'agg' ? (
                  <VirtualGrid items={filteredAggResults} className='grid-cols-3 gap-x-2 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
                    rowGapClass='pb-14 sm:pb-20' estimateRowHeight={320}
                    renderItem={([mapKey, group]) => {
                      const title = group[0]?.title || '';
                      const poster = group[0]?.poster || '';
                      const year = group[0]?.year || 'unknown';
                      const { episodes, source_names, douban_id } = computeGroupStats(group);
                      if (!groupStatsRef.current.has(mapKey)) groupStatsRef.current.set(mapKey, { episodes, source_names, douban_id });
                      return (
                        <div key={`agg-${mapKey}`} className='w-full'>
                          <VideoCard ref={getGroupRef(mapKey)} from='search' isAggregate={true}
                            title={title} poster={poster} year={year} episodes={episodes}
                            source_names={source_names} douban_id={douban_id}
                            query={searchQuery.trim() !== title ? searchQuery.trim() : ''}
                            type={episodes === 1 ? 'movie' : 'tv'} />
                        </div>
                      );
                    }} />
                ) : (
                  <VirtualGrid items={filteredAllResults} className='grid-cols-3 gap-x-2 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
                    rowGapClass='pb-14 sm:pb-20' estimateRowHeight={320}
                    renderItem={(item) => (
                      <div key={`all-${item.source}-${item.id}`} className='w-full'>
                        <VideoCard id={item.id} title={item.title} poster={item.poster}
                          episodes={item.episodes.length} source={item.source} source_name={item.source_name}
                          douban_id={item.douban_id}
                          query={searchQuery.trim() !== item.title ? searchQuery.trim() : ''}
                          year={item.year} from='search' type={item.episodes.length > 1 ? 'tv' : 'movie'} />
                      </div>
                    )} />
                )}
              </div>
            )}
          </section>
        ) : searchHistory.length > 0 ? (
          <section className='mb-12'>
            <h2 className='mb-4 text-xl font-bold text-gray-800 text-left dark:text-gray-200'>
              搜索历史
              <button onClick={() => clearSearchHistory()}
                className='ml-3 text-sm text-gray-500 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-500'>
                清空
              </button>
            </h2>
            <div className='flex flex-wrap gap-2'>
              {searchHistory.map((item) => (
                <div key={item} className='relative group'>
                  <button onClick={() => { setSearchQuery(item); doSearch(item); }}
                    className='px-4 py-2 bg-gray-500/10 hover:bg-gray-300 rounded-full text-sm text-gray-700 transition-colors duration-200 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-300'>
                    {item}
                  </button>
                  <button aria-label='删除'
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteSearchHistory(item); }}
                    className='absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] transition-colors'>
                    <X className='w-3 h-3' />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
