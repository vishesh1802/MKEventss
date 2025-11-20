import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import FilterBar from "@/components/FilterBar";
import { useSearchParams } from "react-router-dom";

interface Event {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  image?: string;
}

const Discover = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | undefined>();
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | undefined>();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        console.log('🔍 Discover: Fetching events from API...');
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }
        const data = await response.json();
        console.log('🔍 Discover: Received', data.length, 'events from API');
        
        // Helper function to get region from coordinates
        const getVenueRegion = (lat: number, lon: number): string | null => {
          if (lat >= 43.038 && lat <= 43.045 && lon >= -87.92 && lon <= -87.89) {
            return 'Downtown';
          }
          if (lat >= 43.0335 && lat <= 43.0345 && lon >= -87.9335 && lon <= -87.9325) {
            return 'Third Ward';
          }
          if (lat >= 43.0515 && lat <= 43.053 && lon >= -87.906 && lon <= -87.904) {
            return 'Walker\'s Point';
          }
          if (lat >= 43.0755 && lat <= 43.077 && (lon >= -87.881 && lon <= -87.879 || Math.abs(lon - (-87.88)) < 0.001)) {
            return 'East Side';
          }
          return null;
        };
        
        // Map API response to Event format (include both past and future events)
        const mappedEvents: Event[] = data
          .map((event: any, idx: number) => {
            // Skip events without required fields
            if (!event.event_name || !event.date) {
              return null;
            }
            
            // Parse M/D/YY date to ISO format
            let isoDate = event.date;
            if (event.date && event.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
              const [month, day, year] = event.date.split('/');
              isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            // Get region from coordinates
            const lat = Number(event.latitude);
            const lon = Number(event.longitude);
            const venueRegion = (lat && lon && getVenueRegion(lat, lon)) || event.venue_name || 'Milwaukee';
            
            return {
              id: event.id || parseInt(event.event_id?.replace(/\D/g, '') || String(idx + 1)),
              title: event.event_name || 'Untitled Event',
              region: venueRegion,
              genre: event.genre || 'General',
              date: isoDate || new Date().toISOString().split('T')[0],
              price: parseFloat(event.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
            };
          })
          .filter((event: Event | null) => event !== null) as Event[];

        // Apply filters
        let filtered = mappedEvents;

        console.log('🔍 Discover: Applying filters', {
          selectedRegion,
          selectedGenres,
          totalEvents: mappedEvents.length
        });

        if (searchQuery) {
          filtered = filtered.filter(event =>
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.region.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        if (selectedRegion !== "All") {
          const beforeRegion = filtered.length;
          filtered = filtered.filter(event => {
            // Exact match first
            if (event.region === selectedRegion) return true;
            // Case-insensitive match for better compatibility
            if (event.region.toLowerCase() === selectedRegion.toLowerCase()) return true;
            // For Third Ward, also check if region contains "third ward"
            if (selectedRegion === "Third Ward" && event.region.toLowerCase().includes("third ward")) return true;
            return false;
          });
          console.log(`🔍 Region filter "${selectedRegion}": ${beforeRegion} -> ${filtered.length} events`);
        }

        if (selectedGenres.length > 0) {
          const beforeGenre = filtered.length;
          filtered = filtered.filter(event => {
            // Case-insensitive genre matching
            return selectedGenres.some(selectedGenre => 
              event.genre.toLowerCase() === selectedGenre.toLowerCase()
            );
          });
          console.log(`🔍 Genre filter [${selectedGenres.join(', ')}]: ${beforeGenre} -> ${filtered.length} events`);
        }

        // Apply date range filter
        if (dateRange) {
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= startDate && eventDate <= endDate;
          });
        }

        // Apply price range filter
        if (priceRange) {
          filtered = filtered.filter(event => {
            const price = event.price || 0;
            const min = priceRange.min !== undefined ? priceRange.min : 0;
            const max = priceRange.max !== undefined && priceRange.max !== Infinity ? priceRange.max : Infinity;
            return price >= min && price <= max;
          });
        }

        // Sort by date (future events first, then past events)
        filtered.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayTime = today.getTime();
          const isAPast = dateA < todayTime;
          const isBPast = dateB < todayTime;
          
          // Future events come first
          if (isAPast && !isBPast) return 1;
          if (!isAPast && isBPast) return -1;
          
          // Within same category, sort by date (future: earliest first, past: most recent first)
          if (!isAPast && !isBPast) {
            return dateA - dateB; // Future: earliest first
          } else {
            return dateB - dateA; // Past: most recent first
          }
        });

        console.log('🔍 Discover: Filtered to', filtered.length, 'events');
        setEvents(filtered);
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedRegion, selectedGenres, searchQuery, dateRange, priceRange]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Discover Events
          </h1>
          <p className="text-muted-foreground">
            {searchQuery ? `Search results for "${searchQuery}"` : "Explore all events in Milwaukee - past and upcoming"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start">
            <FilterBar
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedGenres={selectedGenres}
              setSelectedGenres={setSelectedGenres}
              dateRange={dateRange}
              setDateRange={setDateRange}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
            />
          </aside>

          {/* Events Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-96 bg-muted rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">
                  No events found matching your criteria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                {events.map((event) => (
                  <EventCard key={event.id} {...event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Discover;
