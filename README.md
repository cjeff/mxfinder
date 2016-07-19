 #Spreadsheet MX check

 This runs through a directory of MAX Mail detailed invoices in csv form, does an MX lookup on each domain (column "domain Name" in spreadsheet)
 and then exports the new spreadsheets to an output directory. The new spreadsheets will have a column "isMaxUser" added.
 This is only present for lines with an item number of  MailProtection or mailEdge, as that’s the service where MX matters.
 Values can be "True" (MX points to us), "false" (mx does NOT point to us), and "probably not" (MX records could not be pulled, usually due to domain no longer existing or not having mx records anymore)
 **IT IS POSSIBLE FOR A DOMAIN TO STILL USE US FOR OUTBOUND OR TO HAVE A SIBLING THAT POINTS TO US. HOWEVER, WORKING OFF OF THESE VALUES WOULD BE MUCH MORE ACCURATE THAN IGNORING THEM**

 To run in node:
 1. install node
 2. download this repo from github
 3. run "npm install" in terminal to install dependencies
 4. put CSVs in "csvInput" directory. **SPREADSHEETS NEED TO BE SAVED AS CSV**
 5. Create "csvOutput" directory
 6. run "node index.js" to run program. It will take a while. You can possibly speed up the process by adjusting the number of concurrent lookups via the "mxConcurrency" parameter above, but you risk more timeouts

 *PROTIP: Create small sample csv that would alphabetically be first in directory so you can quickly encounter any write issues that need addressing before processing a larger csv*