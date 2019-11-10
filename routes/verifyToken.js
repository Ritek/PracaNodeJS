const jwt = require('jsonwebtoken');

const checkToken = (req, res, next) => {
    //console.log('headers:', req.cookies.cookie);

    //const token = req.header('authToken');
    const token = req.cookies.cookie;
    if (!token) {
        return res.status(401).send('Acces Denied');
    }

    try {
        const verified = jwt.verify(token, process.env.TOKEN);
        req.user = verified;
        next();
    } catch(error) {
        res.status(400).send('Invalid token');
    }
}

module.exports = checkToken;