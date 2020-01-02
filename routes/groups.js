const router = require('express').Router();
const db = require('../db');
const oID = require('mongodb').ObjectID;

const verify = require('./verifyToken');

router.post('/creategroup', verify, async (req, res) => {

    //let teacherId = oID(req.body.id);
    let teacherId = oID(req.user.id);
    const group = {
        teacher: teacherId,
        name: req.body.name,
        password: req.body.password,
        members: [],
        tests: [],
    }

    try {
        var dataBase = db.getDb();

        // check if group of given name already exists
        const find = await dataBase.collection('groups').findOne({name: group.name});
        if (find) res.status(406).send('Group with given name already exisits');
        else {
            // if not create new group
            await dataBase.collection('groups').insertOne(group);
            res.status(200).send('Group created');
        }
    } catch(error) {
        console.log(error);
    }
});


router.post('/deletegroup', verify, async (req, res) => {
    console.log('delegroup');

    try {
        let groupId = oID(req.body.groupId);
        var dataBase = db.getDb();

        // check if group of given name already exists
        await dataBase.collection('groups').deleteOne({_id: groupId, teacher: oID(req.user.id)}).then(result => {
            res.status(200).send('Deleted');
        }).catch(error => {
            console.log(error);
        })
    } catch(error) {
        console.log(error);
        res.status(500).send('Error');
    }
});



router.post('/joingroup', verify, async (req, res) => {
    
    try {
        let studentId = oID(req.user.id);
        let groupName = req.body.name;
        let groupPass = req.body.password;

        var dataBase = db.getDb();

        let group = await dataBase.collection('groups').findOne({name: groupName, password: groupPass});

        if (!group) res.status(406).send('Could not join the group');
        else {
            dataBase.collection('groups').updateOne({name: groupName, password: groupPass}, {$addToSet: {members: studentId}}).then(result => {
                if (result.modifiedCount > 0) res.status(200).send('Joined the group');
                else res.status(406).send('Already in group!');
            }).catch(error => {
                console.log(error);
                res.status(504).send('Server error');
            });
        }

        /* await dataBase.collection('groups').updateOne({name: groupName, password: groupPass}, {$addToSet: {members: studentId}}).then(result => {
            if (result.modifiedCount > 0) res.status(200).send('Joined the group');
            else res.status(406).send('Could not join!');
        }).catch(error => {
            console.log(error);
            res.status(504).send('Server error');
        }) */
    } catch(error) {
        console.log(error);
    }
});


router.post('/getgroups', verify, async (req, res) => {
    let teacherId = oID(req.user.id);

    try {
        var dataBase = db.getDb();

        const groups = await dataBase.collection('groups').find({teacher: teacherId}).toArray();
        if (groups) {
            for (let i=0;i<groups.length;i++) {
                let members = groups[i].members;
                let temp = [];
                for (let j=0;j<members.length;j++) {
                    let person = await dataBase.collection('users').findOne({_id: oID(members[j].id)});
                    temp.push({id: person._id, login: person.login, email: person.email});
                }
                groups[i].members = temp;
            }
            res.status(200).send(groups);
        }
 
    } catch(error) {
        console.log(error);
    }  

});


router.post('/getgroup', verify, async (req, res) => {
    let groupId = oID(req.body.groupId);
    console.log(req.body.groupId);
    let userId = oID(req.user.id);

    try {
        var dataBase = db.getDb();

        const group = await dataBase.collection('groups').findOne({_id: groupId, teacher: userId});
        console.log(group);

        let testsNotInGroup = [];
        let testsInGroup = [];
        let filter = [];
    
        for (let i=0;i<group.tests.length;i++) {
            console.log(group.tests[i].test);
            let test = await dataBase.collection('tests').findOne({ _id: oID(group.tests[i].test) });
            testsInGroup.push({id: test._id, name: test.name, tags: test.tags, time: group.tests[i].time, autoCheck: group.tests[i].autoCheck})
            filter.push(test._id);
        }

        testsNotInGroup = await dataBase.collection('tests').find({_id: {$nin: filter}}).toArray();
        for (let i=0;i<testsNotInGroup.length;i++) {
            delete testsNotInGroup[i].questions;
        }
        delete group.tests;

        if (group) res.status(200).send({group: group, inGroup: testsInGroup, notInGroup: testsNotInGroup});
    } catch(error) {
        console.log(error);
        res.status(400).send('Bad request');
    }  

});


router.post('/deletemembers', verify, async (req, res) => {
    try {
        let groupId = oID(req.body.groupId);
        let array = req.body.members;

        console.log(groupId);
        console.log(array);
        
        var dataBase = db.getDb();

        await dataBase.collection('groups').updateOne({_id: groupId}, {$set: {members: array}});
        
        res.status(200).send('Students deleted');
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


router.post('/addmembers', verify, async (req, res) => {
    try {
        console.log(req.body);
        let groupId = oID(req.body.groupId);
        console.log(req.body.members);
        let array = req.body.members;

        console.log('groupId', groupId);
        
        var dataBase = db.getDb();

        let newMembers = [];
        for (let i=0;i<array.length;i++) {
            let student = await dataBase.collection('users').findOne({email: array[i]});
            if (student) newMembers.push({id: student._id, login: student.login, email: student.email});
        }

        await dataBase.collection('groups').updateOne({_id: groupId}, {$addToSet: {members: {$each: newMembers}}});
        let group = await dataBase.collection('groups').findOne({id: groupId});
        
        console.log(group);
        res.status(200).send(group.members);
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


router.post('/addtests', verify, async (req, res) => {
    let groupId = oID(req.body.groupId);
    let testArray = req.body.tests;
    //console.log(req.body);

    let tempTestArray = [];

    for (let i=0;i<testArray.length;i++) {
        tempTestArray.push({test: oID(testArray[i]), time: 45, autoCheck: false});
    }

    //console.log(groupId);
    //console.log(testArray);

    try {
        var dataBase = db.getDb();
        await dataBase.collection('groups').updateOne({_id: groupId}, {$addToSet: {tests: {$each: tempTestArray}}});
        res.status(200).send('Tests added');
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


router.post('/deletetests', verify, async (req, res) => {
    console.log('deletetests');
    let groupId = oID(req.body.groupId);
    let testArray = req.body.tests;
    let userId = oID(req.user.id);


    for (let i=0;i<testArray.length;i++) testArray[i] = oID(testArray[i]);

    try {
        var dataBase = db.getDb();
        let group = await dataBase.collection('groups').findOne({_id: groupId, teacher: userId});
        if (!group) res.status(500).send('Access forbidden');
        else {
            await dataBase.collection('groups').update(
                {_id: groupId, teacher: userId}, 
                { $pull: {tests: {test: {$in: testArray}}} }
            );

            res.status(200).send('Deleted');
        }
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


router.post('/updatetestprops', verify, async (req, res) => {
    console.log('updatetestprops');

    let groupId = oID(req.body.groupId);
    let userId = oID(req.user.id);
    let testId = oID(req.body.testId);

    let time = parseInt(req.body.time);
    let autoCheck = req.body.autoCheck;

    if (time % 1 !== 0) Math.trunc(time);

    try {
        var dataBase = db.getDb();
        let group = await dataBase.collection('groups').update({_id: groupId, teacher: userId, "tests.test": testId}, 
            {$set: {"tests.$.time": parseInt(time), "tests.$.autoCheck": autoCheck}
        });
        console.log(group);

        res.status(200).send('Time changed');
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


module.exports = router;