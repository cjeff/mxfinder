/**
 * Created by chrisjefferies on 7/14/16.
 */

/*

 Spreadsheet MX check

 This runs through a directory of MAX Mail detailed invoices in csv form, does an MX lookup on each domain (column "domain Name" in spreadsheet)
 and then exports the new spreadsheets to an output directory. The new spreadsheets will have a column "isMaxUser" added.
 This is only present for lines with an item number of  MailProtection or mailEdge, as that’s the service where MX matters.
 Values can be "True" (MX points to us), "false" (mx does NOT point to us), and "probably not" (MX records could not be pulled, usually due to domain no longer existing or not having mx records anymore)
 **IT IS POSSIBLE FOR A DOMAIN TO STILL USE US FOR OUTBOUND OR TO HAVE A SIBLING THAT POINTS TO US. HOWEVER, WORKING OFF OF THESE VALUES WOULD BE MUCH MORE ACCURATE THAN IGNORING THEM***

 to run in node:
 1- install node
 2- download this repo from github
 3- run "npm install" in terminal to install dependencies
 4- put CSVs in "csvInput" directory. ***SPREADSHEETS NEED TO BE SAVED AS CSV***
 5- Create "csvOutput" directory
 6- run "node index.js" to run program. It will take a while. You can possibly speed up the process by adjusting the number of concurrent lookups via the "mxConcurrency" parameter above, but you risk more timeouts

 PROTIP: Create small sample csv that would alphabetically be first in directory so you can quickly encounter any write issues that need addressing before processing a larger csv

 */


//load dependencies
var dns = require('dns');
var Baby = require('babyparse');
var async = require('async');
var fs = require('fs');
var path = require('path');
var process = require("process");


//edit parameters
//TODO: parameterize domain name lookup column
var startPath = './csvInput/';
var endPath = './csvOutput/';
var mxConcurrency = 60;


//counter display object just to visually verify that rows are being processed rather than taking a half-hour long leap of faith that nothing is hanging. Not necessary for completion
//TODO: turn procCount into object constructor to instantiate for each sheet's parsing
var procCount = {
    errCount: 0,
    goodCount: 0,
    //keep count and send a status update with every 100 processed.
    addProc: function (isGood) {
        //TODO: rewrite for DRY
        if (isGood) {
            this.goodCount++;
            if (this.goodCount % 100 == 0) {
                console.log("%s successfully processed", this.goodCount);
            }
        } else {
            this.errCount++;
            if (this.errCount % 100 == 0) {
                console.log("%s unsuccessfully processed", this.errCount);
            }
        }
    }
};

//for a csv, parse into a json object, do an MX lookup
var parseIt = function (file, callback) {


    Baby.parseFiles(path.join(startPath, file), {
        download: true,
        header: true,
        dynamicTyping: true,
        //TODO: add error logging for actual parse. As error does not always mean parse failure, this will require nuance
        complete: function (results) {
            // go thru results.data with a maximum of *mxConcurrency* simultaneous calls to the function in the 3rd arg. Do function in 4th arg when done
            async.eachLimit(results.data, mxConcurrency, function (result, callback) {
                    //we only care about max mail... not archive, branding or hosting
                    if (result["Item Number"].toString().includes('PROTECTION') || result["Item Number"].toString().includes('EDGE')) {
                        isMaxMail(result, callback);
                    } else {
                        return callback()
                    }
                },
                function (err) {
                    if (err) {
                        console.error(err);
                    }
                    var csv = Baby.unparse(results, {
                        header: true
                    });

                    fs.writeFile(path.join(endPath, file), csv, function (err) {
                        if (err) {
                            console.log(err);
                            return callback(err);
                        } else {
                            //show that the file is complete
                            console.log("%s write complete", file);
                            return callback();
                        }
                    });

                });
        }

    })

};

function isMaxMail(domain, callback) {
    if (!domain["Domain Name"]) {
        //no domain name entry, no need to process
        return callback();
    }
    dns.resolveMx(domain["Domain Name"],
        function (err, res) {
            if (err) {
                //we don't want one lookup's error to stop the presses, as lookup errors are generally correct info (no mx, no name server)
                //we just want to log for measurement
                //TODO: retry lookup ONCE to better eliminate timeout issues as a factor
                procCount.addProc(false);
                //errors are probably not using MAX Mail
                domain.isMaxUser = "Probably Not";
                return callback();
            } else {
                //all we need is a single MX listing for a domain to contain either "smtproutes" or "smtpbak"
                for (var i = 0; i < res.length; i++) {
                    var obj = res[i];
                    if (obj.exchange.toString().includes('smtproutes') || obj.exchange.toString().includes('smtpbak')) {
                        //we have a winner
                        procCount.addProc(true);
                        domain.isMaxUser = true;
                        return callback();
                    }
                }
                //loser. addproc is still set to true because the MX lookup was successfully completed despite giving an answer of "false"
                procCount.addProc(true);
                domain.isMaxUser = false;
                return callback();
            }
        }
    );
}


//loop through the files in the start directory
fs.readdir(startPath, function (err, files) {
    //in case things screw up right out of the gate
    if (err) {
        console.error("Could not list the directory.", err);
        process.exit(1);
    }
    //for every file (assuming they are csv's), pass along for parsing
    async.forEachLimit(files, 1, function (file, callback) {
            //TODO: verify file is CSV
            parseIt(file, callback);
        },
        // wrap up after all files are processed or fatal error encountered
        function (err) {
            if (err) {
                console.error(err);
            } else {
                console.log("ALL FILES WRITTEN!!!!!")
            }

        })
});