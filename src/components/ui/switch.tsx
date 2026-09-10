import React from 'react';
import { Switch as ArkSwitch } from '@ark-ui/react/switch';
import './ark-ui.css';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (details: { checked: boolean }) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  name?: string;
  className?: string;
  children?: React.ReactNode;
}

const SwitchComponent: React.FC<SwitchProps> = ({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  label,
  name,
  className = '',
  children
}) => {
  return (
    <ArkSwitch.Root
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={`ark-switch-root inline-flex items-center gap-3 cursor-pointer select-none ${className}`}
    >
      <ArkSwitch.Control className="ark-switch-control relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700">
        <ArkSwitch.Thumb className="ark-switch-thumb pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out data-[state=checked]:-translate-x-5 rtl:data-[state=checked]:-translate-x-5 ltr:data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
      </ArkSwitch.Control>
      {(label || children) && (
        <ArkSwitch.Label className="ark-switch-label text-sm font-medium text-slate-700 dark:text-slate-300">
          {label || children}
        </ArkSwitch.Label>
      )}
      <ArkSwitch.HiddenInput name={name} />
    </ArkSwitch.Root>
  );
};

export const Switch = Object.assign(SwitchComponent, {
  Root: ArkSwitch.Root,
  Control: ArkSwitch.Control,
  Thumb: ArkSwitch.Thumb,
  Label: ArkSwitch.Label,
  HiddenInput: ArkSwitch.HiddenInput
});

export default Switch;
