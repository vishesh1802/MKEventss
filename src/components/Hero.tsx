import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import milwaukeeHeroImage from "@/assets/milwaukee-hero.jpg";

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/discover?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative text-white py-20 md:py-32 overflow-hidden min-h-[600px] md:min-h-[700px]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          key="milwaukee-hero"
          src={milwaukeeHeroImage}
          alt="Milwaukee skyline with Art Museum"
          className="w-full h-full object-cover object-center"
          style={{
            minHeight: '100%',
            minWidth: '100%',
            objectPosition: 'center center'
          }}
          loading="eager"
          onError={(e) => {
            // Fallback to gradient if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.className = 'absolute inset-0 z-0 gradient-hero';
            }
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-10 z-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Discover Milwaukee's
            <span className="block mt-2">Best Events</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            From lakefront concerts to local art shows, find the perfect way to experience MKE
          </p>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto animate-fade-in" 
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <Input
                  type="text"
                  placeholder="Search events, venues, or artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-white/5 border-white/20 text-white placeholder:text-white/60 h-14 rounded-xl focus:bg-white/10 transition-smooth"
                />
              </div>
              <Button 
                type="submit"
                size="lg"
                className="bg-secondary hover:bg-secondary-hover text-white px-8 h-14 rounded-xl"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Quick Filters */}
          <div className="flex flex-wrap justify-center gap-3 mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {["This Weekend", "Free Events", "Music", "Food & Drink"].map((filter) => (
              <button
                key={filter}
                className="px-5 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium hover:bg-white/20 transition-smooth"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
