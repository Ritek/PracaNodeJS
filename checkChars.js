const forbidden = ['*', '/', '\\', '{', '}', ';', "'", "\"", "<", ">", "$", 
                            ":", "?", "-", "+", "=", "(", ")", "%"];

const checkString = (str) => {
    if (str.length === "") return true;
    else if (forbidden.some(function(v) {return str.indexOf(v) >= 0})) return true;
    else return false;
}

module.exports.checkString = checkString;