import { Filter } from "lucide-react";
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

interface FilterBarProps {
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
}

const REGIONS = ["All", "Downtown", "East Side", "Bay View", "Walker's Point", "Third Ward"];
const GENRES = ["Art", "Comedy", "Family", "Food & Drink", "Music", "Sports", "Cultural", "Educational", "Business", "Technology"];

const FilterBar = ({
  selectedRegion,
  setSelectedRegion,
  selectedGenres,
  setSelectedGenres,
}: FilterBarProps) => {
  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(
      selectedGenres.includes(genre)
        ? selectedGenres.filter((g) => g !== genre)
        : [...selectedGenres, genre]
    );
  };

  const clearFilters = () => {
    setSelectedRegion("All");
    setSelectedGenres([]);
  };

  const hasActiveFilters = selectedRegion !== "All" || selectedGenres.length > 0;

  return (
    <div className="bg-card rounded-xl shadow-card p-6 sticky top-20">
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
