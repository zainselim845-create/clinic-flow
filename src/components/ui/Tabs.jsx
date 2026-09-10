import React from 'react';
import { Tabs as ArkTabs } from '@ark-ui/react/tabs';
import './ark-ui.css';

/**
 * Accessible Tabs Primitive powered by Ark UI with RTL keyboard navigation & Google M3 Pills
 */
export const Tabs = ({
  value,
  defaultValue,
  onValueChange,
  items = [], // Array of { value, label, icon, content }
  className = '',
  children
}) => {
  return (
    <ArkTabs.Root
      value={value}
      defaultValue={defaultValue || (items[0]?.value)}
      onValueChange={onValueChange}
      className={`ark-tabs-root ${className}`}
    >
      <ArkTabs.List className="ark-tabs-list">
        {items.map((tab) => (
          <ArkTabs.Trigger key={tab.value} value={tab.value} className="ark-tab-trigger">
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
          </ArkTabs.Trigger>
        ))}
      </ArkTabs.List>

      {items.map((tab) => (
        <ArkTabs.Content key={tab.value} value={tab.value} className="ark-tab-content">
          {tab.content}
        </ArkTabs.Content>
      ))}

      {children}
    </ArkTabs.Root>
  );
};

export default Tabs;
