import React from 'react';
export default function PageHeader({ title, description, children }) {
  return <header className="ui-page-header">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="ui-header-actions">{children}</div>}
  </header>;
}
