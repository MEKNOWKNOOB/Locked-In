let taskData = [];

export function init() {
    const input = document.getElementById("task-input");
    const addBtn = document.getElementById("add-task");
    const list = document.getElementById("task-list");

    // Load saved tasks
    chrome.storage.local.get(['tasks'], (result) => {
        taskData = result.tasks || [];
        render();
    });

    addBtn.addEventListener("click", () => {
        const taskText = input.value.trim();
        if (taskText === "") return;

        taskData.push({ text: taskText });
        input.value = "";
        saveTasks();
        render();
    });

    function render() {
        list.innerHTML = "";

        // render everything from storage
        taskData.forEach((task, index) => {
            const newTask = document.createElement("li");
            newTask.className = "task-item";

            const taskInput = document.createElement("input");
            taskInput.type = "text";
            taskInput.value = task.text;

            taskInput.addEventListener("input", () => {
                taskData[index].text = taskInput.value;
                saveTasks();
            });

            const removeBtn = document.createElement("span");
            removeBtn.className = "remove-task";
            removeBtn.textContent = "✕";

            removeBtn.addEventListener("click", () => {
                taskData.splice(index, 1);
                saveTasks();
                render();
            });

            newTask.appendChild(removeBtn);
            newTask.appendChild(taskInput);
            list.appendChild(newTask);
        });
    }

    function saveTasks() {
        chrome.storage.local.set({ tasks: taskData });
    }
}
