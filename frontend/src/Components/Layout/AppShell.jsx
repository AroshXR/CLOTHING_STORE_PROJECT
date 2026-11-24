import React, { useEffect, useRef } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import NavBar from '../NavBar/navBar';
import Footer from '../Footer/Footer';
import pages from '../../config/pages.json';
import './ui.css';

export function pageForPath(pathname) {
  return pages.find(page => matchPath({ path: page.path, end: true }, pathname)) || { id: 'not-found', layout: 'content' };
}
export default function AppShell({ children }) {
  const { pathname } = useLocation(), content = useRef(null), previousPath = useRef(pathname);
  const page = pageForPath(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      content.current?.focus({ preventScroll: true });
      previousPath.current = pathname;
    }
  }, [pathname]);
  return <div className="ui-app">
    <a className="ui-skip-link" href="#main-content">Skip to content</a>
    <NavBar />
    <main id="main-content" ref={content} tabIndex={-1} className={'ui-page ui-page--' + page.layout} data-page={page.id}>
      {children}
    </main>
    <Footer />
  </div>;
}
