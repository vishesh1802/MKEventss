import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, Heart, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSavedEvents } from "@/contexts/SavedEventsContext";

interface Event {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  description: string;
  image?: string;
}

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggleSaveEvent, isEventSaved } = useSavedEvents();
  const isSaved = event ? isEventSaved(event.id) : false;

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call to /api/events/:id
        const mockEvent: Event = {
          id: Number(id),
          title: "Lakefront Music Festival",
          region: "Downtown",
          genre: "Music",
          date: "2025-06-15",
          price: 45,
          description:
            "Join us for an unforgettable evening of music along Milwaukee's beautiful lakefront. This festival features top local and national artists performing across multiple stages. Enjoy food trucks, craft beverages, and stunning sunset views over Lake Michigan. Perfect for families and music lovers of all ages.",
        };

        const mockRelated: Event[] = [
          {
            id: 2,
            title: "Third Ward Art Walk",
            region: "Third Ward",
            genre: "Art",
            date: "2025-05-20",
            price: 0,
            description: "Explore galleries",
          },
          {
            id: 3,
            title: "Bay View Jazz Night",
            region: "Bay View",
            genre: "Music",
            date: "2025-05-25",
            price: 25,
            description: "Jazz evening",
          },
          {
            id: 4,
            title: "Milwaukee Food Festival",
            region: "Downtown",
            genre: "Food",
            date: "2025-06-01",
            price: 65,
            description: "Food and wine",
          },
        ];

        setEvent(mockEvent);
        setRelatedEvents(mockRelated);
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
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
                    <span className="text-lg">{event.region}, Milwaukee</span>
                  </div>
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
                <Button size="lg" className="w-full gap-2">
                  <Users className="w-5 h-5" />
                  Attend
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
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleShare}
                  className="w-full gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>
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
