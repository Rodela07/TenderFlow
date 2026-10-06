import { CircleCheck, TriangleAlert, CircleAlert, CircleDashed, MinusCircle } from 'lucide-react';
import type { StatusType } from '../types';
import { useLang } from '../i18n/LanguageContext';

const statusConfig: Record<StatusType, {
  className: string;
  icon: typeof CircleCheck;
  labelKey: 'statusOk' | 'statusMissing' | 'statusNotProvided' | 'statusExpiryNeeded' | 'statusExpired';
}> = {
  ok: { className: 'status-ok', icon: CircleCheck, labelKey: 'statusOk' },
  missing: { className: 'status-missing', icon: CircleAlert, labelKey: 'statusMissing' },
  not_provided: { className: 'status-not-provided', icon: CircleDashed, labelKey: 'statusNotProvided' },
  expiry_needed: { className: 'status-expiry-needed', icon: TriangleAlert, labelKey: 'statusExpiryNeeded' },
  expired: { className: 'status-expired', icon: MinusCircle, labelKey: 'statusExpired' },
};

interface StatusBadgeProps {
  type: StatusType;
}

export default function StatusBadge({ type }: StatusBadgeProps) {
  const { t } = useLang();
  const config = statusConfig[type];
  const Icon = config.icon;

  return (
    <span className={`status-badge ${config.className}`}>
      <Icon size={14} />
      {t(config.labelKey)}
    </span>
  );
}
