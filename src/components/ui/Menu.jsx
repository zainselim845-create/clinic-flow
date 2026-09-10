import React from 'react';
import { Menu as ArkMenu } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import './ark-ui.css';

/**
 * Accessible Dropdown Menu Primitive powered by Ark UI with Google M3 Floating Card
 */
export const Menu = ({
  trigger,
  items = [], // Array of { value, label, icon, onSelect, danger, separatorAfter }
  positioning = { placement: 'bottom-start', gutter: 6 },
  onSelect
}) => {
  return (
    <ArkMenu.Root
      positioning={positioning}
      onSelect={(details) => {
        onSelect?.(details.value);
        const item = items.find((i) => i.value === details.value);
        item?.onSelect?.();
      }}
    >
      <ArkMenu.Trigger asChild>{trigger}</ArkMenu.Trigger>
      <Portal>
        <ArkMenu.Positioner>
          <ArkMenu.Content className="ark-menu-content">
            {items.map((item, idx) => (
              <React.Fragment key={item.value || idx}>
                <ArkMenu.Item
                  value={item.value}
                  className="ark-menu-item"
                  style={item.danger ? { color: 'var(--error, #D93025)' } : {}}
                >
                  {item.icon && <span className="menu-icon">{item.icon}</span>}
                  <span>{item.label}</span>
                </ArkMenu.Item>
                {item.separatorAfter && <ArkMenu.Separator className="ark-menu-separator" />}
              </React.Fragment>
            ))}
          </ArkMenu.Content>
        </ArkMenu.Positioner>
      </Portal>
    </ArkMenu.Root>
  );
};

export default Menu;
