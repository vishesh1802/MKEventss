import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import EventCard from "@/components/EventCard";
import { ChevronRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Event {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  image?: string;
}

const Index = () => {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('🏠 Home: Fetching events from API...');
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }
        const data = await response.json();
        console.log('🏠 Home: Received', data.length, 'events from API');
        console.log('🏠 Home: Sample event data:', data[0] ? {
          id: data[0].id,
          event_name: data[0].event_name,
          image: data[0].image,
          hasImage: !!data[0].image
        } : 'No events');
        
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
        
        // Map API response to Event format and filter future events
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const mappedEvents: Event[] = data
          .map((event: any, idx: number) => {
            // Skip events without required fields
            if (!event.event_name || !event.date) {
              console.warn('Skipping event with missing data:', event);
              return null;
            }
            
            // Parse M/D/YY date to ISO format
            let isoDate = event.date;
            if (event.date && event.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
              const [month, day, year] = event.date.split('/');
              isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            const eventDate = new Date(isoDate);
            if (isNaN(eventDate.getTime())) {
              console.warn('Invalid date for event:', event.event_name, event.date);
              return null;
            }
            eventDate.setHours(0, 0, 0, 0);
            
            // Only include today and future events (>= today)
            // Compare dates as strings to avoid timezone issues
            const eventDateStr = eventDate.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];
            if (eventDateStr < todayStr) return null;
            
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
              image: event.image || undefined,
            };
          })
          .filter((event: Event | null) => event !== null) as Event[];
        
        console.log('🏠 Home: Mapped', mappedEvents.length, 'future events');
        
        // Sort by date (earliest first)
        mappedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Featured events: first 4
        setFeaturedEvents(mappedEvents.slice(0, 4));
        // Trending events: next 3 (or shuffle for variety)
        setTrendingEvents(mappedEvents.slice(4, 7));
        
        console.log('🏠 Home: Set', mappedEvents.slice(0, 4).length, 'featured and', mappedEvents.slice(4, 7).length, 'trending events');
      } catch (error) {
        console.error("Error fetching events:", error);
        setFeaturedEvents([]);
        setTrendingEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />

        {/* Featured Events Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Featured Events
              </h2>
              <p className="text-muted-foreground">
                Hand-picked experiences you won't want to miss
              </p>
            </div>
            <Link to="/discover">
              <Button variant="ghost" className="gap-2">
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          )}
        </section>

        {/* Trending Section */}
        <section className="bg-muted py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="w-6 h-6 text-secondary" />
              <h2 className="text-3xl font-bold text-foreground">
                Trending Now
              </h2>
            </div>

            {loading ? (
              <div className="flex overflow-x-auto gap-6 pb-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="min-w-[300px] h-96 bg-card rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide animate-fade-in">
                {trendingEvents.map((event) => (
                  <div key={event.id} className="min-w-[300px] md:min-w-[350px]">
                    <EventCard {...event} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="gradient-hero rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Never Miss a Milwaukee Moment
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Get personalized event recommendations based on your interests and location
            </p>
            <Link to="/recommendations">
              <Button size="lg" className="bg-secondary hover:bg-secondary-hover text-white px-8">
                Get Recommendations
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
