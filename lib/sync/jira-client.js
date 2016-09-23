/**
 * Created by jeff on 19/09/16.
 */

var fs = require('fs');
var JiraApi = require('jira-client');

require('../common');
var argv = require('../argv');
var git = require('../git');
var server = require('../server');

const CLI_OPTIONS = [
    {
        name: 'host',
        short: 'h',
        type: 'string',
        description: 'JIRA Host'
    },
    {
        name: 'user',
        short: 'u',
        type: 'string',
        description: 'JIRA User'
    },
    {
        name: 'password',
        short: 'p',
        type: 'string',
        description: 'JIRA Password'
    },
    {
        name: 'project',
        short: 'j',
        type: 'string',
        description: 'JIRA Project Name'
    }
];

function JiraClient() {

}

JiraClient.prototype.readJira = function(data, projectName, startAt, issues, totalIssues, callback, errorCallback) {
    var result = data;
    var th1s = this;
    Array.prototype.push.apply(issues, result["issues"]);
    console.log("Items read: %d of %d.", issues.length, totalIssues);
    if (issues.length >= totalIssues) {
        callback(issues);
    } else {
        th1s.api.searchJira('project=' + projectName, {
            startAt: issues.length,
            maxResults: 50
        }).then(function(data) {
            th1s.readJira(data, projectName, issues.length, issues, data["total"], callback, errorCallback);
        }).catch(function(error) {
            errorCallback(error);
        });
    }
};

/**
 * Get issues from Jira
 * @param projectName JIRA Project Name.
 * @param callback Callback when all issues are read.
 * @param errorCallback Error Callback.
 */
JiraClient.prototype.getIssues = function(projectName, callback, errorCallback) {
    var issues = [];
    var th1s = this;
    this.api.searchJira('project=' + projectName).then(function(data) {
        th1s.readJira(data, projectName, 0, issues, data["total"], callback, errorCallback);
    }).catch(function(error) {
        errorCallback(error);
    });
};

//TODO: Complete array definition
const JIRA_FIELDS = {
    ".fields.status": function (local, remote) {
        local.status = remote['fields']['status']['name'];
    },
    ".fields.timeestimate": function (local, remote) {
        local.estimation = parseInt(remote['fields']['timeestimate']) / 3600;
    },
    ".fields.timespent": function (local, remote) {
        local.pending = (parseInt(remote['fields']['timeestimate']) - parseInt(remote['fields']['timespent'])) / 3600;
    },
    ".fields.summary": function (local, remote) {
        local.title = remote['fields']['summary'];
    },
    ".fields.labels": function (local, remote) {
        var labels = remote['fields']['labels'];
        if (typeof labels === 'undefined' ||
            labels.length == 0) {
            return "";
        }
        local.tags = labels.join(',');
    },
    ".fields.assignee": function (local, remote) {
        var assignee = remote['fields']['assignee'];
        local.assignedTo = assignee ? assignee['key'] : null;
    },
    ".fields.*": function (local, remote, fieldName) {
        local['jira_fields_' + fieldName] = remote["fields"][fieldName];
    },
    ".*": function (local, remote, fieldName) {
        local['jira_' + fieldName] = remote[fieldName];
    }
};

/**
 * Get git-task mapped issues.
 * @param issues [{*}]
 */
JiraClient.prototype.getMappedIssues = function(issues) {
    var result = [];
    issues.forEach(function(i) {
        var task = server.mapToLocalTask(i, JIRA_FIELDS);
        task.id = git.createItemId();
        result.push(task);
    });
    return result;
};

/**
 * Validates for null or whitespace string, and complains if that's the case.
 * @param args Command line arguments.
 * @param name Name of the param.
 * @return string Value if not null or whitespace.
 */
JiraClient.prototype.getOrFail = function(args, name) {
    var value = args.options[name];
    if (typeof value === 'undefined' ||
        (typeof value === 'string' && value.isWhitespace())) {
        console.error("Parameter %s is null or empty.", name);
        process.exit(1);
    }
    return value;
};

JiraClient.prototype.mappingTest = function() {
    //var ex = {
    //    "expand": "operations,versionedRepresentations,editmeta,changelog,renderedFields",
    //    "id": "18307",
    //    "self": "https://engineering.atlassian.net/rest/api/2/issue/18307",
    //    "key": "WM-448",
    //    "fields": {
    //        "issuetype": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/issuetype/10002",
    //            "id": "10002",
    //            "description": "A task that needs to be done.",
    //            "iconUrl": "https://engineering.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10318&avatarType=issuetype",
    //            "name": "Task",
    //            "subtask": false,
    //            "avatarId": 10318
    //        },
    //        "timespent": null,
    //        "project": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/project/10002",
    //            "id": "10002",
    //            "key": "WM",
    //            "name": "Wassermeloni",
    //            "avatarUrls": {
    //                "48x48": "https://engineering.atlassian.net/secure/projectavatar?pid=10002&avatarId=10601",
    //                "24x24": "https://engineering.atlassian.net/secure/projectavatar?size=small&pid=10002&avatarId=10601",
    //                "16x16": "https://engineering.atlassian.net/secure/projectavatar?size=xsmall&pid=10002&avatarId=10601",
    //                "32x32": "https://engineering.atlassian.net/secure/projectavatar?size=medium&pid=10002&avatarId=10601"
    //            }
    //        },
    //        "fixVersions": [],
    //        "aggregatetimespent": null,
    //        "resolution": null,
    //        "resolutiondate": null,
    //        "workratio": -1,
    //        "lastViewed": null,
    //        "watches": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/issue/WM-448/watchers",
    //            "watchCount": 1,
    //            "isWatching": false
    //        },
    //        "created": "2016-09-19T18:36:34.000+0200",
    //        "customfield_10020": "Not started",
    //        "customfield_10021": null,
    //        "customfield_10100": "com.atlassian.servicedesk.plugins.approvals.internal.customfield.ApprovalsCFValue@11128c5",
    //        "priority": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/priority/1",
    //            "iconUrl": "https://engineering.atlassian.net/images/icons/priorities/critical.svg",
    //            "name": "Highest",
    //            "id": "1"
    //        },
    //        "customfield_10300": "",
    //        "labels": [
    //            "usability"
    //        ],
    //        "customfield_10016": "file:///home/lago/Downloads/20160916_Anpassungen%20der%20Usability%20login_logout_LS_V0.7.pdf",
    //        "customfield_10017": "1920x1080",
    //        "customfield_10018": null,
    //        "customfield_10019": "Quirks (undefined)",
    //        "timeestimate": null,
    //        "aggregatetimeoriginalestimate": null,
    //        "versions": [],
    //        "issuelinks": [],
    //        "assignee": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/user?username=linda.schott",
    //            "name": "linda.schott",
    //            "key": "linda.schott",
    //            "emailAddress": "lindaschott@aleph.engineering",
    //            "avatarUrls": {
    //                "48x48": "https://avatar-cdn.atlassian.com/97aa60b6e4f0ec567e246161556c675e?s=48&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3FownerId%3Dlinda.schott%26avatarId%3D11101%26noRedirect%3Dtrue",
    //                "24x24": "https://avatar-cdn.atlassian.com/97aa60b6e4f0ec567e246161556c675e?s=24&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dsmall%26ownerId%3Dlinda.schott%26avatarId%3D11101%26noRedirect%3Dtrue",
    //                "16x16": "https://avatar-cdn.atlassian.com/97aa60b6e4f0ec567e246161556c675e?s=16&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dxsmall%26ownerId%3Dlinda.schott%26avatarId%3D11101%26noRedirect%3Dtrue",
    //                "32x32": "https://avatar-cdn.atlassian.com/97aa60b6e4f0ec567e246161556c675e?s=32&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dmedium%26ownerId%3Dlinda.schott%26avatarId%3D11101%26noRedirect%3Dtrue"
    //            },
    //            "displayName": "Linda Schott",
    //            "active": true,
    //            "timeZone": "Europe/Berlin"
    //        },
    //        "updated": "2016-09-19T18:37:13.000+0200",
    //        "status": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/status/10000",
    //            "description": "",
    //            "iconUrl": "https://engineering.atlassian.net/",
    //            "name": "To Do",
    //            "id": "10000",
    //            "statusCategory": {
    //                "self": "https://engineering.atlassian.net/rest/api/2/statuscategory/2",
    //                "id": 2,
    //                "key": "new",
    //                "colorName": "blue-gray",
    //                "name": "To Do"
    //            }
    //        },
    //        "components": [],
    //        "timeoriginalestimate": null,
    //        "description": null,
    //        "customfield_10010": null,
    //        "customfield_10011": null,
    //        "customfield_10012": null,
    //        "customfield_10013": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36",
    //        "customfield_10014": "Chrome 48.0.2564.109",
    //        "customfield_10015": "Linux x86_64",
    //        "customfield_10006": null,
    //        "customfield_10007": "0|i007qv:",
    //        "customfield_10009": null,
    //        "aggregatetimeestimate": null,
    //        "summary": "Password change over logout button",
    //        "creator": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/user?username=eduardo.lago.aguilar",
    //            "name": "eduardo.lago.aguilar",
    //            "key": "eduardo.lago.aguilar",
    //            "emailAddress": "ed@aleph.engineering",
    //            "avatarUrls": {
    //                "48x48": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=48&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3FownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue",
    //                "24x24": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=24&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dsmall%26ownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue",
    //                "16x16": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=16&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dxsmall%26ownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue",
    //                "32x32": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=32&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dmedium%26ownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue"
    //            },
    //            "displayName": "ed",
    //            "active": true,
    //            "timeZone": "America/New_York"
    //        },
    //        "subtasks": [],
    //        "reporter": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/user?username=eduardo.lago.aguilar",
    //            "name": "eduardo.lago.aguilar",
    //            "key": "eduardo.lago.aguilar",
    //            "emailAddress": "ed@aleph.engineering",
    //            "avatarUrls": {
    //                "48x48": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=48&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3FownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue",
    //                "24x24": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=24&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dsmall%26ownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue",
    //                "16x16": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=16&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dxsmall%26ownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue",
    //                "32x32": "https://avatar-cdn.atlassian.com/43f71df3e70c79a30daf0613c513aa62?s=32&d=https%3A%2F%2Fengineering.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dmedium%26ownerId%3Deduardo.lago.aguilar%26avatarId%3D12401%26noRedirect%3Dtrue"
    //            },
    //            "displayName": "ed",
    //            "active": true,
    //            "timeZone": "America/New_York"
    //        },
    //        "customfield_10000": null,
    //        "aggregateprogress": {
    //            "progress": 0,
    //            "total": 0
    //        },
    //        "customfield_10001": null,
    //        "customfield_10200": null,
    //        "customfield_10002": null,
    //        "environment": null,
    //        "duedate": null,
    //        "progress": {
    //            "progress": 0,
    //            "total": 0
    //        },
    //        "votes": {
    //            "self": "https://engineering.atlassian.net/rest/api/2/issue/WM-448/votes",
    //            "votes": 0,
    //            "hasVoted": false
    //        }
    //    }
    //};
    //
    //var task = server.mapToLocalTask(ex, JIRA_FIELDS);
    //console.log(JSON.stringify(task, null, 2));
};

/**
 * Run the CLI.
 */
JiraClient.prototype.run = function() {
    argv.option(CLI_OPTIONS);
    var args = argv.run();
    var host = this.getOrFail(args, "host");
    var userName = this.getOrFail(args, "user");
    var password = this.getOrFail(args, "password");
    var projectName = this.getOrFail(args, "project");

    this.api = new JiraApi({
        protocol: 'https',
        host: host,
        username: userName,
        password: password,
        apiVersion: '2',
        strictSSL: true
    });

    // this.mappingTest();

    var issues = fs.readFileSync('/home/jeff/aleph.engineering/wassermeloni/issues.jira.json');
    var mappedIssues = this.getMappedIssues(JSON.parse(issues));
    mappedIssues.forEach(function(i) {
        fs.writeFileSync('/home/jeff/aleph.engineering/wassermeloni/.tasks/data/' + i.id, JSON.stringify(i));
    });

    //this.getIssues(projectName, function(issues) {
    //    console.log(JSON.stringify(issues, null, 2));
    //}, function(err) {
    //    console.error(err);
    //});
    
};

if (typeof module !== 'undefined')
    module.exports = new JiraClient();

module.exports.run();