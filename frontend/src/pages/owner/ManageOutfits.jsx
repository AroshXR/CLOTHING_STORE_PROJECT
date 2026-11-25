import { API_BASE_URL as API_ORIGIN } from '../../config/api';
import MediaImage from '../../Components/MediaImage';
import React, { useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { assets } from '../../assets/assets'
import Title from '../../Components/pasindu/owner/Title'
import { useState } from 'react'

const ManageOutfits = () => {

  const currency = process.env.REACT_APP_CURRENCY
  const navigate = useNavigate()

  const [outfits,setOutfits] = useState([])

  const fetchOwnerOutfits = async ()=>{
    try{
      const BASE_URL = API_ORIGIN
      const { data } = await axios.get(`${BASE_URL}/api/owner/outfits`)
      if(data?.success){
        setOutfits(data.outfits)
      }
    }catch(err){
      console.error(err)
    }
  }

  useEffect(()=>{
    fetchOwnerOutfits()
  },[])



  return (
    <div className="w-full">

      <Title title="Manage Outfits"  subTitle="View all listed outfits, update their details or remove them from the booking platform." />

      <div className="w-full rounded-md overflow-hidden border border-solid border-borderColor bg-white">

        <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Scrollable table"><table className='w-full border-collapse text-left text-sm text-gray-600'>
          <thead className='text-gray-500'>
            <tr>
              <th className="p-3 font-medium">Outfit</th>
              <th className="p-3 font-medium max-md:hidden">Category</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium max-md:hidden">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {outfits.map((outfit,index)=>(
              <tr key={index} className='border border-solid border-borderColor'>
                <td className='p-3 flex items-center gap-3'>
                  <MediaImage src={outfit.image} alt="" className="h-24 w-16 aspect-square rounded-md object-cover" />
                  <div className='max-md:hidden'>
                    <p className='font-medium'>{outfit.brand} {outfit.model} </p>
                    <p className='text-xs text-gray-500'>{outfit.material} • {outfit.size} </p>
                  </div>
                  
                </td>
                <td className='p-3 max-md:hidden'> {outfit.category}</td>
                <td className='p-3 '>{currency} {outfit.pricePerDay}/day</td>

                <td className='p-3 max-md:hidden'>
                  <span className={`px-3 py-1 rounded-full text-xs ${outfit.isAvailable ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>{outfit.isAvailable ? "Available " : "Unavailable"} </span>

                </td>
                <td className='flex items-center p-3 gap-2'>
                  <MediaImage src={outfit.isAvailable ? assets.eye_close_icon : assets.eye_icon} alt="" className='cursor-pointer' onClick={async()=>{
                    try{
                      const BASE_URL = API_ORIGIN
                      const { data } = await axios.post(`${BASE_URL}/api/owner/toggle-outfit`, { outfitId: outfit._id })
                      if(data?.success){
                        fetchOwnerOutfits()
                      }
                    }catch(err){ console.error(err) }
                  }}/>
                  <MediaImage
                    src={assets.edit_icon} 
                    alt="Edit" 
                    className='cursor-pointer w-5 h-4' 
                    onClick={()=>{
                      navigate(`/owner/edit-outfit/${outfit._id}`)
                    }}
                  />
                  <MediaImage src={assets.delete_icon} alt="" className='cursor-pointer' onClick={async()=>{
                    try{
                      const ok = window.confirm('Are you sure you want to delete this outfit? This will permanently remove the outfit and all related bookings.')
                      if(!ok) return
                      const BASE_URL = API_ORIGIN
                      const { data } = await axios.post(`${BASE_URL}/api/owner/delete-outfit`, { outfitId: outfit._id })
                      if(data?.success){
                        alert(`${data.message}${data.deletedBookings ? ` (${data.deletedBookings} related bookings also deleted)` : ''}`)
                        fetchOwnerOutfits()
                      } else {
                        alert(data?.message || 'Failed to delete outfit')
                      }
                    }catch(err){ 
                      console.error(err)
                      alert('Error deleting outfit')
                    }
                  }}/>

                </td>
              </tr>
            ))}

          </tbody>
        </table></div>

      </div>
        
    </div>
  )
}

export default ManageOutfits
