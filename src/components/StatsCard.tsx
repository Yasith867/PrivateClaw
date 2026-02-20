import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
}

export function StatsCard({ title, value, subtitle, icon: Icon }: StatsCardProps) {
  return (
    <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </Card>
  );
}
