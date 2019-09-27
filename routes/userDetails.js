const router = require('express').Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const decode = require('jwt-decode');

const verify = require('./verifyToken');
const oID = require('mongodb').ObjectID;


router.post('/getdetails', verify, async (req, res) => {
    console.log('hi');
    console.log(req.headers);
    try {
        const {id} = decode(req.headers.authtoken);
        var dataBase = db.getDb();
        const temp = await dataBase.collection('users').findOne({_id: oID(id)});

        user = {
            login: temp.login,
            email: temp.email,
        }

        res.status(200).send(user);
    } catch(error) {
        console.log('server error:', error);
        res.status(400).send('Server error');
    }
});


module.exports = router;