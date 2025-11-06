import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, DollarSign, X, Plus, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSavedEvents } from "@/contexts/SavedEventsContext";
import { toast } from "sonner";

interface Event {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  description?: string;
  venue_name?: string;
  organizer?: string;
}

const CompareEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggleAttendingEvent, isEventAttending } = useSavedEvents();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const mappedEvents: Event[] = data
          .map((e: any, idx: number) => {
            let isoDate = e.date;
            if (e.date && e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
              const [month, day, year] = e.date.split('/');
              isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            const eventDate = new Date(isoDate);
            eventDate.setHours(0, 0, 0, 0);
            const eventDateStr = eventDate.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];
            
            if (eventDateStr < todayStr) return null;
            
            return {
              id: e.id || parseInt(e.event_id?.replace(/\D/g, '') || String(idx + 1)),
              title: e.event_name || 'Untitled Event',
              region: e.venue_name || 'Milwaukee',
              genre: e.genre || 'General',
              date: isoDate,
              price: parseFloat(e.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
              description: e.description,
              venue_name: e.venue_name,
              organizer: e.organizer,
            };
          })
          .filter((e: Event | null) => e !== null) as Event[];
        
        setEvents(mappedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const addToComparison = (event: Event) => {
    if (selectedEvents.length >= 3) {
      toast.error('You can compare up to 3 events at a time');
      return;
    }
    if (selectedEvents.find(e => e.id === event.id)) {
      toast.error('Event already in comparison');
      return;
    }
    setSelectedEvents([...selectedEvents, event]);
    toast.success('Event added to comparison');
  };

  const removeFromComparison = (eventId: number) => {
    setSelectedEvents(selectedEvents.filter(e => e.id !== eventId));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Compare Events
          </h1>
          <p className="text-muted-foreground">
            Select up to 3 events to compare side by side
          </p>
        </div>

        {/* Comparison View */}
        {selectedEvents.length > 0 && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Comparison</CardTitle>
                <CardDescription>
                  {selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''} selected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedEvents.map((event) => (
                    <Card key={event.id} className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeFromComparison(event.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <CardHeader>
                        <CardTitle className="text-lg line-clamp-2 pr-8">{event.title}</CardTitle>
                        <CardDescription>{event.venue_name || event.region}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{event.venue_name || event.region}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {event.price === 0 ? 'Free' : `$${event.price}`}
                          </span>
                        </div>
                        <div>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {event.genre}
                          </span>
                        </div>
                        {event.organizer && (
                          <div className="text-xs text-muted-foreground">
                            by {event.organizer}
                          </div>
                        )}
                        <div className="pt-2 flex gap-2">
                          <Link to={`/events/${event.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant={isEventAttending(event.id) ? "default" : "outline"}
                            onClick={() => toggleAttendingEvent(event)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Events List */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Available Events
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const isSelected = selectedEvents.find(e => e.id === event.id);
                const canAdd = selectedEvents.length < 3 && !isSelected;
                
                return (
                  <Card key={event.id} className={isSelected ? 'ring-2 ring-primary' : ''}>
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                      <CardDescription>{event.venue_name || event.region}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {formatDate(event.date)}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          {event.price === 0 ? 'Free' : `$${event.price}`}
                        </div>
                        <div>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {event.genre}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/events/${event.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => isSelected ? removeFromComparison(event.id) : addToComparison(event)}
                          disabled={!canAdd && !isSelected}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Selected
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Compare
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CompareEvents;

