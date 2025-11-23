const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { response } = require('express');
dotenv.config();

const socketMiddleWare = (socket, next) => {
    // const authToken = req.cookies?.token;
    // if (!authToken) {
    //     return res.status(401).json({ message: 'No token provided' });
    // }

    
    const authToken = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if(!authToken){
        return next(new Error('Authentication error'));
    }

    try{
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        socket.user = decoded;
        console.log(req.user);
        next();
    }catch(error){
        console.error('Error in authMiddleware:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = socketMiddleWare;