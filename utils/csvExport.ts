
import { FullComparison, LoanType, PaymentMethod } from '../types';

export const generateRepaymentCSV = (data: FullComparison, loanType: LoanType, method: PaymentMethod): string => {
  const activeData = method === PaymentMethod.EPI ? data.epi : data.ep;
  const isCombo = loanType === LoanType.COMBO;

  // Add Byte Order Mark (BOM) for Excel to recognize UTF-8 encoding
  let csvContent = '\uFEFF';

  // Build Headers
  const headers = ['期数', '月供(元)', '本金(元)', '利息(元)', '剩余本金(元)'];
  
  // Insert Combo specific headers if needed
  if (isCombo) {
    // Insert after '月供'
    headers.splice(2, 0, '商贷月供(元)', '公积金月供(元)');
  }
  
  csvContent += headers.join(',') + '\n';

  // Build Rows
  activeData.monthlyData.forEach(row => {
    const rowData = [
      row.month,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.remainingPrincipal.toFixed(2)
    ];

    if (isCombo) {
      rowData.splice(2, 0, 
        (row.commercialPayment || 0).toFixed(2), 
        (row.providentPayment || 0).toFixed(2)
      );
    }

    csvContent += rowData.join(',') + '\n';
  });

  return csvContent;
};
