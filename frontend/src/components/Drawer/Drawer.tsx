import classNames from 'classnames';
import { Fragment, MouseEvent, PropsWithChildren, ReactNode } from 'react';

import { WithClassnameType } from 'types';

import styles from './drawer.styles';

interface DrawerPropsType extends PropsWithChildren, WithClassnameType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: ReactNode;
}

export const Drawer = ({
  isOpen,
  setIsOpen,
  children,
  title,
  className
}: DrawerPropsType) => {
  const handleDismiss = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Fragment>
      <div
        onClick={handleDismiss}
        className={classNames(styles.drawerBackdrop, {
          [styles.drawerBackdropVisible]: isOpen
        })}
      />

      <div className={classNames(styles.drawer, className)}>
        <div className={styles.drawerContainer}>
          <div className={styles.drawerContentWrapper}>
            <div className={styles.drawerContentHeader}>
              <div className={styles.drawerContentHeaderTitle}>{title}</div>

              <div
                onClick={handleDismiss}
                className={styles.drawerContentHeaderClose}
              />
            </div>

            <div className={styles.drawerContent}>{children}</div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};
