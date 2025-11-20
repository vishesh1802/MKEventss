import { Filter, Calendar, DollarSign } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface FilterBarProps {
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  dateRange?: { start: string; end: string };
  setDateRange?: (range: { start: string; end: string } | undefined) => void;
  priceRange?: { min: number; max: number };
  setPriceRange?: (range: { min: number; max: number } | undefined) => void;
}

const REGIONS = ["All", "Downtown", "East Side", "Walker's Point", "Third Ward"];
const GENRES = ["Art", "Comedy", "Family", "Food & Drink", "Music", "Sports", "Cultural", "Educational", "Business", "Technology"];

const FilterBar = ({
  selectedRegion,
  setSelectedRegion,
  selectedGenres,
  setSelectedGenres,
  dateRange,
  setDateRange,
  priceRange,
  setPriceRange,
}: FilterBarProps) => {
  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(
      selectedGenres.includes(genre)
        ? selectedGenres.filter((g) => g !== genre)
        : [...selectedGenres, genre]
    );
  };

  const handleQuickDateFilter = (preset: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);

    switch (preset) {
      case 'today':
        end = new Date(today);
        break;
      case 'thisWeek':
        end = new Date(today);
        end.setDate(end.getDate() + 7);
        break;
      case 'thisMonth':
        end = new Date(today);
        end.setMonth(end.getMonth() + 1);
        break;
      case 'nextMonth':
        start = new Date(today);
        start.setMonth(start.getMonth() + 1);
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        break;
      case 'clear':
        setDateRange?.(undefined);
        return;
    }

    setDateRange?.({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const handlePricePreset = (preset: string) => {
    switch (preset) {
      case 'free':
        setPriceRange?.({ min: 0, max: 0 });
        break;
      case 'under25':
        setPriceRange?.({ min: 0, max: 25 });
        break;
      case '25to50':
        setPriceRange?.({ min: 25, max: 50 });
        break;
      case '50to100':
        setPriceRange?.({ min: 50, max: 100 });
        break;
      case 'over100':
        setPriceRange?.({ min: 100, max: Infinity });
        break;
      case 'clear':
        setPriceRange?.(undefined);
        break;
    }
  };

  const clearFilters = () => {
    setSelectedRegion("All");
    setSelectedGenres([]);
    setDateRange?.(undefined);
    setPriceRange?.(undefined);
  };

  const hasActiveFilters = selectedRegion !== "All" || selectedGenres.length > 0 || dateRange || priceRange;

  return (
    <div className="bg-card rounded-xl shadow-card p-6 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Filters</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-secondary"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Region Filter */}
      <div className="mb-6">
        <Label className="mb-2 block text-sm font-medium">Region</Label>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger>
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {REGIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter */}
      {setDateRange && (
        <div className="mb-6">
          <Label className="mb-2 block text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Range
          </Label>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2">
              <Button
                variant={dateRange ? "outline" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleQuickDateFilter('today')}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleQuickDateFilter('thisWeek')}
              >
                This Week
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleQuickDateFilter('thisMonth')}
              >
                This Month
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => handleQuickDateFilter('clear')}
            >
              Clear Date
            </Button>
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={dateRange?.start || ''}
                onChange={(e) => setDateRange({ start: e.target.value, end: dateRange?.end || e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={dateRange?.end || ''}
                onChange={(e) => setDateRange({ start: dateRange?.start || e.target.value, end: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      {setPriceRange && (
        <div className="mb-6">
          <Label className="mb-2 block text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Price Range
          </Label>
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={priceRange?.min === 0 && priceRange?.max === 0 ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handlePricePreset('free')}
              >
                Free
              </Button>
              <Button
                variant={priceRange?.min === 0 && priceRange?.max === 25 ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handlePricePreset('under25')}
              >
                Under $25
              </Button>
              <Button
                variant={priceRange?.min === 25 && priceRange?.max === 50 ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handlePricePreset('25to50')}
              >
                $25-$50
              </Button>
              <Button
                variant={priceRange?.min === 50 && priceRange?.max === 100 ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handlePricePreset('50to100')}
              >
                $50-$100
              </Button>
            </div>
            <Button
              variant={priceRange?.min === 100 && priceRange?.max === Infinity ? "default" : "outline"}
              size="sm"
              className="w-full text-xs"
              onClick={() => handlePricePreset('over100')}
            >
              $100+
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => handlePricePreset('clear')}
            >
              Clear Price
            </Button>
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Min Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={priceRange?.min !== undefined && priceRange.min !== Infinity ? priceRange.min : ''}
                onChange={(e) => {
                  const min = e.target.value ? parseFloat(e.target.value) : 0;
                  setPriceRange({
                    min,
                    max: priceRange?.max !== undefined && priceRange.max !== Infinity ? priceRange.max : 1000
                  });
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Max Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="1000"
                value={priceRange?.max !== undefined && priceRange.max !== Infinity ? priceRange.max : ''}
                onChange={(e) => {
                  const max = e.target.value ? parseFloat(e.target.value) : Infinity;
                  setPriceRange({
                    min: priceRange?.min !== undefined ? priceRange.min : 0,
                    max
                  });
                }}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Genre Filter */}
      <div>
        <Label className="mb-3 block text-sm font-medium">Genres</Label>
        <div className="space-y-3">
          {GENRES.map((genre) => (
            <div key={genre} className="flex items-center space-x-2">
              <Checkbox
                id={genre}
                checked={selectedGenres.includes(genre)}
                onCheckedChange={() => handleGenreToggle(genre)}
              />
              <label
                htmlFor={genre}
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-smooth"
              >
                {genre}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
