const MongoClient = require( 'mongodb' ).MongoClient;
const url = "mongodb://localhost:27017";

var mongodb;

const connect = (callback) => {
    MongoClient.connect( url,  { useNewUrlParser: true, useUnifiedTopology: true }, function( err, client ) {
        mongodb  = client.db('praca');
        return callback( err );
    });
}

const getDb = () => {
    return mongodb;
}

const close = () => {
    mongodb.close();
}

module.exports = {
  connect,
  getDb,
  close,
};