import React from 'react';
import { Menu as ArkMenu } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import './ark-ui.css';

export interface MenuItemData {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  separatorAfter?: boolean;
}

export interface MenuFunctionalProps {
  trigger?: React.ReactNode;
  items?: MenuItemData[];
  positioning?: any;
  onSelect?: (value: string) => void;
  children?: React.ReactNode;
}

const MenuComponent: React.FC<MenuFunctionalProps> = ({
  trigger,
  items = [],
  positioning = { placement: 'bottom-start', gutter: 6 },
  onSelect,
  children
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
      {trigger && <ArkMenu.Trigger asChild>{trigger}</ArkMenu.Trigger>}
      <Portal>
        <ArkMenu.Positioner>
          <ArkMenu.Content className="ark-menu-content min-w-[180px] p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl focus-visible:outline-none">
            {items.map((item, idx) => (
              <React.Fragment key={item.value || idx}>
                <ArkMenu.Item
                  value={item.value}
                  className="ark-menu-item flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[disabled]:opacity-50"
                  style={item.danger ? { color: 'var(--error, #D93025)' } : {}}
                >
                  {item.icon && <span className="menu-icon">{item.icon}</span>}
                  <span>{item.label}</span>
                </ArkMenu.Item>
                {item.separatorAfter && <ArkMenu.Separator className="ark-menu-separator my-1 h-px bg-slate-100 dark:bg-slate-800" />}
              </React.Fragment>
            ))}
            {children}
          </ArkMenu.Content>
        </ArkMenu.Positioner>
      </Portal>
    </ArkMenu.Root>
  );
};

export const Menu = Object.assign(MenuComponent, {
  Root: ArkMenu.Root,
  Trigger: ArkMenu.Trigger,
  Positioner: ({ className = '', ...props }: ArkMenu.PositionerProps) => (
    <ArkMenu.Positioner className={`z-50 ${className}`} {...props} />
  ),
  Content: ({ className = '', ...props }: ArkMenu.ContentProps) => (
    <ArkMenu.Content
      className={`min-w-[180px] p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl focus-visible:outline-none transition-all duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  ),
  Item: ({ className = '', ...props }: ArkMenu.ItemProps) => (
    <ArkMenu.Item
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${className}`}
      {...props}
    />
  ),
  Separator: ({ className = '', ...props }: ArkMenu.SeparatorProps) => (
    <ArkMenu.Separator className={`my-1 h-px bg-slate-100 dark:bg-slate-800 ${className}`} {...props} />
  )
});

export default Menu;
