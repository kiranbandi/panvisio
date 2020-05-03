const _ = require('lodash');
var fs = require('fs');


fs.readdir('wheatdata/', function(err, filenames) {
    if (err) {
        onError(err);
        return;
    }

    let gffFiles = _.filter(filenames, (d) => d.indexOf('gff') > -1);

    gffFiles.reduce((p, gffFilename) => {
        return p.then(() => {
            return new Promise((resolve, reject) => {
                fs.readFile('wheatdata/' + gffFilename, 'utf-8', function(err, gffFileData) {
                    if (err) {
                        onError(err);
                        return;
                    }

                    processGFF(gffFileData).then((data) => {

                        let { genomeLibrary, chromosomeMap } = data;

                        const referenceName = gffFilename.split('_coordinate')[0],
                            collinearFileName = referenceName + '_collinear.collinearity';

                        fs.readFile('wheatdata/' + collinearFileName, 'utf-8', function(err, collinearData) {

                            let newData = processCollinear(collinearData);

                            let modifiedList = [];

                            _.map(newData.alignmentList, (alignment) => {

                                if (chromosomeMap.has(alignment.source) && chromosomeMap.has(alignment.target)) {

                                    let firstLink = alignment.links[0],
                                        lastLink = alignment.links[alignment.links.length - 1];

                                    let sourceGenes = genomeLibrary.get(firstLink.source).start < genomeLibrary.get(lastLink.source).start ? [firstLink.source, lastLink.source] : [lastLink.source, firstLink.source];
                                    let targetGenes = genomeLibrary.get(firstLink.target).start < genomeLibrary.get(lastLink.target).start ? [firstLink.target, lastLink.target] : [lastLink.target, firstLink.target];

                                    _.each([0, 1], (value) => {
                                        sourceGenes[value] = genomeLibrary.get(sourceGenes[value]).start;
                                        targetGenes[value] = genomeLibrary.get(targetGenes[value]).start;
                                    })

                                    let sourceChromosome = chromosomeMap.get(alignment.source),
                                        targetChromosome = chromosomeMap.get(alignment.target);

                                    let sourceGeneWidth = (sourceGenes[1] - sourceGenes[0]),
                                        targetGeneWidth = (targetGenes[1] - targetGenes[0]),
                                        sourceX = (sourceGenes[0] - sourceChromosome.start),
                                        targetX = (targetGenes[0] - targetChromosome.start),
                                        // pick the one with the smaller width and ensure the minimum is 2px
                                        linkWidth = Math.max(sourceGeneWidth, targetGeneWidth, 2);

                                    modifiedList.push({
                                        ...alignment,
                                        sourceX,
                                        sourceGeneWidth,
                                        targetX,
                                        targetGeneWidth
                                    });
                                }
                            });

                            let coordinateDataFile = [...chromosomeMap].map((d) => [d[1].speciesIdentifier, d[0], d[1].start, d[1].end, d[1].width].join('\t')).join('\n');

                            let collinearDataFile = modifiedList.map((d) => {
                                return [d.source, d.target, d.e_value, d.count, d.score, d.sourceX, d.sourceGeneWidth, d.targetX, d.targetGeneWidth].join('\t');
                            }).join('\n');

                            fs.writeFile('wheatdata/processed_data/' + referenceName + '.gff', coordinateDataFile, (err) => {
                                if (err) throw err;
                                fs.writeFile('wheatdata/processed_data/' + referenceName + '.col', collinearDataFile, (err) => {
                                    if (err) throw err;
                                    console.log(referenceName + ' processing complete');
                                    resolve();
                                });
                            });
                        });
                    });
                });
            });
        })
    }, Promise.resolve());

});






function processGFF(gffData, additionalParams = {}) {

    return new Promise((resolve, reject) => {

        let genomeEntry,
            genomeLibrary = new Map(),
            chromosomeMap = new Map(),
            { processScaffolds = false } = additionalParams;

        gffData.split('\n').forEach(function(line) {

                genomeEntry = line.split("\t");
                // 4 tab seperated entries , 1st in chromosome index , 2nd is unique gene id ,3rd and 4th are the start and end positions
                let chromosomeId = genomeEntry[0],
                    speciesIdentifier = genomeEntry[0].slice(0, 2),
                    geneStart = parseInt(genomeEntry[2]),
                    geneEnd = parseInt(genomeEntry[3]),
                    geneId = genomeEntry[1];

                // Taking in only non scafflod entries - unwanted entries end up being parsed as NaN and this filters them
                if (chromosomeId.length >= 2 && (chromosomeId.length <= (processScaffolds ? 25 : 4))) {
                    genomeLibrary.set(geneId, {
                            'start': geneStart,
                            'end': geneEnd,
                            // the first 2 characters are the genome name and can be removed
                            'chromosomeId': chromosomeId
                        })
                        // To create a list of the start and end of all chromosomes
                    if (!chromosomeMap.has(chromosomeId)) {
                        chromosomeMap.set(chromosomeId, {
                            start: geneStart,
                            end: geneEnd,
                            'speciesIdentifier': speciesIdentifier
                        });
                    } else {
                        var entry = chromosomeMap.get(chromosomeId);
                        if (geneStart < entry.start) {
                            entry.start = geneStart;
                        }
                        if (geneEnd > entry.end) {
                            entry.end = geneEnd;
                        }
                        chromosomeMap.set(chromosomeId, entry);
                    }
                }
            })
            // once all parsing is done set width of each chromosome
        chromosomeMap.forEach((chromosome) => {
            chromosome.width = chromosome.end - chromosome.start;
        })
        resolve({ genomeLibrary, chromosomeMap });
    });

};




// worker written in vanilla javascript 
function processCollinear(collinearityData) {
    // The first 11 lines contain information regarding the MCSCANX Parameters
    // and can be processed seperately 
    var FileLines = collinearityData.split('\n'),
        alignmentList = [],
        alignmentBuffer = {};
    // remove the first 11 lines and then process the file line by line
    FileLines.slice(11).forEach(function(line, index) {
            if (line.indexOf('Alignment') > -1) {
                // store the previous alignment in list , 
                // and skip for the first iteration since buffer is empty
                if (alignmentBuffer.links) {
                    alignmentList.push(alignmentBuffer);
                }
                alignmentBuffer = parseAlignmentDetails(line);
                alignmentBuffer.links = [];
            } else if (line.trim().length > 1) {
                // condition to skip empty lines
                alignmentBuffer.links.push(parseLink(line));
            }
        })
        // push the last alignment still in the buffer
    alignmentList.push(alignmentBuffer);
    return { "alignmentList": alignmentList };
};


function parseAlignmentDetails(alignmentDetails) {
    let alignmentDetailsList = alignmentDetails.split(' ');
    return {
        'score': Number(alignmentDetailsList[3].split('=')[1].trim()),
        'e_value': Number(alignmentDetailsList[4].split('=')[1].trim()),
        'count': Number(alignmentDetailsList[5].split('=')[1].trim()),
        'type': alignmentDetailsList[7].trim() == 'plus' ? 'regular' : 'flipped',
        'source': alignmentDetailsList[6].split('&')[0].trim(),
        'target': alignmentDetailsList[6].split('&')[1].trim(),
        'sourceKey': Number(alignmentDetailsList[6].split('&')[0].trim().slice(2)),
        'targetKey': Number(alignmentDetailsList[6].split('&')[1].trim().slice(2)),
        'alignmentID': Number(alignmentDetailsList[2].split(':')[0].trim())
    };
}

function parseLink(link) {
    let linkInfo = link.split('\t');
    return {
        'source': linkInfo[1],
        'target': linkInfo[2],
        'e_value': linkInfo[3]
    };
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}