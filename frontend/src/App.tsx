import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { routes } from 'routes';
import { AxiosInterceptors, BatchTransactionsContextProvider } from 'wrappers';

import { Layout, ScrollToTop, ToastContainer } from './components';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationsProvider } from './contexts/NotificationsContext';

export const App = () => {
  return (
    <ToastProvider>
      <NotificationsProvider>
        <Router>
          <ScrollToTop />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              ariaProps: {
                role: 'status',
                'aria-live': 'polite' as 'polite',
              },
              className: '',
              style: {},
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <ToastContainer />
          <AxiosInterceptors>
            <BatchTransactionsContextProvider>
              <Layout>
                <Routes>
                  {routes.map((route) => (
                    <Route
                      key={`route-key-${route.path}`}
                      path={route.path}
                      element={<route.component />}
                    >
                      {route.children?.map((child) => (
                        <Route
                          key={`route-key-${route.path}-${child.path}`}
                          path={child.path}
                          element={<child.component />}
                        />
                      ))}
                    </Route>
                  ))}
                </Routes>
              </Layout>
            </BatchTransactionsContextProvider>
          </AxiosInterceptors>
        </Router>
      </NotificationsProvider>
    </ToastProvider>
  );
};
