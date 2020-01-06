const forbidden = ['*', '/', '\\', '{', '}', ';', "'", "\"", "<", ">", "$", 
                            ":", "?", "-", "+", "=", "(", ")", "%"];

const checkString = (str) => {
    if (forbidden.some(function(v) { return str.indexOf(v) >= 0})) return true;
    else return false;
}

module.exports.checkString = checkString;