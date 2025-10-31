import { Calendar, MapPin, DollarSign, Heart } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Link } from "react-router-dom";
import { useSavedEvents } from "@/contexts/SavedEventsContext";

interface EventCardProps {
  id: number;
  title: string;
  region: string;
  genre: string;
  date: string;
  price: number;
  image?: string;
}

const EventCard = ({ id, title, region, genre, date, price, image }: EventCardProps) => {
  const { toggleSaveEvent, isEventSaved } = useSavedEvents();
  const isSaved = isEventSaved(id);
  
  const formatDate = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="event-card group">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-smooth group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full gradient-hero flex items-center justify-center">
            <Calendar className="w-12 h-12 text-white/30" />
          </div>
        )}
        
        {/* Save Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleSaveEvent({ id, title, region, genre, date, price });
          }}
          className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-smooth hover:scale-110 active:scale-95"
        >
          <Heart 
            className={`w-5 h-5 transition-smooth ${
              isSaved ? "fill-secondary text-secondary" : "text-foreground"
            }`}
          />
        </button>

        {/* Genre Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-white/90 backdrop-blur-sm text-foreground">
            {genre}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2">
          {title}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            {region}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            {formatDate(date)}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <DollarSign className="w-4 h-4 text-secondary" />
            {price === 0 ? "Free" : `$${price}`}
          </div>
        </div>

        <Link to={`/events/${id}`}>
          <Button className="w-full">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
