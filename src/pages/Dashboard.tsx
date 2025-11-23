import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSavedEvents } from "@/contexts/SavedEventsContext";
import { getReminders } from "@/utils/reminders";
import { 
  Calendar, 
  Heart, 
  CheckCircle2, 
  Bell, 
  TrendingUp, 
  MapPin,
  BarChart3,
  ArrowRight
} from "lucide-react";

interface Event {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  image?: string;
}

const Dashboard = () => {
  const { savedEvents, attendingEvents } = useSavedEvents();
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const reminders = getReminders();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recommended events
        const userId = 'user_1';
        const recResponse = await fetch(`/api/recommend?user_id=${userId}`);
        if (recResponse.ok) {
          const recData = await recResponse.json();
          const mapped = (recData.recommendations || []).slice(0, 6).map((r: any, idx: number) => {
            let isoDate = r.date;
            if (r.date && r.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
              const [month, day, year] = r.date.split('/');
              isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return {
              id: r.id || parseInt(r.event_id?.replace(/\D/g, '') || String(idx + 1)),
              title: r.event_name || 'Untitled Event',
              region: r.venue_name || 'Milwaukee',
              genre: r.genre || 'General',
              date: isoDate,
              price: parseFloat(r.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
              image: r.image || undefined,
            };
          });
          setRecommendedEvents(mapped);
        }

        // Fetch recent events (from localStorage or API)
        const recent = localStorage.getItem('recentlyViewedEvents');
        if (recent) {
          setRecentEvents(JSON.parse(recent).slice(0, 6));
        }

        // Fetch all events for recent view tracking
        const allResponse = await fetch('/api/events');
        if (allResponse.ok) {
          const allData = await allResponse.json();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const mapped = allData
            .filter((e: any) => {
              if (!e.date) return false;
              let isoDate = e.date;
              if (e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                const [month, day, year] = e.date.split('/');
                isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              const eventDate = new Date(isoDate);
              eventDate.setHours(0, 0, 0, 0);
              const eventDateStr = eventDate.toISOString().split('T')[0];
              const todayStr = today.toISOString().split('T')[0];
              return eventDateStr >= todayStr;
            })
            .slice(0, 6)
            .map((e: any, idx: number) => {
              let isoDate = e.date;
              if (e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                const [month, day, year] = e.date.split('/');
                isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              return {
                id: e.id || parseInt(e.event_id?.replace(/\D/g, '') || String(idx + 1)),
                title: e.event_name || 'Untitled Event',
                region: e.venue_name || 'Milwaukee',
                genre: e.genre || 'General',
                date: isoDate,
                price: parseFloat(e.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
                image: e.image || undefined,
              };
            });
          
          if (!recent) {
            setRecentEvents(mapped);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch full event data for saved/attending events to get images
  const [attendingEventsWithImages, setAttendingEventsWithImages] = useState<Event[]>([]);
  
  useEffect(() => {
    const enrichEventsWithImages = async () => {
      if (attendingEvents.length === 0) {
        setAttendingEventsWithImages([]);
        return;
      }

      try {
        // Fetch all events from API
        const response = await fetch('/api/events');
        if (!response.ok) return;
        
        const allEvents = await response.json();
        
        // Helper function to get region from coordinates
        const getVenueRegion = (lat: number, lon: number): string | null => {
          if (lat >= 43.038 && lat <= 43.045 && lon >= -87.92 && lon <= -87.89) return 'Downtown';
          if (lat >= 43.0335 && lat <= 43.0345 && lon >= -87.9335 && lon <= -87.9325) return 'Third Ward';
          if (lat >= 43.0515 && lat <= 43.053 && lon >= -87.906 && lon <= -87.904) return 'Walker\'s Point';
          if (lat >= 43.0755 && lat <= 43.077 && (lon >= -87.881 && lon <= -87.879 || Math.abs(lon - (-87.88)) < 0.001)) return 'East Side';
          return null;
        };

        // Map attending events with images from API
        const enriched = attendingEvents
          .map(savedEvent => {
            const apiEvent = allEvents.find((e: any) => e.id === savedEvent.id || e.event_id === String(savedEvent.id));
            if (!apiEvent) return null;

            let isoDate = apiEvent.date;
            if (apiEvent.date && apiEvent.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
              const [month, day, year] = apiEvent.date.split('/');
              isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            const lat = Number(apiEvent.latitude);
            const lon = Number(apiEvent.longitude);
            const venueRegion = (lat && lon && getVenueRegion(lat, lon)) || apiEvent.venue_name || 'Milwaukee';

            return {
              id: apiEvent.id || savedEvent.id,
              title: apiEvent.event_name || savedEvent.title,
              region: venueRegion,
              genre: apiEvent.genre || savedEvent.genre,
              date: isoDate || savedEvent.date,
              price: parseFloat(apiEvent.ticket_price?.replace(/[^0-9.]/g, '') || '0') || savedEvent.price,
              image: apiEvent.image || savedEvent.image || undefined,
            };
          })
          .filter((e): e is Event => e !== null);

        setAttendingEventsWithImages(enriched);
      } catch (error) {
        console.error('Error enriching events with images:', error);
        // Fallback to events without images
        setAttendingEventsWithImages(attendingEvents as Event[]);
      }
    };

    enrichEventsWithImages();
  }, [attendingEvents]);

  // Sort attending events by date
  const upcomingAttending = [...attendingEventsWithImages]
    .filter(e => {
      const eventDate = new Date(e.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  const stats = {
    saved: savedEvents.length,
    attending: attendingEvents.length,
    reminders: reminders.length,
    upcoming: upcomingAttending.length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Your personalized event hub
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Events</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.saved}</div>
              <p className="text-xs text-muted-foreground">Events you've saved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attending</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attending}</div>
              <p className="text-xs text-muted-foreground">Events you're going to</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
              <p className="text-xs text-muted-foreground">Events coming soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reminders</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reminders}</div>
              <p className="text-xs text-muted-foreground">Active reminders</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Attending Events */}
        {upcomingAttending.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  Upcoming Events You're Attending
                </h2>
              </div>
              <Link to="/profile">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingAttending.map((event) => (
                <EventCard key={`attending-${event.id}`} {...event} />
              ))}
            </div>
          </section>
        )}

        {/* Recommended Events */}
        {recommendedEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-secondary" />
                <h2 className="text-2xl font-bold text-foreground">
                  Recommended For You
                </h2>
              </div>
              <Link to="/recommendations">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedEvents.map((event) => (
                <EventCard key={`recommended-${event.id}`} {...event} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  Trending Events
                </h2>
              </div>
              <Link to="/discover">
                <Button variant="ghost" className="gap-2">
                  Discover More
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentEvents.map((event) => (
                <EventCard key={`recent-${event.id}`} {...event} />
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Navigate to different sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/discover">
                  <Button variant="outline" className="w-full gap-2">
                    <MapPin className="w-4 h-4" />
                    Discover
                  </Button>
                </Link>
                <Link to="/recommendations">
                  <Button variant="outline" className="w-full gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Recommendations
                  </Button>
                </Link>
                <Link to="/map">
                  <Button variant="outline" className="w-full gap-2">
                    <MapPin className="w-4 h-4" />
                    Map View
                  </Button>
                </Link>
                <Link to="/compare">
                  <Button variant="outline" className="w-full gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Compare
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;

