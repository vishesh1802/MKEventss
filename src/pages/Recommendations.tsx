import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
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

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call to /api/recommendations?userId=1
        const mockRegionEvents: Event[] = [
          {
            id: 1,
            title: "Downtown Summer Concert Series",
            region: "Downtown",
            genre: "Music",
            date: "2025-06-15",
            price: 0,
            relevanceScore: 0.95,
          },
          {
            id: 2,
            title: "Lakefront Fireworks Show",
            region: "Downtown",
            genre: "Festival",
            date: "2025-07-04",
            price: 0,
            relevanceScore: 0.92,
          },
          {
            id: 3,
            title: "City Market at the Square",
            region: "Downtown",
            genre: "Food",
            date: "2025-05-28",
            price: 0,
            relevanceScore: 0.88,
          },
        ];

        const mockInterestEvents: Event[] = [
          {
            id: 4,
            title: "Jazz & Blues Night",
            region: "Bay View",
            genre: "Music",
            date: "2025-06-08",
            price: 30,
            relevanceScore: 0.93,
          },
          {
            id: 5,
            title: "Indie Rock Showcase",
            region: "East Side",
            genre: "Music",
            date: "2025-05-22",
            price: 15,
            relevanceScore: 0.91,
          },
          {
            id: 6,
            title: "Electronic Music Festival",
            region: "Walker's Point",
            genre: "Music",
            date: "2025-06-30",
            price: 40,
            relevanceScore: 0.89,
          },
          {
            id: 7,
            title: "Classical Symphony Night",
            region: "Downtown",
            genre: "Music",
            date: "2025-06-12",
            price: 50,
            relevanceScore: 0.85,
          },
        ];

        setRegionEvents(mockRegionEvents);
        setInterestEvents(mockInterestEvents);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

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
                Events happening in Downtown
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {regionEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          )}
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              {interestEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Recommendations;
