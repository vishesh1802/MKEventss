import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Event {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  image?: string;
  latitude?: number;
  longitude?: number;
  venue_name?: string;
}

const MapView = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const mappedEvents: Event[] = data
          .filter((e: any) => e.latitude && e.longitude)
          .map((e: any, idx: number) => {
            let isoDate = e.date;
            if (e.date && e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
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
              latitude: Number(e.latitude),
              longitude: Number(e.longitude),
              venue_name: e.venue_name,
            };
          })
          .filter((e: Event) => {
            const eventDate = new Date(e.date);
            eventDate.setHours(0, 0, 0, 0);
            const eventDateStr = eventDate.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];
            return eventDateStr >= todayStr;
          });
        
        setEvents(mappedEvents);
        if (mappedEvents.length > 0) {
          setSelectedEvent(mappedEvents[0]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getMapUrl = (event: Event | null) => {
    // Use Google Maps embed with coordinates
    if (!event || !event.latitude || !event.longitude) {
      // Default to Milwaukee center
      return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d93321.225551638!2d-87.977834!3d43.0389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x880519b3d450533f%3A0x5b8b5c5b5c5b5c5b!2sMilwaukee%2C%20WI!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus`;
    }
    // Embed map centered on event location
    return `https://www.google.com/maps?q=${event.latitude},${event.longitude}&hl=en&z=15&output=embed`;
  };

  const getDirectionsUrl = (event: Event) => {
    if (!event.latitude || !event.longitude) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Event Map
          </h1>
          <p className="text-muted-foreground">
            Explore events on the map - Click on events to see details
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">No events with location data</p>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card
                  key={event.id}
                  className={`cursor-pointer transition-all ${
                    selectedEvent?.id === event.id
                      ? 'ring-2 ring-primary'
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                    <CardDescription>{event.venue_name || event.region}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        {event.price === 0 ? 'Free' : `$${event.price}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {event.genre}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="sticky top-20">
              <div className="rounded-lg overflow-hidden shadow-lg border border-border">
                <iframe
                  width="100%"
                  height="600"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={getMapUrl(selectedEvent)}
                />
              </div>
              {selectedEvent && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>{selectedEvent.title}</CardTitle>
                    <CardDescription>{selectedEvent.venue_name || selectedEvent.region}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedEvent.venue_name || selectedEvent.region}, Milwaukee</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedEvent.price === 0 ? 'Free Event' : `$${selectedEvent.price}`}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Link to={`/events/${selectedEvent.id}`} className="flex-1">
                          <Button className="w-full">View Details</Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() => window.open(getDirectionsUrl(selectedEvent), '_blank')}
                        >
                          Directions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MapView;

