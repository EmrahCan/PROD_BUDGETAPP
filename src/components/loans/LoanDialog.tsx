import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { TURKISH_BANKS } from "@/types/bank";

interface Loan {
  id: string;
  name: string;
  loan_type: 'housing' | 'vehicle' | 'personal' | 'education';
  bank_id: string | null;
  bank_name: string | null;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number | null;
  start_date: string;
  end_date: string | null;
  payment_day: number;
  total_months: number;
  paid_months: number;
  currency: string;
  account_id: string | null;
  card_id: string | null;
  is_active: boolean;
}

interface LoanDialogProps {
  loan?: Loan;
  onSuccess: () => void;
  onClose?: () => void;
}

const LOAN_TYPES = [
  { value: 'housing', labelTr: 'Konut Kredisi', labelEn: 'Housing Loan' },
  { value: 'vehicle', labelTr: 'Araç Kredisi', labelEn: 'Vehicle Loan' },
  { value: 'personal', labelTr: 'İhtiyaç Kredisi', labelEn: 'Personal Loan' },
  { value: 'education', labelTr: 'Eğitim Kredisi', labelEn: 'Education Loan' },
];

export function LoanDialog({ loan, onSuccess, onClose }: LoanDialogProps) {
  const [open, setOpen] = useState(!!loan);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(loan?.name || '');
  const [loanType, setLoanType] = useState<string>(loan?.loan_type || 'personal');
  const [bankId, setBankId] = useState(loan?.bank_id || '');
  const [totalAmount, setTotalAmount] = useState(loan?.total_amount?.toString() || '');
  const [monthlyPayment, setMonthlyPayment] = useState(loan?.monthly_payment?.toString() || '');
  const [interestRate, setInterestRate] = useState(loan?.interest_rate?.toString() || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    loan?.start_date ? new Date(loan.start_date) : new Date()
  );
  const [totalMonths, setTotalMonths] = useState(loan?.total_months?.toString() || '');
  const [paidMonths, setPaidMonths] = useState(loan?.paid_months?.toString() || '0');
  const [paymentDay, setPaymentDay] = useState(loan?.payment_day?.toString() || '1');
  const [currency, setCurrency] = useState(loan?.currency || 'TRY');
  
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  const dateLocale = i18n.language === 'tr' ? tr : enUS;

  useEffect(() => {
    if (loan) {
      setOpen(true);
    }
  }, [loan]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemoMode) {
      toast({ title: t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz" });
      return;
    }
    
    if (!user || !name || !totalAmount || !monthlyPayment || !totalMonths || !startDate) {
      toast({ title: t('loans.fillRequired'), variant: "destructive" });
      return;
    }

    setLoading(true);
    
    const total = parseFloat(totalAmount);
    const monthly = parseFloat(monthlyPayment);
    const months = parseInt(totalMonths);
    const paid = parseInt(paidMonths) || 0;
    const remaining = total - (paid * monthly);
    
    const bank = TURKISH_BANKS.find(b => b.id === bankId);

    const loanData = {
      user_id: user.id,
      name,
      loan_type: loanType,
      bank_id: bankId || null,
      bank_name: bank?.name || null,
      total_amount: total,
      remaining_amount: Math.max(0, remaining),
      monthly_payment: monthly,
      interest_rate: interestRate ? parseFloat(interestRate) : null,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: null,
      payment_day: parseInt(paymentDay),
      total_months: months,
      paid_months: paid,
      currency,
      is_active: paid < months,
    };

    let error;
    if (loan) {
      const { error: updateError } = await supabase
        .from('loans')
        .update(loanData)
        .eq('id', loan.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('loans')
        .insert(loanData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({ title: t('loans.saveError'), variant: "destructive" });
    } else {
      toast({ title: loan ? t('loans.updated') : t('loans.added') });
      handleClose();
      onSuccess();
      
      // Reset form
      if (!loan) {
        setName('');
        setTotalAmount('');
        setMonthlyPayment('');
        setInterestRate('');
        setTotalMonths('');
        setPaidMonths('0');
        setPaymentDay('1');
      }
    }
  };

  const dialogContent = (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{loan ? t('loans.edit') : t('loans.add')}</DialogTitle>
        <DialogDescription>{t('loans.dialogDescription')}</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">{t('loans.name')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('loans.namePlaceholder')}
            required
          />
        </div>
        
        {/* Loan Type */}
        <div className="space-y-2">
          <Label>{t('loans.type')}</Label>
          <Select value={loanType} onValueChange={setLoanType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOAN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {i18n.language === 'tr' ? type.labelTr : type.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Bank */}
        <div className="space-y-2">
          <Label>{t('loans.bank')}</Label>
          <Select value={bankId} onValueChange={setBankId}>
            <SelectTrigger>
              <SelectValue placeholder={t('loans.selectBank')} />
            </SelectTrigger>
            <SelectContent>
              {TURKISH_BANKS.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Total Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalAmount">{t('loans.totalAmount')}</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t('loans.currency')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">₺ TRY</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Monthly Payment & Interest */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyPayment">{t('loans.monthlyPayment')}</Label>
            <Input
              id="monthlyPayment"
              type="number"
              step="0.01"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interestRate">{t('loans.interestRate')}</Label>
            <Input
              id="interestRate"
              type="number"
              step="0.01"
              placeholder="%"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>
        </div>
        
        {/* Total Months & Paid Months */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalMonths">{t('loans.totalMonths')}</Label>
            <Input
              id="totalMonths"
              type="number"
              value={totalMonths}
              onChange={(e) => setTotalMonths(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paidMonths">{t('loans.paidMonths')}</Label>
            <Input
              id="paidMonths"
              type="number"
              value={paidMonths}
              onChange={(e) => setPaidMonths(e.target.value)}
            />
          </div>
        </div>
        
        {/* Start Date & Payment Day */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('loans.startDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP', { locale: dateLocale }) : t('loans.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDay">{t('loans.paymentDay')}</Label>
            <Select value={paymentDay} onValueChange={setPaymentDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loan ? t('common.save') : t('loans.add')}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (loan) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('loans.add')}
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}