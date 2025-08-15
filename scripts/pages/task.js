/**
 * @task Runs User Interaction Logic Related to the Task Manager and Handles UI Visuals
 */

// Base class for a task
class Task {
    constructor(text, subtasks = []) {
        this.text = text;
        this.subtasks = subtasks;
    }

    // Returns a basic input element for task text editing
    render() {
        const taskInput = document.createElement("input");
        taskInput.type = "text";
        taskInput.value = this.text;
        return [taskInput];
    }
}

/**
 * TimedTask extends Task with deadline functionality
 * Adds auto-saving deadline tracking through date input
 */
class TimedTask extends Task {
    constructor(text, subtasks = [], deadline = "") {
        super(text, subtasks);
        this.deadline = deadline;
    }

    // Override the render method to include a deadline input
    render() {
        const elements = super.render();
        const deadlineInput = document.createElement("input");
        deadlineInput.type = "date";
        deadlineInput.value = this.deadline;
        deadlineInput.className = "deadline-input";

        deadlineInput.addEventListener("input", () => {
            this.deadline = deadlineInput.value;
            SaveTasks();
        });

        elements.push(deadlineInput);
        return elements;
    }
}

// In-memory task storage, synced with chrome.storage
let taskData = [];

// Persists current task state to storage
function SaveTasks() {
    chrome.storage.local.set({ tasks: taskData });
}

export function init() {
    // DOM element references
    const input = document.getElementById("task-input");
    const addBtn = document.getElementById("add-task");
    const addTimedBtn = document.getElementById("add-timed-task");
    const list = document.getElementById("task-list");

    // Restore tasks from storage, reconstructing proper class instances
    chrome.storage.local.get(['tasks'], (result) => {
        taskData = (result.tasks || []).map(t => {
            if (t.deadline !== undefined) {
                return new TimedTask(t.text, t.subtasks, t.deadline);
            }
            return new Task(t.text, t.subtasks);
        });
        Render();
    });

    // Event handlers for adding tasks
    addBtn.addEventListener("click", () => {
        const taskText = input.value.trim();
        if (taskText === "") return;

        taskData.push(new Task(taskText));
        input.value = "";
        SaveTasks();
        Render();
    });

    // assign button functionality for timed tasks
    addTimedBtn.addEventListener("click", () => {
        const taskText = input.value.trim();
        if (taskText === "") return;

        taskData.push(new TimedTask(taskText));
        input.value = "";
        SaveTasks();
        Render();
    });


    /*********************************************************************************************************************************************************************************************/

    /**
     * Renders the complete task interface including:
     * - Task items with edit/delete controls
     * - Subtask lists with individual edit/delete
     * - Subtask creation interface
     */
    function Render() {
        list.innerHTML = "";

        taskData.forEach((task, tIndex) => {
            // Create task container
            const newTask = document.createElement("li");
            newTask.className = "task-item";

            // Handle polymorphic task rendering
            const taskElements = task.render();
            taskElements[0].addEventListener("input", () => {
                task.text = taskElements[0].value;
                SaveTasks();
            });

            // Task removal control
            const removeBtn = document.createElement("span");
            removeBtn.className = "remove-task";
            removeBtn.textContent = "✕";

            // assign eventListener to removeBtn
            removeBtn.addEventListener("click", () => {
                taskData.splice(tIndex, 1);
                SaveTasks();
                Render();
            });

            // adds both removeBtn & taskInput to list element, then adds newTask to html list
            newTask.appendChild(removeBtn);
            taskElements.forEach(el => newTask.appendChild(el));


            // — Subtask container —
            const subtaskList = document.createElement("ul");
            subtaskList.className = "subtask-list";

            // Render each existing subtask
            task.subtasks.forEach((sub, sIndex) => {
                const subLi = document.createElement("li");
                subLi.className = "subtask-item";

                const subInput = document.createElement("input");
                subInput.type = "text";
                subInput.value = sub.text;
                subInput.addEventListener("input", () => {
                    task.subtasks[sIndex].text = subInput.value;
                    SaveTasks();
                });

                const subRemove = document.createElement("span");
                subRemove.className = "remove-subtask";
                subRemove.textContent = "✕";
                subRemove.addEventListener("click", () => {
                    task.subtasks.splice(sIndex, 1);
                    SaveTasks();
                    Render();
                });

                subLi.append(subRemove, subInput);
                subtaskList.appendChild(subLi);
            });

            // — “Add subtask” input + button —
            const subInputBar = document.createElement("div");
            subInputBar.className = "subtask-input-bar";

            const newSubInput = document.createElement("input");
            newSubInput.type = "text";
            newSubInput.placeholder = "Add a subtask…";

            const addSubBtn = document.createElement("button");
            addSubBtn.textContent = "+";
            addSubBtn.addEventListener("click", () => {
                const txt = newSubInput.value.trim();
                if (!txt) return;
                task.subtasks.push({ text: txt });
                newSubInput.value = "";
                SaveTasks();
                Render();
            });

            subInputBar.append(newSubInput, addSubBtn);

            // — Nest it all under this task —
            newTask.append(subtaskList, subInputBar);

            list.appendChild(newTask);
        });
    }
}