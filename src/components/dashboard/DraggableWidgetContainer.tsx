import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Unlock, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WidgetConfig {
  id: string;
  component: React.ReactNode;
  colSpan?: 1 | 2;
}

interface DraggableWidgetContainerProps {
  widgets: WidgetConfig[];
  storageKey: string;
}

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  colSpan?: 1 | 2;
  isEditMode: boolean;
}

function SortableWidget({ id, children, colSpan = 1, isEditMode }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        colSpan === 2 ? "lg:col-span-2" : "lg:col-span-1",
        isDragging && "opacity-50 z-50"
      )}
    >
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-2 -left-2 z-10 p-1.5 rounded-lg bg-primary text-primary-foreground cursor-grab active:cursor-grabbing shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className={cn(
        "h-full transition-all duration-200",
        isEditMode && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background rounded-lg"
      )}>
        {children}
      </div>
    </div>
  );
}

export function DraggableWidgetContainer({ widgets, storageKey }: DraggableWidgetContainerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [orderedWidgetIds, setOrderedWidgetIds] = useState<string[]>(() => {
    // Initially load from localStorage as fallback
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return widgets.map(w => w.id);
      }
    }
    return widgets.map(w => w.id);
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load preferences from Supabase
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preference_value')
          .eq('user_id', user.id)
          .eq('preference_key', storageKey)
          .maybeSingle();

        if (error) {
          console.error('Error loading widget preferences:', error);
          return;
        }

        if (data?.preference_value) {
          const cloudOrder = data.preference_value as string[];
          if (Array.isArray(cloudOrder) && cloudOrder.length > 0) {
            setOrderedWidgetIds(cloudOrder);
            setIsSynced(true);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, [user, storageKey]);

  // Sync with widget changes
  useEffect(() => {
    const widgetIds = widgets.map(w => w.id);
    const newWidgets = widgetIds.filter(id => !orderedWidgetIds.includes(id));
    const validIds = orderedWidgetIds.filter(id => widgetIds.includes(id));
    
    if (newWidgets.length > 0 || validIds.length !== orderedWidgetIds.length) {
      setOrderedWidgetIds([...validIds, ...newWidgets]);
    }
  }, [widgets]);

  // Save preferences to Supabase and localStorage
  const savePreferences = useCallback(async (order: string[]) => {
    // Always save to localStorage as fallback
    localStorage.setItem(storageKey, JSON.stringify(order));

    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preference_key: storageKey,
          preference_value: order,
        }, {
          onConflict: 'user_id,preference_key',
        });

      if (error) {
        console.error('Error saving widget preferences:', error);
        setIsSynced(false);
      } else {
        setIsSynced(true);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setIsSynced(false);
    }
  }, [user, storageKey]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setOrderedWidgetIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        savePreferences(newOrder);
        return newOrder;
      });
    }
  };

  const orderedWidgets = orderedWidgetIds
    .map(id => widgets.find(w => w.id === id))
    .filter((w): w is WidgetConfig => w !== undefined);

  const activeWidget = activeId ? widgets.find(w => w.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {user && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isSynced ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden sm:inline">{t('common.synced')}</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">{t('common.notSynced')}</span>
              </>
            )}
          </div>
        )}
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className="gap-2"
        >
          {isEditMode ? (
            <>
              <Lock className="h-4 w-4" />
              {t('dashboard.lockWidgets')}
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              {t('dashboard.editWidgets')}
            </>
          )}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedWidgetIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-8">
            {orderedWidgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                id={widget.id}
                colSpan={widget.colSpan}
                isEditMode={isEditMode}
              >
                {widget.component}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget ? (
            <div className="opacity-80 scale-105 shadow-2xl rounded-lg">
              {activeWidget.component}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
