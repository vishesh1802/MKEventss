import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, Heart, Share2, Users, Clock, Download, ExternalLink, Bell } from "lucide-react";
import { toast } from "sonner";
import { useSavedEvents } from "@/contexts/SavedEventsContext";
import { downloadCalendar, getGoogleCalendarUrl } from "@/utils/calendar";
import { shareToFacebook, shareToTwitter, shareViaEmail, copyToClipboard, shareViaNativeShare } from "@/utils/share";
import { saveReminder, getReminderForEvent, removeReminder, calculateReminderTime } from "@/utils/reminders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Event {
  id: number;
  event_id?: string;
  title: string;
  event_name?: string;
  region: string;
  venue_name?: string;
  genre: string;
  date: string;
  price: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  organizer?: string;
  image?: string;
}

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderType, setReminderType] = useState<'1day' | '1week' | 'custom'>('1day');
  const [customHours, setCustomHours] = useState(24);
  const { toggleSaveEvent, toggleAttendingEvent, isEventSaved, isEventAttending } = useSavedEvents();
  const isSaved = event ? isEventSaved(event.id) : false;
  const isAttending = event ? isEventAttending(event.id) : false;
  const hasReminder = event ? getReminderForEvent(event.id) !== null : false;

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

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        // Fetch event by ID
        const response = await fetch(`/api/events/${id}`);
        if (!response.ok) {
          throw new Error('Event not found');
        }
        const eventData = await response.json();
        
        // Parse date
        let isoDate = eventData.date;
        if (eventData.date && eventData.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
          const [month, day, year] = eventData.date.split('/');
          isoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Get region
        const lat = Number(eventData.latitude);
        const lon = Number(eventData.longitude);
        const venueRegion = (lat && lon && getVenueRegion(lat, lon)) || eventData.venue_name || 'Milwaukee';
        
        const mappedEvent: Event = {
          id: eventData.id || parseInt(eventData.event_id?.replace(/\D/g, '') || String(id)),
          event_id: eventData.event_id,
          title: eventData.event_name || 'Untitled Event',
          event_name: eventData.event_name,
          region: venueRegion,
          venue_name: eventData.venue_name,
          genre: eventData.genre || 'General',
          date: isoDate,
          price: parseFloat(eventData.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
          description: eventData.description || 'No description available.',
          latitude: lat,
          longitude: lon,
          organizer: eventData.organizer,
        };
        
        setEvent(mappedEvent);
        
        // Fetch related events (same genre, different event)
        const allEventsResponse = await fetch('/api/events');
        if (allEventsResponse.ok) {
          const allEvents = await allEventsResponse.json();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const related = allEvents
            .filter((e: any) => {
              if (!e.event_name || !e.date || e.event_id === eventData.event_id) return false;
              
              // Parse date
              let eIsoDate = e.date;
              if (e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                const [month, day, year] = e.date.split('/');
                eIsoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              
              const eDate = new Date(eIsoDate);
              eDate.setHours(0, 0, 0, 0);
              const eDateStr = eDate.toISOString().split('T')[0];
              const todayStr = today.toISOString().split('T')[0];
              
              // Only future events, same genre
              return e.genre === eventData.genre && eDateStr >= todayStr;
            })
            .slice(0, 3)
            .map((e: any, idx: number) => {
              let eIsoDate = e.date;
              if (e.date.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                const [month, day, year] = e.date.split('/');
                eIsoDate = `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              
              const eLat = Number(e.latitude);
              const eLon = Number(e.longitude);
              const eVenueRegion = (eLat && eLon && getVenueRegion(eLat, eLon)) || e.venue_name || 'Milwaukee';
              
              return {
                id: e.id || parseInt(e.event_id?.replace(/\D/g, '') || String(idx + 1)),
                title: e.event_name || 'Untitled Event',
                region: eVenueRegion,
                genre: e.genre || 'General',
                date: eIsoDate,
                price: parseFloat(e.ticket_price?.replace(/[^0-9.]/g, '') || '0'),
              };
            });
          
          setRelatedEvents(related);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        toast.error("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  const handleSave = () => {
    if (event) {
      toggleSaveEvent({
        id: event.id,
        title: event.title,
        region: event.region,
        genre: event.genre,
        date: event.date,
        price: event.price,
      });
    }
  };

  const handleAttend = () => {
    if (event) {
      toggleAttendingEvent({
        id: event.id,
        title: event.title,
        region: event.region,
        genre: event.genre,
        date: event.date,
        price: event.price,
      });
    }
  };

  const handleShare = async (platform?: 'facebook' | 'twitter' | 'email' | 'native' | 'copy') => {
    const url = window.location.href;
    const title = event?.title || 'Event';

    if (!platform || platform === 'copy') {
      const success = await copyToClipboard(url);
      if (success) {
        toast.success("Link copied to clipboard!");
      } else {
        toast.error("Failed to copy link");
      }
    } else if (platform === 'facebook') {
      shareToFacebook(url, title);
    } else if (platform === 'twitter') {
      shareToTwitter(url, title);
    } else if (platform === 'email') {
      shareViaEmail(url, title);
    } else if (platform === 'native') {
      shareViaNativeShare(url, title, event?.description);
    }
  };

  const handleAddToCalendar = (type: 'ical' | 'google') => {
    if (!event) return;
    
    if (type === 'ical') {
      downloadCalendar({
        title: event.title,
        date: event.date,
        description: event.description,
        location: `${event.venue_name || event.region}, Milwaukee`,
        price: event.price,
      });
      toast.success("Calendar file downloaded!");
    } else {
      window.open(getGoogleCalendarUrl({
        title: event.title,
        date: event.date,
        description: event.description,
        location: `${event.venue_name || event.region}, Milwaukee`,
      }), '_blank');
    }
  };

  const handleSetReminder = () => {
    if (!event) return;
    
    const reminderTime = calculateReminderTime(event.date, reminderType, customHours);
    saveReminder({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      reminderTime,
      reminderType,
    });
    
    toast.success("Reminder set successfully!");
    setReminderDialogOpen(false);
  };

  const handleRemoveReminder = () => {
    if (!event) return;
    removeReminder(event.id);
    toast.success("Reminder removed");
  };

  const handleGetDirections = () => {
    if (!event || !event.latitude || !event.longitude) {
      toast.error("Location information not available");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-2xl mb-8" />
            <div className="h-8 bg-muted rounded w-2/3 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2 mb-8" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Event not found</h2>
            <Link to="/discover">
              <Button>Browse Events</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Banner */}
        <div className="relative h-96 gradient-hero">
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="w-32 h-32 text-white/20" />
          </div>
        </div>

        {/* Event Details */}
        <div className="container mx-auto px-4 -mt-20 relative z-10">
          <div className="bg-card rounded-2xl shadow-card-hover p-8 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-3">
                  {event.genre}
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  {event.title}
                </h1>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-lg">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-lg">{event.venue_name || event.region}, Milwaukee</span>
                  </div>
                  {event.organizer && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="text-lg">Organized by {event.organizer}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-foreground font-semibold">
                    <DollarSign className="w-5 h-5 text-secondary" />
                    <span className="text-lg">
                      {event.price === 0 ? "Free Event" : `$${event.price}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 lg:w-48">
                <Button 
                  size="lg" 
                  className={`w-full gap-2 ${isAttending ? 'bg-primary' : ''}`}
                  onClick={handleAttend}
                >
                  <Users className="w-5 h-5" />
                  {isAttending ? "Attending ✓" : "Attend"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleSave}
                  className="w-full gap-2"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isSaved ? "fill-secondary text-secondary" : ""
                    }`}
                  />
                  {isSaved ? "Saved" : "Save"}
                </Button>
                
                {/* Share Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="w-full gap-2">
                      <Share2 className="w-5 h-5" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare('copy')}>
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('facebook')}>
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('twitter')}>
                      Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('email')}>
                      Email
                    </DropdownMenuItem>
                    {navigator.share && (
                      <DropdownMenuItem onClick={() => handleShare('native')}>
                        More Options
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add to Calendar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="w-full gap-2">
                      <Calendar className="w-5 h-5" />
                      Add to Calendar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddToCalendar('google')}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Google Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToCalendar('ical')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download (.ics)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Reminder Button */}
                {hasReminder ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleRemoveReminder}
                    className="w-full gap-2"
                  >
                    <Bell className="w-5 h-5 fill-primary text-primary" />
                    Remove Reminder
                  </Button>
                ) : (
                  <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" variant="outline" className="w-full gap-2">
                        <Bell className="w-5 h-5" />
                        Set Reminder
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Event Reminder</DialogTitle>
                        <DialogDescription>
                          Get notified before this event starts
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Reminder Time</Label>
                          <Select value={reminderType} onValueChange={(v: '1day' | '1week' | 'custom') => setReminderType(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1day">1 Day Before</SelectItem>
                              <SelectItem value="1week">1 Week Before</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {reminderType === 'custom' && (
                          <div>
                            <Label>Hours Before Event</Label>
                            <Input
                              type="number"
                              value={customHours}
                              onChange={(e) => setCustomHours(parseInt(e.target.value) || 24)}
                              min={1}
                              max={168}
                            />
                          </div>
                        )}
                        <Button onClick={handleSetReminder} className="w-full">
                          Set Reminder
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Get Directions */}
                {event.latitude && event.longitude && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleGetDirections}
                    className="w-full gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    Get Directions
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-border pt-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                About This Event
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {event.description}
              </p>
            </div>
          </div>

          {/* Related Events */}
          <section className="pb-16">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {relatedEvents.map((relatedEvent) => (
                <EventCard key={relatedEvent.id} {...relatedEvent} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
