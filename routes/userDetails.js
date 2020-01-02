const router = require('express').Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const decode = require('jwt-decode');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');

const verify = require('./verifyToken');
const oID = require('mongodb').ObjectID;

const getImage = async (userId) => {
    let data = await fs.readFile(`${__dirname}/../pictures/${userId}/avatar.png`);
    let str64 = new Buffer(data).toString('base64');

    return(str64);
}

router.post('/getdetails', verify, async (req, res) => {
    console.log('getdetails');
    let userId = oID(req.user.id);

    try {
        var dataBase = db.getDb();
        const temp = await dataBase.collection('users').findOne({_id: userId});

        /* if (!fs.existsSync(`${__dirname+'/../'}/pictures/${req.user.id}/avatar.png`)) {
            temp.picture = null; 
        } else temp.picture = `/${req.user.id}/avatar.png`; */

        user = {
            login: temp.login,
            email: temp.email,
            imgPath: (await getImage(userId)).toString(),
        }

        res.status(200).send(user);
    } catch(error) {
        console.log('server error:', error);
        res.status(400).send('Server error');
    }
});


router.post('/updateprofile', verify, async (req, res) => {
    let details = JSON.parse(req.body.user);

    try {
        var dataBase = db.getDb();

        await dataBase.collection('users').updateOne({_id: oID(req.user.id)}, {$set: {login: details.login, email: details.email}});

        if (details.oldPassword !== String && details.oldPassword !== "" && 
            details.newPassword !== String && details.newPassword !== "") {

            let temp = await dataBase.collection('users').findOne({_id: oID(req.user.id)});
            const validPassword = await bcrypt.compare(details.oldPassword, temp.password);
            if (validPassword) {
                const salt = await bcrypt.genSalt(10);
                const hashPassword = await bcrypt.hash(details.newPassword, salt);

                await dataBase.collection('users').updateOne({_id: oID(req.user.id)}, {$set: {password: hashPassword}});
            }
        }

        if (req.files !== null) {
            const file = req.files.image;
            file.mv(`${__dirname+'/../'}/pictures/${req.user.id}/avatar.png`);
        }

        res.status(200).send('ok');
    } catch(error) {
        console.log('server error:', error);
        res.status(400).send('Server error');
    }
});


module.exports = router;