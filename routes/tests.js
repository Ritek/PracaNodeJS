const router = require('express').Router();
const db = require('../db');
const oID = require('mongodb').ObjectID;

const verify = require('./verifyToken');

router.post('/createtest', async (req, res) => {
    let teacherId = oID(req.body.id);
    console.log(req.body);

    let obj = {
        author: teacherId,
        name: req.body.test.name,
        tags: req.body.test.tags,
        questions: req.body.test.questions,
        access: req.body.access,
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
    console.log('gettests');
    let teacherId = oID(req.body.id);

    try {
        var dataBase = db.getDb();
        let teacher = await dataBase.collection('users').findOne({_id: teacherId});

        let userTests = await dataBase.collection('tests').find({author: teacherId}).toArray();
        for (let i=0;i<userTests.length;i++) delete userTests[i].questions;

        let othersTests = await dataBase.collection('tests').find({access: teacher.email}).toArray();
        res.status(200).send({userTests: userTests, othersTests: othersTests});
        
    } catch(error) {
        console.log(error);
        res.status(400).send("Error");
    }
});


router.post('/gettest', async (req, res) => {
    let testId = oID(req.body.testId);
    let teacherId = oID(req.body.userId);
    console.log('gettest');

    try {
        var dataBase = db.getDb();
        await dataBase.collection('tests').findOne({_id: testId}).then(result => {
            console.log(">", result);
            res.status(200).send(result);
        }).catch(error => {
            console.log(error);
        })

    } catch(error) {
        console.log(error);
    }
});


router.post('/getsomonestest', async (req, res) => {
    let testId = oID(req.body.testId);
    let teacherId = oID(req.body.userId);

    try {
        var dataBase = db.getDb();
        let user = await dataBase.collection('users').findOne({_id: teacherId});
        await dataBase.collection('tests').findOne({_id: testId}).then(result => {
            let resAccess = result.access;
            console.log(user.email);
            if (resAccess.indexOf(user.email) !== -1) {
                let temp = result;
                temp.access = [];
                res.status(200).send(temp);
            } else {
                res.status(400).send("Access forbidden");
            }
        }).catch(error => {
            console.log(error);
        })

    } catch(error) {
        console.log(error);
    }
});


router.post('/edittest', async (req, res) => {
    let test = req.body.test;
    let teacherId = oID(req.body.id);
    let testId = oID(test._id);

    //console.log(teacherId);
    //console.log(testId);

    try {
        var dataBase = db.getDb();

        let newAccess = test.access;
        console.log('access:', newAccess);

        if (newAccess !== null && newAccess.length > 2) {
            let temp = newAccess.split(',');
            for (let i=0;i<temp.length;i++) {
                try {
                    temp[i] = temp[i].trim()
                } catch(error) {
                    console.log('Error finding user!');
                }  
            }
            newAccess = temp;
        }


        await dataBase.collection('tests').updateOne({_id: testId, author: teacherId}, 
            {$set: {name: test.name, tags: test.tags, questions: test.questions, access: newAccess}
        });
        res.send('ok');
    } catch(error) {
        console.log(error);
    }

});


router.post('/deletetest', verify, async (req, res) => {
    let testId = oID(req.body.testId);

    try {
        var dataBase = db.getDb();
        await dataBase.collection('tests').deleteOne({_id: testId}).then(result => {
            dataBase.collection('groups').updateMany( {}, {$pull: {tests: testId}}).then(result2 => {
                res.status(200).send('deleted');
            })
        }).catch(error => {
            console.log(error);
            res.status(400).send('error');
        })

    } catch(error) {
        console.log(error);
    }

});


router.post('/publishtest', async (req, res) => {
    //let teacherId = oID(req.body.userId);
    let groupId = oID(req.body.groupId);
    let testId = oID(req.body.testId);

    var dataBase = db.getDb();
    await dataBase.collection('groups').updateOne({_id: groupId}, {$addToSet: {tests: testId}}).then(result => {
        res.status(200).send('ok');
    }).catch(error => {
        res.status(400).send('coud not add test to group');
    })
});


router.post('/studenttests', verify, async (req, res) => {
    console.log('studenttests');

    try {
        var dataBase = db.getDb();
        let groups = await dataBase.collection('groups').find({members: {$elemMatch: {id: oID(req.user.id)}}}).toArray();
        console.log(groups);

        let testsArray = [];

        for (let i=0;i<groups.length;i++) {

            let tests = groups[i].tests;
            let groupTests = [];

            for (let j=0;j<tests.length;j++) {
                let test = await dataBase.collection('tests').findOne({_id: oID(tests[j].test)});

                groupTests.push({testId: test._id, testName: test.name, testTime: tests[j].time, groupName: groups[i].name});
            }
            //testsArray.push({testName: test.name, groupName: group[i].name, test: test.questions})
            testsArray.push(groupTests);
        }

        //console.log(testsArray);

        res.status(200).send(testsArray);
    } catch(error) {
        console.log(error);
        res.status(400).send('Error');
    }
    
});


const clearAnswers = (test) => {
    delete test.access;
    delete test.tags;
    let questions = test.questions;

    for (let i=0;i<questions.length;i++) {
        if (questions[i].type === "choices") questions[i].answer = "";

        if (questions[i].type === "truefalse") {
            for (let j=0;j<questions[i].subquestions.length;j++) questions[i].subquestions[j][1] = "";
        }
        
        if (questions[i].type === "blanks") {

            // prepare for student answer
            questions[i].answer = [];

            // shuffle blanks
            let number = questions[i].blanks.length;
            for (let j=0;j<number;j++) {
                let random = Math.floor(Math.random() * number)

                let temp = questions[i].blanks[j];
                questions[i].blanks[j] = questions[i].blanks[random];
                questions[i].blanks[random] = temp;

                questions[i].answer.push("")
            }

            // clear sentences
            for (let j=0;j<questions[i].sentences.length;j++) {
                let temp = questions[i].sentences[j].replace(/(?<=\[)(.*?)(?=\])/g, "");
                //console.log(temp)
                questions[i].sentences[j] = temp;
            }
            
        }
    }   
}


router.post('/solvetest', verify, async (req, res) => {
    console.log('solvetest');
    const testId = oID(req.body.testId);
    const userId = oID(req.user.id);
    //console.log('testId:', testId);
    //console.log('userId:', userId);

    try {
        var dataBase = db.getDb();
        let group = await dataBase.collection('groups').findOne({
            members: {$elemMatch: {id: userId}},
            tests: {$elemMatch: {test: testId}}
        });
        
        let testTime;
        let fromGroup;
        for (let i=0;i<group.tests.length;i++) {
            if (group.tests[i].test.equals(testId)) {
                testTime = group.tests[i].time;
                fromGroup = group._id;
            }
        }

        if (!group) res.status(500).send('No match!');

        let test = await dataBase.collection('tests').findOne({_id: testId});
        if (test) {
            clearAnswers(test);
            test.time = testTime;
            test.fromGroup = fromGroup;
            res.status(200).send(test);
        } else {
            res.status(400).send('Could not find a test');
        }
    } catch(error) {
        console.log(error);
    }
});


const checkMistakes = (questions, stencil) => {
    for (let i=0;i<questions.length;i++) {
        if (questions[i].type === "choices") {
            if (questions[i].answer === stencil[i].answer) questions[i].correct = true;
            else questions[i].correct = false;
        }
        if (test.questions[i].type === "truefalse") {
            for (let j=0;j<questions[i].subquestions.length;i++) {
                if (questions[i].subquestions[j] === stencil[i].subquestions[j]) {
                    questions[i].subquestions[j].push('correct');
                } else questions[i].subquestions[j].push('incorrect');
            }
        }
        if (test.questions[i].type === "blanks") console.log();
    }
}


router.post('/savesolved', verify, async (req, res) => {
    console.log('savesolved');
    console.log(req.body);
    let test = req.body.test;
    const userId = oID(req.userId);
    const testId = oID(test._id);
    const groupId = oID(test.fromGroup);

    try {
        var dataBase = db.getDb();

        let group = await dataBase.collection('groups').findOne({
            _id: groupId,
            tests: {$elemMatch: {test: testId}}
        });
        //console.log("autoCheck", group);

        let test;
        for (let i=0;i<group.tests.length;i++) {
            if (group.tests[i].test.equals(testId)) test = group.tests[i];
        }
        console.log(test);
        let autoCheck = test.autoCheck;
        let stencil = await dataBase.collection('tests').findOne({_id: testId});

        /* let insert = await dataBase.collection('solved').insertOne(test);
        if (insert) {
            res.status(200).send("Saved solved");
        } else {
            res.status(400).send('Could not save a test');
        } */
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not save a test');
    }
});

module.exports = router;