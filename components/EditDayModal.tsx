'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Coffee, X } from 'lucide-react';
import { SquatDial } from './SquatDial';
import { getChallengeDay } from '@/lib/supabase';

interface EditDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  currentSquats: number;
  dailyTargets: any[];
  onSave: (date: string, squats: number) => Promise<void>;
}

export function EditDayModal({
  isOpen,
  onClose,
  selectedDate,
  currentSquats,
  dailyTargets,
  onSave
}: EditDayModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  if (!selectedDate) return null;

  const challengeDay = getChallengeDay(selectedDate);
  const target = dailyTargets.find((t) => t.day === challengeDay)?.target_squats || 50;
  const isRestDay = target === 0;
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleSquatsChange = async (newSquats: number) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(selectedDate, newSquats);
      onClose();
    } catch (error) {
      console.error('Error saving day:', error);
      // Handle error (could show toast notification)
    } finally {
      setIsSaving(false);
    }
  };



    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/30 dark:border-white/20 shadow-2xl max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Edit Day {challengeDay}
          </DialogTitle>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
            <div className="flex flex-wrap gap-2">
              {isToday && (
                <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                  Today
                </Badge>
              )}
              {isRestDay ? (
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  <Coffee className="w-3 h-3 mr-1" />
                  Rest Day
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Target: {target} squats
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {isRestDay ? (
            <div className="text-center space-y-4">
              <div className="text-6xl">🛌</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Rest Day</h3>
                <p className="text-sm text-muted-foreground">Take a well-deserved break!</p>
              </div>
              <Button
                variant="outline"
                onClick={onClose}
                className="mt-4"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          ) : (
            <SquatDial
              currentSquats={currentSquats}
              targetSquats={target}
              onSquatsChange={handleSquatsChange}
              currentDay={challengeDay}
              compact={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 