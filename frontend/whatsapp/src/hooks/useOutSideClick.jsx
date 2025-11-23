import { useEffect } from "react";

const useOutSideClick = (ref, callback) => {
    useEffect(()=>{
        const handleoutsideClick = (e) => {
            if(ref.current && !ref.current.contains(e.target)){
                callback();
            }
        };

        document.addEventListener("mousedown",handleoutsideClick)
        return () => {
            document.removeEventListener("mousedown",handleoutsideClick)
        }


    },[ref,callback]);
}

export default useOutSideClick
    
