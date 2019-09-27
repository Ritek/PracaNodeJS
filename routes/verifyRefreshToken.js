const jwt = require('jsonwebtoken');

const checkRefreshToken = (req, res, next) => {
    const token = req.header('refreshToken');
    if (!token) return res.status(401).send('Session ended');

    try {
        const verified = jwt.verify(token, process.env.REFRESH_TOKEN);
        res.user = verified;
        next();
    } catch(error) {
        res.status(400).send('Invalid refresh token');
    }
}

module.exports = checkRefreshToken;