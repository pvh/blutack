declare module "react-contextmenu" {
  import * as React from "react";

  interface ContextMenuProps {
    children?: React.ReactNode;
    id: string;
    data?: any;
    className?: string;
    hideOnLeave?: boolean;
    rtl?: boolean;
    onHide?: { (event: any): void };
    onMouseLeave?:
      | {
          (
            event: React.MouseEvent<HTMLElement>,
            data: Record<string, any>,
            target: HTMLElement
          ): void;
        }
      | Function;
    onShow?: { (event: any): void };
  }

  interface ContextMenuTriggerProps {
    id: string;
    attributes?: React.HTMLAttributes<any>;
    collect?: { (data: any): any };
    disable?: boolean;
    holdToDisplay?: number;
    renderTag?: React.ReactType;
    children?: React.ReactNode;
  }

  interface MenuItemProps {
    children?: React.ReactNode;
    attributes?: React.HTMLAttributes<HTMLDivElement>;
    data?: Record<string, any>;
    disabled?: boolean;
    divider?: boolean;
    preventClose?: boolean;
    onClick?:
      | {
          (
            event:
              | React.TouchEvent<HTMLDivElement>
              | React.MouseEvent<HTMLDivElement>,
            data: Record<string, any>,
            target: HTMLElement
          ): void;
        }
      | Function;
  }

  interface SubMenuProps {
    title: React.ReactElement<any> | React.ReactText;
    className?: string;
    disabled?: boolean;
    hoverDelay?: number;
    rtl?: boolean;
  }

  namespace ReactContextmenu {
    export const ContextMenu: React.ComponentClass<ContextMenuProps>;
    export const ContextMenuTrigger: React.ComponentClass<ContextMenuTriggerProps>;
    export const MenuItem: React.ComponentClass<MenuItemProps>;
    export const SubMenu: React.ComponentClass<SubMenuProps>;
    export function connectMenu(menuId: string): (menu: any) => any;
    export function showMenu(opts?: any, target?: HTMLElement): void;
    export function hideMenu(opts?: any, target?: HTMLElement): void;
  }

  export = ReactContextmenu;
}

declare module "react-contextmenu/modules/actions" {
  namespace ReactContextmenuActions {
    export function showMenu(opts?: any, target?: HTMLElement): void;
    export function hideMenu(opts?: any, target?: HTMLElement): void;
  }

  export = ReactContextmenuActions;
}
