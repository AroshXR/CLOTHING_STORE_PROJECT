import React from 'react';
import PageHeader from './PageHeader';
export default class PageBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="ui-empty-page" role="alert">
      <PageHeader title="Unable to display this page" description="Please try again. You can also use the navigation to open another page." />
      <button type="button" className="ui-button--primary" onClick={() => this.setState({ failed: false })}>Try again</button>
    </section>;
    return this.props.children;
  }
}
