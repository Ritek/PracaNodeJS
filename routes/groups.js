const router = require('express').Router();
const db = require('../db');
const oID = require('mongodb').ObjectID;

const verify = require('./verifyToken');

router.post('/creategroup', async (req, res) => {

    let teacherId = oID(req.body.id);
    const group = {
        teacher: teacherId,
        name: req.body.name,
        password: req.body.password,
        members: [],
        tests: [],
    }

    try {
        //console.log('got request for group');
        var dataBase = db.getDb();

        // check if group of given name already exists
        const find = await dataBase.collection('groups').findOne({name: group.name});
        if (find) res.status(400).send('Group with given name already exisits');
        else {
            // if not create new group
            await dataBase.collection('groups').insertOne(group);
            res.status(200).send('Group created');
        }
    } catch(error) {
        console.log(error);
    }
});


router.post('/joingroup', verify, async (req, res) => {
    try {
        studentId = oID(req.body.userId);
        groupName = req.body.name;
        groupPass = req.body.password;

        var dataBase = db.getDb();

        //studentData = await dataBase.collection('users').findOne({_id: oID(studentId)});
        //const studentArr = [studentId, studentData.login, studentData.email];

        await dataBase.collection('groups').updateOne({name: groupName, password: groupPass}, {$addToSet: {members: studentId}}).then(result => {
            //console.log(result.modifiedCount);
            res.status(200).send('Joined the group');
        }).catch(error => {
            res.status(400).send('Could not join!');
        })


    } catch(error) {
        console.log(error);
    }
});


router.post('/getgroups', verify, async (req, res) => {
    teacherId = oID(req.body.teacherId);
    //console.log(req.headers);

    try {
        var dataBase = db.getDb();

        const groups = await dataBase.collection('groups').find({teacher: teacherId}).toArray();
        if (groups) {
            for (let i=0;i<groups.length;i++) {
                let members = groups[i].members;
                let temp = [];
                for (let j=0;j<members.length;j++) {
                    let person = await dataBase.collection('users').findOne({_id: oID(members[j])});
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


router.post('/getgroup', async (req, res) => {
    groupId = oID(req.body.groupId);
    //console.log('get groups:', req.body);

    try {
        var dataBase = db.getDb();

        const group = await dataBase.collection('groups').findOne({_id: groupId});
        if (group) {
            //res.status(200).send(group);
            let temp = [];  
            for (let i=0;i<group.members.length;i++) {
                let user = await dataBase.collection('users').findOne({_id: group.members[i]});
                temp.push({id: user._id, login: user.login, email: user.email});
            }
            group.members = temp;
            res.status(200).send(group);
        } else {
            res.status(400).send('Bad request');
        }
    } catch(error) {
        console.log(error);
    }  

});


router.post('/deletemembers', verify, async (req, res) => {
    try {
        let groupId = oID(req.body.groupId);
        let array = req.body.members;
        
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
        let groupId = oID(req.body.groupId);
        let array = req.body.members;
        
        var dataBase = db.getDb();

        let newMembers = [];
        for (let i=0;i<array.length;i++) {
            let student = await dataBase.collection('users').findOne({email: array[i]});
            if (student) newMembers.push(student._id);
        }
        await dataBase.collection('groups').updateOne({_id: groupId}, {$addToSet: {members: {$each: newMembers}}});
        
        res.status(200).send('Students added');
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


router.post('/addtests', async (req, res) => {
    let groupId = oID(req.body.groupId);
    let testArray = req.body.tests;

    console.log(groupId);
    console.log(testArray);

    try {
        var dataBase = db.getDb();
        await dataBase.collection('groups').updateOne({_id: groupId}, {$addToSet: {tests: {$each: testArray}}});
        res.status(200).send('Students added');
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


router.post('/deletetests', async (req, res) => {
    let groupId = oID(req.body.groupId);
    let testArray = req.body.tests;

    console.log("id", groupId);
    console.log("arr", testArray);

    try {
        var dataBase = db.getDb();
        let group = await dataBase.collection('groups').findOne({_id: groupId});

        let filtered = group.tests.filter(function(test) {
            return this.indexOf(test) < 0;
        }, testArray);

        await dataBase.collection('groups').updateOne({_id: groupId}, {$set: {tests: filtered}}).then(result => {
            res.status(200).send('Deleted tests');
        }).catch(error => {
            res.status(400).send('Error');
        })
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});


module.exports = router;