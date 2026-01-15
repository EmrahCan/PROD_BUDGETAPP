import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const usePaymentCelebration = () => {
  const { t } = useTranslation();

  const celebrate = (paymentName: string, amount?: number, currency?: string) => {
    // Fire confetti from the center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
    });

    // Fire confetti from the sides
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#10b981', '#34d399'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#10b981', '#34d399'],
      });
    }, 150);

    // Show enhanced toast
    const amountText = amount && currency 
      ? ` (${amount.toLocaleString('tr-TR')} ${currency})` 
      : '';
    
    toast.success(
      `🎉 ${paymentName} ${t('common.paid', 'ödendi')}!`,
      {
        description: `${t('common.paymentCompleted', 'Ödeme başarıyla tamamlandı')}${amountText}`,
        duration: 4000,
      }
    );
  };

  const celebrateCardPayment = (cardName: string) => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#22c55e', '#10b981'],
    });

    toast.success(
      `💳 ${cardName} ${t('common.cleared', 'temizlendi')}!`,
      {
        description: t('common.cardDebtCleared', 'Kart borcu sıfırlandı'),
        duration: 4000,
      }
    );
  };

  const celebrateInstallment = (name: string, paidMonths: number, totalMonths: number) => {
    const isCompleted = paidMonths + 1 >= totalMonths;
    
    if (isCompleted) {
      // Big celebration for completing all installments
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22c55e', '#fbbf24', '#f59e0b'],
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#22c55e', '#fbbf24', '#f59e0b'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      toast.success(
        `🏆 ${name} tamamlandı!`,
        {
          description: t('installments.allInstallmentsCompleted', 'Tüm taksitler ödendi!'),
          duration: 5000,
        }
      );
    } else {
      // Regular celebration for single installment
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.65 },
        colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#22c55e'],
      });

      toast.success(
        `✨ ${name} taksit ödendi`,
        {
          description: `${paidMonths + 1}/${totalMonths} ${t('installments.installmentsPaid', 'taksit ödendi')}`,
          duration: 3000,
        }
      );
    }
  };

  return { celebrate, celebrateCardPayment, celebrateInstallment };
};
