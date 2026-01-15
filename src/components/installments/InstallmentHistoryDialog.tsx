import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, CheckCircle2, Clock, Calendar, Download } from "lucide-react";
import { format, addMonths } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface InstallmentHistoryDialogProps {
  installment: {
    id: string;
    name: string;
    start_date: string;
    total_months: number;
    paid_months: number;
    monthly_amount: number;
    total_amount: number;
    currency: string;
    category: string;
    is_active: boolean;
  };
}

export function InstallmentHistoryDialog({ installment }: InstallmentHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { formatDate, getLocale } = useDateFormat();
  const { formatCurrency } = useCurrencyFormat();

  const startDate = new Date(installment.start_date);
  
  // Generate payment schedule
  const paymentSchedule = Array.from({ length: installment.total_months }, (_, index) => {
    const paymentDate = addMonths(startDate, index);
    const isPaid = index < installment.paid_months;
    const isCurrent = index === installment.paid_months && installment.is_active;
    
    return {
      month: index + 1,
      date: paymentDate,
      amount: installment.monthly_amount,
      isPaid,
      isCurrent,
    };
  });

  const totalPaid = installment.paid_months * installment.monthly_amount;
  const totalRemaining = (installment.total_months - installment.paid_months) * installment.monthly_amount;

  // Transliterate Turkish characters for PDF compatibility
  const transliterateTurkish = (text: string): string => {
    if (!text) return text;
    const turkishMap: Record<string, string> = {
      'ğ': 'g', 'Ğ': 'G',
      'ü': 'u', 'Ü': 'U',
      'ş': 's', 'Ş': 'S',
      'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O',
      'ç': 'c', 'Ç': 'C',
    };
    return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (char) => turkishMap[char] || char);
  };

  const formatCurrencyForPDF = (value: number): string => {
    const formatted = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    return `${formatted} ${installment.currency}`;
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      const tr = transliterateTurkish;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(tr(t('installments.paymentHistory')), pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Installment name
      doc.setFontSize(14);
      doc.text(tr(installment.name), pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(tr(t('common.summary') || 'Ozet'), 14, yPos);
      yPos += 8;

      const summaryData = [
        [tr(t('installments.total')), formatCurrencyForPDF(installment.total_amount)],
        [tr(t('widgets.monthlyPayment')), formatCurrencyForPDF(installment.monthly_amount)],
        [tr(t('installments.totalPaid')), formatCurrencyForPDF(totalPaid)],
        [tr(t('installments.totalRemaining')), formatCurrencyForPDF(totalRemaining)],
        [tr(t('installments.paidMonths')), `${installment.paid_months}/${installment.total_months}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', cellWidth: 50 }
        },
        margin: { left: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Payment Schedule
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(tr(t('installments.paymentSchedule')), 14, yPos);
      yPos += 5;

      const scheduleHeaders = [
        tr(t('installments.installmentNumber', { number: '' }).replace('#', '').trim() || 'No'),
        tr(t('common.date') || 'Tarih'),
        tr(t('common.amount') || 'Tutar'),
        tr(t('common.status') || 'Durum')
      ];

      const scheduleBody = paymentSchedule.map((payment) => [
        `${payment.month}`,
        format(payment.date, "MM/yyyy"),
        formatCurrencyForPDF(payment.amount),
        payment.isPaid 
          ? tr(t('installments.paid')) 
          : payment.isCurrent 
            ? tr(t('installments.current'))
            : tr(t('installments.pending'))
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [scheduleHeaders],
        body: scheduleBody,
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'center', cellWidth: 40 },
          2: { halign: 'right', cellWidth: 50 },
          3: { halign: 'center', cellWidth: 40 }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const status = data.cell.raw as string;
            if (status === tr(t('installments.paid'))) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === tr(t('installments.current'))) {
              data.cell.styles.textColor = [37, 99, 235];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${tr(t('reports.reportGenerated') || 'Olusturulma')}: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      const fileName = `${tr(installment.name).replace(/\s+/g, '-')}-${t('installments.paymentHistory').replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success(t('reports.pdfExported') || 'PDF olarak indirildi');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('reports.exportError') || 'PDF oluşturulamadı');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('installments.paymentHistory')}
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Installment Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <h3 className="font-semibold text-lg">{installment.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t('installments.total')}</p>
                <p className="font-medium">{formatCurrency(installment.total_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('widgets.monthlyPayment')}</p>
                <p className="font-medium">{formatCurrency(installment.monthly_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('installments.totalPaid')}</p>
                <p className="font-medium text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('installments.totalRemaining')}</p>
                <p className="font-medium text-orange-600">{formatCurrency(totalRemaining)}</p>
              </div>
            </div>
          </div>

          {/* Payment Timeline */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('installments.paymentSchedule')}
            </h4>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {paymentSchedule.map((payment) => (
                  <div
                    key={payment.month}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                      payment.isPaid 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
                        : payment.isCurrent 
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                          : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        payment.isPaid 
                          ? 'bg-green-100 dark:bg-green-900/50' 
                          : payment.isCurrent
                            ? 'bg-blue-100 dark:bg-blue-900/50'
                            : 'bg-muted'
                      }`}>
                        {payment.isPaid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Clock className={`h-4 w-4 ${payment.isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {t('installments.installmentNumber', { number: payment.month })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(payment.date, "MMMM yyyy", { locale: getLocale() })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <Badge 
                        variant={payment.isPaid ? "default" : payment.isCurrent ? "secondary" : "outline"}
                        className={payment.isPaid ? "bg-green-600" : ""}
                      >
                        {payment.isPaid 
                          ? t('installments.paid') 
                          : payment.isCurrent 
                            ? t('installments.current')
                            : t('installments.pending')
                        }
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
