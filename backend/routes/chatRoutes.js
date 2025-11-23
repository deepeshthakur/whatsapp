const express = require('express');
const {sendMessage,getAllConversations,getMessages, markMessagesAsRead, deleteMessage} = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');
const { multerMiddleware } = require('../config/cloudinaryConfig');

const router  = express.Router();

router.post('/send-message',authMiddleware,multerMiddleware,sendMessage);
router.get('/conversations',authMiddleware,getAllConversations);
router.get('/conversations/:conversationId/messages',authMiddleware,getMessages);
router.put('/message/read',authMiddleware,markMessagesAsRead);
router.delete('/message/:messageId',authMiddleware,deleteMessage);
module.exports = router;