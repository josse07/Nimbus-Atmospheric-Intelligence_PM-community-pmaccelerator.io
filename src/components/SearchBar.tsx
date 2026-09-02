import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, AlertCircle, Sparkles, Loader2, X } from 'lucide-react';
import { GeocodeResult, GeocodeSuggestion } from '../types';

interface SearchBarProps {
  onSelectLocation: (location: GeocodeResult) => void;
  isLoading: boolean;
  activeLocationName?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectLocation,
  isLoading,
  activeLocationName,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isGpsHint, setIsGpsHint] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick preset locations
  const popularPlaces = [
    { name: 'London, UK', query: 'London' },
    { name: 'New York, USA', query: 'New York' },
    { name: 'Tokyo, Japan', query: 'Tokyo' },
    { name: 'Lagos, Nigeria', query: 'Lagos' },
    { name: 'Paris, France', query: 'Paris' },
    { name: 'Sydney, Australia', query: 'Sydney' },
  ];

  // Detect GPS coordinate formatting while typing
  useEffect(() => {
    const trimmed = query.trim();
    const gpsPattern = /^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/;
    setIsGpsHint(gpsPattern.test(trimmed));
  }, [query]);

  // Handle manual submit or suggestion selection
  const handleSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    setErrorMsg(null);
    setSuggestions([]);
    setIsSearching(true);

    // Validate GPS if it looks like coordinates
    if (term.includes(',') && !isNaN(Number(term.split(',')[0]))) {
      const parts = term.split(',').map(s => s.trim());
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        setErrorMsg('Invalid GPS coordinate range. Latitude must be between -90 and 90, and Longitude between -180 and 180.');
        setIsSearching(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'LOCATION_NOT_FOUND') {
          setErrorMsg(data.message || "We couldn't find that location — try a nearby city or check the spelling");
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
          }
        } else {
          setErrorMsg(data.message || 'Error looking up location. Please try again.');
        }
        setIsSearching(false);
        return;
      }

      if (data.exactMatch) {
        setQuery(data.exactMatch.formattedName || data.exactMatch.name);
        onSelectLocation(data.exactMatch);
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMsg('Network error while resolving location. Please check your connection.');
    } finally {
      setIsSearching(false);
    }
  };

  // Browser Geolocation button handler
  const handleUseMyLocation = () => {
    setErrorMsg(null);
    setSuggestions([]);

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your current browser.');
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const revRes = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          if (revRes.ok) {
            const revData = await revRes.json();
            setQuery(revData.formattedName || revData.name);
            onSelectLocation(revData);
          } else {
            // Fallback coordinate object
            const fallbackLoc: GeocodeResult = {
              name: `Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
              formattedName: `Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
              latitude,
              longitude,
              timezone: 'auto',
            };
            setQuery(fallbackLoc.name);
            onSelectLocation(fallbackLoc);
          }
        } catch {
          const fallbackLoc: GeocodeResult = {
            name: `Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            formattedName: `Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            latitude,
            longitude,
            timezone: 'auto',
          };
          onSelectLocation(fallbackLoc);
        } finally {
          setGeoLocating(false);
        }
      },
      (geoError) => {
        setGeoLocating(false);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setErrorMsg('Location access was denied. Please allow location permissions in your browser or search manually.');
            break;
          case geoError.POSITION_UNAVAILABLE:
            setErrorMsg('Location information is unavailable.');
            break;
          case geoError.TIMEOUT:
            setErrorMsg('The request to get your location timed out.');
            break;
          default:
            setErrorMsg('An unknown error occurred while retrieving location.');
            break;
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSuggestionClick = (sug: GeocodeSuggestion) => {
    setSuggestions([]);
    const loc: GeocodeResult = {
      name: sug.name,
      formattedName: sug.displayText,
      latitude: sug.latitude,
      longitude: sug.longitude,
      country: sug.country,
      admin1: sug.admin1,
      timezone: 'auto',
    };
    setQuery(sug.displayText);
    onSelectLocation(loc);
  };

  return (
    <div className="w-full space-y-3">
      {/* Search Bar Input Row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="relative flex flex-col sm:flex-row gap-2.5 items-stretch"
      >
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            id="location-search-input"
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Search city, postal code, landmark, or GPS (lat, lon)..."
            className="w-full pl-11 pr-10 py-3.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-slate-100 placeholder-slate-500 text-sm md:text-base outline-none transition-all shadow-inner"
          />

          {query && (
            <button
              type="button"
              id="clear-search-btn"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setErrorMsg(null);
                searchInputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {isGpsHint && (
            <div className="absolute right-10 top-3 text-[11px] bg-sky-950 text-sky-300 border border-sky-800/80 px-2 py-0.5 rounded font-mono">
              GPS Pair Detected
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            id="search-submit-btn"
            type="submit"
            disabled={isSearching || isLoading || !query.trim()}
            className="flex-1 sm:flex-none px-5 py-3.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-600/20"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>

          <button
            id="use-my-location-btn"
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLocating || isLoading}
            title="Use current device location"
            className="px-3.5 sm:px-4 py-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 border border-slate-700/80 hover:border-slate-600 disabled:opacity-50 text-slate-200 hover:text-sky-400 font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            {geoLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            ) : (
              <Navigation className="w-4 h-4 text-sky-400" />
            )}
            <span className="inline xs:hidden sm:hidden md:inline">Use My Location</span>
            <span className="hidden xs:inline md:hidden">My Location</span>
          </button>
        </div>
      </form>

      {/* Error Message with plain-language feedback & suggestions */}
      {errorMsg && (
        <div id="search-error-banner" className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-sm flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="font-medium">{errorMsg}</p>
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs text-rose-300 font-semibold mb-1.5">Did you mean one of these?</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(sug)}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3 text-sky-400" />
                      <span>{sug.displayText}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popular Fast-Select Location Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" /> Quick select:
        </span>
        {popularPlaces.map((place) => (
          <button
            key={place.query}
            type="button"
            onClick={() => {
              setQuery(place.name);
              handleSearch(place.query);
            }}
            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800 hover:border-sky-500/40 transition-colors"
          >
            {place.name}
          </button>
        ))}
      </div>
    </div>
  );
};
