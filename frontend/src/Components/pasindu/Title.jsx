import React from 'react';
import PageHeader from '../Layout/PageHeader';
export default function Title({ title, subTitle, level = 1 }) {
  return <PageHeader title={title} description={subTitle} level={level} />;
}
