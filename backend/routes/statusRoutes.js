const express = require('express');

const {createStatus,viewStatus,deleteStatus, getStatus} = require('../controllers/statusController');
const authMiddleware = require('../middlewares/authMiddleware');
const { multerMiddleware } = require('../config/cloudinaryConfig');

const router  = express.Router();

router.post('/',authMiddleware,multerMiddleware,createStatus);
router.get('/',authMiddleware,getStatus);



router.put('/:statusId/view',authMiddleware,viewStatus);
router.delete('/:statusId',authMiddleware,deleteStatus);
module.exports = router;