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
    // Simulate API call - replace with actual API endpoint
    const fetchEvents = async () => {
      try {
        // Mock data for demo
        const mockEvents: Event[] = [
          {
            id: 1,
            title: "Lakefront Music Festival",
            region: "Downtown",
            genre: "Music",
            date: "2025-06-15",
            price: 45,
          },
          {
            id: 2,
            title: "Third Ward Art Walk",
            region: "Third Ward",
            genre: "Art",
            date: "2025-05-20",
            price: 0,
          },
          {
            id: 3,
            title: "Bay View Jazz Night",
            region: "Bay View",
            genre: "Music",
            date: "2025-05-25",
            price: 25,
          },
          {
            id: 4,
            title: "Milwaukee Food & Wine Festival",
            region: "Downtown",
            genre: "Food",
            date: "2025-06-01",
            price: 65,
          },
        ];
        
        setFeaturedEvents(mockEvents.slice(0, 4));
        setTrendingEvents(mockEvents.slice(0, 3));
      } catch (error) {
        console.error("Error fetching events:", error);
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
