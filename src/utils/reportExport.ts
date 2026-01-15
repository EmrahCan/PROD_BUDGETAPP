import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ExportData {
  summary: {
    totalBalance: number;
    totalCardDebt: number;
    totalFixedPayments: number;
    totalInstallmentsRemaining: number;
    periodIncome: number;
    periodExpense: number;
    netBalance: number;
  };
  monthlyData: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  categoryData: Array<{
    category: string;
    amount: number;
  }>;
  transactions: Array<{
    date: string;
    description: string;
    category: string;
    type: string;
    amount: number;
  }>;
  dateRange: {
    start: Date;
    end: Date;
  };
  translations: {
    title: string;
    summary: string;
    totalAssets: string;
    totalDebt: string;
    monthlyObligations: string;
    remainingInstallments: string;
    periodIncome: string;
    periodExpense: string;
    netBalance: string;
    monthlyTrend: string;
    month: string;
    income: string;
    expense: string;
    categorySpending: string;
    category: string;
    amount: string;
    transactions: string;
    date: string;
    description: string;
    type: string;
    incomeType: string;
    expenseType: string;
    reportGenerated: string;
    dateRange: string;
  };
  formatCurrency: (value: number) => string;
}

// Transliterate Turkish characters to ASCII equivalents for PDF compatibility
function transliterateTurkish(text: string): string {
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
}

// Format currency without special characters for PDF
function formatCurrencyForPDF(value: number): string {
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  
  return `${formatted} TL`;
}

export function exportToExcel(data: ExportData) {
  const { summary, monthlyData, categoryData, transactions, dateRange, translations, formatCurrency } = data;
  
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryRows = [
    [translations.title],
    [''],
    [translations.dateRange, `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`],
    [''],
    [translations.summary],
    [translations.totalAssets, summary.totalBalance],
    [translations.totalDebt, summary.totalCardDebt],
    [translations.monthlyObligations, summary.totalFixedPayments],
    [translations.remainingInstallments, summary.totalInstallmentsRemaining],
    [''],
    [translations.periodIncome, summary.periodIncome],
    [translations.periodExpense, summary.periodExpense],
    [translations.netBalance, summary.netBalance],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, transliterateTurkish(translations.summary));
  
  // Monthly data sheet
  const monthlyHeaders = [translations.month, translations.income, translations.expense, translations.netBalance];
  const monthlyRows = monthlyData.map(m => [m.month, m.income, m.expense, m.net]);
  const monthlySheet = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);
  monthlySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, monthlySheet, transliterateTurkish(translations.monthlyTrend).substring(0, 31));
  
  // Category data sheet
  const categoryHeaders = [translations.category, translations.amount];
  const categoryRows = categoryData.map(c => [c.category, c.amount]);
  const categorySheet = XLSX.utils.aoa_to_sheet([categoryHeaders, ...categoryRows]);
  categorySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, categorySheet, transliterateTurkish(translations.categorySpending).substring(0, 31));
  
  // Transactions sheet
  const transactionHeaders = [translations.date, translations.description, translations.category, translations.type, translations.amount];
  const transactionRows = transactions.map(t => [
    t.date,
    t.description,
    t.category,
    t.type === 'income' ? translations.incomeType : translations.expenseType,
    t.amount
  ]);
  const transactionSheet = XLSX.utils.aoa_to_sheet([transactionHeaders, ...transactionRows]);
  transactionSheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, transactionSheet, transliterateTurkish(translations.transactions).substring(0, 31));
  
  // Generate filename
  const fileName = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  
  // Write and download
  XLSX.writeFile(workbook, fileName);
}

export function exportToPDF(data: ExportData) {
  const { summary, monthlyData, categoryData, transactions, dateRange, translations } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Helper function to transliterate text for PDF
  const t = transliterateTurkish;
  const fc = formatCurrencyForPDF;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(t(translations.title), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${t(translations.dateRange)}: ${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`,
    pageWidth / 2, yPos, { align: 'center' }
  );
  yPos += 15;
  
  // Summary section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t(translations.summary), 14, yPos);
  yPos += 8;
  
  const summaryData = [
    [t(translations.totalAssets), fc(summary.totalBalance)],
    [t(translations.totalDebt), fc(summary.totalCardDebt)],
    [t(translations.monthlyObligations), fc(summary.totalFixedPayments)],
    [t(translations.remainingInstallments), fc(summary.totalInstallmentsRemaining)],
    ['', ''],
    [t(translations.periodIncome), fc(summary.periodIncome)],
    [t(translations.periodExpense), fc(summary.periodExpense)],
    [t(translations.netBalance), fc(summary.netBalance)],
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
  
  // Monthly Trend Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t(translations.monthlyTrend), 14, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [[t(translations.month), t(translations.income), t(translations.expense), t(translations.netBalance)]],
    body: monthlyData.map(m => [
      t(m.month),
      fc(m.income),
      fc(m.expense),
      fc(m.net)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Check if we need a new page
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }
  
  // Category Spending Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t(translations.categorySpending), 14, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [[t(translations.category), t(translations.amount)]],
    body: categoryData.map(c => [t(c.category), fc(c.amount)]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Transactions (on new page)
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t(translations.transactions), 14, yPos);
  yPos += 5;
  
  // Limit transactions to last 50 for PDF
  const limitedTransactions = transactions.slice(0, 50);
  
  autoTable(doc, {
    startY: yPos,
    head: [[t(translations.date), t(translations.description), t(translations.category), t(translations.type), t(translations.amount)]],
    body: limitedTransactions.map(tr => [
      tr.date,
      t(tr.description?.substring(0, 30) || '-'),
      t(tr.category),
      tr.type === 'income' ? t(translations.incomeType) : t(translations.expenseType),
      fc(tr.amount)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { halign: 'right', cellWidth: 30 }
    }
  });
  
  // Footer with generation date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${t(translations.reportGenerated)}: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Generate filename and save
  const fileName = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
