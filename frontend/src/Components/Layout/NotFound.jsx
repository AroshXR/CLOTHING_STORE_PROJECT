import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from './PageHeader';
export default function NotFound() {
  return <section className="ui-empty-page"><PageHeader title="Page not found" description="The page may have moved, or the address may be incorrect." />
    <Link className="ui-button ui-button--primary" to="/">Back to home</Link></section>;
}
