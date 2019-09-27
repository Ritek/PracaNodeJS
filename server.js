const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const app = express();

const cookieParser = require('cookie-parser');

const db = require('./db');

//app.use(cors());
dotenv.config();

//import routes
const authRoute = require('./routes/auth');
const postRoute = require('./routes/posts');// change later!!!
const groupRoute = require('./routes/groups');
const userRoute = require('./routes/userDetails');

//neaded middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.get('/', (req,res) => {
    res.send('Home route works');
});

//router routes
app.use('/api/user', authRoute);
app.use('/api/post', postRoute);
app.use('/api/groups', groupRoute);
app.use('/api/userinfo', userRoute);

db.connect( ( err, client ) => {
    if (err) console.log(err);
    else {
        console.log('Connected to database!');
        app.listen(5000, () => console.log('Server listening on port 5000'));
    }
});