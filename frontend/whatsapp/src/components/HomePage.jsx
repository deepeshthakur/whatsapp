import React, { useEffect, useState } from "react";
import LayOut from "./LayOut";
import { motion } from "framer-motion";
import ChatList from "../pages/chatSection/ChatList";
import useLayOutStore from "../store/LayOutStore";
import { getAllUsers } from "../service/user.service";

const HomePage = () => {
  const setSelectedContact = useLayOutStore(
    (state) =>state.setSelectedContact
  );
 
  const [allUsers, setAllUsers] = useState([]);
  const getAllUser = async () => {
    try {
      const result = await getAllUsers();
      if (result.status === "success") {
        setAllUsers(result.data);
      }
    } catch (error) {
      console.error(error);
    }
  };


  useEffect(()=>{
    getAllUser();
  },[]);

  console.log(allUsers)

  return (
    <LayOut>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <ChatList  contacts = {allUsers} setSelectedContact={setSelectedContact}  />
      </motion.div>
    </LayOut>
  );
};

export default HomePage;
