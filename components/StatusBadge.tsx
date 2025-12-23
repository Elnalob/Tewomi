
import React from 'react';
import { InvoiceStatus } from '../types';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'bg-green-100 text-green-800 border-green-200';
      case InvoiceStatus.OVERDUE:
        return 'bg-red-100 text-red-800 border-red-200';
      case InvoiceStatus.SENT:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case InvoiceStatus.DRAFT:
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyles()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
