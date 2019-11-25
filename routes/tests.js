const router = require('express').Router();
const db = require('../db');
const oID = require('mongodb').ObjectID;

const verify = require('./verifyToken');

const fs = require('fs');
const xfs = require('fs-extra');

router.post('/createtest', verify, async (req, res) => {
    let test = JSON.parse(req.body.test);
    test.author = oID(req.user.id);

    //console.log(test);
    // create folder for test
    fs.mkdirSync(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}`, (err) => {
        if (err) throw err;
    });

    // save images 
    for (let i=0;i<test.questions.length;i++) {
        if (test.questions[i].image64 !== undefined && test.questions[i].picture !== undefined) {
            temp = test.questions[i].image64;
            let image = temp.replace(/^data:image\/png;base64,/, "");
            let buff = new Buffer.from(image, 'base64');
        
            fs.writeFile(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}/ex-${i}.png`, buff, (err) => {
                if (err) console.log(err);
            });

            test.questions[i].picture = `static/${req.user.id}/${test.name}/ex-${i}.png`;
        }

        // delete base 64 encoded image and set path to public folder
        delete test.questions[i].image64;
    }

    var dataBase = db.getDb();
    await dataBase.collection('tests').insertOne(test);
    res.status(200).send('OK');
});


router.post('/gettests', verify, async (req, res) => {
    console.log('gettests');
    let teacherId = oID(req.user.id);

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


router.post('/gettest', verify, async (req, res) => {
    let testId = oID(req.body.testId);
    console.log('gettest');

    try {
        var dataBase = db.getDb();
        await dataBase.collection('tests').findOne({_id: testId, author: oID(req.user.id)}).then(result => {
            console.log(">", result);
            res.status(200).send(result);
        }).catch(error => {
            console.log(error);
        })

    } catch(error) {
        console.log(error);
    }
});


router.post('/getsomonestest', verify, async (req, res) => {
    let testId = oID(req.body.testId);
    let teacherId = oID(req.user.id);

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

router.post('/edittest', verify, async (req, res) => {
    console.log('edittest');
    let test = JSON.parse(req.body.test);
    let teacherId = oID(req.user.id);
    let testId = oID(test._id);

    for (let i=0;i<test.questions.length;i++) {

        if (test.questions[i].image64 !== undefined) {
            temp = test.questions[i].image64;
            let image = temp.replace(/^data:image\/png;base64,/, "");
            let buff = new Buffer.from(image, 'base64');
        
            fs.writeFile(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}/ex-${i}.png`, buff, (err) => {
                if (err) console.log(err);
            });

            test.questions[i].picture = `static/${req.user.id}/${test.name}/ex-${i}.png`;
        } 
        
        if (test.questions[i].picture === undefined) {
            console.log(`Checking ex-${i}.png`);
            fs.access(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}/ex-${i}.png`, fs.F_OK, (err) => {
                if (err) {
                    console.log(err);
                }

                fs.unlink(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}/ex-${i}.png`, (err) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log('File Deleted');
                });
            })
        }

    }

    try {
        var dataBase = db.getDb();

        let newAccess = test.access;
        console.log('access:', newAccess);

        if (newAccess !== null && newAccess !== undefined && newAccess.length > 2) {
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
        let test = await dataBase.collection('tests').findOne({_id: testId});


        await dataBase.collection('tests').deleteOne({_id: testId}).then(result => {
            xfs.remove(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}`, err => {
                console.log(err);
            })

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

                if (test) groupTests.push({testId: test._id, testName: test.name, testTime: tests[j].time, groupName: groups[i].name});
            }
            //testsArray.push({testName: test.name, groupName: group[i].name, test: test.questions})
            if (groupTests.length !== 0) testsArray.push(groupTests);
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
        if (questions[i].type === "open") {
            questions[i].answer = "";
            delete questions[i].regularExpression;
            delete questions[i].regArray;
        }

        if (questions[i].type === "choices") {
            questions[i].answer = "";
        }

        if (questions[i].type === "truefalse") {
            for (let j=0;j<questions[i].subquestions.length;j++) questions[i].subquestions[j][1] = "";
        }
        
        if (questions[i].type === "blanks") {

            // prepare for student answer
            questions[i].answer = [];
            delete questions[i].sentences;

            // shuffle blanks
            let number = questions[i].blanks.length;
            for (let j=0;j<number;j++) {
                let random = Math.floor(Math.random() * number)

                let temp = questions[i].blanks[j];
                questions[i].blanks[j] = questions[i].blanks[random];
                questions[i].blanks[random] = temp;

                questions[i].answer.push("")
            }

            // clear sentences and give index
            let lines = questions[i].sentencesArr;
            let num = 0;
            for (let j=0;j<lines.length;j++) {
                let arr = lines[j].split(" ");
                for (let w=0;w<arr.length;w++) {
                    if (arr[w].includes('[')) {
                        arr[w] = "["+num+"]";
                        num++;
                    } 
                }
                questions[i].sentencesArr[j] = arr.join(" ");
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


const checkMistakes = (questions, stencil, test) => {
    console.log('==============')
    console.log('check Mistakes')
    let status = 'graded';
    let allPossiblePoints = 0;
    let allGotPoints = 0;

    for (let i=0;i<questions.length;i++) {
        let numOfQuestions = 0;
        let correct = 0;

        if (questions[i].type === "open") {
            //console.log('open')
            numOfQuestions = stencil[i].regArray.length;

            for (let j=0;j<stencil[i].regArray.length;j++) {
                if (questions[i].answer.indexOf(stencil[i].regArray[j]) !== -1) correct++;
            }
        }
        if (questions[i].type === "choices") {
            //console.log('Choices');
            numOfQuestions = 1;

            if (questions[i].answer === stencil[i].answer[1]) {
                correct++;
                correctAns = true;
            }
        }
        if (questions[i].type === "truefalse") {
            //console.log('TrueFalse');
            numOfQuestions = stencil[i].subquestions.length;

            for (let j=0;j<questions[i].subquestions.length;j++) {
                if (questions[i].subquestions[j][1] === stencil[i].subquestions[j][1]) {
                    questions[i].subquestions[j].push('correct');
                    correct++;
                } else questions[i].subquestions[j].push('incorrect');
            }
        }
        if (questions[i].type === "blanks") {
            //console.log('Blanks');
            numOfQuestions = stencil[i].blanks.length;

            let index = 0;
            let sent = stencil[i].sentencesArr;
            for (let j=0;j<sent.length;j++) {
                let words = sent[j].split(" ");
                for (let k=0;k<words.length;k++) {
                    if (words[k].includes('[')) {
                        let x;
                        if (questions[i].answer[index] === stencil[i].blanks[index]) {
                            correct++;
                            x = 'true';
                        }
                        else x = 'false';
                        words[k] = "[" + questions[i].answer[index] + "," + x + "]";
                        index++;
                    }
                }
                sent[j] = words.join(" ");
            }
            questions[i].answer = sent;
            delete questions[i].sentencesArr
        }

        //in for
        questions[i].correct = (stencil[i].points / numOfQuestions) * correct;
        allPossiblePoints += stencil[i].points;
        allGotPoints += questions[i].correct;
    }

    // change status and give points
    test.status = status;
    test.allPossiblePoints = allPossiblePoints;
    test.allGotPoints = allGotPoints;
}


router.post('/savesolved', verify, async (req, res) => {
    console.log('savesolved');
    //console.log(req.body);
    let test = req.body.test;
    const userId = oID(req.user.id);
    const testId = oID(test._id);
    const groupId = oID(test.fromGroup);

    try {
        var dataBase = db.getDb();

        let group = await dataBase.collection('groups').findOne({
            _id: groupId,
            tests: {$elemMatch: {test: testId}}
        });

        let autoCheck;
        for (let i=0;i<group.tests.length;i++) {
            if (group.tests[i].test.equals(testId)) autoCheck = group.tests[i].autoCheck;
        }

        let stencil = await dataBase.collection('tests').findOne({_id: testId});

        if (autoCheck) checkMistakes(test.questions, stencil.questions, test);

        test.solvedBy = userId;
        delete test._id;

        let insert = await dataBase.collection('solved').insertOne(test);
        if (insert) {
            res.status(200).send("Saved solved");
        } else {
            res.status(400).send('Could not save a test');
        }
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not save a test');
    }
});


router.post('/studentsolved', verify, async (req, res) => {
    console.log('studentsolved');
    const userId = oID(req.user.id);
    console.log(userId)

    try {
        var dataBase = db.getDb();
        let tests = await dataBase.collection('solved').find({solvedBy: userId, status: 'graded'}).toArray();

        console.log(tests)

        for (let i=0;i<tests.length;i++) {
            let group = await dataBase.collection('groups').findOne({_id: oID(tests[i].fromGroup)});
            tests[i].groupName = group.name;
            delete tests[i].questions;
        }

        res.status(200).send(tests);
    } catch(error) {
        console.log(error);
    }
});


router.post('/solvederrors', verify, async (req, res) => {
    console.log('solvederrors')
    const userId = oID(req.user.id);
    const testId = oID(req.body.testId);

    try {
        var dataBase = db.getDb();
        let test = await dataBase.collection('solved').findOne({_id: testId, solvedBy: userId});

        res.status(200).send(test);
    } catch(error) {
        console.log(error);
    }
});

module.exports = router;