const _ = require('lodash');
var fs = require('fs');

fs.readdir('wheatdata/processed_data/', function(err, filenames) {
    if (err) {
        onError(err);
        return;
    }

    let gffFiles = _.filter(filenames, (d) => d.indexOf('gff') > -1);

    debugger;

    const globalData = {};

    gffFiles.reduce((p, gffFilename) => {
        return p.then(() => {
            return new Promise((resolve, reject) => {
                fs.readFile('wheatdata/processed_data/' + gffFilename, 'utf-8', function(err, filecontent) {
                    if (err) {
                        onError(err);
                        return;
                    }

                    let line = filecontent.split("\n");

                    _.map(line, (d) => {
                        let dataentry = d.split('\t');
                        dataentryKey = dataentry[1];
                        if (!globalData[dataentryKey]) {
                            globalData[dataentryKey] = dataentry;
                        }
                    })

                    resolve();


                })
            })
        })
    }, Promise.resolve()).then((d) => {


        const combinedFileData = _.map(globalData, (d) => d.join('\t')).join('\n');

        fs.writeFile('wheatdata/processed_data/combined.gff', combinedFileData, (err) => {
            if (err) throw err;
            console.log('file written')
        });

    });




});