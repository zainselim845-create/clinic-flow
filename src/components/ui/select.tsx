import React from 'react';
import { Select as ArkSelect } from '@ark-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

export const Select = {
  Root: ArkSelect.Root,
  Label: ({ className = '', ...props }: ArkSelect.LabelProps) => (
    <ArkSelect.Label className={`block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ${className}`} {...props} />
  ),
  Control: ({ className = '', ...props }: ArkSelect.ControlProps) => (
    <ArkSelect.Control className={`relative w-full ${className}`} {...props} />
  ),
  Trigger: ({ className = '', children, ...props }: ArkSelect.TriggerProps) => (
    <ArkSelect.Trigger
      className={`flex items-center justify-between w-full px-3.5 py-2.5 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      {...props}
    >
      {children}
      <ArkSelect.Indicator>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </ArkSelect.Indicator>
    </ArkSelect.Trigger>
  ),
  ValueText: ArkSelect.ValueText,
  Positioner: ({ className = '', ...props }: ArkSelect.PositionerProps) => (
    <ArkSelect.Positioner className={`z-50 w-[var(--reference-width)] ${className}`} {...props} />
  ),
  Content: ({ className = '', ...props }: ArkSelect.ContentProps) => (
    <ArkSelect.Content
      className={`p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-60 overflow-y-auto focus-visible:outline-none transition-all duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  ),
  ItemGroup: ArkSelect.ItemGroup,
  ItemGroupLabel: ArkSelect.ItemGroupLabel,
  Item: ({ className = '', children, ...props }: ArkSelect.ItemProps) => (
    <ArkSelect.Item
      className={`flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${className}`}
      {...props}
    >
      <ArkSelect.ItemText>{children}</ArkSelect.ItemText>
      <ArkSelect.ItemIndicator>
        <Check className="w-4 h-4 text-primary" />
      </ArkSelect.ItemIndicator>
    </ArkSelect.Item>
  )
};

export default Select;
