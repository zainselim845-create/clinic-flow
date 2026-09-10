import React from 'react';
import { Accordion as ArkAccordion } from '@ark-ui/react/accordion';
import { ChevronDown } from 'lucide-react';
import './ark-ui.css';

/**
 * Accessible Accordion Primitive powered by Ark UI with animated indicators & Google M3 surfaces
 */
export const Accordion = ({
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  collapsible = true,
  items = [], // Array of { value, title, content, icon }
  className = ''
}) => {
  return (
    <ArkAccordion.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      multiple={multiple}
      collapsible={collapsible}
      className={`ark-accordion-root ${className}`}
    >
      {items.map((item) => (
        <ArkAccordion.Item key={item.value} value={item.value} className="ark-accordion-item">
          <ArkAccordion.ItemTrigger className="ark-accordion-trigger">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {item.icon && <span className="accordion-icon">{item.icon}</span>}
              <span>{item.title}</span>
            </div>
            <ArkAccordion.ItemIndicator className="ark-accordion-indicator">
              <ChevronDown size={18} />
            </ArkAccordion.ItemIndicator>
          </ArkAccordion.ItemTrigger>
          <ArkAccordion.ItemContent className="ark-accordion-content">
            {item.content}
          </ArkAccordion.ItemContent>
        </ArkAccordion.Item>
      ))}
    </ArkAccordion.Root>
  );
};

export default Accordion;
