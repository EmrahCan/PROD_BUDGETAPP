import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstallmentDialog } from "@/components/installments/InstallmentDialog";
import { InstallmentHistoryDialog } from "@/components/installments/InstallmentHistoryDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { Trash2, CreditCard, CheckCircle2, ShoppingCart, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { usePaymentCelebration } from "@/hooks/usePaymentCelebration";

export default function Installments() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { celebrateInstallment } = usePaymentCelebration();
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user || isDemoMode) {
      fetchInstallments();
    }
  }, [user, isDemoMode]);

  const fetchInstallments = async () => {
    if (isDemoMode) {
      // Add mock card data to installments for demo
      const installmentsWithCards = demoData.installments.map(inst => {
        const card = demoData.credit_cards.find(c => c.id === inst.card_id);
        return {
          ...inst,
          credit_cards: card ? { name: card.name, bank_name: card.bank_name } : null
        };
      });
      setInstallments(installmentsWithCards);
      setLoading(false);
      return;
    }
    
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("installments")
        .select("*, credit_cards(name, bank_name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInstallments(data || []);
    } catch (error: any) {
      toast.error(t('installments.loadError') || "Taksitler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("installments")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success(t('installments.installmentDeleted'));
      fetchInstallments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const markPaid = async (id: string, name: string, currentPaidMonths: number, totalMonths: number) => {
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      return;
    }
    if (!user) return;
    
    if (currentPaidMonths >= totalMonths) {
      toast.error(t('installments.allPaid'));
      return;
    }

    try {
      const { error } = await supabase
        .from("installments")
        .update({ 
          paid_months: currentPaidMonths + 1,
          is_active: currentPaidMonths + 1 < totalMonths
        })
        .eq("id", id);

      if (error) throw error;
      
      // Delete related installment notifications
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("related_entity_id", id)
        .eq("related_entity_type", "installment");
      
      // Also mark any related notifications as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("related_entity_id", id);
      
      celebrateInstallment(name, currentPaidMonths, totalMonths);
      fetchInstallments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const totalRemaining = installments
    .filter(i => i.is_active)
    .reduce((sum, i) => sum + (parseFloat(i.monthly_amount) * (i.total_months - i.paid_months)), 0);

  const transliterateTurkish = (text: string): string => {
    const turkishChars: { [key: string]: string } = {
      'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
      'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
    };
    return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, char => turkishChars[char] || char);
  };

  const exportSummaryPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    
    // Title
    doc.setFontSize(20);
    doc.text(transliterateTurkish(t('installments.pdfTitle')), 14, 20);
    
    // Summary stats
    doc.setFontSize(12);
    const activeCount = installments.filter(i => i.is_active).length;
    const completedCount = installments.filter(i => !i.is_active).length;
    
    doc.text(`${transliterateTurkish(t('installments.pdfTotalRemaining'))}: ${formatCurrency(totalRemaining)}`, 14, 35);
    doc.text(`${transliterateTurkish(t('installments.pdfActiveInstallments'))}: ${activeCount}`, 14, 42);
    doc.text(`${transliterateTurkish(t('installments.pdfCompletedInstallments'))}: ${completedCount}`, 14, 49);
    
    // Table
    const tableData = installments.map(inst => {
      const remaining = inst.total_months - inst.paid_months;
      const remainingAmount = parseFloat(inst.monthly_amount) * remaining;
      return [
        transliterateTurkish(inst.name),
        transliterateTurkish(t(`installmentCategories.${inst.category}`, inst.category) as string),
        inst.credit_cards ? `${inst.credit_cards.name}` : '-',
        inst.is_active ? transliterateTurkish(t('installments.ongoing') as string) : transliterateTurkish(t('installments.completed') as string),
        `${inst.paid_months}/${inst.total_months}`,
        formatCurrency(parseFloat(inst.monthly_amount)).replace('₺', 'TL'),
        formatCurrency(remainingAmount).replace('₺', 'TL')
      ];
    });

    autoTable(doc, {
      startY: 58,
      head: [[
        transliterateTurkish(t('installments.installmentName')),
        transliterateTurkish(t('installments.pdfCategory')),
        transliterateTurkish(t('installments.pdfCreditCard')),
        transliterateTurkish(t('installments.pdfStatus')),
        transliterateTurkish(t('installments.pdfProgress')),
        transliterateTurkish(t('installments.pdfMonthlyAmount')),
        transliterateTurkish(t('installments.pdfRemainingAmount'))
      ]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [147, 51, 234] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `${transliterateTurkish(t('installments.pdfGeneratedAt'))}: ${now.toLocaleDateString()} - ${i}/${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`installments-summary-${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-500 to-purple-500/60 shadow-lg">
            <ShoppingCart className="h-5 w-5 lg:h-8 lg:w-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg lg:text-3xl font-bold text-foreground truncate">{t('installments.title')}</h1>
            <p className="text-xs lg:text-base text-muted-foreground hidden sm:block">{t('installments.description')}</p>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {/* Summary Card */}
          <Card className="p-3 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('installments.totalRemaining')}</p>
                <p className="text-lg lg:text-3xl font-bold truncate">{formatCurrency(totalRemaining)}</p>
              </div>
              <CreditCard className="h-6 w-6 lg:h-8 lg:w-8 text-primary shrink-0" />
            </div>
          </Card>

          <Card className="p-3 lg:p-6">
            <div className="flex flex-col gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base lg:text-xl font-bold truncate">{t('installments.allInstallments')}</h2>
                <InstallmentDialog onSuccess={fetchInstallments} />
              </div>
              {installments.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportSummaryPDF} className="w-full sm:w-auto self-start text-xs lg:text-sm">
                  <FileDown className="h-3.5 w-3.5 lg:h-4 lg:w-4 mr-1.5 lg:mr-2" />
                  {t('installments.exportSummaryPdf')}
                </Button>
              )}
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{t('common.loading')}</p>
            ) : installments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{t('installments.noInstallmentsYet')}</p>
            ) : (
              <div className="space-y-2 lg:space-y-4">
                {installments.map((installment) => {
                  const progress = (installment.paid_months / installment.total_months) * 100;
                  const remaining = installment.total_months - installment.paid_months;
                  
                  return (
                    <div
                      key={installment.id}
                      className="p-2.5 lg:p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      {/* Mobile Layout */}
                      <div className="sm:hidden">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-medium text-sm truncate max-w-[120px]">{installment.name}</p>
                              <p className="text-sm font-bold text-primary whitespace-nowrap">
                                {formatCurrency(parseFloat(installment.monthly_amount))}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {installment.paid_months}/{installment.total_months} • {remaining} {t('installments.remaining')}
                              </span>
                              <Badge 
                                variant={installment.is_active ? "default" : "secondary"} 
                                className="text-[8px] px-1 py-0 h-4"
                              >
                                {installment.is_active ? t('installments.ongoing') : t('installments.completed')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <Progress value={progress} className="h-1 mt-2 mb-1.5" />
                        
                        <div className="flex items-center justify-end gap-1">
                          {installment.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-0.5 px-1.5"
                              onClick={() => markPaid(installment.id, installment.name, installment.paid_months, installment.total_months)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="hidden xs:inline">{t('installments.markAsPaid')}</span>
                            </Button>
                          )}
                          <InstallmentHistoryDialog installment={installment} />
                          <InstallmentDialog installment={installment} onSuccess={fetchInstallments} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => setDeleteId(installment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:block">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{installment.name}</p>
                                <Badge variant={installment.is_active ? "default" : "secondary"}>
                                  {installment.is_active ? t('installments.ongoing') : t('installments.completed')}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {t(`installmentCategories.${installment.category}`, installment.category) as string}
                                {installment.credit_cards && (
                                  <> • {installment.credit_cards.name} ({installment.credit_cards.bank_name})</>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {installment.paid_months}/{installment.total_months} {t('installments.paidMonths')} • 
                                {t('installments.remaining')}: {remaining} {t('installments.months')} ({formatCurrency(installment.monthly_amount * remaining)})
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                              <p className="text-lg font-semibold">
                                {formatCurrency(parseFloat(installment.monthly_amount))}{t('installments.perMonth')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t('installments.total')}: {formatCurrency(parseFloat(installment.total_amount))}
                              </p>
                            </div>
                            {installment.is_active && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => markPaid(installment.id, installment.name, installment.paid_months, installment.total_months)}
                                title={t('installments.markAsPaid')}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <InstallmentHistoryDialog installment={installment} />
                            <InstallmentDialog installment={installment} onSuccess={fetchInstallments} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(installment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Progress value={progress} className="h-2 mt-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('installments.deleteConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('installments.cannotBeUndone')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}