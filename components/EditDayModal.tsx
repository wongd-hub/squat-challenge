'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Coffee, Save, X } from 'lucide-react';
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
  const [squats, setSquats] = useState(currentSquats);
  const [isSaving, setIsSaving] = useState(false);

  // Update squats when modal opens with new data
  useEffect(() => {
    setSquats(currentSquats);
  }, [currentSquats, selectedDate]);

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

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(selectedDate, squats);
      onClose();
    } catch (error) {
      console.error('Error saving day:', error);
      // Handle error (could show toast notification)
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSquats(currentSquats); // Reset to original value
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-strong max-w-md mx-auto">
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
            </div>
          ) : (
            <div className="space-y-4">
                             <SquatDial
                 currentSquats={squats}
                 targetSquats={target}
                 onSquatsChange={setSquats}
                 currentDay={challengeDay}
                 compact={true}
               />
              
              {/* Progress indicator */}
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  {squats} of {target} squats ({Math.round((squats / target) * 100)}%)
                </div>
                {squats >= target && (
                  <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    🎉 Target Achieved!
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          {!isRestDay && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 