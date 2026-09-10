import React from 'react';
import { Menu as ArkMenu } from '@ark-ui/react/menu';

export const Menu = {
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
};

export default Menu;
