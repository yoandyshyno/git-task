/**
 * Created by jeff on 3/08/16.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const git = require('./git');

require('./common');

/**
 * Represents the git-task server service.
 * @constructor
 */
function GitTaskServer() {
}

/**
 * Gets content type from file name.
 * @param fileName File name.
 */
GitTaskServer.prototype.getContentTypeFromFileName = function(fileName) {
    if (fileName.endsWith('.css')) {
        return "text/css";
    }
    if (fileName.endsWith('.js')) {
        return "text/javascript";
    }
    return "text/html";
};

/**
 * Saves the object to a file.
 * @param obj Object to save.
 * @returns The task object.
 */
GitTaskServer.prototype.saveObjectToFile = function(obj) {
    git.checkDataDir();
    var fileName = git.dataDir + path.sep + obj.id;
    fs.writeFileSync(fileName, JSON.stringify(obj, null, 2));
    console.info("File '%s' saved.", fileName);
    var result = obj;
    switch (obj.gitStatus) {
        case '??':
            git.gitUnstage(fileName);
            break;
        case '--':
            git.gitUnstage(fileName);
            git.gitCheckout(fileName);
            result = this.readObjectFromFile(obj.id);
            break;
        default:
            git.gitAdd(fileName);
            break;
    }
    var gitStatus = git.gitGetTaskStatus(fileName);
    this.updateTaskGitStatus(result, gitStatus);
    return result;
};

/**
 * Reads a task from a file.
 * @param fileName File name.
 */
GitTaskServer.prototype.readObjectFromFile = function(fileName) {
    var fileContent = fs.readFileSync(git.dataDir + path.sep + fileName);
    var task = JSON.parse(fileContent);
    return task;
};

/**
 * Serves a file directly to the browser.
 * @param res HTTP Response
 * @param pathname Path name of the URL
 */
GitTaskServer.prototype.serveFile = function(res, pathname) {
    var fileName = pathname == null || pathname == "/"
        ? "tasks.html" : pathname;
    fileName = path.sep != '/' ?
        fileName.replaceAll('/', path.sep) : fileName;
    fileName = git.taskDir + path.sep + fileName;
    console.log('GET: %s.', pathname);
    if (!fs.existsSync(fileName)) {
        res.writeHead(500, {});
        console.error("Invalid access to file '%s'.", fileName);
        res.end("");
        return;
    }
    res.writeHead(200, {'Content-type': this.getContentTypeFromFileName(fileName)});
    var fileContent = fs.readFileSync(fileName);
    res.end(fileContent);
};

/**
 * Reports successful response with an object.
 * @param response HTTP response.
 * @param obj Object to return.
 */
GitTaskServer.prototype.reportSuccess = function(response, obj) {
    response.writeHead(200, {'Content-type': 'application/json'});
    var responseBody = {
        "status":"success"
    };
    if (obj) {
        responseBody.obj = obj;
    }
    response.end(JSON.stringify(responseBody));
};

/**
 * Reports an error as a json response.
 * @param response HTTP response.
 * @param errorMessage Error message.
 * @param exception Exception if needs saving to the log.
 */
GitTaskServer.prototype.reportError = function(response, errorMessage, exception) {
    if (exception) {
        console.error("%s %s", errorMessage, JSON.stringify(exception));
    }
    response.writeHead(500, {'Content-type': 'application/json'});
    var responseBody = {
        "status":"error",
        "msg": errorMessage
    };
    response.end(JSON.stringify(responseBody));
};

/**
 * Processes a POST request.
 * @param parsedData Parsed request data.
 * @param res HTTP Response.
 */
GitTaskServer.prototype.postItem = function(parsedData, res) {
    if (!parsedData.id) {
        parsedData.id = git.createItemId();
    }
    if (!parsedData.createdAt) {
        parsedData.createdAt = Date.now();
    }
    parsedData.updatedAt = Date.now();
    try {
        parsedData = this.saveObjectToFile(parsedData);
    }
    catch (e) {
        return this.reportError(res, 'Error processing item.', e);
    }
    this.reportSuccess(res, parsedData);
};

/**
 * Updates the status in git of a task.
 * @param task Task to update.
 * @param gitStatusList Status list from git.
 */
GitTaskServer.prototype.updateTaskGitStatus = function(task, gitStatusList) {
    task.gitStatus = '  ';
    if (typeof task.id !== 'string')
        return;
    gitStatusList.forEach(function(item) {
        if (item.endsWith('/' + task.id)) {
            task.gitStatus = item.substr(0, 2);
        }
    });
};

/**
 * Maps an issue from a remote issue tracker to local issue.
 * @param issue Remote issue.
 * @param mapFuncs Map functions hash to convert remote fields to local fields.
 */
GitTaskServer.prototype.mapToLocalTask = function(issue, mapFuncs) {
    var config = require(git.taskDir + "/config.js");
    var task = new config.task();
    var mapKeys = Object.keys(mapFuncs);

    function mapField(issue, prop, mapFuncs, path) {
        prop = prop ? prop : issue;
        var remoteKeys = Object.keys(prop);
        remoteKeys.forEach(function(key) {
            var fieldType = typeof prop[key];
            var mappedFunc = mapFuncs[path + "." + key];
            if (mappedFunc) {
                mappedFunc(task, issue);
                return;
            }
            var innerMappingFound = false;
            var regexpStr = path + "." + key + ".";
            var pathRegExp = new RegExp(regexpStr.replaceAll('.', '\\.'));
            mapKeys.forEach(function(k) {
                k = k + ".";
                if (k.match(pathRegExp)) {
                    innerMappingFound = true;
                }
            });
            if (fieldType.match(/object/) && innerMappingFound) {
                mapField(issue, prop[key], mapFuncs, path + "." + key);
                return;
            }
            mappedFunc = mapFuncs[path + ".*"];
            if (mappedFunc) {
                mappedFunc(task, issue, key);
            }
        });
    }
    mapField(issue, null, mapFuncs, "");
    return task;
};

/**
 * Creates an object with its fields (and inner objects' fields) alphabetically ordered.
 * @param task Object.
 */
GitTaskServer.prototype.orderFields = function (task) {
    function order(o) {
        if (typeof o === 'undefined' ||
                o == null ||
                Array.isArray(o) ||
                !(typeof o).match(/object/))
            return o;
        var result = {};
        var keys = Object.keys(o);
        keys.sort();
        keys.forEach(function(k) {
            result[k] = order(o[k]);
        });
        return result;
    }
    return order(task);
};

/**
 * Sort the task fields for each task file in the directory.
 * @param dir: string Task directory.
 */
GitTaskServer.prototype.sortFieldsInDir = function (dir) {
    var th1s = this;
    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        var fileName = dir + path.sep + file;
        var fileContent = fs.readFileSync(fileName);
        var task = JSON.parse(fileContent);
        var sortedTask = th1s.orderFields(task);
        fs.writeFileSync(fileName, JSON.stringify(sortedTask, null, 2));
    });
};

/**
 * Commit and tag after sorting the task fields in the directory given.
 * @param dir Directory to commit.
 */
GitTaskServer.prototype.commitAfterSort = function(dir) {
    git.git('add ' + dir.quote());
    git.git('commit -m "Task fields sorted (for git-task pull)." -- ' + dir.quote());
    var commitId = git.git('rev-parse --short HEAD');
    git.git('tag sorted_fields_' + commitId + " " + commitId);
};

GitTaskServer.prototype.CONFLICT_STRATEGY_LATEST_WINS = 'latest-wins';
GitTaskServer.prototype.CONFLICT_STRATEGY_LOCAL_WINS = 'local-wins';
GitTaskServer.prototype.CONFLICT_STRATEGY_REMOTE_WINS = 'remote-wins';
GitTaskServer.prototype.CONFLICT_STRATEGY_MANUAL = 'manual';

GitTaskServer.prototype.CONFLICT_STRATEGIES = {};

/**
 * Latest wins conflict strategy.
 * @param localTask Local task.
 * @param remoteTask Remote mapped task.
 * @returns {*} Task.
 */
GitTaskServer.prototype.CONFLICT_STRATEGIES[
    GitTaskServer.prototype.CONFLICT_STRATEGY_LATEST_WINS] = function(localTask, remoteTask) {
    return GitTaskServer.prototype.mergeTasks(remoteTask, localTask, remoteTask.updatedAt > localTask.updatedAt);
};

/**
 * Local task wins conflict strategy.
 * @param localTask Local task.
 * @param remoteTask Remote mapped task.
 * @returns {*} Task.
 */
GitTaskServer.prototype.CONFLICT_STRATEGIES[
    GitTaskServer.prototype.CONFLICT_STRATEGY_LOCAL_WINS] = function(localTask, remoteTask) {
    return GitTaskServer.prototype.mergeTasks(remoteTask, localTask, false);
};

/**
 * Local task wins conflict strategy.
 * @param localTask Local task.
 * @param remoteTask Remote mapped task.
 * @returns {*} Task.
 */
GitTaskServer.prototype.CONFLICT_STRATEGIES[
    GitTaskServer.prototype.CONFLICT_STRATEGY_REMOTE_WINS] = function(localTask, remoteTask) {
    return GitTaskServer.prototype.mergeTasks(remoteTask, localTask, true);
};

/**
 * Manual strategy.
 * @param localTask Local task.
 * @param remoteTask Remote mapped task.
 * @returns {*} Task.
 */
GitTaskServer.prototype.CONFLICT_STRATEGIES[
    GitTaskServer.prototype.CONFLICT_STRATEGY_MANUAL] = function(localTask, remoteTask) {
    return GitTaskServer.prototype.mergeTasks(remoteTask, localTask, true);
};

/**
 * Merge mapped remote task with a local task according to a criteria.
 * @param remoteMappedTask Remote task mapped to local task.
 * @param localTask Local task corresponding to the remote task.
 * @param preferRemote Indicates if the remote fields are preferred against the local fields.
 * @returns {*} Mapped task.
 */
GitTaskServer.prototype.mergeTasks = function(remoteMappedTask, localTask, preferRemote) {
    var result = {};
    var taskOrder = preferRemote ? [localTask, remoteMappedTask] : [remoteMappedTask, localTask];
    taskOrder.forEach(function(t) {
        var keys = Object.keys(t);
        keys.forEach(function(k) {
            result[k] = t[k];
        });
    });
    result.id = localTask.id;
    return result;
};

/**
 * Merge the local tasks with the remote tasks using a defined strategy.
 * @param localTasks:Array Local tasks array.
 * @param remoteTasks:Array Remote mapped tasks array.
 * @param getIdFn: Function Function to get the ID of the remote task - fn(task): String.
 * @param strategy:String Strategy to use (use the CONFLICT_STRATEGY_XXX consts).
 * @returns [] Array of merged tasks.
 */
GitTaskServer.prototype.mergeAllTasks = function(localTasks, remoteTasks, getIdFn, strategy) {
    var th1s = this;
    var idHash = {};
    var result = [];
    localTasks.forEach(function(localTask) {
        var id = getIdFn(localTask);
        if (typeof id === 'undefined') {
            result.push(localTask);
            return;
        }
        idHash[id] = localTask;
    });
    remoteTasks.forEach(function(remoteTask) {
        var remoteId = getIdFn(remoteTask);
        var localTask = idHash[remoteId];
        var mergedTask = (typeof localTask === 'undefined') ?
            remoteTask :
            th1s.CONFLICT_STRATEGIES[strategy](localTask, remoteTask);
        result.push(mergedTask);
    });
    return result;
};

/**
 * Read the items from disk.
 * @returns {Array} Item array.
 */
GitTaskServer.prototype.readItems = function () {
    var th1s = this;
    console.log("Checking data dir '%s'.", git.dataDir);
    git.checkDataDir();
    var files = fs.readdirSync(git.dataDir);
    var items = [];
    var gitStatusList = git.gitGetTaskStatus();
    files.forEach(function (item) {
        try {
            var task = th1s.readObjectFromFile(item);
            th1s.updateTaskGitStatus(task, gitStatusList);
            items.push(task);
        } catch (e) {
            console.error("Error reading file '%s'.", item);
        }
    });
    return items;
};

/**
 * Gets the tasks items.
 * @param res HTTP response.
 */
GitTaskServer.prototype.getItems = function(res) {
    try {
        var items = this.readItems();
        var obj = {
            tasks: items,
            meta: {
                branch: git.gitGetBranch()
            }
        };
        this.reportSuccess(res, obj);
    } catch (e) {
        this.reportError(res, "Error reading tasks.", e);
    }
};

/**
 * Delete a task item.
 * @param itemId Item ID.
 * @param res HTTP Response.
 */
GitTaskServer.prototype.deleteItem = function(itemId, res) {
    console.log('Deleting task %s.', itemId);
    try {
        git.gitRm(git.dataDir + path.sep + itemId);
        this.reportSuccess(res);
    }
    catch (e) {
        this.reportError(res, "Error deleting task.");
    }
};

/**
 * Commits the git-task directory.
 * @param message Commit message.
 * @param res HTTP response.
 */
GitTaskServer.prototype.commit = function(message, res) {
    try {
        git.gitCommit(message);
        this.reportSuccess(res);
    }
    catch (e) {
        this.reportError(res, "Error committing tasks.", e);
    }
};

/**
 * Fires when the server receives a request.
 * @param req HTTP Request.
 * @param res HTTP Response.
 */
GitTaskServer.prototype.requestReceived = function(req, res) {
    console.log("");
    var parsedUrl = url.parse(req.url);
    if (parsedUrl.pathname == null ||
        !parsedUrl.pathname.startsWith("/tasks/")) {
        server.serveFile(res, parsedUrl.pathname);
        return;
    }

    var data = "";
    req.on("data", function(chunk) {
        data += chunk;
    }).on("end", function() {
        console.log("%s: %s", req.method, parsedUrl.pathname);
        switch (req.method) {
            case 'POST':
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    server.reportError(res, 'Error parsing JSON.', e);
                    return;
                }
                if (parsedUrl.pathname == "/tasks/commit") {
                    server.commit(data.msg, res);
                    return;
                }
                server.postItem(data, res);
                break;

            case 'GET':
                server.getItems(res);
                break;

            case 'DELETE':
                server.deleteItem(parsedUrl.pathname.substr("/tasks/".length + 1).trim(), res);
                break;
        }
    });
};

/**
 * Runs the git-task server.
 */
GitTaskServer.prototype.run = function() {
    var config = require(git.taskDir + path.sep + "config.js").config;
    var server = http.createServer(this.requestReceived);

    server.listen(config.port, config.bindAddress, function() {
        var pidFile = git.taskDir + path.sep + "server.pid";
        console.log('Server is now listening on %s:%d...', config.bindAddress, config.port);
        fs.writeFileSync(pidFile, process.pid);

        process.on('SIGTERM', function() {
            console.log('Got SIGTERM signal. Exiting');
            fs.unlinkSync(pidFile);
            process.exit(0);
        });
    });
};

var server = new GitTaskServer();

//NOTICE: Do not modify from this point.
if (typeof module !== 'undefined')
    module.exports = server;
