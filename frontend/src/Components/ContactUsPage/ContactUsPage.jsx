import React, { useState } from 'react';
import './ContactUsPage.css';
import { useNavigate } from 'react-router-dom';


import { useBranding } from '../../config/branding';

function ContactUs() {
    const { branding } = useBranding();
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const navigate = useNavigate();


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!branding.contactEmail) return;
        const subject = encodeURIComponent('Enquiry from ' + formData.name);
        const body = encodeURIComponent(formData.message + '\n\nName: ' + formData.name + '\nReply to: ' + formData.email);
        window.location.href = 'mailto:' + branding.contactEmail + '?subject=' + subject + '&body=' + body;
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (

        <div>
            
            <button className='contact-back-button' onClick={handleBack}>
                Back
            </button>

            <div className="contact-container">
                <h1>Contact Us</h1>
                {branding.contactEmail && <p>Email: <a href={'mailto:' + branding.contactEmail}>{branding.contactEmail}</a></p>}
                {branding.contactPhone && <p>Phone: <a href={'tel:' + branding.contactPhone.replace(/[^\d+]/g, '')}>{branding.contactPhone}</a></p>}
                {branding.address && <p style={{ whiteSpace: 'pre-line' }}>{branding.address}</p>}
                <p>{branding.contactEmail ? 'Use the form below to prepare a message in your email app.' : 'Contact details will appear here once the store has configured them.'}</p>

                <form onSubmit={handleSubmit} className="contact-form">
                    <div className="form-group">
                        <label className='contact-form-label'>Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Your Name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className='contact-form-label'>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Your Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className='contact-form-label'>Message</label>
                        <textarea
                            name="message"
                            placeholder="Your Message"
                            rows="5"
                            value={formData.message}
                            onChange={handleChange}
                            required
                        ></textarea>
                    </div>

                    <button className='contact-form-button' type="submit" disabled={!branding.contactEmail}>Open email draft</button>
                </form>
            </div>
            
        </div>


    );
}

export default ContactUs;
