import React from 'react';
import { useNavigate } from 'react-router-dom';


import './Unauthorized.css';

function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div className="w-full flex flex-col">
            
            <div className="unauthorized-container">
                <div className="unauthorized-content">
                    <div className="unauthorized-icon">🚫</div>
                    <h1>Access Denied</h1>
                    <p>Sorry, you don't have permission to access this page.</p>
                    <p>Please contact an administrator if you believe this is an error.</p>
                    <div className="unauthorized-actions">
                        <button 
                            className="supbtn"
                            onClick={() => navigate('/')}
                        >
                            Go to Home
                        </button>
                        <button 
                            className="supbtn"
                            onClick={() => navigate(-1)}
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
            
        </div>
    );
}

export default Unauthorized;
