const router = require('express').Router();
const db = require('../db');

const {registerValidaion, loginValidaion} = require('../validation');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const decode = require('jwt-decode');

const verify = require('./verifyToken');
const oID = require('mongodb').ObjectID;


router.post('/register', async (req, res) => {
    console.log("login:", req.body.userLogin);

    const {error} = registerValidaion(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    console.log('After validation');

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    // create login from email if not provided
    let userLogin;
    if (req.body.userLogin === '' || req.body.userLogin === undefined) {
        userLogin = req.body.email.substr(0, req.body.email.indexOf('@'));
    } else {
        userLogin = req.body.email;
    }

    // create user
    const user = {
        login: userLogin,
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: hashPassword,
        role: 'student',
        groups: [],
    }

    console.log(user);

    try {
        var dataBase = db.getDb();

        // check if login already exists in database
        const find = await dataBase.collection('users').findOne({email: user.email});
        if (find) res.status(400).send('Acount with this login already exisits');
        else {
            // if not create new account
            await dataBase.collection('users').insertOne(user);
            res.status(200).send('Inserted');
        }
    } catch(err) {
        res.status(400).send(err);
    }
});

router.post('/login', async (req, res) => {

    console.log('email:', req.body.email);
    console.log('password:', req.body.password);

    try {
        var dataBase = db.getDb();

        // check if the login exists
        const user = await dataBase.collection('users').findOne({email: req.body.email});
        if (!user) res.status(400).send('Email was not found');

        // check if the password exists
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) res.status(400).send('Password was not found');
        
        // crete and assign a token
        const token = jwt.sign({id: user._id}, process.env.TOKEN);
        const session = jwt.sign({id: user._id, login: user.login, role: user.role}, process.env.TOKEN);
        //const refreshToken = jwt.sign({id: user._id, password: user.password}, process.env.REFRESH_TOKEN, {expiresIn: "3h"});
        //await dataBase.collection('users').updateOne({email: req.body.email}, {$set: {refreshToken: refreshToken}});

        res.status(200).cookie('cookie', token, {httpOnly: true}).send({token: session});

    } catch(error) {
        console.log(error);
        //res.status(400).send('Invalid Token');
    }

});

router.post('/checkRefreshToken', async (req, res) => {
    console.log('got request');
    //console.log('cookie:', req.cookie);
    const token = req.body.refreshToken;
    if (!token) res.status(400).send("Bad request");

    try {
        const {id} = decode(token);
        var dataBase = db.getDb();
        const user = await dataBase.collection('users').findOne({_id: oID(id)});

        if (user.refreshToken === token && jwt.verify(token, process.env.REFRESH_TOKEN)) {
            const newToken = jwt.sign({id: user._id, login: user.login, role: user.role}, process.env.TOKEN, { expiresIn: '1m' });
            res.status(200).send({newToken: newToken});
        } else {
            res.status(400).send({erorr: 'Inactive token'});
        }
    } catch(error) {
        console.log('server error:', error);
    }
});

module.exports = router;