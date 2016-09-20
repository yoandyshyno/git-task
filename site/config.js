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
    this.status = 'open';
    this.pending = 1;
    this.estimation = 1;
    this.title = 'New task';
    this.tags = '';
    this.gitStatus = 'A ';
}

//NOTICE: Do not modify from this point.
if (typeof module !== 'undefined')
    module.exports = config;