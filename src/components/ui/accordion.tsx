import React from 'react';
import { Accordion as ArkAccordion } from '@ark-ui/react/accordion';
import { ChevronDown } from 'lucide-react';

export const Accordion = {
  Root: ({ className = '', ...props }: ArkAccordion.RootProps) => (
    <ArkAccordion.Root
      className={`w-full divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}
      {...props}
    />
  ),
  Item: ({ className = '', ...props }: ArkAccordion.ItemProps) => (
    <ArkAccordion.Item
      className={`group transition-colors data-[disabled]:opacity-50 ${className}`}
      {...props}
    />
  ),
  ItemTrigger: ({ className = '', children, ...props }: ArkAccordion.ItemTriggerProps) => (
    <ArkAccordion.ItemTrigger
      className={`flex w-full items-center justify-between px-5 py-4 text-sm font-bold text-slate-800 dark:text-slate-100 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${className}`}
      {...props}
    >
      <span>{children}</span>
      <ArkAccordion.ItemIndicator className="transition-transform duration-200 group-data-[state=open]:rotate-180">
        <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
      </ArkAccordion.ItemIndicator>
    </ArkAccordion.ItemTrigger>
  ),
  ItemContent: ({ className = '', ...props }: ArkAccordion.ItemContentProps) => (
    <ArkAccordion.ItemContent
      className={`overflow-hidden px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  )
};

export default Accordion;
