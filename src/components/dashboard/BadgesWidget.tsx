import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { 
  Trophy, Award, Flame, Brain, PiggyBank, ShieldCheck, 
  TrendingUp, CheckCircle, Footprints, Lock 
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useAchievementSound } from "@/hooks/useAchievementSound";

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserBadge {
  badge_id: string;
  earned_at: string | null;
  progress: number;
}

const iconMap: Record<string, React.ElementType> = {
  'footprints': Footprints,
  'piggy-bank': PiggyBank,
  'shield-check': ShieldCheck,
  'trending-up': TrendingUp,
  'trophy': Trophy,
  'check-circle': CheckCircle,
  'brain': Brain,
  'flame': Flame,
};

// Confetti celebration function
const celebrateWithConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // Confetti from left
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
    });
    
    // Confetti from right
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
    });
  }, 250);
};

export function BadgesWidget() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { playAchievementSound } = useAchievementSound();
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const awardBadge = useCallback(async (badgeId: string, progress: number, badgesList: BadgeDefinition[], currentUserBadges: UserBadge[]) => {
    if (!user) return;

    const existingBadge = currentUserBadges.find(b => b.badge_id === badgeId);
    
    if (existingBadge?.earned_at) return; // Already earned

    try {
      const badgeDef = badgesList.find(b => b.id === badgeId);
      const isComplete = progress >= (badgeDef?.requirement_value || 1);

      const { error } = await supabase
        .from('user_badges')
        .upsert({
          user_id: user.id,
          badge_id: badgeId,
          progress,
          earned_at: isComplete ? new Date().toISOString() : null
        }, { onConflict: 'user_id,badge_id' });

      if (error) throw error;

      if (isComplete && !existingBadge?.earned_at) {
        // Celebrate with confetti and sound!
        celebrateWithConfetti();
        playAchievementSound();
        
        // Convert snake_case to camelCase for translation key
        const translationKey = badgeId.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        toast.success(t('badges.unlocked'), {
          description: t(`badges.${translationKey}` as any) || badgeDef?.name,
          duration: 5000,
        });
      }

      // Refresh badges
      const { data: updatedBadges } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at, progress')
        .eq('user_id', user.id);
      
      setUserBadges(updatedBadges || []);
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  }, [user, t]);

  const checkAndAwardBadges = useCallback(async (badgesList: BadgeDefinition[], currentUserBadges: UserBadge[]) => {
    if (!user) return;

    try {
      // Check transaction count for first_transaction badge
      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (transactionCount && transactionCount >= 1) {
        await awardBadge('first_transaction', transactionCount, badgesList, currentUserBadges);
      }

      // Check savings goals for savings_starter badge
      const { count: goalCount } = await supabase
        .from('savings_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (goalCount && goalCount >= 1) {
        await awardBadge('savings_starter', goalCount, badgesList, currentUserBadges);
      }

      // Check completed goals for goal_achiever badge
      const { count: completedGoals } = await supabase
        .from('savings_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_completed', true);

      if (completedGoals && completedGoals >= 1) {
        await awardBadge('goal_achiever', completedGoals, badgesList, currentUserBadges);
      }

      // Check for debt_free badge (all cards have 0 balance)
      const { data: cards } = await supabase
        .from('credit_cards')
        .select('balance')
        .eq('user_id', user.id);

      if (cards && cards.length > 0) {
        const totalDebt = cards.reduce((sum, card) => sum + (card.balance || 0), 0);
        if (totalDebt === 0) {
          await awardBadge('debt_free', 1, badgesList, currentUserBadges);
        }
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  }, [user, awardBadge]);

  const fetchBadges = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch badge definitions
      const { data: badgeDefs, error: badgeError } = await supabase
        .from('badge_definitions')
        .select('*');

      if (badgeError) throw badgeError;
      setBadges(badgeDefs || []);

      // Fetch user badges
      const { data: userBadgeData, error: userBadgeError } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at, progress')
        .eq('user_id', user.id);

      if (userBadgeError) throw userBadgeError;
      setUserBadges(userBadgeData || []);

      // Check for new badges
      await checkAndAwardBadges(badgeDefs || [], userBadgeData || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  }, [user, checkAndAwardBadges]);

  useEffect(() => {
    if (user) {
      fetchBadges();
    }
  }, [user, fetchBadges]);

  const earnedBadges = badges.filter(b => 
    userBadges.find(ub => ub.badge_id === b.id && ub.earned_at)
  );

  const lockedBadges = badges.filter(b => 
    !userBadges.find(ub => ub.badge_id === b.id && ub.earned_at)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 w-12 bg-muted rounded-full"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-lg">{t('badges.title')}</CardTitle>
          </div>
          <Badge variant="secondary">
            {earnedBadges.length}/{badges.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('badges.earned')}</p>
            <div className="flex flex-wrap gap-3">
              {earnedBadges.map(badge => {
                const IconComponent = iconMap[badge.icon] || Trophy;
                // Convert snake_case to camelCase for translation key
                const translationKey = badge.id.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 
                      cursor-pointer transition-all duration-300 
                      hover:scale-105 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/15 hover:border-primary/40
                      group"
                    title={badge.description}
                  >
                    <div className="p-2.5 rounded-full bg-primary/20 transition-all duration-300 group-hover:bg-primary/30 group-hover:scale-110">
                      <IconComponent className="h-6 w-6 text-primary transition-transform duration-300 group-hover:rotate-12" />
                    </div>
                    <span className="text-sm font-medium transition-colors duration-300 group-hover:text-primary">
                      {t(`badges.${translationKey}` as any) || badge.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('badges.locked')}</p>
            <div className="flex flex-wrap gap-3">
              {lockedBadges.slice(0, 4).map(badge => {
                const IconComponent = iconMap[badge.icon] || Trophy;
                const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
                const progress = userBadge?.progress || 0;
                const progressPercent = Math.min(100, (progress / badge.requirement_value) * 100);
                // Convert snake_case to camelCase for translation key
                const translationKey = badge.id.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-muted
                      cursor-pointer transition-all duration-300
                      hover:scale-105 hover:shadow-md hover:bg-muted/70 hover:border-muted-foreground/20
                      group"
                    title={badge.description}
                  >
                    <div className="p-2.5 rounded-full bg-muted relative transition-all duration-300 group-hover:bg-muted-foreground/10">
                      <IconComponent className="h-6 w-6 text-muted-foreground transition-all duration-300 group-hover:text-foreground/60" />
                      <Lock className="h-3 w-3 absolute -bottom-0.5 -right-0.5 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground/70">
                        {t(`badges.${translationKey}` as any) || badge.name}
                      </span>
                      {progressPercent > 0 && (
                        <Progress value={progressPercent} className="h-1 w-20 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {earnedBadges.length === 0 && lockedBadges.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('badges.locked')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
