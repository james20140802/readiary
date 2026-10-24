'use client';

import styles from './Switch.module.css';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 보이는 이름표의 id */
  labelledBy?: string;
  /** 보이는 이름표가 없을 때 */
  label?: string;
  describedBy?: string;
  disabled?: boolean;
}

/** 켜고 끄는 스위치(시안 .switch). 이름은 옆의 보이는 글을 가리킨다 */
export default function Switch({
  checked,
  onChange,
  labelledBy,
  label,
  describedBy,
  disabled,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={styles.switch}
    />
  );
}
