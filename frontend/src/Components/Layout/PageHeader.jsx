import React from 'react';
export default function PageHeader({ title, description, children, level = 1 }) {
  const Heading = level === 2 ? 'h2' : 'h1';
  return <header className="ui-page-header">
    <div><Heading>{title}</Heading>{description && <p>{description}</p>}</div>
    {children && <div className="ui-header-actions">{children}</div>}
  </header>;
}
