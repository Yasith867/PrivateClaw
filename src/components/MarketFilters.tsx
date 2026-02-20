import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const categories = [
  { value: 'all',        label: 'All Assets' },
  { value: 'crypto',     label: 'Crypto' },
  { value: 'finance',    label: 'Finance' },
  { value: 'technology', label: 'Technology' },
  { value: 'other',      label: 'Other' },
];

const statuses = [
  { value: 'all',    label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Halted' },
];

const sortOptions = [
  { value: 'volume',      label: 'Highest Volume' },
  { value: 'newest',      label: 'Newest Pairs' },
  { value: 'ending_soon', label: 'Tightest Spread' },
];

// MarketFilters — adapted labels for trading pairs
export function MarketFilters() {
  const { filters, setFilters } = useAppStore();
  const hasActive = filters.category !== 'all' || filters.status !== 'all' || filters.searchQuery;

  const clear = () => setFilters({ category: 'all', status: 'all', searchQuery: '', sortBy: 'volume' });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pairs… (ALEO, BTC, ETH)"
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="pl-10 bg-muted/50 border-border/50 text-sm"
          />
        </div>
        <Select value={filters.sortBy} onValueChange={(v: any) => setFilters({ sortBy: v })}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50 border-border/50 text-sm">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.category} onValueChange={(v: any) => setFilters({ category: v })}>
          <SelectTrigger className="w-auto h-8 text-xs bg-muted/50 border-border/50">
            <SelectValue placeholder="Asset class" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v: any) => setFilters({ status: v })}>
          <SelectTrigger className="w-auto h-8 text-xs bg-muted/50 border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasActive && (
          <>
            <Button variant="ghost" size="sm" onClick={clear} className="h-8 gap-1 text-muted-foreground text-xs">
              <X className="h-3 w-3" />Clear
            </Button>
            <Badge variant="secondary" className="h-6 text-xs">
              {[filters.category !== 'all', filters.status !== 'all', !!filters.searchQuery].filter(Boolean).length} active
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}
