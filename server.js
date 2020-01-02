const express = require('express');
const dotenv = require('dotenv');
//const cors = require('cors');
const app = express();

const fileUpload = require('express-fileupload');

const cookieParser = require('cookie-parser');

const db = require('./db');

//app.use(cors());
dotenv.config();

//import routes
const authRoute = require('./routes/auth');
const postRoute = require('./routes/posts');// change later!!!
const groupRoute = require('./routes/groups');
const userRoute = require('./routes/userDetails');
const testsRoute = require('./routes/tests');

//neaded middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use(fileUpload());
//app.use('/static', express.static('pictures'));

app.get('/', (req,res) => {
    res.send('Home route works');
});

//router routes
app.use('/api/user', authRoute);
app.use('/api/post', postRoute);
app.use('/api/groups', groupRoute);
app.use('/api/userinfo', userRoute);
app.use('/api/tests', testsRoute);

db.connect( ( err, client ) => {
    if (err) console.log(err);
    else {
        console.log('Connected to database!');
        app.listen(5000, () => console.log('Server listening on port 5000'));
    }
});