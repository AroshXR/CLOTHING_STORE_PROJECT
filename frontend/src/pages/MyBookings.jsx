import { API_BASE_URL as API_ORIGIN } from '../config/api';
import MediaImage from '../Components/MediaImage';
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import Title from '../Components/pasindu/Title'

import axios from 'axios'
import { useAuth } from '../AuthGuard/authGuard'
import './MyBookings.css'
import { addBookingToCart } from '../Components/OrderManagement/cartItems'

const MyBookings = () => {

  const [bookings, setBookings] = useState([])  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currency = process.env.REACT_APP_CURRENCY
  const navigate = useNavigate()
  const { isAuthenticated, getToken, currentUser } = useAuth()

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isAuthenticated()) {
        setError('Please log in to view your bookings');
        setLoading(false);
        return;
      }

      const BASE_URL = API_ORIGIN;
      const token = getToken();
      
      const { data } = await axios.get(`${BASE_URL}/api/booking/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (data?.success) {
        setBookings(data.bookings);
      } else {
        setError('Failed to fetch bookings');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(`Error loading bookings: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMyBookings()
  }, [isAuthenticated, currentUser])

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated()) {
        fetchMyBookings()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated])

  return (
    <div>
      

    <div className="text-sm"> 
     
      <div className="flex justify-between items-center">
        <Title title='My Bookings' subTitle='View and manage your all bookings' align="left" />
        <button 
          onClick={fetchMyBookings}
          className="supbtn supbtn-neutral"
        >
          Refresh
        </button>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading your bookings...</div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      
      {!loading && !error && bookings.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No bookings found</p>
          <p className="text-gray-400">Book an outfit to see it here!</p>
        </div>
      )}
      
      <div>
        {bookings.map((booking, index) => (
          <div key={booking._id} className='grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-solid border-black rounded-lg mt-5 first:mt-12 bg-white'>
            
            {/* Outfit Image + Info */}
            <div className='md:col-span-1'>
              <div className='rounded-md overflow-hidden mb-3'>
                <MediaImage src={booking.outfit.image} alt="" className='w-60 h-60 aspect-video object-cover object-top'  />
              </div>

              <p className='text-lg font-medium mt-2'>{booking.outfit.brand} {booking.outfit.model} </p>
              <p className='text-gray-500'>{booking.outfit.category} • {booking.outfit.location} </p>
            </div>

            {/* Booking Info */}
            <div className='md:col-span-2'>
              <div className='flex items-center gap-2'>
                <p className='px-3 py-1.5 bg-light rounded'>Booking #{index + 1} </p>
                <p className={`px-3 py-1 text-xs rounded-full ${
                  booking.status === 'confirmed' ? 'bg-green-400/15 text-green-600' : 
                  booking.status === 'pending' ? 'bg-yellow-400/15 text-yellow-600' : 
                  'bg-red-400/15 text-red-600'
                }`}>
                  {booking.status} 
                </p>
              </div>

              <div className='flex items-start gap-2 mt-3'>
                <MediaImage src={assets.calendar_icon_colored} alt="" className='w-4 h-4 mt-1' />
                <div>
                  <p className='text-gray-500'>Rental Period</p>
                  <p>{booking.reservationDate.split('T')[0]} To {booking.returnDate.split('T')[0]} </p>
                </div>
              </div>

              <div className='flex items-start gap-2 mt-3'>
                <MediaImage src={assets.location_icon} alt="" className='w-4 h-4 mt-1' />
                <div>
                  <p className='text-red-500'>Pickup Location</p>
                  <p>{booking.outfit.location} </p> 
                </div>
              </div>

              {/* Contact Information */}
              <div className='flex items-start gap-2 mt-3'>
                <MediaImage src={assets.phone_icon || assets.location_icon} alt="" className='w-4 h-4 mt-1' />
                <div>
                  <p className='text-gray-500'>Contact</p>
                  <p className='text-sm'>{booking.phone}</p>
                  <p className='text-sm text-gray-400'>{booking.email}</p>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className='md:col-span-1 flex flex-col justify-between gap-6'>
              <div className='text-sm text-gray-500 text-right'>
                <p>Total Price</p>
                <p className='text-2xl font-semibold text-primary'>{currency || '$'}{booking.collectionAmount ?? booking.price}</p>
                <p>Booked On {booking.createdAt.split('T')[0]} </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {booking.status === 'confirmed' && !['pending', 'paid'].includes(booking.paymentStatus) && (
                  <><button onClick={() => {
                    try { addBookingToCart(booking); navigate('/orderManagement'); }
                    catch (failure) { alert(failure.message || 'The booking could not be added to your cart.'); }
                  }} className="supbtn supbtn-neutral">Add booking to cart</button>
                  <button onClick={() => {
                    sessionStorage.setItem('directPurchase', JSON.stringify({ type: 'booking', id: booking._id, bookingId: booking._id, quantity: 1 }));
                    navigate('/paymentManagement');
                  }} className="supbtn supbtn-primary">Arrange cash collection</button></>
                )}
                {booking.paymentStatus === 'pending' && <p>Cash due on collection</p>}
                {booking.paymentStatus === 'paid' && <p>Cash payment received</p>}
                
                <div className="flex gap-2">
                  {/* Edit Button - Only show for pending bookings */}
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => navigate(`/edit-booking/${booking._id}`)}
                      className={`${booking.status === 'pending' ? 'flex-1' : ''} supbtn supbtn-neutral`}
                    >
                      Edit
                    </button>
                  )}
                  
                  {/* Remove Booking Button */}
                  {booking.status === 'pending' && !['pending', 'paid'].includes(booking.paymentStatus) &&
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to remove this booking?')) {
                        try {
                          const BASE_URL = API_ORIGIN;
                          const token = getToken();
                          
                          const { data } = await axios.delete(`${BASE_URL}/api/booking/${booking._id}`, {
                            headers: {
                              Authorization: `Bearer ${token}`
                            }
                          });
                          
                          if (data?.success) {
                            alert('Booking removed successfully');
                            fetchMyBookings(); // Refresh the bookings list
                          } else {
                            alert(data?.message || 'Failed to remove booking');
                          }
                        } catch (err) {
                          console.error(err);
                          alert('Error removing booking');
                        }
                      }
                    }}
                    className={`${booking.status === 'pending' ? 'flex-1' : 'w-full'} supbtn supbtn-danger`}
                  >
                    Remove
                  </button>
                  }
                </div>
              </div>
            </div>

          </div>
        ))}

      </div>
    </div>
  </div>
  )
}

export default MyBookings