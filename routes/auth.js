const router = require('express').Router();
const db = require('../db');

const {registerValidaion, loginValidaion} = require('../validation');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const decode = require('jwt-decode');

const oID = require('mongodb').ObjectID;


router.post('/register', async (req, res) => {
    console.log("login:", req.body.login);

    const {error} = registerValidaion(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    // create login from email if not provided
    let userLogin;
    if (req.body.login === '' || req.body.login === undefined) {
        userLogin = req.body.email.substr(0, req.body.email.indexOf('@'));
    } else {
        userLogin = req.body.login;
    }

    // create user
    const user = {
        login: userLogin,
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
        if (find) {
            res.status(400).send('Acount with this login already exisits');
            console.log(find);
        }
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

    const {error} = registerValidaion(req.body);
    if (error) return res.status(400).send('Email was not found');

    try {
        var dataBase = db.getDb();

        // check if the login exists
        const user = await dataBase.collection('users').findOne({email: req.body.email});
        if (!user) return res.status(400).send('Email was not found');

        // check if the password exists
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).send('Email was not found');
        
        // crete and assign a token
        const token = jwt.sign({id: user._id, role: user.role}, process.env.TOKEN);
        const session = jwt.sign({id: user._id, login: user.login, role: user.role}, process.env.TOKEN);

        return res.status(200).cookie('Authorization', token, {httpOnly: true}).send({token: session});

    } catch(error) {
        console.log(error);
        //res.status(400).send('Invalid Token');
    }

});

router.post('/checktoken', async (req, res) => {
    console.log('checktoken')
    const token = req.cookies.Authorization;
    if (!token) res.status(400).send({error: "Unauthorized"});

    try {
        const verified = jwt.verify(token, process.env.TOKEN);
        console.log(verified);
        return res.status(200).send({status: "OK"});
    } catch(error) {
        console.log('invalid')
        return res.status(400).send({error: "Unauthorized"})
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