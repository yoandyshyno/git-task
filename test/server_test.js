/**
 * Created by jeff on 13/10/16.
 */

var describe = require('mocha').describe;
var before = require('mocha').before;
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
    });

    describe('#mergeTasks', function() {
        var remoteTask, localTask;
        before(function() {
            remoteTask = {
                "updatedAt": 1000,
                "afield": {
                    "fork": "example1"
                },
                "sweet": "right",
                "remoteField": "good"
            };
            localTask = {
                "updatedAt": 2000,
                "afield": {
                    "fork": "example2"
                },
                "sweet": "left",
                "localField": 1
            };
        });

        it('#mergeTasks merges tasks and prefers remote task', function () {
            var result = server.mergeTasks(remoteTask, localTask, true);
            expect(result).to.have.property('updatedAt', 1000);
            expect(result).to.have.property('localField', 1);
        });

        it('#mergeTasks merges tasks and prefers local task', function () {
            var result = server.mergeTasks(remoteTask, localTask, false);
            expect(result).to.have.property('updatedAt', 2000);
            expect(result).to.have.property('remoteField', "good");
        });
    });

    describe('#mergeAllTasks', function() {
        var localTasks, remoteTasks, getIdFn;
        before(function() {
            localTasks = [
                {
                    id: 1,
                    status: "open",
                    updatedAt: 1000,
                    remote_id: 1,
                    title: "first task"
                },
                {
                    id: 2,
                    status: "in_progress",
                    updatedAt: 2000,
                    title: "another task"
                }
            ];
            remoteTasks = [
                {
                    id: 3,
                    remote_id: 1,
                    status: "in_progress",
                    updatedAt: 3000,
                    title: "first task but remote"
                }
            ];
            getIdFn = function(t) {
                return t.remote_id;
            };
        });

        it('#mergeAllTasks merges tasks with local-wins', function () {
            var result = server.mergeAllTasks(localTasks, remoteTasks, getIdFn, server.CONFLICT_STRATEGY_LOCAL_WINS);

            expect(result.length).to.be(2);
            var task1 = result.find(function(t) {
                return t.id == 1;
            });
            expect(task1).to.be.ok();
            expect(task1).to.have.property('updatedAt', 1000);
            expect(task1).to.have.property('title', "first task");
            expect(task1).to.have.property('remote_id', 1);
        });

        it('#mergeAllTasks merges tasks with remote-wins', function () {
            var result = server.mergeAllTasks(localTasks, remoteTasks, getIdFn, server.CONFLICT_STRATEGY_REMOTE_WINS);

            expect(result.length).to.be(2);
            var task1 = result.find(function(t) {
                return t.id == 1;
            });
            expect(task1).to.be.ok();
            expect(task1).to.have.property('updatedAt', 3000);
            expect(task1).to.have.property('title', "first task but remote");
            expect(task1).to.have.property('remote_id', 1);
        });

        it('#mergeAllTasks merges tasks with latest-wins', function () {
            var result = server.mergeAllTasks(localTasks, remoteTasks, getIdFn, server.CONFLICT_STRATEGY_LATEST_WINS);

            expect(result.length).to.be(2);
            var task1 = result.find(function(t) {
                return t.id == 1;
            });
            expect(task1).to.be.ok();
            expect(task1).to.have.property('updatedAt', 3000);
            expect(task1).to.have.property('title', "first task but remote");
            expect(task1).to.have.property('remote_id', 1);
        });

        it('#mergeAllTasks merges tasks with manual', function () {
            var result = server.mergeAllTasks(localTasks, remoteTasks, getIdFn, server.CONFLICT_STRATEGY_MANUAL);

            expect(result.length).to.be(2);
            var task1 = result.find(function(t) {
                return t.id == 1;
            });
            expect(task1).to.be.ok();
            expect(task1).to.have.property('title', "first task but remote");
            expect(task1).to.have.property('remote_id', 1);
        });
    });
});