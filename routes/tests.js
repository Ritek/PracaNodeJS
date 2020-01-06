const router = require('express').Router();
const db = require('../db');
const oID = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');

const verify = require('./verifyToken');

const fs = require('fs').promises;
const xfs = require('fs-extra');

const {checkString} = require('../checkChars');

router.post('/createtest', verify, async (req, res) => {
    let test = JSON.parse(req.body.test);
    if (checkString(test.name)) return res.status(400).send("Incorrect value");
    test.author = oID(req.user.id);

    if (test._id !== undefined) delete test._id;

    if (test.tags.length > 0) {
        let temp = test.tags;
        let newTags = temp.filter(function(tag) {
            return tag !== "";
        });
        test.tags = newTags;
    } else test.tags = [];

    if (test.access.length > 0) {
        let temp = test.access.split(',');
        let newAccess = temp.filter(function(email) {
            return email !== "";
        });
        test.access = newAccess;
    } else test.access = [];

    // create folder for test
    fs.mkdir(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}`, {recursive: true}, (err) => {
        if (err) throw err;
    }).then(result => {
        // save images 
        for (let i=0;i<test.questions.length;i++) {
            if (test.questions[i].image64 !== undefined && test.questions[i].picture !== undefined) {
                temp = test.questions[i].image64;
                let image = temp.replace(/^data:image\/png;base64,/, "");
                let buff = new Buffer.from(image, 'base64');

                test._id = oID(test._id);
            
                fs.writeFile(`${__dirname+'/../'}/pictures/${req.user.id}/${test.name}/ex-${i}.png`, buff, (err) => {
                    if (err) console.log(err);
                });

                test.questions[i].picture = `ex-${i}.png`;
            }

        // delete base 64 encoded image and set path to public folder
        delete test.questions[i].image64;
    }
    });

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

const getImage = async (userId, testName, i) => {
    console.log(userId, testName, i);
    let data = await fs.readFile(`${__dirname}/../pictures/${userId}/${testName}/ex-${i}.png`);
    let str64 = new Buffer(data).toString('base64');

    return(str64);
}


router.post('/gettest', verify, async (req, res) => {
    let userId = oID(req.user.id);
    if (checkString(req.body.testId)) return res.status(400).send("Incorrect value");
    let testId = oID(req.body.testId);
    console.log('gettest');

    try {
        var dataBase = db.getDb();
        let test = await dataBase.collection('tests').findOne({_id: testId});
        let questions = test.questions;

        for (let i=0;i<questions.length;i++) {
            if (questions[i].picture !== undefined) {
                questions[i].picture = "";
                questions[i].image64 = "";
                questions[i].image64 = (await getImage(test.author, test.name, i)).toString();
            }
        }

        if (test.author !== userId) test.access = "";
        return res.status(200).send(test);
    } catch(error) {
        console.log(error);
    }
});


router.post('/getsomonestest', verify, async (req, res) => {
    console.log('getsomonestest');
    if (checkString(req.body.testId)) return res.status(400).send("Incorrect value");
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
    console.log('tests.js, deletetest');
    let testId = oID(req.body.testId);
    console.log(testId);

    try {
        var dataBase = db.getDb();

        await dataBase.collection('tests').findOne({_id: testId, author: oID(req.user.id)})
        .then(prom1 => {
            dataBase.collection('tests').deleteOne({_id: testId, author: oID(req.user.id)});

            fs.rmdir(`${__dirname+'/../'}/pictures/${req.user.id}/${prom1.name}`, {recursive: true}, err => {
                console.log(err);
            })
        })

        await dataBase.collection('groups').updateMany( 
            { }, 
            { $pull: {tests: {test: testId}} },
            { multi: true }
        );

        return res.status(200).send('OK');

    } catch(error) {
        console.log(error);
        return res.status(400).send('Nope');
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
        //console.log(groups);

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
            if (questions[i].subquestions !== undefined) {
                for (let j=0;j<questions[i].subquestions.length;j++) questions[i].subquestions[j][1] = "";
            }
            
        }
        
        if (questions[i].type === "blanks") {
            // prepare for student answer
            questions[i].answer = [];
            delete questions[i].sentences;

            // shuffle blanks
            if (questions[i].blanks !== undefined && questions[i].blanks !== null && questions[i].blanks.length !== undefined) {
                let number = questions[i].blanks.length;
                for (let j=0;j<number;j++) {
                    let random = Math.floor(Math.random() * number)

                    let temp = questions[i].blanks[j];
                    questions[i].blanks[j] = questions[i].blanks[random];
                    questions[i].blanks[random] = temp;

                    questions[i].answer.push("")
                }
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
            tests: {$elemMatch: {test: testId}},
            $or: [ {members: {$elemMatch: {id: userId}} }, {teacher: userId}],
        });
        
        let testTime;
        let fromGroup;

        if (group) {
            for (let i=0;i<group.tests.length;i++) {
                if (group.tests[i].test.equals(testId)) {
                    testTime = group.tests[i].time;
                    fromGroup = group._id;
                }
            }
        }

        let test = await dataBase.collection('tests').findOne({_id: testId});
        if (test) {
            clearAnswers(test);
            test.time = testTime || 0;
            test.fromGroup = fromGroup || null;

            let temp = test.questions;
            for (let i=0;i<temp.length;i++) {
                if (temp[i].picture !== undefined) temp[i].picture = (await getImage(test.author, test.name, i)).toString();
            }

            let exp = test.time * 60;
            let testToken = jwt.sign({id: userId, test: test.id}, 'secret', {expiresIn: `${exp}s`});
            res.status(200).send({test, testToken});
        } else {
            res.status(400).send('Could not find a test');
        }
    } catch(error) {
        console.log(error);
    }
});


const checkMistakes = (questions, stencil, test, autoCheck) => {
    console.log('==============')
    console.log('check Mistakes')
    let allPossiblePoints = 0;
    let allGotPoints = 0;

    for (let i=0;i<questions.length;i++) {
        let numOfQuestions = 0;
        let correct = 0;

        if (questions[i].type === "open" && autoCheck == true) {
            //console.log('open')
            numOfQuestions = stencil[i].regArray.length;

            for (let j=0;j<stencil[i].regArray.length;j++) {
                if (questions[i].answer.indexOf(stencil[i].regArray[j]) !== -1) correct++;
            }
        } else if (questions[i].type === "open") numOfQuestions = stencil[i].regArray.length;

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
        questions[i].correct = Math.floor( (stencil[i].points / numOfQuestions) * correct );
        allPossiblePoints += stencil[i].points;
        allGotPoints += questions[i].correct;

        //console.log(i, questions[i].correct, stencil[i].points, numOfQuestions);
    }

    // change status and give points
    if (!autoCheck) test.status = "awaiting"
    else test.status = "graded"

    test.allPossiblePoints = allPossiblePoints;
    test.allGotPoints = allGotPoints;
}


router.post('/savesolved', verify, async (req, res) => {
    console.log('savesolved');

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

        checkMistakes(test.questions, stencil.questions, test, autoCheck);

        test.groupName = group.name;
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

    try {
        var dataBase = db.getDb();
        let tests = await dataBase.collection('solved').find({solvedBy: userId, status: 'graded'}).toArray();

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
    const testId = oID(req.body.testId);

    try {
        var dataBase = db.getDb();
        let test = await dataBase.collection('solved').findOne(
            {$or: [
                {_id: testId, solvedBy: oID(req.user.id)},
                {_id: testId, author: req.user.id}
            ]}
        );

        res.status(200).send(test);
    } catch(error) {
        console.log(error);
    }
});



router.post('/getallsolved', verify, async (req, res) => {
    console.log('getallsolved')
    const userId = oID(req.user.id);

    try {
        var dataBase = db.getDb();
        let gradedTests = await dataBase.collection('solved').find({author: req.user.id, status: 'graded'}).toArray();
        let awaitTests = await dataBase.collection('solved').find({author: req.user.id, status: 'awaiting'}).toArray();

        console.log(gradedTests)
        //gradedTests.forEach(element => delete element.questions);
        //awaitTests.forEach(element => delete element.questions);


        res.status(200).send({gradedTests: gradedTests, awaitTests: awaitTests});
    } catch(error) {
        console.log(error);
    }
});


router.post('/savegraded', verify, async (req, res) => {
    console.log('savegraded')
    const test = req.body.test;

    if (!test) return res.status(400).send({msg: 'error'});

    try {
        var dataBase = db.getDb();           
        await dataBase.collection('solved').updateOne({_id: oID(test._id), author: req.user.id}, {$set: {questions: test.questions}}).then(result => {
            if (result.modifiedCount > 0) res.status(200).send({msg: 'Test updated and graded'});
            else res.status(200).send({msg: 'No changes were made'});
        })      
    } catch(error) {
        console.log(error);
    }
});

module.exports = router;