import { ComponentType } from 'react';

export interface RouteType {
  path: string;
  component: ComponentType<any>;
  authenticatedRoute?: boolean;
  children?: RouteType[];
}
