import React from 'react';
import { Link } from 'react-router-dom';

const AdBanner = () => {
  return (
    <div style={{
      width: '100%',
      backgroundColor: '#353839', /* Charcoal */
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '12px 20px',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '800' }}>
          Tired of touching your phone?
        </span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '600' }}>
          Get the ScoreCourt Smart Clicker.
        </span>
      </div>
      
      <Link 
        to="/store" 
        style={{
          backgroundColor: '#91cb23', /* Brand Green */
          color: '#000000',
          padding: '8px 16px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '900',
          fontSize: '13px',
          boxShadow: '0 4px 10px rgba(145, 203, 35, 0.2)'
        }}
      >
        Shop Now
      </Link>
    </div>
  );
};

export default AdBanner;