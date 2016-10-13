/**
 * Created by jeff on 13/10/16.
 */

var describe = require('mocha').describe;
var it = require('mocha').it;
var expect = require('expect.js');
var server = require('../lib/server');

describe('GitTaskServer', function () {

    it('#orderFields should sort the fields of a task', function () {
        var unorderedTask = {
            "prop": "value1",
            "afield": {
                "fork": "example1"
            },
            "sweet": "right"
        };
        var task = server.orderFields(unorderedTask);
        var keys = Object.keys(task);
        expect(keys[0]).to.be('afield');
        expect(keys[1]).to.be('prop');
        expect(keys[2]).to.be('sweet');
    })
});