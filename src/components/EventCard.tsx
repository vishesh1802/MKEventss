import { Calendar, MapPin, DollarSign, Heart, CheckCircle2, Clock } from "lucide-react";
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
  const { toggleSaveEvent, toggleAttendingEvent, isEventSaved, isEventAttending } = useSavedEvents();
  const isSaved = isEventSaved(id);
  const isAttending = isEventAttending(id);
  
  // Check if event is in the past
  const isPastEvent = () => {
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) return false;
    eventDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Compare dates as strings to avoid timezone issues
    const eventDateStr = eventDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    return eventDateStr < todayStr;
  };
  
  const isPast = isPastEvent();
  
  const formatDate = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`event-card group ${isPast ? 'opacity-75' : ''}`}>
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
        
        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          {/* Save Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleSaveEvent({ id, title, region, genre, date, price });
            }}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-smooth hover:scale-110 active:scale-95"
            title={isSaved ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className={`w-5 h-5 transition-smooth ${
                isSaved ? "fill-secondary text-secondary" : "text-foreground"
              }`}
            />
          </button>
          
          {/* Attend Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              if (!isPast) {
                toggleAttendingEvent({ id, title, region, genre, date, price });
              }
            }}
            disabled={isPast}
            className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-smooth ${
              isPast 
                ? "bg-white/50 text-muted-foreground cursor-not-allowed" 
                : isAttending 
                ? "bg-primary/90 text-white hover:scale-110 active:scale-95" 
                : "bg-white/90 text-foreground hover:scale-110 active:scale-95"
            }`}
            title={isPast ? "Event has ended" : isAttending ? "Remove from attending" : "Mark as attending"}
          >
            <CheckCircle2 
              className={`w-5 h-5 transition-smooth ${
                isAttending ? "fill-white text-white" : ""
              }`}
            />
          </button>
        </div>

        {/* Genre Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-white/90 backdrop-blur-sm text-foreground">
            {genre}
          </Badge>
        </div>
        
        {/* Past Event Badge */}
        {isPast && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-destructive/90 text-white backdrop-blur-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Past Event
            </Badge>
          </div>
        )}
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
          <div className={`flex items-center gap-2 text-sm ${isPast ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
            <Calendar className={`w-4 h-4 ${isPast ? 'text-muted-foreground/50' : 'text-primary'}`} />
            {formatDate(date)}
            {isPast && <span className="text-xs text-destructive ml-1">(Ended)</span>}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <DollarSign className="w-4 h-4 text-secondary" />
            {price === 0 ? "Free" : `$${price}`}
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={`/events/${id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
          <Button
            onClick={(e) => {
              e.preventDefault();
              if (!isPast) {
                toggleAttendingEvent({ id, title, region, genre, date, price });
              }
            }}
            disabled={isPast}
            className={`flex-1 ${
              isPast 
                ? "bg-muted text-muted-foreground cursor-not-allowed" 
                : isAttending 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-secondary hover:bg-secondary/90"
            }`}
          >
            {isPast ? "Event Ended" : isAttending ? "Attending ✓" : "Attend"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
