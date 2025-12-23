
import React from 'react';
import { InvoiceStatus } from '../types';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800';
      case InvoiceStatus.OVERDUE:
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
      case InvoiceStatus.SENT:
        return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
      case InvoiceStatus.DRAFT:
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-black border transition-all ${getStyles()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
