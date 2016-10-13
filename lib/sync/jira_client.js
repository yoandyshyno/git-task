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
    ".fields.created": function (local, remote) {
        local.createdAt = new Date(remote['fields']['created']).getTime();
    },
    ".fields.updated": function (local, remote) {
        local.updatedAt = new Date(remote['fields']['updated']).getTime();
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

/**
 * Test the commit with a tag.
 */
JiraClient.prototype.commitSortedTasks = function() {
    var dir = process.env.DIRECTORY_ORDER_TEST;
    process.chdir(dir);
    server.commitAfterSort(dir);
};

/**
 * Map a JIRA task to a local task.
 * @param jiraTask JIRA task.
 */
JiraClient.prototype.mapJiraTaskToLocal = function (jiraTask) {
    var task = server.mapToLocalTask(jiraTask, JIRA_FIELDS);
    task.id = git.createItemId();
    return task;
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

    //var source = process.env.JIRA_JSON_FILE;
    //var dest = process.env.NEW_TASKS_DEST_DIR;
    //var issues = fs.readFileSync(source);
    //var mappedIssues = this.getMappedIssues(JSON.parse(issues));
    //mappedIssues.forEach(function(i) {
    //    fs.writeFileSync(dest + '/' + i.id, JSON.stringify(i));
    //});

    this.orderDirectoryTest();
    this.commitSortedTasks();

    //this.getIssues(projectName, function(issues) {
    //    console.log(JSON.stringify(issues, null, 2));
    //}, function(err) {
    //    console.error(err);
    //});
    
};

if (typeof module !== 'undefined') {
    module.exports = new JiraClient();
}