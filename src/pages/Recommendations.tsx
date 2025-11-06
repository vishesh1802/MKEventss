import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import FilterBar from "@/components/FilterBar";
import { Sparkles, MapPin, Heart } from "lucide-react";

interface Event {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  relevanceScore?: number;
  image?: string;
}

const Recommendations = () => {
  const [regionEvents, setRegionEvents] = useState<Event[]>([]);
  const [interestEvents, setInterestEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      console.log('🔄 useEffect triggered - Region:', selectedRegion, 'Genres:', selectedGenres);
      setLoading(true);
      setError(null);
      // Clear previous events immediately when filters change
      setInterestEvents([]);
      setRegionEvents([]);
      try {
        // Build query params
        const params = new URLSearchParams({ user_id: 'user_1' });
        if (selectedRegion !== "All") {
          params.append('region', selectedRegion);
        }
        if (selectedGenres.length > 0) {
          params.append('genres', selectedGenres.join(','));
        }
        
        // Add timestamp to prevent caching
        params.append('_t', Date.now().toString());
        const apiUrl = `/api/recommend?${params.toString()}`;
        console.log('Fetching recommendations with filters:', { selectedRegion, selectedGenres, apiUrl });
        
        console.log('Making API request to:', apiUrl);
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store', // Prevent caching
        });
        
        console.log('API response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error:', response.status, errorText);
          throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Unexpected response type:', contentType, text.substring(0, 200));
          throw new Error('API returned non-JSON response');
        }
        const data = await response.json();
        console.log('✅ API Response received:', {
          totalEvents: data.recommendations?.length || 0,
          region: selectedRegion,
          genres: selectedGenres,
          sampleVenues: data.recommendations?.slice(0, 3).map((r: any) => r.venue_name) || []
        });
        
        if (!data.recommendations || data.recommendations.length === 0) {
          console.warn('⚠️ No recommendations returned from API');
          setInterestEvents([]);
          setRegionEvents([]);
          return;
        }
        
        // Map API response to Event format
        const mappedEvents: Event[] = data.recommendations.map((rec: any, idx: number) => {
          // Parse M/D/YY date to ISO format
          let isoDate = rec.date;
          if (rec.date && rec.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
            const [month, day, year] = rec.date.split('/');
            isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          return {
            id: rec.id || parseInt(rec.event_id?.replace(/\D/g, '') || String(idx + 1)),
            title: rec.event_name || 'Untitled Event',
            region: rec.venue_name || 'Milwaukee',
            genre: rec.genre || 'General',
            date: isoDate || new Date().toISOString().split('T')[0],
            price: parseFloat(rec.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
            relevanceScore: rec.similarity_score,
          };
        });

        // Split into two categories for display
        const midPoint = Math.ceil(mappedEvents.length / 2);
        const interest = mappedEvents.slice(0, midPoint);
        const region = mappedEvents.slice(midPoint);
        console.log('📊 Events split:', {
          total: mappedEvents.length,
          interestEvents: interest.length,
          regionEvents: region.length
        });
        setInterestEvents(interest);
        setRegionEvents(region);
      } catch (error: any) {
        console.error("Error fetching recommendations:", error);
        setError(`Unable to load recommendations: ${error.message || 'Unknown error'}`);
        // Fallback to empty arrays or show error state
        setInterestEvents([]);
        setRegionEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [selectedRegion, selectedGenres]);

  // Debug: Log current state
  console.log('🎨 Rendering Recommendations:', {
    loading,
    error,
    regionEventsCount: regionEvents.length,
    interestEventsCount: interestEvents.length,
    selectedRegion,
    selectedGenres
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Personalized For You</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Your Event Recommendations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Curated events based on your location, interests, and what's trending
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8">
          <FilterBar
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            selectedGenres={selectedGenres}
            setSelectedGenres={setSelectedGenres}
          />
        </div>

        {/* Based on Your Region */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Near You
              </h2>
              <p className="text-sm text-muted-foreground">
                Events happening {selectedRegion === "All" ? "nearby" : `in ${selectedRegion}`}
                {selectedRegion !== "All" && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    {regionEvents.length} events
                  </span>
                )}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-96 bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : regionEvents.length === 0 && !error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No events found for this region. Try selecting a different region or clearing filters.</p>
              <p className="text-xs mt-2">Debug: Loading={loading.toString()}, Events={regionEvents.length}</p>
            </div>
          ) : regionEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {regionEvents.map((event) => (
                <EventCard key={`region-${event.id}`} {...event} />
              ))}
            </div>
          ) : null}
        </section>

        {/* Based on Your Interests */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Based on Your Interests
              </h2>
              <p className="text-sm text-muted-foreground">
                Music events you might love
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : interestEvents.length === 0 && !error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No events found. Try adjusting your filters.</p>
              <p className="text-xs mt-2">Debug: Loading={loading.toString()}, Events={interestEvents.length}</p>
            </div>
          ) : interestEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              {interestEvents.map((event) => (
                <EventCard key={`interest-${event.id}`} {...event} />
              ))}
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Recommendations;
