/**
 * Created by jeff on 19/09/16.
 */

require('../common');
var argv = require('../argv');
var JiraApi = require('jira-client');
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
    console.log("Items read: %s.", issues.length);
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
const LOCAL_TASK_MAP_FIELDS = [
    {
        status: function (issue) {
            return issue['fields']['Name'];
        }
    }
];

/**
 * Get git-task mapped issues.
 * @param issues [{*}]
 */
JiraClient.prototype.getMappedIssues = function(issues) {
    //TODO: Map JIRA issues to git-task issues.
};

JiraClient.prototype.run = function() {
    argv.option(CLI_OPTIONS);
    var args = argv.run();
    var host = args.options["host"];
    var userName = args.options["user"];
    var password = args.options["password"];
    var projectName = args.options["project"];

    this.api = new JiraApi({
        protocol: 'https',
        host: host,
        username: userName,
        password: password,
        apiVersion: '2',
        strictSSL: true
    });
    console.log("Here!!");
    this.getIssues(projectName, function(issues) {
        console.log(JSON.stringify(issues, null, 2));
    }, function(err) {
        console.error(err);
    });
};

if (typeof module !== 'undefined')
    module.exports = new JiraClient();

module.exports.run();