const jwt = require('jsonwebtoken');

const checkToken = (req, res, next) => {
    const token = req.header('authToken');
    if (!token) {
        return res.status(401).send('Acces Denied');
    }

    try {
        const verified = jwt.verify(token, process.env.TOKEN);
        res.user = verified;
        next();
    } catch(error) {
        res.status(400).send('Invalid token');
    }
}

module.exports = checkToken;