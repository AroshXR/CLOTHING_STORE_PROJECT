import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';
import { useBranding } from '../../config/branding';
import Reveal from './Reveal';
import cutout from '../../assets/editorial/contact-model.png';
import './Editorial.css';
const questions = [
  ['Can I try the customizer before signing in?', 'Yes. Explore garment colours, presets, patterns, and messages as a guest. Sign in when you want to upload private artwork or save a design to your cart.'],
  ['Which parts of the T-shirt can I design?', 'You can work on the front, back, left sleeve, and right sleeve, with a separate colour for the collar and cuffs. Use the panel buttons to switch between them.'],
  ['How do payments work?', 'Payment is currently by cash on delivery or collection. Checkout shows the available fulfilment options and confirms the total before you place an order.'],
  ['Can I change a design I have saved?', 'Open your cart and choose Edit item to change a saved design. Once an order has been placed, its production design is preserved separately. Contact the store if you need help with an existing order.'],
  ['Will the finished garment match the preview exactly?', 'The 3D view helps you explore colours and artwork placement. Screen colours, garment fit, and print placement can vary in production; the preview is not a sewing pattern or a production-ready print file.']
];
export default function Contact() {
  const { branding } = useBranding(), reduced = useReducedMotion();
  const [open, setOpen] = useState(0), [form, setForm] = useState({ name: '', email: '', message: '' });
  function submit(event) {
    event.preventDefault(); if (!branding.contactEmail) return;
    const subject = encodeURIComponent('Enquiry from ' + form.name), body = encodeURIComponent(form.message + '\n\nName: ' + form.name + '\nReply to: ' + form.email);
    window.location.href = 'mailto:' + branding.contactEmail + '?subject=' + subject + '&body=' + body;
  }
  return <div className="ed-page ed-contact">
    <section className="ed-contact-hero ed-pad"><Reveal><span className="ed-kicker">A CONVERSATION STARTS HERE</span><h1>CONTACT<br /><span>US.</span></h1></Reveal><div className="ed-contact-details"><p>Questions about a piece, a custom design, or an order? We’re here for the details.</p><div><span className="ed-kicker">GENERAL ENQUIRIES</span>{branding.contactEmail ? <a href={'mailto:' + branding.contactEmail}>{branding.contactEmail} <ArrowUpRight size={16} /></a> : <p>Contact details will be available here soon.</p>}</div>{branding.contactPhone && <div><span className="ed-kicker">LET’S TALK</span><a href={'tel:' + branding.contactPhone.replace(/[^\d+]/g, '')}>{branding.contactPhone} <ArrowUpRight size={16} /></a></div>}{branding.address && <div><span className="ed-kicker">FIND US</span><p className="ed-address">{branding.address}</p></div>}</div><Reveal className="ed-contact-model" delay={.15}><img src={cutout} alt="Original monochrome fashion editorial with an oversized T-shirt and tailored trousers" /></Reveal></section>
    <section className="ed-contact-body ed-pad"><Reveal className="ed-faq"><span className="ed-kicker">A FEW THINGS, ANSWERED</span><h2>FREQUENTLY<br />ASKED QUESTIONS.</h2>{questions.map(([question, answer], index) => <div className="ed-faq-item" key={question}><h3><button aria-expanded={open === index} aria-controls={'faq-answer-' + index} onClick={() => setOpen(open === index ? null : index)}>{question}<Plus size={17} className={open === index ? 'is-open' : ''} /></button></h3><AnimatePresence initial={false}>{open === index && <motion.div key="answer" id={'faq-answer-' + index} initial={{ height: reduced ? 'auto' : 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: reduced ? 'auto' : 0, opacity: 0 }} transition={{ duration: reduced ? 0 : .28 }}><p>{answer}</p></motion.div>}</AnimatePresence></div>)}</Reveal>
      <Reveal className="ed-enquiry" delay={.1}><span className="ed-kicker">SOMETHING ELSE ON YOUR MIND?</span><h2>DROP US<br />A LINE.</h2><p>Your message opens as a draft in your email app.</p><form onSubmit={submit}>{[['name','Your name','text'],['email','Email address','email']].map(([key,label,type]) => <label key={key}>{label}<input type={type} value={form[key]} required maxLength={key === 'name' ? 100 : 254} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>)}<label>Your message<textarea required rows={4} maxLength={4000} value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} /></label><button type="submit" className="ed-button" disabled={!branding.contactEmail}>Open email draft <ArrowUpRight size={20} /></button></form></Reveal>
    </section>
  </div>;
}
