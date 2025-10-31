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

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call to /api/events
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
          {
            id: 5,
            title: "Walker's Point Comedy Show",
            region: "Walker's Point",
            genre: "Comedy",
            date: "2025-05-18",
            price: 20,
          },
          {
            id: 6,
            title: "East Side Theater Performance",
            region: "East Side",
            genre: "Theater",
            date: "2025-06-10",
            price: 35,
          },
          {
            id: 7,
            title: "Summerfest Preview",
            region: "Downtown",
            genre: "Festival",
            date: "2025-06-20",
            price: 25,
          },
          {
            id: 8,
            title: "Gallery Night & Day",
            region: "Third Ward",
            genre: "Art",
            date: "2025-05-15",
            price: 0,
          },
        ];

        // Apply filters
        let filtered = mockEvents;

        if (searchQuery) {
          filtered = filtered.filter(event =>
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.genre.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        if (selectedRegion !== "All") {
          filtered = filtered.filter(event => event.region === selectedRegion);
        }

        if (selectedGenres.length > 0) {
          filtered = filtered.filter(event => selectedGenres.includes(event.genre));
        }

        setEvents(filtered);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedRegion, selectedGenres, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Discover Events
          </h1>
          <p className="text-muted-foreground">
            {searchQuery ? `Search results for "${searchQuery}"` : "Explore all upcoming events in Milwaukee"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <FilterBar
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedGenres={selectedGenres}
              setSelectedGenres={setSelectedGenres}
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
