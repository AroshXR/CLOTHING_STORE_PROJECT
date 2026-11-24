import React from 'react';
 // Make sure navBar.js uses capital 'N'
import '../Home.css'; // Import CSS
import Outlet from '../../Outlet/Outlet';
 // Import Footer component

function UserHome() {
  return (
     <div className="home-container">
      
      <div className="background-graffiti">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
      </div>
      <div className="home-content">
        {/* <h1>Welcome to your store</h1>
        <p>Customize your style with our unique shirt designs.</p>
         */}
        <Outlet />
        
      </div>
      
    </div>
  )
}

export default UserHome
