function refreshProjectIndex() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/vigor22/available_projects');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {
            projectSelect.length = 0;
            let projectIndex = JSON.parse(xhr.responseText);
            projectIndex.sort();
            for (var i = 0; i < projectIndex.length; i++) {
                let opt = document.createElement('option');
                opt.text = projectIndex[i];
                projectSelect.appendChild(opt);
            }
        }
    };
    xhr.send();
}

function getActiveProject() {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status == 200) {
            let response = JSON.parse(xhr.responseText);
            console.log(response);
            activeProject.innerHTML = response;
        } else if (xhr.status == 404) {
            activeProject.innerHTML = "None"
        } else if (xhr.responseText == 'Internal Server Error') {
            alert(xhr.responseText);
        } else {
            alert(JSON.parse(xhr.responseText).detail);
        }
    }
    xhr.open('GET', '/api/vigor22/get_project');
    xhr.send();
}

function deactivateProject() {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status != 200) {
            if (xhr.responseText == 'Internal Server Error') {
                alert(xhr.responseText);
            } else {
                alert(JSON.parse(xhr.responseText).detail);
            }
        }
        getActiveProject();
    }
    xhr.open('GET', '/api/vigor22/deactivate_project');
    xhr.send();
}

function deleteProject(project_name) {
    let confirmation = confirm('Do you want to remove the following project from this device?: ' + project_name);
    if (!confirmation)
        return
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status != 200) {
            if (xhr.responseText == 'Internal Server Error') {
                alert(xhr.responseText);
            } else {
                alert(JSON.parse(xhr.responseText).detail);
            }
        }
        getActiveProject();
        refreshProjectIndex();
    }
    xhr.open('GET', '/api/vigor22/delete_project?project_name=' + project_name);
    xhr.send();
}


function activateProject(projectName) {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status != 200) {
            if (xhr.responseText == 'Internal Server Error') {
                alert(xhr.responseText);
            } else {
                alert(JSON.parse(xhr.responseText).detail);
            }
        }
        getActiveProject();
    }
    xhr.open('GET', '/api/vigor22/set_project?project_name=' + projectName);
    xhr.send();
}

function uploadProject() {
    const files = fileInput.files;
    if (files.length == 0)
        return;
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status != 200) {
            if (xhr.responseText == 'Internal Server Error') {
                alert(xhr.responseText);
            } else {
                alert(JSON.parse(xhr.responseText).detail);
            }
            fileInput.value = "";
            return;
        }
        let jsonResponse = JSON.parse(xhr.responseText);
        console.log(jsonResponse);
        if (jsonResponse.length == 1) {
            activateProject(jsonResponse[0]);
        }
        fileInput.value = "";
        refreshProjectIndex();
    }
    xhr.open('POST', '/api/vigor22/upload_projects');
    xhr.send(formData);
}

function prepareDownload(file, text) {
    var element = document.createElement('a');
    element.setAttribute('href',
        'data:text/plain;charset=utf-8,' +
        encodeURIComponent(text));
    element.setAttribute('download', file);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


function downloadProject(projectName) {
    let downloadFileName = projectName + '.json';
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status != 200) {
            if (xhr.responseText == 'Internal Server Error') {
                alert(xhr.responseText);
            } else {
                alert(JSON.parse(xhr.responseText).detail);
            }
        }
        prepareDownload(downloadFileName, xhr.responseText);
    }
    xhr.open('GET', '/projects/' + downloadFileName);
    xhr.send();
}

fileInput.onchange = () => {
    uploadProject();
}
refreshProjectIndex();
getActiveProject();
