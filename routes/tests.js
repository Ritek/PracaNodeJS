const router = require('express').Router();
const db = require('../db');
const oID = require('mongodb').ObjectID;

const verify = require('./verifyToken');

router.post('/createtest', async (req, res) => {
    let teacherId = oID(req.body.id);

    let obj = {
        author: teacherId,
        name: req.body.test.name,
        tags: req.body.test.tags,
        questions: req.body.test.questions,
    }

    try {
        var dataBase = db.getDb();
        await dataBase.collection('tests').insertOne(obj);

        res.status(200).send('Test added');
    } catch(error) {
        console.log(error);
        res.status(400).send("Error");
    }
});


router.post('/gettests', async (req, res) => {
    let teacherId = oID(req.body.id);

    try {
        var dataBase = db.getDb();
        await dataBase.collection('tests').find({author: teacherId}).toArray((err, result) => {
            if (err) throw err;
            else {
                let tempArr = [];
                for (let i=0;i<result.length;i++) {
                    tempArr.push({id: result[i]._id, name: result[i].name, tags: result[i].tags, exnum: result[i].questions.length});
                }
                console.log(tempArr);
                res.status(200).send(tempArr);
            }
        });
        
    } catch(error) {
        console.log(error);
        res.status(400).send("Error");
    }
});


router.post('/gettest', async (req, res) => {
    let testId = oID(req.body.testId);
    let teacherId = oID(req.body.userId);

    try {
        var dataBase = db.getDb();
        await dataBase.collection('tests').findOne({_id: testId}).then(result => {
            res.status(200).send(result);
        }).catch(error => {
            console.log(error);
        })

    } catch(error) {
        console.log(error);
    }

});


router.post('/edittest', async (req, res) => {
    let teacherId = oID(req.body.id);
    let test = req.body.test;

    console.log('Edit');
    console.log('test:', test);

    res.status(200).send('ok');

});

module.exports = router;