/**
 * Created by jeff on 3/08/16.
 */

var tasks = [];
var draggedTask = null;

/**
 * Finds the container associated with an status.
 * @param status Status to search for.
 * @returns {*|{}} Container found (jQuery).
 */
function getContainerFor(status) {
    var result = $('.column_task_group[data-status="' + status + '"]');
    return result;
}

/**
 * Creates a new Task.
 * @returns {Task} New task.
 */
function createNewTask() {
    var newTask = new Task();
    return newTask;
}

/**
 * Find the task given its ID.
 * @param id Task ID.
 * @returns {*|{}} Task
 */
function findTask(id) {
    return tasks.find(function(item) {
        return item.id == id;
    });
}

/**
 * Finds a task item.
 * @param id Task ID.
 */
function findTaskItem(id) {
    return $('.task_item[data-id="' + id + '"]');
}

/**
 * Indicates if a field is read-only or not.
 * @param fieldName Field name.
 */
function isReadOnlyField(fieldName) {
    return READONLY_FIELDS.indexOf(fieldName) > -1;
}

/**
 * Indicates if a field is a Date or not.
 * @param fieldName Field name.
 */
function isDateField(fieldName) {
    return DATE_FIELDS.indexOf(fieldName) > -1;
}

/**
 * Adds a new field to the tasks in the list.
 * @param taskList Array of tasks.
 * @param fieldName Field name.
 * @param defaultValue Default field value.
 */
function addField(taskList, fieldName, defaultValue) {
    taskList.forEach(function(item) {
        var keys = Object.keys(item);
        if (keys.indexOf(fieldName) > -1) {
            return;
        }
        item[fieldName] = defaultValue;
        //TODO: Do a batch update
        updateTask(item);
    });
}

/**
 * Deletes a field from tasks in a list.
 * @param taskList Array of tasks.
 * @param fieldName Field name.
 */
function deleteField(taskList, fieldName) {
    taskList.forEach(function(item) {
        item[fieldName] = undefined;
        //TODO: Do a batch update
        updateTask(item);
    });
}

/**
 * Edits a task in a form.
 * @param task Task to edit.
 */
function editTask(task) {
    var keys = Object.keys(task);
    var containerForm = $(".task_editor_form");
    var content = '<table class="form_table" cellpadding="3" cellspacing="3">';
    var template =
        '<tr>' +
            '<td class="task_edit_form_keys_column">%key%: <a class="delete_field_link %hidden%" href="#" data-field="%key%">X</a> </td>' +
            '<td class="task_edit_form_values_column">' +
                '<input type="text" data-key="%key%" class="task_edit_input %attrs%" value="%value%" %attrs% />' +
            '</td>' +
        '</tr>';
    keys.sort();
    keys.forEach(function(key) {
        var attrs = "";
        var encodedValue = task[key];
        if (typeof encodedValue === 'undefined') {
            return;
        }
        if (typeof encodedValue === 'string') {
            encodedValue = encodedValue.replaceAll('"', "&quot;").replaceAll("'", '&apos;');
        }
        if (isReadOnlyField(key)) {
            attrs = "readonly";
        }
        if (isDateField(key)) {
            encodedValue = (new Date(encodedValue)).toString();
        }
        content += template.format(["%key%", "%value%", "%attrs%", "%hidden%"], [key, encodedValue, attrs, attrs == "readonly" ? "hidden" : ""]);
    });
    content +=
        '<tr>' +
            '<td class="task_edit_form_keys_column">' +
                '<a id="add_field_link" href="#">Add field</a>'  +
            '</td>' +
            '<td class="task_edit_form_values_column">' +
                '<input id="add_field_to_all_checkbox" type="checkbox"><label for="add_field_to_all_checkbox">To all tasks</label>'  +
            '</td>' +
        '</tr>';
    content += '</table>';
    containerForm.html(content);
    var taskEditorPanel = $(".task_editor");
    taskEditorPanel.removeClass("hidden");

    taskEditorPanel.find("#add_field_link").click(function(event) {
        var fieldName = prompt("Enter the field name:", "");
        if (fieldName == null) {
            return;
        }
        var fieldDefaultValue = prompt("Enter the field default value:", "");
        if (fieldDefaultValue == null) {
            return;
        }
        var taskList = [];
        if ($("#add_field_to_all_checkbox").prop("checked")) {
            taskList = tasks;
        } else {
            taskList = [task];
        }
        addField(taskList, fieldName, fieldDefaultValue);
        editTask(task);
    });

    taskEditorPanel.find(".delete_field_link").click(function(event) {
        var deleteLink = $(event.target);
        if (!confirm("Field %s will be deleted. Are you sure?".format(["%s"], [deleteLink.data("field")]))) {
            return;
        }
        var taskList = [];
        if (confirm("Delete field %s in ALL tasks?".format(["%s"], [deleteLink.data("field")]))) {
            taskList = tasks;
        } else {
            taskList = [task];
        }
        deleteField(taskList, deleteLink.data("field"));
        editTask(task);
    });

    function updateTaskValues() {
        containerForm.find(".task_edit_input").toArray().forEach(function (item) {
            var input = $(item);
            var key = input.data("key");
            if (!isReadOnlyField(key)) {
                task[key] = input.val();
            }
        });
    }

    $("#save_task_button").off("click").click(function(event) {
        event.preventDefault();
        updateTaskValues();
        updateTask(task, function(newTask) {
            editTask(newTask);
        });
    });

    $("#close_task_button").off("click").click(function(event) {
        event.preventDefault();
        taskEditorPanel.addClass("hidden");
    });

    containerForm.find('input').keypress(function(event) {
        var target = $(event.target);
        if (event.keyCode == 13) {
            updateTaskValues();
            updateTask(task);
        }
    });
}

/**
 * Fires when the Edit task link is clicked.
 */
function taskItemEditClick(event) {
    var taskItem = $(event.target).parents(".task_item");
    var task = findTask(taskItem.data("id"));
    editTask(task);
}

/**
 * Adds a task to the corresponding status panel.
 * @param task Task to add.
 * @param prevItem If defined, must be the previous item (to replace with this new one).
 */
function addTask(task, prevItem) {
    if (tasks.indexOf(task) < 0) {
        tasks.push(task);
    }
    var itemTemplate =
        '<div class="task_item %git%" draggable="true" data-id="%id%">' +
            '<span class="task_item_title">%title%</span><br/>' +
            '<span class="task_item_pending">%pending%</span>h / ' +
            '<span class="task_item_estimation">%estimation%</span>h<br/>' +
            '<span class="task_item_tags">%tags%</span>' +
            '<div class="task_options">' +
                '<a class="edit_task_link" href="#"><i class="fa fa-edit"></i></a> ' +
                '<a class="task_menu_link" href="#"><i class="fa fa-bars"></i></a>' +
            '</div>' +
        '</div>';
    var tags = (!task.tags || task.tags.isWhitespace()) ?
        "<em>[no tags]</em>" : task.tags;
    var git = "";
    if (!task.pending) {
        task.pending = 0;
    }
    if (!task.estimation) {
        task.estimation = 0;
    }
    switch (task.gitStatus) {
        case 'A ':
        case 'AM':
            git = "added";
            break;
        case 'M ':
            git = "modified";
            break;
        case '??':
        case ' A':
        case ' M':
            git = "not_included";
            break;
    }
    var realItem = itemTemplate.format(
        ["%id%","%title%","%pending%","%estimation%","%tags%", "%git%"],
        [task.id, task.title, task.pending, task.estimation, tags, git]);
    var container = getContainerFor(task.status);
    if (container.length == 0) {
        return;
    }
    var replaced = false;
    if (prevItem != null && prevItem.length == 1) {
        var prevParent = prevItem.parent(".column_task_group");
        if (prevParent.data("status") == container.data("status")) {
            prevItem.replaceWith(realItem);
            replaced = true;
        } else {
            prevItem.remove();
        }
    }
    if (!replaced) {
        container.append(realItem);
    }
    var newChildNode = container.children('.task_item[data-id="' + task.id + '"]');
    newChildNode.on("dragstart", function (event) {
        draggedTask = $(event.target);
    });
    newChildNode.find(".task_item_title").click(taskItemTitleClick);
    newChildNode.find(".task_item_tags").click(taskItemTagsClick);
    newChildNode.find(".edit_task_link").click(taskItemEditClick);
    newChildNode.find(".task_menu_link").click(taskItemMenuLinkClick);
    newChildNode.find(".task_item_pending").click(taskItemPendingClick);
    newChildNode.find(".task_item_estimation").click(taskItemEstimationClick);
    updateHourCount();
    return newChildNode;
}

/**
 * Gets the base service URL.
 * @returns {string} Base service URL.
 */
function getBaseUrl() {
    var url = "http://".concat(config.bindAddress, ":",
        config.port.toString(), "/tasks/");
    return url;
}

/**
 * Edit the task title.
 * @param task Task to edit.
 */
function editTaskTitle(task) {
    var taskDiv = findTaskItem(task.id);
    var taskTitleLabel = taskDiv.children(".task_item_title");
    taskTitleLabel.click();
}

/**
 * Fires when the New task button is clicked.
 */
function newTaskClick() {
    event.preventDefault();
    var url = getBaseUrl();
    var newTask = createNewTask();
    $.post(url, JSON.stringify(newTask), function(res) {
    	var newTaskItem = addTask(res.obj);
    	var panel = getContainerFor(res.obj.status);
    	panel.children(".column_header").after(newTaskItem);
        if (!$(".task_editor").hasClass("hidden")) {
            editTask(res.obj);
            return;
        }
        editTaskTitle(res.obj);
    }).fail(function(error){
        alert("error:" + JSON.stringify(error));
    });
}

/**
 * Updates a task info on the server.
 * @param task Task to update.
 * @param callback Method to call after a successful post.
 */
function updateTask(task, callback) {
    var url = getBaseUrl();
    $.post(url, JSON.stringify(task), function(res) {
        handleSuccess('Task updated.');
        var taskIndex = tasks.indexOf(task);
        tasks[taskIndex] = res.obj;
        var taskItem = findTaskItem(task.id);
        addTask(res.obj, taskItem);
        if (callback) {
            callback(res.obj);
        }
    }).fail(function(error){
        handleError(error);
    });
}

/**
 * Run triggers when a task property is changed.
 * @param task Task to check.
 * @param taskProperty Task property/field name that was changed.
 */
function runTaskPropertyChangedTriggers(task, taskProperty) {
    switch (taskProperty) {
        case "pending":
            if (task.estimation < task.pending) {
                task.estimation = task.pending;
            }
            break;
        case "status":
            if (task.status == "done") {
                task.pending = 0;
            }
            break;
    }
}

/**
 * Edits a value in-line (in the task item).
 * @param labelElement Label element to be replaced.
 * @param taskProperty Task property to set in the textbox.
 * @param clickHandler Function of the click event handler.
 * @param admitsWhitespace Indicates if the textbox admits whitespace or empty string.
 * @param textBoxWidth Text box width.
 * @returns {*|jQuery|HTMLElement} Input element.
 */
function editInputInPlace(labelElement, taskProperty, clickHandler, admitsWhitespace, textBoxWidth) {
    if (typeof admitsWhitespace === 'undefined' || admitsWhitespace == null) {
        admitsWhitespace = true;
    }
    if (!textBoxWidth) {
        textBoxWidth = "150px";
    }
    labelElement.replaceWith(
        "<input class='visible_text_edit' type='text' style='width: %width%'/>".format(["%width%"], [textBoxWidth]));
    var inputEdit = $(".visible_text_edit");
    var parent = inputEdit.parents(".task_item");
    var currentTask = tasks.find(function(item) {
        return item.id == parent.data("id");
    });
    inputEdit.val(currentTask[taskProperty]);
    inputEdit.focus();
    inputEdit.focusingOut = false;
    inputEdit.on("focusout", function() {
        if (inputEdit.focusingOut) {
            return;
        }
        inputEdit.focusingOut = true;
        if (currentTask[taskProperty] != inputEdit.val() &&
            ((!admitsWhitespace && !inputEdit.val().isWhitespace()) || admitsWhitespace) ) {
            currentTask[taskProperty] = inputEdit.val();
            runTaskPropertyChangedTriggers(currentTask, taskProperty);
            updateTask(currentTask);
        } else {
            addTask(currentTask, parent);
        }
        switch (taskProperty) {
            case "pending": case "estimation":
                updateHourCount();
                break;
        }
    }).on("keypress", function() {
        if (event.keyCode == 13) {
            inputEdit.focusout();
        }
    });
    return inputEdit;
}

/**
 * Fires when the title of a task item is clicked.
 */
function taskItemTitleClick() {
    editInputInPlace($(this), "title", taskItemTitleClick, false);
}

/**
 * Fires when the tags of a task item is clicked.
 */
function taskItemTagsClick(event) {
    var label = $(event.target);
    var inputEdit = editInputInPlace(label, "tags", taskItemTagsClick);
    inputEdit.on("focusout", function(event) {
        var taskItem = $(event.target).parents(".task_item");
        var task = findTask(taskItem.data("id"));
        if (task.tags.isWhitespace()) {
            label.html("<em>[no tags]</em>");
        }
    });
}

/**
 * Fires when the pending hours is clicked.
 * @param event Event object.
 */
function taskItemPendingClick(event) {
    var label = $(event.target);
    editInputInPlace(label, "pending", taskItemPendingClick, false, "24px");
}

/**
 * Fires when the estimation hours is clicked.
 * @param event Event object.
 */
function taskItemEstimationClick(event) {
    var label = $(event.target);
    editInputInPlace(label, "estimation", taskItemEstimationClick, false, "24px");
}

/**
 * Deletes a task.
 * @param taskId Task ID.
 */
function deleteTask(taskId) {
    var task = findTask(taskId);
    if (!confirm("Are you sure you want to delete task " + task.title.quote() + " ?")) {
        return;
    }
    $.ajax(getBaseUrl() + "/" + taskId, {
        method: "DELETE",
        success: function(data) {
            if (data.status == "success") {
                handleSuccess('Task deleted.');
                var taskItem = findTaskItem(taskId);
                taskItem.remove();
            }
            else {
                handleError("Error deleting task: " + data.msg);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            handleError("Error deleting task: " + textStatus);
        }
    });
}

/**
 * Fires when the link of the task menu is clicked.
 * @param event
 */
function taskItemMenuLinkClick(event) {
    event.preventDefault();
    var menuLink = $(event.target);
    var taskItem = menuLink.parents(".task_item");
    var taskId = taskItem.data("id");
    var taskMenu = $("#task_menu");
    var task = findTask(taskId);
    taskMenu.data("id", taskId);
    taskMenu.css("top", taskItem.offset().top + taskItem.height() - 10);
    taskMenu.css("left", taskItem.offset().left + taskItem.width() - 10);
    taskMenu.removeClass("hidden");

    var includeInCommit = $("#include_commit_task_menu_item");
    var excludeFromCommit = $("#exclude_commit_task_menu_item");
    var discardChanges = $("#discard_changes_task_menu_item");
    if (task.gitStatus == '??' || task.gitStatus[0] == ' ') {
        includeInCommit.removeClass('hidden');
        excludeFromCommit.addClass('hidden');
    } else {
        excludeFromCommit.removeClass('hidden');
        includeInCommit.addClass('hidden');
    }
    if (task.gitStatus == '??' || task.gitStatus == 'A ') {
        discardChanges.addClass('hidden');
    } else {
        discardChanges.removeClass('hidden');
    }
}

/**
 * Handles an error occurred in the app.
 * @param error Error (exception).
 * @param callback Callback to invoke when the error has faded.
 */
function handleError(error, callback) {
    var errorPanel = $(".error_message");
    if (error.responseText) {
        error = JSON.parse(error.responseText).msg;
    }
    errorPanel.html(error);
    errorPanel.removeClass('hidden');
    errorPanel.fadeIn(200, function() {
        errorPanel.fadeOut(3000, function() {
            if (callback) {
                callback();
            }
        });
    });
}

/**
 * Handles a successful operation.
 * @param message Message to show.
 * @param callback Calls when the success has finished fading.
 */
function handleSuccess(message, callback) {
    var successPanel = $(".success");
    successPanel.html(message);
    successPanel.removeClass('hidden');
    successPanel.fadeIn(200, function() {
        successPanel.fadeOut(3000, function() {
            if (callback) {
                callback();
            }
        });
    });
}

/**
 * Sort tasks by a given property.
 * @param taskArray Array of tasks.
 * @param property Property to sort by.
 * @param inverse true to order from greater to lower, otherwise false.
 */
function sortTasks(taskArray, property, inverse) {
    if (typeof inverse === 'undefined' || inverse == null) {
        inverse = false;
    }
    var sign = inverse ? -1 : 1;
    taskArray.sort(function(t1, t2) {
        if (t1[property] < t2[property]) {
            return -1 * sign;
        }
        if (t1[property] > t2[property]) {
            return sign;
        }
        return 0;
    });
}

/**
 * Displays the branch name.
 * @param branchName Branch name.
 */
function showBranch(branchName) {
    $("#branch_name").html(branchName.isWhitespace() ? "[None]" : branchName);
}

/**
 * Load the Sort combo with the existing properties.
 * @param props Array of property names.
 */
function loadSortCombo(props) {
    props.sort();
    var sortCombo = $("#sort_combo");
    var reverseCheckbox = $("#reverse_sort_checkbox");
    var itemTemplate = '<option value="%key%">%key%</option>';
    props.forEach(function(item) {
        sortCombo.append(itemTemplate.format(["%key%"], [item]));
    });

    sortCombo.on("click", function() {
        if (sortCombo.val() == "sort_here") {
            return;
        }
        sortTasks(tasks, sortCombo.val(), reverseCheckbox.prop("checked"));
        tasks.forEach(function (t) {
            var taskItem = findTaskItem(t.id);
            getContainerFor(t.status).append(taskItem);
        });
    });

    reverseCheckbox.click(function() {
        sortCombo.click();
    });
}

/**
 * Load the tasks from the service.
 */
function loadTasks() {
    $(".loading").removeClass('hidden');
    var url = getBaseUrl();
    $.get(url, function(data) {
        if (data.status == "success") {
            sortTasks(data.obj.tasks, "updatedAt", true);
            var properties = [];
            data.obj.tasks.forEach(function(item) {
                if (typeof item.tags === 'undefined')
                    item.tags = '';
                var keys = Object.keys(item);
                keys.forEach(function(k) {
                    if (properties.indexOf(k) < 0 && k != 'undefined') {
                        properties.push(k);
                    }
                });
                addTask(item);
            });
            loadSortCombo(properties);
            $(".loading").addClass('hidden');
            showBranch(data.obj.meta.branch);
            updateHourCount();
        }
    }).fail(function(error) {
        $(".loading").addClass('hidden');
        handleError(error);
    });
}

/**
 * Creates panels for each task status.
 */
function createTaskStatusPanels() {
    var panelTemplate =
            '<td class="column_task_group back%index%" data-status="%status%">' +
                '<div class="column_header">%status%</div>' +
            '</td>';
    var content = "<table width='100%'><tr>";
    STATUS_ENUM.forEach(function(item, index) {
        content += panelTemplate.format(["%status%", "%index%"], [item, index.toString()]);
    });
    content += "</tr></table>";
    var container = $("#task_container");
    container.html(content);
    container.on("dragover", function (event) {
            event.preventDefault();
        })
        .on("drop", function (event) {
            event.preventDefault();
            var taskItem = draggedTask;
            var target = $(event.target);
            if (!target.hasClass("column_task_group")) {
                target = target.parents(".column_task_group");
            }
            var parent = taskItem.parents('.column_task_group');
            if (parent.data("status") == target.data("status")) {
                return;
            }
            //taskItem.remove();
            target.append(taskItem);
            var task = findTask(taskItem.data("id"));
            task.status = target.data("status");
            runTaskPropertyChangedTriggers(task, "status");
            updateTask(task);
            updateTaskCount();
        });
}

/**
 * Update total hours planned/left for visible tasks.
 */
function updateHourCount() {
    var hourCountLabel = $("#hour_count");
    var totalPending = 0; totalEstimation = 0;
    var taskArray = $(".task_item:not(.legend):not(:hidden)").toArray();
    taskArray.forEach(
        function (item) {
            var taskId = $(item).data('id');
            var task = findTask(taskId);
            if (typeof (task.pending) != 'undefined') {
                totalPending += parseFloat(task.pending);
            }
            if (typeof (task.estimation) != 'undefined') {
                totalEstimation += parseFloat(task.estimation);
            }
        });
    hourCountLabel.html("<b>%c%</b> tasks: <b>%hp%</b>h left/<b>%he%</b>h total/<b>%hb%</b>h burned".
        format(["%c%", "%hp%", "%he%", "%hb%"],
        [taskArray.length, totalPending, totalEstimation, totalEstimation - totalPending]));
}

/**
 * Filter task display by a value.
 * @param value Space separated values.
 */
function filterTasksBy(value) {
    $(".task_item:not(.legend)").addClass("hidden");
    var terms = value.split(" ");
    tasks.forEach(function(task) {
        var text = JSON.stringify(task);
        terms.forEach(function(term) {
            if (text.indexOf(term) >= 0) {
                $('.task_item[data-id="' + task.id + '"]').removeClass("hidden");
            }
        });
    });
    updateHourCount();
}

/**
 * Register event on textbox filter.
 */
function registerFilterEvents() {
    var searchTextbox = $("#search_textbox");
    searchTextbox.keyup(function(event) {
        var value = searchTextbox.val();
        filterTasksBy(value);
    });
}

/**
 * Register a click event in the document to enable hiding the task context menu.
 */
function registerTaskMenuHideEvent() {
    $(document).click(function(event) {
        var target = $(event.target);
        var taskMenu = $("#task_menu");
        if (target.attr("id") != "task_menu" &&
            !target.hasClass("task_menu_link") &&
            !taskMenu.hasClass("hidden") &&
            !target.hasClass("fa-bars")) {
            taskMenu.addClass("hidden");
        }
    });
}

/**
 * Unstages a task from git.
 * @param taskId Task ID.
 */
function unstageTask(taskId) {
    var task = findTask(taskId);
    task.gitStatus = '??';
    updateTask(task);
}

/**
 * Stages a task in git.
 * @param taskId Task ID.
 */
function stageTask(taskId) {
    var task = findTask(taskId);
    task.gitStatus = 'A ';
    updateTask(task);
}

/**
 * Discard task changes in git.
 * @param taskId Task ID.
 */
function discardTaskChanges(taskId) {
    var task = findTask(taskId);
    task.gitStatus = '--'; // checkout!
    updateTask(task);
}

/**
 * Clones an existing task.
 * @param taskId Task ID.
 */
function cloneTask(taskId) {
    var task = findTask(taskId);
    var taskItem = findTaskItem(taskId);
    var taskFields = Object.keys(task);
    var newTask = createNewTask();
    taskFields.forEach(function (field) {
        if (field == "id" || field == "gitStatus") {
            return;
        }
        newTask[field] = task[field];
    });
    updateTask(newTask, function (updatedTask) {
        var container = getContainerFor(updatedTask.status);
        var newTaskItem = findTaskItem(updatedTask.id);
        newTaskItem.insertAfter(taskItem);
        editTaskTitle(updatedTask);
    });
}

/**
 * Register the clicks of the task context menu items.
 */
function registerTaskContextMenuEvents() {
    $("#edit_task_menu_item").click(function(event) {
        event.preventDefault();
        var taskId = $("#task_menu").data("id");
        var task = findTask(taskId);
        editTask(task);
    });

    $("#include_commit_task_menu_item").click(function(event) {
        event.preventDefault();
        var taskId = $("#task_menu").data("id");
        stageTask(taskId);
    });

    $("#exclude_commit_task_menu_item").click(function(event) {
        event.preventDefault();
        var taskId = $("#task_menu").data("id");
        unstageTask(taskId);
    });

    $("#clone_task_menu_item").click(function (event) {
        event.preventDefault();
        var taskId = $("#task_menu").data("id");
        cloneTask(taskId);
    });

    $("#delete_task_menu_item").click(function(event) {
        event.preventDefault();
        var taskId = $("#task_menu").data("id");
        deleteTask(taskId);
    });

    $("#discard_changes_task_menu_item").click(function(event) {
        event.preventDefault();
        var taskId = $("#task_menu").data("id");
        discardTaskChanges(taskId);
    });
}

/**
 * Apply (add or remove) a collection of tags to visible tasks.
 * @param tags Array of tags.
 */
function applyTags(tags) {
    var taskItems = $(".task_item");
    taskItems.each(function() {
        var taskItem = $(this);
        if (taskItem.hasClass('hidden')) {
            return;
        }
        var taskId = taskItem.data("id");
        var task = findTask(taskId);
        var taskTags = task.tags.split(",");
        // Patch: split returns 1 element with empty string when no tags are found.
        if (taskTags.length == 1 && taskTags[0].trim() == "") {
            taskTags = [];
        }
        tags.forEach(function(t) {
            var currentTag = t.trim();
            if (currentTag.isWhitespace()) {
                return;
            }
            var tagIndex = taskTags.indexOf(currentTag);
            if (currentTag[0] == '-') {
                taskTags = taskTags.filter(function(item) {
                    return item != currentTag.substr(1);
                });
                return;
            }
            if (tagIndex < 0) {
                taskTags.push(currentTag);
            }
        });
        task.tags = taskTags.join(",");
        updateTask(task, taskItem);
    });
}

/**
 * Register events for the Add/remove tags textbox.
 */
function registerApplyTagTextboxEvents() {
    $("#tags_textbox").keypress(function(event) {
        if (event.keyCode == 13) {
            var textbox = $(event.target);
            var val = textbox.val().trim();
            if (val.isWhitespace()) {
                return;
            }
            applyTags(val.split(","));
        }
    });
}

/**
 * Fires when the Commit link is clicked.
 * @param event Event args.
 */
function commitClick(event) {
    event.preventDefault();
    var message = prompt("Commit message:", "");
    if (message == null) {
        return;
    }
    var url = getBaseUrl() + "commit";
    $.post(url, JSON.stringify({msg: message}), function(res) {
        handleSuccess('Tasks committed.');
    }).fail(function(error){
        handleError(error);
    });
}

/**
 * Load a markdown README.md in the .tasks directory.
 */
function loadReadme() {
    $.get("/README.md", function(data) {
        $("#readme").html(marked(data));
    });
}

/**
 * Fill with zero two places of a number.
 */
function addZero(number) {
    return (number < 10) ? "0" + number : number + "";
}

/**
 * Update the elapsed time.
 */
function updateTimeElapsed() {
    var nowTime = new Date();
    var partialTimeElapsed = nowTime.getTime() - window.startingTime.getTime();
    window.startingTime = nowTime;
    window.timeElapsed += partialTimeElapsed;

    $("#timer_display").html("%h%:%min%:%sec%".format(
        ["%h%", "%min%", "%sec%"],
        [addZero(Math.floor(window.timeElapsed / 1000 / 60 / 60)),
            addZero(Math.floor(window.timeElapsed / 1000 / 60 % 60)),
            addZero(Math.floor(window.timeElapsed / 1000 % 60))]
        ));
}

/**
 * Register timer callback function.
 */
function registerTimerFunction() {
    setTimeout(function () {
        if (window.timerEnabled) {
            updateTimeElapsed();
        }
        registerTimerFunction();
    }, 1000);
}

/**
 * Resets the timer.
 */
function resetTimer() {
    window.timeElapsed = 0;
    $("#timer_display").html("00:00:00");
}

/**
 * Handle the timer start/stop click event.
 */
function timerStartClick() {
    var timerButton = $("#timer_start_button");
    if (typeof (window.timerEnabled) === 'undefined') {
        registerTimerFunction();
        resetTimer();
    }
    if (typeof (window.timerEnabled) === 'undefined' || !window.timerEnabled) {
        window.timerEnabled = true;
        window.startingTime = new Date();
        timerButton.html("Stop");
    } else {
        window.timerEnabled = false;
        timerButton.html("Start");
    }
}

/**
 * Handle the timer reset click event.
 */
function timerResetClick() {
    resetTimer();
}

/**
 * Register the events of the main menu items.
 */
function registerMainMenuEvents() {
    $("#new_task_button").click(newTaskClick);
    $("#commit_button").click(commitClick);
    $("#timer_start_button").click(timerStartClick);
    $("#timer_reset_button").click(timerResetClick);
}

/**
 * Update Task count for each container.
 */
function updateTaskCount() {
    STATUS_ENUM.forEach(function(item, index) {
        var container_count = getContainerFor(item).find('.task_item').length;
        $('.back' + (index)
            + ' > .column_header').html(item + ' (' + (container_count) + ')');
    });
}

$(document).ready(function() {
    registerMainMenuEvents();
    registerFilterEvents();
    registerApplyTagTextboxEvents();
    registerTaskMenuHideEvent();
    registerTaskContextMenuEvents();

    createTaskStatusPanels();
    loadTasks();
    loadReadme();
    setTimeout(updateTaskCount, 3000);
});
