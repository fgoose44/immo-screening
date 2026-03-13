import type { PropertyStatus } from '@/lib/types';

const STATUS_CONFIG: Record<PropertyStatus, { label: string; className: string }> = {
  preview: {
    label: 'Vorschau',
    className: 'bg-amber-100 text-amber-800',
  },
  enriched: {
    label: 'Angereichert',
    className: 'bg-blue-100 text-blue-800',
  },
  analyzed: {
    label: 'Analysiert',
    className: 'bg-teal-100 text-teal-800',
  },
  skipped: {
    label: 'Übersprungen',
    className: 'bg-gray-100 text-gray-500',
  },
};

interface StatusBadgeProps {
  status: PropertyStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.preview;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
