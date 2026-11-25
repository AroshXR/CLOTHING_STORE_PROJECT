import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Clock3, Asterisk } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import { useBranding } from '../../config/branding';
import Reveal from '../Editorial/Reveal';
import EditorialPhoto from '../Editorial/EditorialPhoto';
import ApplicantForm from './ApplicantForm';
import '../Editorial/Editorial.css';
import '../Editorial/Information.css';
import './Career.css';

export default function Career() {
  const { branding } = useBranding();
  const [jobs, setJobs] = useState([]), [state, setState] = useState('loading'), [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [selectedJob, setSelectedJob] = useState(null), [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    axios.get(apiUrl('/jobs'), { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data?.data)) throw new Error('Unable to load roles');
      setJobs(data.data.filter(job => !job.status || job.status === 'active')); setState('ready');
    }).catch(error => {
      if (error.code === 'ERR_CANCELED') return;
      if (error.response?.status === 404 && Array.isArray(error.response.data?.data) && error.response.data.data.length === 0) { setJobs([]); setState('ready'); }
      else setState('error');
    });
    return () => controller.abort();
  }, [attempt]);
  const visible = useMemo(() => {
    const value = search.trim().toLowerCase();
    return jobs.filter(job => !value || [job.title, job.department, job.location, job.type, job.description, ...(Array.isArray(job.requirements) ? job.requirements : [])].filter(Boolean).join(' ').toLowerCase().includes(value));
  }, [jobs, search]);
  function apply(job) { setNotice(''); setSelectedJob(job); }
  async function submit(data) {
    try {
      await axios.post(apiUrl('/applicant'), data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSelectedJob(null); setNotice('Your application was submitted successfully.');
    } catch (failure) {
      const message = failure.response?.data?.message || 'Your application was not submitted. Please check your connection and try again.';
      const details = failure.response?.data?.errors;
      throw new Error(Array.isArray(details) ? message + ' ' + details.join(' ') : message);
    }
  }
  return <div className="ed-page ed-information ed-careers">
    <section className="ed-information-hero ed-pad"><div className="ed-hero-meta"><span>{branding.name} / CAREERS</span><span>CREATIVITY STARTS WITH PEOPLE.</span></div><div className="ed-information-hero-grid"><Reveal><span className="ed-kicker">BRING YOUR POINT OF VIEW</span><h1>WORK<br />WITH US.</h1><p>Bring your skills, your ideas, and your attention to the details. Explore the roles currently open at {branding.name}.</p><a className="ed-button" href="#open-roles">Explore open roles <ArrowUpRight size={18} /></a></Reveal><Reveal className="ed-information-photo ed-fold-right" delay={.15}><EditorialPhoto panel={0} eager alt="An individual approach to tailoring — fashion editorial inspiration" /></Reveal></div></section>
    <section className="ed-career-values ed-pad"><Reveal><span className="ed-kicker">A LITTLE MORE PERSPECTIVE</span><h2>GOOD IDEAS.<br />THOUGHTFUL WORK.</h2></Reveal><div>{[['01','Creativity','An eye for a fresh idea and the confidence to share your point of view.'],['02','Craft','Care for the way things are made, from the first idea to the finishing touches.'],['03','Collaboration','Clear communication, shared ideas, and respect for the people you work with.']].map(([number,title,copy]) => <Reveal key={number}><article><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article></Reveal>)}</div></section>
    <section className="ed-information-band ed-pad" id="open-roles"><Reveal><span className="ed-kicker">FIND YOUR NEXT CHAPTER</span><h2>OPEN<br />ROLES.</h2><p>Each role includes its own requirements and application details.</p></Reveal><Reveal delay={.1}><form className="ed-career-search" onSubmit={event => { event.preventDefault(); setSearch(query); }}><label htmlFor="role-search">Search by role, department, location, or skill</label><div><input id="role-search" type="search" value={query} onChange={event => { setQuery(event.target.value); if (!event.target.value) setSearch(''); }} placeholder="Find your place" /><button className="ed-button ed-button--light" type="submit">Search roles <ArrowUpRight size={18} /></button></div></form></Reveal></section>
    <section className="ed-career-roles ed-pad" aria-busy={state === 'loading'}>{notice && <p className="ed-career-notice" role="status">{notice}</p>}
      {state === 'loading' ? <p role="status">Loading open roles…</p> : state === 'error' ? <div className="ed-career-empty"><h2>ONE MOMENT.</h2><p>Open roles could not be loaded. Please try again.</p><button className="ed-button" onClick={() => setAttempt(value => value + 1)}>Try again <ArrowUpRight size={17} /></button></div> : !visible.length ? <div className="ed-career-empty"><h2>{jobs.length ? 'NO MATCHING ROLES.' : 'MORE TO COME.'}</h2><p>{jobs.length ? 'Try a different keyword to explore the current openings.' : 'There are no open roles listed right now. You can still send a general application below.'}</p>{search && <button className="ed-text-link" onClick={() => { setQuery(''); setSearch(''); }}>Clear search</button>}</div> : <><div className="ed-career-count ed-kicker">{visible.length} {visible.length === 1 ? 'OPEN ROLE' : 'OPEN ROLES'}</div>{visible.map((job, index) => <Reveal key={job._id || job.id || index} className="ed-role" delay={Math.min(index, 4) * .05}><article><div className="ed-role-heading"><div><span className="ed-kicker">{job.department || 'THE TEAM'}</span><h2>{job.title}</h2></div><button className="ed-button" onClick={() => apply(job)} aria-label={'Apply for ' + job.title}>Apply now <ArrowUpRight size={18} /></button></div><div className="ed-role-meta">{job.location && <span><MapPin size={13} />{job.location}</span>}{job.type && <span><Clock3 size={13} />{job.type}</span>}{job.experience && <span>{job.experience}</span>}{job.salary && typeof job.salary === 'object' && (job.salary.min != null || job.salary.max != null) && <span>{job.salary.currency || 'LKR'} {job.salary.min ?? '—'} – {job.salary.max ?? '—'}</span>}{job.deadline && <span>Apply by {new Date(job.deadline).toLocaleDateString()}</span>}</div>{job.description && <p className="ed-role-description">{job.description}</p>}{(job.requirements?.length > 0 || job.responsibilities?.length > 0 || job.benefits?.length > 0) && <details className="ed-role-details"><summary>Role details</summary>{[['Requirements', job.requirements], ['Responsibilities', job.responsibilities], ['Role benefits', job.benefits]].map(([title, list]) => Array.isArray(list) && list.length > 0 ? <div key={title}><h3>{title}</h3><ul>{list.map((value, position) => <li key={position}>{value}</li>)}</ul></div> : null)}</details>}</article></Reveal>)}</>}
    </section>
    <section className="ed-information-close ed-pad"><Reveal><Asterisk size={46} strokeWidth={1.2} /><span className="ed-kicker">A DIFFERENT KIND OF FIT?</span><h2>SHOW US<br />YOUR SKILLS.</h2></Reveal><Reveal delay={.1}><p>If you cannot find the right role, share a general application and tell us about the work you would like to do.</p><button className="ed-button ed-button--light" onClick={() => apply({ title: 'General Application', department: 'Various' })}>General application <ArrowUpRight size={18} /></button><Link className="ed-text-link" to="/contact">Have a question? <ArrowUpRight size={17} /></Link></Reveal></section>
    {selectedJob && <ApplicantForm job={selectedJob} onSubmit={submit} onClose={() => setSelectedJob(null)} />}
  </div>;
}