import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useAppShell } from '../../context/AppShellContext';
import type { ConnectivityState } from '../../lib/appShell';

const CONNECTIVITY_COPY: Record<
  Exclude<ConnectivityState, 'online'>,
  { label: string; Icon: typeof WifiOff }
> = {
  offline: { label: 'Ngoại tuyến', Icon: WifiOff },
  syncing: { label: 'Đang đồng bộ', Icon: RefreshCw },
  needs_attention: { label: 'Cần xử lý', Icon: AlertTriangle },
};

export function ConnectivityStatus() {
  const { connectivity } = useAppShell();
  if (connectivity === 'online') return null;

  const { label, Icon } = CONNECTIVITY_COPY[connectivity];
  return (
    <p className="omni-connectivity" role="status" data-state={connectivity}>
      <Icon aria-hidden="true" className="omni-connectivity__icon" />
      <span>{label}</span>
    </p>
  );
}
