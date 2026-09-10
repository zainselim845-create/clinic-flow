import React from 'react';
import { Combobox as ArkCombobox } from '@ark-ui/react/combobox';
import { ChevronsUpDown, Check, X } from 'lucide-react';
import { Portal } from '@ark-ui/react/portal';

export const Combobox = {
  Root: ArkCombobox.Root,
  Label: ({ className = '', ...props }: ArkCombobox.LabelProps) => (
    <ArkCombobox.Label className={`block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ${className}`} {...props} />
  ),
  Control: ({ className = '', ...props }: ArkCombobox.ControlProps) => (
    <ArkCombobox.Control className={`relative flex items-center w-full ${className}`} {...props} />
  ),
  Input: ({ className = '', ...props }: ArkCombobox.InputProps) => (
    <ArkCombobox.Input
      className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      {...props}
    />
  ),
  Trigger: ({ className = '', children, ...props }: ArkCombobox.TriggerProps) => (
    <ArkCombobox.Trigger
      className={`absolute left-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ${className}`}
      {...props}
    >
      {children || <ChevronsUpDown className="w-4 h-4" />}
    </ArkCombobox.Trigger>
  ),
  ClearTrigger: ({ className = '', children, ...props }: ArkCombobox.ClearTriggerProps) => (
    <ArkCombobox.ClearTrigger
      className={`absolute left-8 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ${className}`}
      {...props}
    >
      {children || <X className="w-3.5 h-3.5" />}
    </ArkCombobox.ClearTrigger>
  ),
  Positioner: ({ className = '', ...props }: ArkCombobox.PositionerProps) => (
    <ArkCombobox.Positioner className={`z-50 w-[var(--reference-width)] ${className}`} {...props} />
  ),
  Content: ({ className = '', children, ...props }: ArkCombobox.ContentProps) => (
    <Portal>
      <ArkCombobox.Positioner className="z-50 w-[var(--reference-width)]">
        <ArkCombobox.Content
          className={`p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-60 overflow-y-auto focus-visible:outline-none transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
          {...props}
        >
          {children}
        </ArkCombobox.Content>
      </ArkCombobox.Positioner>
    </Portal>
  ),
  ItemGroup: ArkCombobox.ItemGroup,
  ItemGroupLabel: ArkCombobox.ItemGroupLabel,
  Item: ({ className = '', children, ...props }: ArkCombobox.ItemProps) => (
    <ArkCombobox.Item
      className={`flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[disabled]:opacity-50 ${className}`}
      {...props}
    >
      <ArkCombobox.ItemText>{children}</ArkCombobox.ItemText>
      <ArkCombobox.ItemIndicator>
        <Check className="w-4 h-4 text-primary" />
      </ArkCombobox.ItemIndicator>
    </ArkCombobox.Item>
  )
};

export default Combobox;
