/**
 * Created by jeff on 13/10/16.
 */

var describe = require('mocha').describe;
var before = require('mocha').before;
var it = require('mocha').it;
var expect = require('expect.js');
var client = require('../../lib/sync/jira_client');

describe('JiraClient', function () {
    var ex;
    before(function () {
        ex = {
            "expand": "operations,versionedRepresentations,editmeta,changelog,renderedFields",
            "id": "18307",
            "self": "https://myproject.atlassian.net/rest/api/2/issue/18307",
            "key": "MP-448",
            "fields": {
                "issuetype": {
                    "self": "https://myproject.atlassian.net/rest/api/2/issuetype/10002",
                    "id": "10002",
                    "description": "A task that needs to be done.",
                    "iconUrl": "https://myproject.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10318&avatarType=issuetype",
                    "name": "Task",
                    "subtask": false,
                    "avatarId": 10318
                },
                "timespent": null,
                "project": {
                    "self": "https://myproject.atlassian.net/rest/api/2/project/10002",
                    "id": "10002",
                    "key": "WM",
                    "name": "Wassermeloni",
                    "avatarUrls": {
                        "48x48": "https://myproject.atlassian.net/secure/projectavatar?pid=10002&avatarId=10601",
                        "24x24": "https://myproject.atlassian.net/secure/projectavatar?size=small&pid=10002&avatarId=10601",
                        "16x16": "https://myproject.atlassian.net/secure/projectavatar?size=xsmall&pid=10002&avatarId=10601",
                        "32x32": "https://myproject.atlassian.net/secure/projectavatar?size=medium&pid=10002&avatarId=10601"
                    }
                },
                "fixVersions": [],
                "aggregatetimespent": null,
                "resolution": null,
                "resolutiondate": null,
                "workratio": -1,
                "lastViewed": null,
                "watches": {
                    "self": "https://myproject.atlassian.net/rest/api/2/issue/MP-448/watchers",
                    "watchCount": 1,
                    "isWatching": false
                },
                "created": "2016-09-19T18:36:34.000+0200",
                "customfield_10020": "Not started",
                "customfield_10021": null,
                "customfield_10100": "com.atlassian.servicedesk.plugins.approvals.internal.customfield.ApprovalsCFValue@11128c5",
                "priority": {
                    "self": "https://myproject.atlassian.net/rest/api/2/priority/1",
                    "iconUrl": "https://myproject.atlassian.net/images/icons/priorities/critical.svg",
                    "name": "Highest",
                    "id": "1"
                },
                "customfield_10300": "",
                "labels": [
                    "usability"
                ],
                "customfield_10016": "file:///home/wayne/Downloads/20160916_Anpassungen%20der%20Usability%20login_logout_LS_V0.7.pdf",
                "customfield_10017": "1920x1080",
                "customfield_10018": null,
                "customfield_10019": "Quirks (undefined)",
                "timeestimate": null,
                "aggregatetimeoriginalestimate": null,
                "versions": [],
                "issuelinks": [],
                "assignee": {
                    "self": "https://myproject.atlassian.net/rest/api/2/user?username=linda.smith",
                    "name": "linda.smith",
                    "key": "linda.smith",
                    "emailAddress": "lindasm@myproject",
                    "avatarUrls": {
                        "48x48": "https://avatar-cdn.atlassian.com/970060b6e4f0ec567e246161556c675e?s=48&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3FownerId%3Dlinda.smith%26avatarId%3D11101%26noRedirect%3Dtrue",
                        "24x24": "https://avatar-cdn.atlassian.com/970060b6e4f0ec567e246161556c675e?s=24&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dsmall%26ownerId%3Dlinda.smith%26avatarId%3D11101%26noRedirect%3Dtrue",
                        "16x16": "https://avatar-cdn.atlassian.com/970060b6e4f0ec567e246161556c675e?s=16&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dxsmall%26ownerId%3Dlinda.smith%26avatarId%3D11101%26noRedirect%3Dtrue",
                        "32x32": "https://avatar-cdn.atlassian.com/970060b6e4f0ec567e246161556c675e?s=32&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dmedium%26ownerId%3Dlinda.smith%26avatarId%3D11101%26noRedirect%3Dtrue"
                    },
                    "displayName": "Linda Smith",
                    "active": true,
                    "timeZone": "Europe/Berlin"
                },
                "updated": "2016-09-19T18:37:13.000+0200",
                "status": {
                    "self": "https://myproject.atlassian.net/rest/api/2/status/10000",
                    "description": "",
                    "iconUrl": "https://myproject.atlassian.net/",
                    "name": "To Do",
                    "id": "10000",
                    "statusCategory": {
                        "self": "https://myproject.atlassian.net/rest/api/2/statuscategory/2",
                        "id": 2,
                        "key": "new",
                        "colorName": "blue-gray",
                        "name": "To Do"
                    }
                },
                "components": [],
                "timeoriginalestimate": null,
                "description": null,
                "customfield_10010": null,
                "customfield_10011": null,
                "customfield_10012": null,
                "customfield_10013": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36",
                "customfield_10014": "Chrome 48.0.2564.109",
                "customfield_10015": "Linux x86_64",
                "customfield_10006": null,
                "customfield_10007": "0|i007qv:",
                "customfield_10009": null,
                "aggregatetimeestimate": null,
                "summary": "Password change over logout button",
                "creator": {
                    "self": "https://myproject.atlassian.net/rest/api/2/user?username=bruce.wayne",
                    "name": "bruce.wayne",
                    "key": "bruce.wayne",
                    "emailAddress": "bruce@myproject",
                    "avatarUrls": {
                        "48x48": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=48&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3FownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue",
                        "24x24": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=24&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dsmall%26ownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue",
                        "16x16": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=16&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dxsmall%26ownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue",
                        "32x32": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=32&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dmedium%26ownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue"
                    },
                    "displayName": "ed",
                    "active": true,
                    "timeZone": "America/New_York"
                },
                "subtasks": [],
                "reporter": {
                    "self": "https://myproject.atlassian.net/rest/api/2/user?username=bruce.wayne",
                    "name": "bruce.wayne",
                    "key": "bruce.wayne",
                    "emailAddress": "bruce@myproject",
                    "avatarUrls": {
                        "48x48": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=48&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3FownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue",
                        "24x24": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=24&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dsmall%26ownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue",
                        "16x16": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=16&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dxsmall%26ownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue",
                        "32x32": "https://avatar-cdn.atlassian.com/4fff1df3e70c79a30daf0613c513aa62?s=32&d=https%3A%2F%2Fmyproject.atlassian.net%2Fsecure%2Fuseravatar%3Fsize%3Dmedium%26ownerId%3Dbruce.wayne%26avatarId%3D12401%26noRedirect%3Dtrue"
                    },
                    "displayName": "ed",
                    "active": true,
                    "timeZone": "America/New_York"
                },
                "customfield_10000": null,
                "aggregateprogress": {
                    "progress": 0,
                    "total": 0
                },
                "customfield_10001": null,
                "customfield_10200": null,
                "customfield_10002": null,
                "environment": null,
                "duedate": null,
                "progress": {
                    "progress": 0,
                    "total": 0
                },
                "votes": {
                    "self": "https://myproject.atlassian.net/rest/api/2/issue/MP-448/votes",
                    "votes": 0,
                    "hasVoted": false
                }
            }
        };
    });

    it('#mapJiraTaskToLocal should map to a local git task', function () {
        var task = client.mapJiraTaskToLocal(ex);
        expect(task).to.have.property('id');
        expect(task).to.have.property('jira_id', '18307');
        expect(task).to.have.property('status', 'To Do');
        expect(task).to.have.property('updatedAt', new Date('2016-09-19T18:37:13.000+0200').getTime());
    })
});