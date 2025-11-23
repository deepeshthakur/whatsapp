const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { response } = require('express');
dotenv.config();

const authMiddleware = (req, res, next) => {
    // const authToken = req.cookies?.token;
    // if (!authToken) {
    //     return res.status(401).json({ message: 'No token provided' });
    // }

    const authHeader = req.headers['authorization'];
    const authToken = authHeader && authHeader.split(' ')[1];
    if (!authToken) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try{
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        req.user = decoded;
        console.log(req.user);
        next();
    }catch(error){
        console.error('Error in authMiddleware:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;