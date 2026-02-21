import React, { useEffect } from 'react';
import { useLorebookStore } from '@/store/useLorebookStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, User, Globe } from 'lucide-react';

export function CardList({ onSelectCard }: { onSelectCard: (id: string) => void }) {
  const { cards, loadCards, isLoading } = useLorebookStore();

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h3 className="text-sm font-semibold">Cards ({cards.length})</h3>
         <Button size="sm" variant="outline" className="gap-2" onClick={() => onSelectCard('new')}>
           <Plus className="size-4" /> New
         </Button>
      </div>
      
      {isLoading ? (
        <div className="text-sm text-muted-foreground animate-pulse p-4">Loading lorebook...</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {cards.map(card => (
            <Card 
              key={card.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelectCard(card.id)}
            >
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  {card.type === 'character' ? <User className="size-4 text-primary" /> : <Globe className="size-4 text-green-500" />}
                  <CardTitle className="text-sm">{card.name || 'Unnamed'}</CardTitle>
                </div>
                <CardDescription className="text-xs truncate">{card.coreData.description || 'No description'}</CardDescription>
              </CardHeader>
            </Card>
          ))}
          {cards.length === 0 && (
            <div className="text-center p-8 text-xs text-muted-foreground border border-dashed rounded bg-card/10">
              No entries yet. Create one or extract from text.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
