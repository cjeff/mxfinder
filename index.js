/**
 * Created by chrisjefferies on 7/14/16.
 */
var dns = require('dns');
var Baby = require('babyparse');
var async = require('async');
var fs = require('fs');

/*

 Spreadsheet MX check

 This runs through MAX Mail detailed invoices in csv form, does an MX lookup on each domain (column "domain Name" in spreadsheet)
 and then exports a new spreadsheet.
 TODO: parameterize input spreadsheet, domain column, output spreadsheet

 */

//counter display object just to visually verify that rows are being processed rather than hanging for several minutes. not necessary for completion
var procCount = {
    errCount: 0,
    goodCount: 0,
    //keep count and send a status update with every 100 processed.
    addProc: function (isGood) {
        if (isGood) {
            this.goodCount++;
            if (this.goodCount % 100 == 0) {
                console.log(this.goodCount, " successfully processed");
            }
        } else {
            this.errCount++;
            if (this.errCount % 100 == 0) {
                console.log(this.errCount, " unsuccessfully processed");
            }
        }
    }
};
var parseIt = function () {
    //work through the juneDomains CSV. will eventually Parameterize
    Baby.parseFiles('juneDomains.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function (results) {
            // go thru results.data with a maximum of 60 simultaneous calls to the function in the 3rd arg. Do function in 4th arg when done
            async.eachLimit(results.data, 60, function (result, callback) {
                    //we only cqre about max mail, not archive, branding or hosting
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

                    fs.writeFile('output.csv', csv, function (err) {
                        if (err) {
                            return console.log(err);
                        } else {
                            console.log("write complete");
                        }
                    });

                });
        }

    })

};

function isMaxMail(domain, callback) {
    if (!domain["Domain Name"]) {
        return callback();
    }
    dns.resolveMx(domain["Domain Name"],
        function (err, res) {
            if (err) {
                //we don't want one lookup's error to stop the presses, as lookup errors are generally correct into (no mx, no name server)
                //we just want to log for measurement
                procCount.addProc(false);
                //errors are probably not using MAX Mail
                domain.isMaxUser = "Probably Not";
                return callback();
            } else {
                for (var i = 0; i < res.length; i++) {
                    var obj = res[i];
                    if (obj.exchange.toString().includes('smtproutes') || obj.exchange.toString().includes('smtpbak')) {
                        //we have a winner
                        procCount.addProc(true);
                        domain.isMaxUser = true;
                        return callback();
                    }
                }
                //loser. addproc is set to true because the MX lookup was successfully completed
                procCount.addProc(true);
                domain.isMaxUser = false;
                return callback();
            }
        }
    );
}

//run script. We'd pass in parameters here
parseIt();