import React from 'react';
import PageHeader from '../../Layout/PageHeader';
export default function Title({ title, subTitle }) {
  return <PageHeader title={title} description={subTitle} />;
}
