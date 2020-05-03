const _ = require('lodash');
var fs = require('fs');


fs.readdir('wheatdata/', function(err, filenames) {
    if (err) {
        onError(err);
        return;
    }

    debugger;

    // filenames.forEach(function(filename) {
    //     fs.readFile(dirname + filename, 'utf-8', function(err, content) {
    //         if (err) {
    //             onError(err);
    //             return;
    //         }
    //         onFileContent(filename, content);
    //     });
    // });
});


// const rootPath = 'modsim-data/' + model + '/';

// // make promise version of fs.readFile()
// fs.readFileAsync = function(filename) {
//     return new Promise(function(resolve, reject) {
//         fs.readFile(filename, { encoding: 'utf8' }, function(err, data) {
//             if (err)
//                 reject(err);
//             else
//                 resolve(data);
//         });
//     });
// };