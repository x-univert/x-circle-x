import { PropsWithChildren, useEffect } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';

import { useGetIsLoggedIn } from 'lib';
import { RouteNamesEnum } from 'localConstants';
import { routes } from 'routes';

export const AuthRedirectWrapper = ({ children }: PropsWithChildren) => {
  const isLoggedIn = useGetIsLoggedIn();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const currentRoute = routes.find((route) => matchPath(route.path, pathname));

  const requireAuth = Boolean(currentRoute?.authenticatedRoute);

  // Routes that authenticated users should be redirected FROM
  // (only unlock page - home is now Circle of Life which should be accessible)
  const authOnlyRoutes = [RouteNamesEnum.unlock];

  useEffect(() => {
    // If logged in and on unlock page, redirect to home (Circle of Life)
    if (isLoggedIn && authOnlyRoutes.includes(pathname as RouteNamesEnum)) {
      navigate(RouteNamesEnum.home);

      return;
    }

    // If not logged in and route requires auth, redirect to home
    if (!isLoggedIn && requireAuth) {
      navigate(RouteNamesEnum.home);
    }
  }, [isLoggedIn, currentRoute, pathname]);

  return <>{children}</>;
};
