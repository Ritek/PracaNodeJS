const router = require('express').Router();
const verify = require('./verifyToken');
const fs = require('fs');

//const cos = require('../pictures');

router.post('/', verify, (req, res) => {
    res.json({posts: {
        title: 'my first post', 
        description: 'random data you shouldnt access'}
    });
})

router.post('/image', async (req, res) => {
    if (req.files === null) return res.status(400).send('Nope');
    console.log(req);

    console.log(req.files.image);
    const file = req.files.image;

    try {
        if (!fs.existsSync(`${__dirname+'/../'}/pictures/cos/`)) {
            fs.mkdirSync(`${__dirname+'/../'}/pictures/cos/`);
        }

        file.mv(`${__dirname+'/../'}/pictures/${req.user.id}/${file.name}`);
    } catch(error) {
        console.log(error);
        res.status(400).send('Error');
    } 

    res.status(200).send({msg: 'ok', path: `/cos/${file.name}`});
})

module.exports = router;