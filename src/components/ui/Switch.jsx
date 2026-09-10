import React from 'react';
import { Switch as ArkSwitch } from '@ark-ui/react/switch';
import './ark-ui.css';

/**
 * Accessible Toggle Switch Primitive powered by Ark UI with Google M3 Tokens
 */
export const Switch = ({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  label,
  name,
  className = ''
}) => {
  return (
    <ArkSwitch.Root
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={`ark-switch-root ${className}`}
    >
      <ArkSwitch.Control className="ark-switch-control">
        <ArkSwitch.Thumb className="ark-switch-thumb" />
      </ArkSwitch.Control>
      {label && <ArkSwitch.Label className="ark-switch-label">{label}</ArkSwitch.Label>}
      <ArkSwitch.HiddenInput name={name} />
    </ArkSwitch.Root>
  );
};

export default Switch;
