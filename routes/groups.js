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

            /* if we need a double refference (in user)
            var groupId = await dataBase.collection('groups').insertOne(group).then(result => {
                console.log("x", result.ops[0]._id);
                //return result.ops[0]._id;
            }).catch(error => {
                res.status(400).send('cannot create group');
            }); 

            // add group id to teachers file to array
            console.log(groupId)
            await dataBase.collection('users').updateOne({_id: teacherId}, {$push: {groups: groupId}}).then(result => {
                console.log('Ok');
            }).catch(error => {
                console.log(error);
            });
            res.status(200).send('Group created');
            */
        }
    } catch(error) {
        console.log(error);
    }
});


router.post('/joingroup', verify, async (req, res) => {
    console.log('=====');
    console.log("body", req.body);
    try {
        console.log(req.body.userId);
        studentId = oID(req.body.userId);
        groupName = req.body.name;
        groupPass = req.body.password;
    
        console.log("name:", groupName);
        console.log("pass:", groupPass);

        //console.log('got request for joining group');
        var dataBase = db.getDb();
        //console.log(studentId);

        studentData = await dataBase.collection('users').findOne({_id: oID(studentId)});
        const studentArr = [studentId, studentData.login, studentData.email];
        //console.log('stud details:', studentData);

        await dataBase.collection('groups').updateOne({name: groupName, password: groupPass}, {$addToSet: {members: studentArr}}).then(result => {
            console.log(result.modifiedCount);
            res.status(200).send('Joined the group');
        }); 


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
        if (groups) res.status(200).send(groups);
 
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
            res.status(200).send(group);
            //console.log(group);
        } else {
            res.status(400).send('Bad request');
        }
    } catch(error) {
        console.log(error);
    }  

});


router.post('/deletemembers', verify, async (req, res) => {
    console.log(req.body);
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
    console.log(req.body);
    try {
        let groupId = oID(req.body.groupId);
        let array = req.body.members;
        
        var dataBase = db.getDb();

        studentArr = [];
        for (let i=0;i<array.length;i++) {
            let user = await dataBase.collection('users').findOne({email: array[i]});
            studentArr.push([user._id, user.login, user.email]);
        }
        await dataBase.collection('groups').updateOne({_id: groupId}, {$addToSet: {members: {$each: studentArr}}});
        
        res.status(200).send('Students added');
    } catch(error) {
        console.log(error);
        res.status(400).send('Could not modify group');
    }  
});

module.exports = router;