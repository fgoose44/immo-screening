import type { PropertyStatus } from '@/lib/types';

const STATUS_CONFIG: Record<PropertyStatus, { label: string; className: string }> = {
  preview: {
    label: 'Vorschau',
    className: 'bg-[#FDF0DC] text-[#9E7232]',
  },
  enriched: {
    label: 'Angereichert',
    className: 'bg-[#FDF0DC] text-[#9E7232]',
  },
  analyzed: {
    label: 'Analysiert',
    className: 'bg-[#DCF2EA] text-[#2E8A65]',
  },
  skipped: {
    label: 'Übersprungen',
    className: 'bg-[#F4F5FB] text-[#8A8EA8]',
  },
  sold: {
    label: 'Verkauft',
    className: 'bg-[#F4F5FB] text-[#8A8EA8]',
  },
};

interface StatusBadgeProps {
  status: PropertyStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.preview;
  return (
    <span
      className={`inline-flex items-center px-[10px] py-[3px] rounded-full text-[11px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
