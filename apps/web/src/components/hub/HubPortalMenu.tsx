export interface HubPortalMenuItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  separatorBefore?: boolean;
}

export { HubItemActionsMenu as HubPortalMenu } from './HubItemActionsMenu';
