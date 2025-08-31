
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { GripVertical } from 'lucide-react';
import { ColumnDef } from './detailed-sales-history-table';

interface OrderManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  order: string[];
  onOrderChange: (newOrder: string[]) => void;
}

// Fix for react-beautiful-dnd in React 18 Strict Mode
const StrictDroppable = ({ children, ...props }: React.ComponentProps<typeof Droppable>) => {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) {
    return null;
  }
  return <Droppable {...props}>{children}</Droppable>;
};


export function OrderManagerDialog({ isOpen, onClose, columns, order, onOrderChange }: OrderManagerDialogProps) {
    
  const orderedColumns = React.useMemo(() => {
    const columnMap = new Map(columns.map(c => [c.id, c]));
    const currentOrder = order.length > 0 ? order : columns.map(c => c.id);
    
    const ordered = currentOrder
        .map(id => columnMap.get(id))
        .filter(Boolean) as ColumnDef[];
        
    const missing = columns.filter(c => !currentOrder.includes(c.id));
    
    return [...ordered, ...missing];

  }, [columns, order]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(orderedColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onOrderChange(items.map(item => item.id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Organizar Colunas</DialogTitle>
          <DialogDescription>
            Arraste e solte as colunas para reordená-las. As alterações serão salvas automaticamente quando você fechar esta janela.
          </DialogDescription>
        </DialogHeader>
        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictDroppable droppableId="columns-organizer">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 max-h-[60vh] overflow-y-auto p-2 border rounded-md">
                {orderedColumns.map((col, index) => (
                  <Draggable key={col.id} draggableId={col.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center p-2 rounded-md bg-muted/50 border"
                      >
                        <GripVertical className="mr-2 h-5 w-5 text-muted-foreground" />
                        <span>{col.label}</span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </StrictDroppable>
        </DragDropContext>
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    