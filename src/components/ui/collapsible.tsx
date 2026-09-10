import React from 'react';
import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible';

export const Collapsible = {
  Root: ({ className = '', ...props }: ArkCollapsible.RootProps) => (
    <ArkCollapsible.Root className={`w-full ${className}`} {...props} />
  ),
  Trigger: ({ className = '', ...props }: ArkCollapsible.TriggerProps) => (
    <ArkCollapsible.Trigger
      className={`flex items-center justify-between w-full cursor-pointer focus-visible:outline-none ${className}`}
      {...props}
    />
  ),
  Content: ({ className = '', ...props }: ArkCollapsible.ContentProps) => (
    <ArkCollapsible.Content
      className={`overflow-hidden transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  )
};

export default Collapsible;
