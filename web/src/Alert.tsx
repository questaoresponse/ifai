import { useEffect, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

function Alert({ showPopup }:{ showPopup: RefObject<any> }){

    const [ popup, setPopup ] = useState<any>({ show: false });
    const navigate = useNavigate();

    const fnShowPopup = (value: any) => {
        if ( typeof value == "string" ){
            setPopup({ message: value, show: true });
        } else {
            setPopup({ ...value, show: true });
        }
    }
    const handleClose = () => {
        popup.redirect && navigate(popup.redirectUrl);
        setPopup({ show: false });
    }
    useEffect(()=>{
        showPopup.current = fnShowPopup;
    },[showPopup]);

    return <div
    id="errorPopupContainer"
    style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2000,
        padding: '1rem', // Added padding for responsiveness on smaller screens
        boxSizing: 'border-box', // Ensure padding doesn't add to total width/height
        display: popup.show ?  "flex" : "none"
    }}
    >
        <div
            id="errorPopup"
            style={{
                backgroundColor: '#fff',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)', // Slightly stronger shadow
                maxWidth: '400px',
                width: '100%', // Ensure it takes full width on smaller screens up to maxWidth
                margin: 'auto', // Center the popup horizontally
            }}
        >
            <button
            onClick={handleClose}
            style={{
                position: "relative",
                fontSize: '20px',
                width: '30px',
                height: '30px',
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: "auto",
                backgroundColor: '#15803d', // Adjusted to a darker green
                color: '#fff',
                fontWeight: '600',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out',
                marginBottom:"10px"
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#166534'; // Darker on hover
                e.currentTarget.style.transform = 'scale(1.02)'; // Slight scale on hover
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#15803d';
                e.currentTarget.style.transform = 'scale(1)';
            }}
            onFocus={(e) => { // Added focus styles for accessibility
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.5)'; // Ring on focus
            }}
            onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
            }}
            >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
            <p
                id="errorPopupMessage"
                style={{
                    marginBottom: '1.5rem',
                    color: '#4b5563', // Medium gray for text
                    lineHeight: '1.6',
                }}
            >
                {popup.message}
            </p>
      </div>
    </div>
}

export default Alert;