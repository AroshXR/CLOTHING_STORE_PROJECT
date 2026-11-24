import { useBranding } from '../../config/branding';
import React, { useEffect } from "react";
import "./TermsAndConditions.css";
import { useNavigate } from "react-router-dom";

const TermsAndConditions = () => {
  const { branding } = useBranding();
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0); // auto-scroll to top
    }, []);

    return (
        <div className="tc-container">
            <div className="tc-content">
                <div className="tc-footer">
                    <button
                        className="tc-back-button"
                        onClick={() => navigate(-1)}
                    >
                        ← Back
                    </button>
                </div>

                <header className="tc-header">
                    <h1>Terms and Conditions for {branding.name}</h1>
                    <p>Last updated: September 23, 2025</p>
                </header>

                <section className="tc-main">
                    <section className="tc-section">
                        <p>
                            Welcome to {branding.name}. By accessing or using our website,
                            you agree to comply with these Terms and Conditions. If you do
                            not agree, please do not use our Service.
                        </p>
                    </section>

                    <section className="tc-section">
                        <h2>Definitions</h2>
                        <ul>
                            <li><strong>Company</strong> refers to {branding.name}.</li>
                            <li><strong>Service</strong> refers to our website and related services.</li>
                            <li><strong>You</strong> means the individual using the Service.</li>
                            <li>
                                <strong>Website</strong> refers to {branding.name}, accessible
                                from <a href={`${branding.websiteUrl || window.location.origin}`}>{branding.websiteUrl || window.location.origin}</a>.
                            </li>
                        </ul>
                    </section>

                    <section className="tc-section">
                        <h2>Use of the Service</h2>
                        <p>You agree to use the Service only for lawful purposes. You may not:</p>
                        <ul>
                            <li>Engage in any unlawful or fraudulent activity.</li>
                            <li>Attempt to gain unauthorized access to the Service.</li>
                            <li>Disrupt the Service or servers in any way.</li>
                        </ul>
                    </section>

                    <section className="tc-section">
                        <h2>Intellectual Property</h2>
                        <p>
                            All content, trademarks, and logos on this website are owned or
                            licensed by {branding.name}. You may not use our intellectual
                            property without prior permission.
                        </p>
                    </section>

                    <section className="tc-section">
                        <h2>Purchases and Payments</h2>
                        <p>
                            When you make a purchase through our Service, you agree to
                            provide accurate payment information. All sales are final unless
                            otherwise specified.
                        </p>
                    </section>

                    <section className="tc-section">
                        <h2>Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, {branding.name} will not
                            be liable for any damages arising from your use of the Service.
                        </p>
                    </section>

                    <section className="tc-section">
                        <h2>Governing Law</h2>
                        <p>
                            These Terms shall be governed and interpreted in accordance with
                            the laws of Sri Lanka, without regard to its conflict of law rules.
                        </p>
                    </section>

                    <section className="tc-section">
                        <h2>Changes to Terms</h2>
                        <p>
                            We may update these Terms from time to time. You are advised to
                            review this page periodically for any changes.
                        </p>
                    </section>

                    <section className="tc-section">
                        <h2>Contact Us</h2>
                        <p>If you have any questions about these Terms, you can contact us:</p>
                        <ul>
                            <li>
                                By email:{" "}
                                <a href={branding.contactEmail ? "mailto:" + branding.contactEmail : "/contact"}>
                                    {branding.contactEmail || "Contact the store"}
                                </a>
                            </li>
                        </ul>
                    </section>
                </section>
            </div>
        </div>
    );
};

export default TermsAndConditions;
