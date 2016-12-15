/**
 * Created by jeff on 3/08/16.
 */

// git task configuration
var config = {

    // Server port
    port: 16100,

    // Server bind address
    bindAddress: 'localhost'
};

// Read only task fields
const READONLY_FIELDS = ["id", "createdAt", "updatedAt", "gitStatus", "status"];

// Date task fields
const DATE_FIELDS = ["createdAt", "updatedAt"];

// Status possible values
const STATUS_ENUM = ["open", "in_progress", "done"];

/**
 * Task class, initialization
 * @constructor
 */
function Task() {
    this.status = 'open'; // status of the task, can be customized with the STATUS_ENUM.
    this.pending = 1; // pending hours to finish the task
    this.estimation = 1; // estimated/planned hours, can be a float
    this.title = 'New task'; // task title
    this.description = ''; // full task description
    this.tags = ''; // tags comma separated
    this.gitStatus = 'A '; // automatically set when coming from the server, 'A ' means "added"
    this.assignedTo = ''; // email(s) or user name(s)
    this.priority = 5; // from 0 to 9, 0 is the highest priority
    this.actualTime = 0; // actual hours that took the task to be done
}

//NOTICE: Do not modify from this point.
if (typeof module !== 'undefined')
    module.exports = { config: config, task: Task };
