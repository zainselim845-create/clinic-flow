// Core Primitives (Hybrid: Functional + Compound)
export { Dialog, default as DialogDefault } from './dialog';
export { Tabs, default as TabsDefault } from './tabs';
export { Tooltip, default as TooltipDefault } from './tooltip';
export { Switch, default as SwitchDefault } from './switch';
export { Accordion, default as AccordionDefault } from './accordion';
export { Menu, default as MenuDefault } from './menu';

// Headless Compound Primitives
export { Collapsible } from './collapsible';
export { Select } from './select';
export { Combobox } from './combobox';
export { Slider } from './slider';
export { Carousel } from './carousel';
export { Popover } from './popover';

// Design System Primitives
export { Avatar, default as AvatarDefault } from './avatar';
export { Badge, default as BadgeDefault } from './badge';
export { Button, default as ButtonDefault } from './button';
export { Card, default as CardDefault } from './card';
export { Input, default as InputDefault } from './input';

// Aliases for explicit ark-namespaced imports
export { Dialog as ArkDialog } from './dialog';
export { Tabs as ArkTabs } from './tabs';
export { Menu as ArkMenu } from './menu';
export { Accordion as ArkAccordion } from './accordion';
export { Tooltip as ArkTooltip } from './tooltip';

// Apple Human Interface & Advanced Glassmorphism Primitives
export { AppleGlassCard, default as AppleGlassCardDefault } from './AppleGlassCard';
export { AppleGlassButton, AppleButton, default as AppleGlassButtonDefault } from './AppleGlassButton';
export { AppleGlassDock, default as AppleGlassDockDefault } from './AppleGlassDock';
export { AppleGlassSegmentedControl, AppleSegmentedControl, default as AppleGlassSegmentedControlDefault } from './AppleGlassSegmentedControl';
export { AppleInsetGroupedList, AppleInsetItem, AppleInsetGroupedCard, default as AppleInsetGroupedListDefault } from './AppleInsetGroupedList';
export { AppleSheetModal, default as AppleSheetModalDefault } from './AppleSheetModal';
export { AppleNavigationBar, default as AppleNavigationBarDefault } from './AppleNavigationBar';
export { AppleTabBar, default as AppleTabBarDefault } from './AppleTabBar';

export type { AppleMaterialTier } from './AppleGlassCard';
export type { AppleButtonVariant, AppleButtonSize, AppleButtonShape } from './AppleGlassButton';
export type { AppleDockItem } from './AppleGlassDock';
export type { SegmentOption } from './AppleGlassSegmentedControl';
export type { AppleSystemColor, AppleInsetItemProps, AppleInsetGroupedListProps } from './AppleInsetGroupedList';
export type { AppleSheetModalProps } from './AppleSheetModal';
export type { AppleNavigationBarProps } from './AppleNavigationBar';
export type { AppleTabBarProps, AppleTabItem } from './AppleTabBar';
