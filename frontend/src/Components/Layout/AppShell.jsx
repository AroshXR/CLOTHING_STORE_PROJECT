import React, { useEffect, useRef } from 'react';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { useBranding } from '../../config/branding';
import { matchPath, useLocation } from 'react-router-dom';
import NavBar from '../NavBar/navBar';
import Footer from '../Footer/Footer';
import PageBoundary from './PageBoundary';
import pages from '../../config/pages.json';
import './ui.css';
import '@fontsource-variable/syne';
import './fashion-theme.css';

export function pageForPath(pathname) {
  return pages.find(page => matchPath({ path: page.path, end: true }, pathname)) || { id: 'not-found', layout: 'content' };
}
export default function AppShell({ children }) {
  const { pathname } = useLocation(), content = useRef(null), previousPath = useRef(pathname);
  const page = pageForPath(pathname);
  const { branding } = useBranding(), reduced = useReducedMotion();
  useEffect(() => {
    if (previousPath.current !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      content.current?.focus({ preventScroll: true });
      previousPath.current = pathname;
    }
  }, [pathname]);
  return <MotionConfig reducedMotion="user"><div className="ui-app" data-appearance={branding.appearanceMode || 'monochrome'} data-surface={page.layout === 'landing' ? 'editorial' : 'workspace'}>
    <a className="ui-skip-link" href="#main-content">Skip to content</a>
    <NavBar />
    <main id="main-content" ref={content} tabIndex={-1} className={'ui-page ui-page--' + page.layout} data-page={page.id}>
      <motion.div className="ui-route" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, ease: [.22, 1, .36, 1] }}><PageBoundary resetKey={pathname}>{children}</PageBoundary></motion.div>
    </main>
    <Footer />
  </div></MotionConfig>;
}
