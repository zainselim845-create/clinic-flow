import React from 'react';
import { Tabs as ArkTabs } from '@ark-ui/react/tabs';
import './ark-ui.css';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

export interface TabsFunctionalProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (details: { value: string }) => void;
  items?: TabItem[];
  className?: string;
  children?: React.ReactNode;
}

const TabsComponent: React.FC<TabsFunctionalProps> = ({
  value,
  defaultValue,
  onValueChange,
  items = [],
  className = '',
  children
}) => {
  return (
    <ArkTabs.Root
      value={value}
      defaultValue={defaultValue || items[0]?.value}
      onValueChange={onValueChange}
      className={`ark-tabs-root w-full flex flex-col ${className}`}
    >
      {items.length > 0 && (
        <ArkTabs.List className="ark-tabs-list relative flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto scrollbar-none">
          {items.map((tab) => (
            <ArkTabs.Trigger
              key={tab.value}
              value={tab.value}
              className="ark-tab-trigger z-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[selected]:text-primary dark:data-[selected]:text-white data-[selected]:bg-white dark:data-[selected]:bg-slate-900 data-[selected]:shadow-sm data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span>{tab.label}</span>
            </ArkTabs.Trigger>
          ))}
        </ArkTabs.List>
      )}

      {items.map((tab) => (
        <ArkTabs.Content
          key={tab.value}
          value={tab.value}
          className="ark-tab-content mt-4 focus-visible:outline-none transition-opacity duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-50"
        >
          {tab.content}
        </ArkTabs.Content>
      ))}

      {children}
    </ArkTabs.Root>
  );
};

export const Tabs = Object.assign(TabsComponent, {
  Root: ({ className = '', ...props }: ArkTabs.RootProps) => (
    <ArkTabs.Root
      className={`w-full flex flex-col ${className}`}
      {...props}
    />
  ),
  List: ({ className = '', ...props }: ArkTabs.ListProps) => (
    <ArkTabs.List
      className={`relative flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto scrollbar-none ${className}`}
      {...props}
    />
  ),
  Trigger: ({ className = '', ...props }: ArkTabs.TriggerProps) => (
    <ArkTabs.Trigger
      className={`z-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[selected]:text-primary dark:data-[selected]:text-white data-[selected]:bg-white dark:data-[selected]:bg-slate-900 data-[selected]:shadow-sm data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${className}`}
      {...props}
    />
  ),
  Indicator: ({ className = '', ...props }: ArkTabs.IndicatorProps) => (
    <ArkTabs.Indicator
      className={`absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ${className}`}
      {...props}
    />
  ),
  Content: ({ className = '', ...props }: ArkTabs.ContentProps) => (
    <ArkTabs.Content
      className={`mt-4 focus-visible:outline-none transition-opacity duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-50 ${className}`}
      {...props}
    />
  )
});

export default Tabs;
