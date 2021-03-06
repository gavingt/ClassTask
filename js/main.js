var facebookProvider = new firebase.auth.FacebookAuthProvider(); //this is for Facebook account authorization
var googleProvider = new firebase.auth.GoogleAuthProvider(); //this is for Google account authorization
var currentlyActiveWeekDates = new Array(8); //stores an array of the dates for the currently visible week
var dayDivArray = new Array(8); //dayDivArray[] will hold the 7 dayDiv objects. Each dayDiv is a div that houses the tasks for a given weekday. So there are 7 dayDivs corresponding to 7 days of the week.
var addedTaskDivArray = new Array(8); //This will be an array of arrays that holds the addedTaskDiv objects for each day of the currently visible week
var dayTaskJsonArray = new Array(8); //This will be an array of arrays that holds the JSON data for the tasks of each day of the currently visible week
var classDivArray = []; //This will be an array of arrays that stores the classDivs inside each dayDiv.
var snackbarTimeoutId;  //Stores the timeout ID associated with the timeout function used for the snackbar.
var snackbar = document.getElementById("snackbar"); //gets a reference to the snackbar div
var todaysDateIndex; //Stores a number from 0-6, corresponding to the 7 days Sunday through Saturday, indicating which day of the week is today. For instance, if today is Sunday it equals 0, and if it's Tuesday it equals 2.
var currentlyActiveWeekIndex = 0; //this tracks which week is currently being viewed. It starts at 0 and increments if user hits Next week button, and decrements when user hits Previous week button
var bInitialReadComplete = false; //boolean value that stores whether or not we've done the initial reading of data at page load (or at login, if not logged in already at page load)
var name, email, photoUrl; // these will hold the name, email, and PhotoUrl provided by Google or Facebook after a user logs in
var spinner = document.getElementById("spinner"); //progress spinner
var lastCheckedForOverdueTasksDate = '1000000000001'; //Holds date of the last time we checked for overdue tasks. This gets updated every time the user pulls data from Firebase, so its initial value is basically meaningless.
var fetchingPreviousWeek, fetchingNextWeek = false;
var classScheduleData = []; //An array that holds the class schedule data that was input by the user in the modal. Each class is an object.
var idOfColorElementSelected;


$(document).ready(function() {


// Initialize Firebase. This code should stay at the top of main.js
var config = {
    apiKey: "AIzaSyAEPEyYJBvmqqwu4XSFitMUENdskmKp0fc",
    authDomain: "classtask-162513.firebaseapp.com",
    databaseURL: "https://classtask-162513.firebaseio.com",
    storageBucket: "classtask-162513.appspot.com",
    messagingSenderId: "453189316211"
};
firebase.initializeApp(config);

initialize2dArrays(true); //calls initialize2dArrays() function when user first loads page


//The below lines force these images to be preloaded so that they they're ready when we need to display them.
var image1 = new Image();
image1.src = "img/checkbox_gray.png";

var image2 = new Image();
image2.src = "img/checkbox_black.png";

var image3 = new Image();
image3.src = "img/left_arrow_hover.png";

var image4 = new Image();
image4.src = "img/right_arrow_hover.png";

var image5 = new Image();
image5.src = "img/settings_black.png";

var image6 = new Image();
image6.src = "img/expand_summary_details.png";

var image7 = new Image();
image7.src = "img/collapse_summary_details.png";

var image8 = new Image();
image8.src = "img/class_delete_summary.png";

//These lines eliminate Flash of Invisible Text (FOIT) as Font Awesome plus sign loads in.
document.getElementById('dummy_text_fa').className = "fa fa-plus";
document.getElementById('dummy_text_fa').style.visibility = "hidden";

//These lines eliminate Flash of Invisible Text (FOIT) as timepicker arrows load in.
document.getElementById('dummy_text_arrows').className = "wickedpicker__controls__control-up wickedpicker__controls__control-down";
document.getElementById('dummy_text_arrows').style.visibility = "hidden";



//Customize layout based on device size. We check both width and height because we have to account for both portrait and landscape mode.
if (screen.width > 750 && screen.height > 750) {
    document.getElementById('greeting').style.display = "inline";
}
else {
    document.getElementById("logo").style.width = "20%";
    document.getElementById("settings_div").style.right = "10px";
    document.getElementById("settings_button").style.width = "95%";
    document.getElementById("main_content_wrapper").style.marginTop = "0px";
    document.getElementById("current_session_text").style.display = "none";
    document.getElementById("current_week_text").style.float = "left";
    document.getElementById("week_switcher_wrapper").appendChild(document.getElementById("current_week_text"));
}


//Callback function that indicates whether a user is signed in or not.
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {  // User is signed in

        if (bInitialReadComplete === false) {  //Doing this check ensures that Firebase's hourly token refreshes don't cause re-reading of data (and thus duplicate tasks, since readTaskData() generates addedTaskDiv elements).

            spinner.style.display = "block";
            createDayDivs();  //creates a dayDiv for each day when user first loads page
            initializeDates(); //gets the dates for the current week when user first loads page
            readClassData(); //Reads class data if it exists for current user, followed by reading task data. If class data doesn't exist, it opens class setup wizard.
            initializeSettingsButton(true);
            initializeWeekSwitcherButtons();
            bInitialReadComplete = true;

            if (user !== null) {
                document.getElementById("profile_picture").src = user.photoURL;
                document.getElementById("email_address").textContent = user.email;
            }
        }
    } else {  // No user is signed in.

        document.getElementById("sign_in_button_group_wrapper").style.display = "block";
        document.getElementById("sign_in_button_group").style.display = "inline-block";
        initializeSettingsButton(false);
    }
});



}); //end $(document).ready

/****************************************************/
/************START DOM MANIPULATION CODE*************/
/****************************************************/


//creates dayDiv elements and saves them in dayDivArray[]
function createDayDivs () {
    for (var i = 0; i < 8; i++) {
            var dayDiv = document.createElement("div");
            dayDiv.className = "day_div"; //Gives every dayDiv a class name so it can be referenced

            var dayDivHeader = document.createElement("div");
            dayDivHeader.className = "day_div_header";
            dayDivHeader.appendChild(document.createElement('span'));
            dayDiv.appendChild(dayDivHeader);

            dayDivArray[i] = dayDiv;  //Sets the dayDiv we just built to be equal to the ith element of the dayDivArray[]
            document.getElementById('day_div_wrapper').appendChild(dayDivArray[i]);   //Makes the dayDiv appear on the page
    }

    dayDivArray[0].firstChild.firstChild.textContent = "Overdue";
    dayDivArray[0].firstChild.firstChild.style.color = "red";
}




//Creates classDiv elements. This function gets called in readTaskData(), to generate classDivs based on the classes the user added in the initial setup wizard.
function createClassDiv(classColor, classDays, classLocation, className, classTime, dayIndex, classDivIndex) {
    var classDiv = document.createElement("div");
    classDiv.className = "class_div";
    classDiv.style.backgroundColor = classColor;

    var classNameDiv = document.createElement("div");
    classNameDiv.className = "class_name_div";
    classNameDiv.textContent = className;

    var classInfoDiv = document.createElement('div');
    classInfoDiv.className = "class_info_div";

    var classInfoButton = document.createElement('span');
    classInfoButton.className = "class_info_button font_awesome_info_icon fa-before fa-angle-down";
    classInfoDiv.appendChild(classInfoButton);

    classDiv.appendChild(classNameDiv);

    var classInfoList = document.createElement('div');
    classInfoList.className = "class_info_list";
    classInfoList.innerHTML = "<span class='bold-text'>Days:</span> &nbsp;" + classDays + "<br/><span class='bold-text'>Location:</span> &nbsp;"  + classLocation + "<br/><span class='bold-text'>Time:</span> &nbsp;" + classTime;
    classNameDiv.appendChild(classInfoList);

    classNameDiv.appendChild(classInfoDiv);

    initializeClassInfoButtons(classNameDiv);

    var addTaskButton = document.createElement("p");
    addTaskButton.className = "add_task_button fa-before fa-plus"; //Gives each addTaskButton a class name and also assigns a Font Awesome icon to it.
    addTaskButton.style.display = "table"; //"table" ensures element goes on a new line but is only as big as its contents (block takes up whole line, whereas inline-block fits to content but doesn't occupy its own line).
    addTaskButton.textContent = "\xa0 Add task";
    classDiv.appendChild(addTaskButton);

    addTaskButton.addEventListener("click", function () {
        resetDomElements();
        addTaskButton.style.display = "none";  //Makes addTaskButton that was clicked disappear.

        var newTaskDiv = document.createElement("div"); //Creates a div to house the UI for adding a new task. This holds a textbox, Submit button, and Cancel button.
        newTaskDiv.className = "new_task_div";  //Gives every newTaskDiv a class name so they can be referenced later.
        classDiv.appendChild(newTaskDiv);

        var newTaskInput = document.createElement("input");
        newTaskInput.type = "text";
        newTaskInput.placeholder = "task";
        newTaskInput.className = "new_task_input";
        newTaskInput.addEventListener("keyup", function (event) {  //this eventListener simulates pressing the newTaskSaveButton after you type into newTaskInput and press Enter.
            event.preventDefault();
            if (event.keyCode === 13) {
                newTaskSaveButton.click();
            }
        });
        newTaskDiv.appendChild(newTaskInput);
        newTaskInput.focus();

        var newTaskButtonContainerDiv = document.createElement('div');
        newTaskButtonContainerDiv.style.marginTop = "3px";

        var newTaskSaveButton = document.createElement("button");
        newTaskSaveButton.textContent = "Add task";
        newTaskSaveButton.className = "new_task_save_button generic_button";
        newTaskButtonContainerDiv.appendChild(newTaskSaveButton);
        newTaskSaveButton.addEventListener("click", function () {
            if (newTaskInput.value !== "") {  //don't save task if text field is left blank
                var addedTaskDiv = createAddedTaskDiv(newTaskInput.value, dayIndex, classDivIndex); //call function createAddedTaskDiv and pass in the necessary values to create a new addedTaskDiv, then return the new object and save it as a var.
                classDiv.insertBefore(addedTaskDiv, newTaskDiv);  //Inserts addedTaskDiv before the newTaskDiv. This ensures tasks are added to the page in the order the user enters them.
                writeUserData(classDivIndex, newTaskInput.value, dayIndex);
                newTaskInput.value = "";  //Removes existing text from newTaskInput textbox
            }
        });

        var newTaskCancelButton = document.createElement("button");
        newTaskCancelButton.textContent = "Cancel";
        newTaskCancelButton.className = "generic_button";
        newTaskButtonContainerDiv.appendChild(newTaskCancelButton);
        newTaskCancelButton.addEventListener("click", function () {
            classDiv.appendChild(addTaskButton);      //Moves addTaskButton back to the bottom of dayDiv
            addTaskButton.style.display = "table";  //Makes addTaskButton reappear
            newTaskDiv.parentNode.removeChild(newTaskDiv); //Removes newTaskDiv from the DOM
        });
        newTaskDiv.appendChild(newTaskButtonContainerDiv);
    });

    addTaskButton.addEventListener("mouseover", function () {
        addTaskButton.style.color = "black";
    });
    addTaskButton.addEventListener("mouseout", function () {
        addTaskButton.style.color = "#595959";
    });

    if (dayIndex === 0) {
        addTaskButton.style.display = "none";
    }

    classDivArray[dayIndex].push(classDiv);
    return classDiv;
}





//Creates addedTaskDiv elements. This function gets called in two places:
                                                         // 1) in createClassDiv(), to generate an addedTaskDiv when the user adds a new task
                                                         // 2) in readTaskData(), to generate addedTaskDivs from existing tasks stored in Firebase
function createAddedTaskDiv(addedTaskText, dayIndex, classDivIndex) {

    var addedTaskDiv = document.createElement("div"); //creates a <div> element to house a newly added task
    addedTaskDiv.className = "added_task_div";

    var markTaskFinishedImage = document.createElement("img"); //creates the checkbox image for an addedTaskDiv
    markTaskFinishedImage.src = "img/checkbox_gray.png";
    markTaskFinishedImage.className = "mark_task_finished_image";
    markTaskFinishedImage.style.cursor = "pointer";
    markTaskFinishedImage.addEventListener("click", function() {

        var completedTaskIndex = addedTaskDivArray[dayIndex].indexOf(markTaskFinishedImage.parentNode);  //finds the index of the task the user wishes to mark as completed
        var completedTaskJson = dayTaskJsonArray[dayIndex][completedTaskIndex];

        removeTaskData(dayIndex, completedTaskIndex); //removes the selected task from Firebase

        //We have to clone the snackbar to remove its event listeners so that the UNDO button doesn't undo multiple completed tasks
        var newSnackbar = snackbar.cloneNode(true);
        snackbar.parentNode.replaceChild(newSnackbar, snackbar);
        snackbar = newSnackbar;
        snackbar.style.visibility = "visible";
        clearTimeout(snackbarTimeoutId);
        snackbarTimeoutId = setTimeout(function(){ snackbar.style.visibility = "hidden"; }, 10000); //hides snackbar after waiting 500 ms for fadeout animation to run

        document.getElementById("snackbar_undo_button").addEventListener("click", function() {

            snackbar.style.visibility = "hidden";
            undoRemoveTaskData(completedTaskJson, completedTaskIndex, dayIndex);
        });

        document.getElementById("snackbar_hide_button").addEventListener("click", function() {
            snackbar.style.visibility = "hidden";
        });

    });
    markTaskFinishedImage.addEventListener("mouseover", function () {
        markTaskFinishedImage.src = "img/checkbox_black.png";
    });
    markTaskFinishedImage.addEventListener("mouseout", function() {
        markTaskFinishedImage.src = "img/checkbox_gray.png";
    });

    addedTaskDiv.appendChild(markTaskFinishedImage);

    var addedTaskTextSpan = document.createElement("span");
    addedTaskTextSpan.textContent = addedTaskText; //Sets the textContent of the newly added task to be equal to what the user typed into the textbox
    addedTaskTextSpan.className = "added_task_text_span";
    addedTaskDiv.appendChild(addedTaskTextSpan);
    var addedTaskDivIndex = addedTaskDivArray[dayIndex].push(addedTaskDiv) - 1; //push returns new length of the array, so we subtract 1 to get the index of the new addedTaskDiv


    //task editing is handled in the eventListener below
    addedTaskTextSpan.addEventListener("click", function() {

        resetDomElements();
        addedTaskDiv.style.display = "none";

        var editTaskDiv = document.createElement("div"); //Creates a div to house the UI for editing a task. This holds a textbox, Save button, and Cancel button.
        editTaskDiv.className = "new_task_div";  //Gives every editTaskDiv a class name so they can be referenced later in the JavaScript code

        var editTaskInput = document.createElement("input");
        editTaskInput.type = "text";
        editTaskInput.placeholder = "task";
        editTaskInput.className = "new_task_input";
        editTaskInput.value = addedTaskTextSpan.textContent; //sets text of the editTaskInput to be equal to the added text of the addedTaskTextSpan that was clicked on
        editTaskInput.addEventListener("keyup", function (event) {  //this eventListener simulates pressing the editTaskSaveButton after you type into editTaskInput and press Enter.
            event.preventDefault();
            if (event.keyCode === 13) {
                editTaskSaveButton.click();
            }
        });
        editTaskDiv.appendChild(editTaskInput);

        var editTaskButtonContainerDiv = document.createElement('div');
        editTaskButtonContainerDiv.style.marginTop = "3px";

        var editTaskSaveButton = document.createElement("button");
        editTaskSaveButton.textContent = "Save";
        editTaskSaveButton.className = "new_task_save_button generic_button";
        editTaskButtonContainerDiv.appendChild(editTaskSaveButton);
        editTaskSaveButton.addEventListener("click", function () {
            if (editTaskInput.value !== "") {
                addedTaskTextSpan.textContent = editTaskInput.value; //set the addedTaskTextSpan's text equal to the newly edited text value from newTaskInput
                addedTaskDiv.style.display = "block"; //make the addedTaskDiv visible again after we hid it earlier
                editTaskDiv.parentNode.removeChild(editTaskDiv); //Removes editTaskDiv from the DOM

                editTaskData(classDivIndex, addedTaskTextSpan.textContent, dayIndex, addedTaskDivIndex);
            }
        });

        var editTaskCancelButton = document.createElement("button");
        editTaskCancelButton.textContent = "Cancel";
        editTaskCancelButton.className = "generic_button";
        editTaskButtonContainerDiv.appendChild(editTaskCancelButton);
        editTaskCancelButton.addEventListener("click", function () {
            addedTaskDiv.style.display = "block";
            editTaskDiv.parentNode.removeChild(editTaskDiv);  //Removes editTaskDiv from the DOM
        });
        editTaskDiv.appendChild(editTaskButtonContainerDiv);

        classDivArray[dayIndex][classDivIndex].insertBefore(editTaskDiv, addedTaskDiv);
        editTaskInput.focus();
    });

    return addedTaskDiv;
}




//Hides or shows dayDivs based on the week that's visible. If it's the current week, we hide the dayDivs for days that have already passed.
function hideOrShowDayDivs () {

    document.getElementById('main_content_wrapper').style.display = "block";

    if (currentlyActiveWeekIndex === 0) {
        dayDivArray[0].style.display = "block";
        for (var j = 1; j <todaysDateIndex + 1; j++) {
            dayDivArray[j].style.display = "none";
        }
    }
    else {
        dayDivArray[0].style.display = "none";
        for (var k = 1; k < 8; k++) {
            dayDivArray[k].style.display = "block";
        }
    }
}


//Hides or shows classDivs within Overdue section. If all classDivs are hidden, it hides the entire Overdue section so that the header is also hidden.
function hideOrShowOverdueClassDivs () {
    var emptyClassDivsCount = 0;
    for (var m=0; m<classDivArray[0].length; m++) {
        if (classDivArray[0][m].getElementsByClassName('added_task_div').length === 0) {  //if classDiv in Overdue section contains zero addedTaskDivs, hide that classDiv
            classDivArray[0][m].style.display = "none";
            emptyClassDivsCount++;
        }
        else {
            classDivArray[0][m].style.display = "block";
        }
        if (emptyClassDivsCount === classDivArray[0].length) {
            dayDivArray[0].style.display = "none";
        }
        else {
            dayDivArray[0].style.display = "block";
        }
    }
}




//Resets various DOM elements to their original states.
function resetDomElements() {
    var addedTaskDivsToShow = document.getElementsByClassName("added_task_div");
    for (var i = 0; i < addedTaskDivsToShow.length; i++) {
        addedTaskDivsToShow[i].style.display = "block";
    }

    var newTaskDivsToHide = document.getElementsByClassName("new_task_div");
    for (var j = 0; j < newTaskDivsToHide.length; j++) {
        newTaskDivsToHide[j].parentNode.removeChild(newTaskDivsToHide[j]);
    }

    var editTaskDivsToHide = document.getElementsByClassName("edit_task_div");
    for (var k = 0; k < editTaskDivsToHide.length; k++) {
        editTaskDivsToHide[k].parentNode.removeChild(editTaskDivsToHide[k]);
    }

    var addTaskButtonsToShow = document.getElementsByClassName("add_task_button"); //store all addTaskButtons in a local array
    var classDivs = document.getElementsByClassName("class_div"); //store all classDivs in a local array

    for (var m=classDivArray[0].length; m<classDivs.length; m++) {  //show all addTaskButtons except for the ones in the first Overdue section
        classDivs[m].appendChild(addTaskButtonsToShow[m]);
        addTaskButtonsToShow[m].style.display = "table";
    }
}


/****************************************************/
/*************END DOM MANIPULATION CODE**************/
/****************************************************/





/****************************************************/
/*****************START FIREBASE CODE ***************/
/****************************************************/





//edit existing task in database
function editTaskData(taskClassIndex, taskText, dayIndex, taskIndex) {
    dayTaskJsonArray[dayIndex][taskIndex] = {
        taskClassIndex: taskClassIndex,
        taskText: taskText
    };
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + "/tasks/" + currentlyActiveWeekDates[dayIndex] + "/" + taskIndex).set(dayTaskJsonArray[dayIndex][taskIndex]); //write edited task data
}



//remove existing task in database
function removeTaskData(dayIndex, taskIndex) {
    dayTaskJsonArray[dayIndex].splice(taskIndex,1);
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + "/tasks/" + currentlyActiveWeekDates[dayIndex]).set(dayTaskJsonArray[dayIndex]); //saves a given day's tasks with the completed task removed
    hideOrShowOverdueClassDivs();
}



//write a task back into the database if it was marked complete and then the UNDO button in snackbar was pressed
function undoRemoveTaskData(completedTaskJson, taskIndex, dayIndex) {
    dayTaskJsonArray[dayIndex].splice(taskIndex, 0, completedTaskJson);

    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + "/tasks/" + currentlyActiveWeekDates[dayIndex]).set(dayTaskJsonArray[dayIndex]); //write deleted task back into Firebase

    hideOrShowOverdueClassDivs();
}



//write new task to database
function writeUserData(taskClassIndex, taskText, dayIndex) {
    dayTaskJsonArray[dayIndex].push({
        taskClassIndex: taskClassIndex,
        taskText: taskText
    });

    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + "/tasks/" + currentlyActiveWeekDates[dayIndex]).set(dayTaskJsonArray[dayIndex]);  //write new task data
}




//Reads class data if it exists. If it doesn't, it opens the initial setup wizard.
function readClassData() {

    var userId = firebase.auth().currentUser.uid;

    //Read old value of lastCheckedForOverdueTasksDate
    firebase.database().ref('/users/' + userId + '/lastCheckedForOverdueTasksDate').once('value', (function (snapshot) {
            lastCheckedForOverdueTasksDate = snapshot.val();
        }
    ));

    //Fetch class data
    firebase.database().ref('/users/' + userId + "/classes").once('value', (function (snapshot) {
            if (snapshot.val() !== null) {   // if there are no tasks for the day it'll return null and we move onto the next day
                classScheduleData = snapshot.val(); //Store entire "classes" JSON object from Firebase as classScheduleData.
                for (var i = 0; i < 8; i++) {

                    for (var j = 0; j < classScheduleData.length; j++) {
                        if (j===0) {
                            document.getElementById("current_session_text").textContent = classScheduleData[0];
                        }
                        else {
                            var classDiv = createClassDiv(document.getElementById(classScheduleData[j].idOfColorElementSelected).style.backgroundColor, classScheduleData[j].classDays, classScheduleData[j].classLocation, classScheduleData[j].className, classScheduleData[j].classTime, i, j-1);
                            dayDivArray[i].append(classDiv);
                        }
                    }
                }
                readTaskData(); //If user has pre-existing class data, execute readTaskData() after reading class data
            }
            else {
                setUpModalWizard(true);
                document.getElementById('class_modal').style.display = "block";
                document.getElementById("main_content_wrapper").style.display = "none";
                spinner.style.display = "none";
            }
        }
    ));
}


//Reads data from Firebase. This only gets called at the initial page load or when the user switches between weeks.
function readTaskData() {

    var userId = firebase.auth().currentUser.uid;

    for (var i = 0; i < 8; i++) {

        (function (i) {   //Solves closure problem described here: http://stackoverflow.com/questions/13343340/calling-an-asynchronous-function-within-a-for-loop-in-javascript.
            //Wrapping the contents of the FOR loop in this function allows us to get a reference to the current value of i, which we otherwise couldn't do from within the asynchronous addEventListener functions defined below

            // Fetch task data for currently active week
            firebase.database().ref('/users/' + userId + "/tasks/" + currentlyActiveWeekDates[i]).on('value', (function (snapshot) {

                    //remove existing tasks before we read task data
                    var addedTaskDivsToRemoveArray = dayDivArray[i].getElementsByClassName("added_task_div");
                    var count = addedTaskDivsToRemoveArray.length;
                    for (var k = 0; k < count; k++) {
                        addedTaskDivArray[i].splice(0, 1);
                        addedTaskDivsToRemoveArray[0].parentNode.removeChild(addedTaskDivsToRemoveArray[0]);
                    }

                    //read task data
                    if (snapshot.val() !== null) {   // if there are no tasks for the day it'll return null and we move onto the next day

                        dayTaskJsonArray[i] = snapshot.val();

                        for (var j = 0; j < dayTaskJsonArray[i].length; j++) {
                            var addedTaskDiv = createAddedTaskDiv(dayTaskJsonArray[i][j].taskText, i, dayTaskJsonArray[i][j].taskClassIndex); //Calls function createAddedTaskDiv and passes in the necessary values to create a new addedTaskDiv, then return the new object and save it as a var.
                            classDivArray[i][dayTaskJsonArray[i][j].taskClassIndex].insertBefore(addedTaskDiv, classDivArray[i][dayTaskJsonArray[i][j].taskClassIndex].lastChild);  //Inserts addedTaskDiv before the last child element of the classDivArray.
                        }
                    }


                    // Find any newly overdue tasks and put them in one place (the day with Unix timestamp 1000000000000)
                    if (i === 0 && currentlyActiveWeekIndex === 0) {

                            firebase.database().ref('/users/' + userId + "/tasks/").startAt(lastCheckedForOverdueTasksDate).endAt(moment().add(-1, 'days').startOf('day').format('x')).orderByKey().once('value', (function (snapshot) {

                                    if (snapshot.val() !== null) {

                                        $.each(snapshot.val(), function (index, value) {  //since snapshot.val() returns an object in this case, I need to turn it into an array instead
                                            for (var k = 0; k < value.length; k++) {
                                                dayTaskJsonArray[0].push(value[k]);
                                            }
                                        });

                                        firebase.database().ref('users/' + userId + "/tasks/1000000000000").set(dayTaskJsonArray[0]);  //write overdue tasks to 1000000000000

                                        var updates = {}; //initialize object to store paths of tasks to be deleted

                                        for (var m = 0; m < Object.keys(snapshot.val()).length; m++) {
                                            updates['/users/' + userId + '/tasks/' + Object.keys(snapshot.val())[m]] = null; //store null as the value for each key in updates object
                                        }

                                        firebase.database().ref().update(updates); //batch update all overdue task directories with null

                                        //write current date to Firebase and save it as lastCheckedForOverdueTasksDate
                                        firebase.database().ref('users/' + userId).update({lastCheckedForOverdueTasksDate: moment().startOf('day').format('x')}) ;
                                    }
                                    else {
                                        hideOrShowDayDivs();
                                        hideOrShowOverdueClassDivs();
                                        spinner.style.display = "none";
                                        fetchingOtherWeeks();

                                    }
                                }
                            ));
                    }

                    if (i === 7 && currentlyActiveWeekIndex !== 0) {
                        hideOrShowDayDivs();
                        fetchingOtherWeeks();
                    }
                }
            ));
        }(i));  //This is the end of the function that exists solely to solve closure problem. It's also where we pass in the value of i so that it's accessible within the above code.
    }  //end FOR loop
}



document.getElementById("sign_in_google_button").addEventListener("click", function() {
    firebase.auth().signInWithPopup(googleProvider).then(function(result) {
        // This gives you a Google Access Token. You can use it to access the Google API.
        var token = result.credential.accessToken;
        // The signed-in user info.
        var user = result.user;

        window.location.reload(); //Reload the page if the user signs in.

    }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        alert("Sign-in error occurred: \n" + "Error code: " + errorCode + "\Error message: " + errorMessage);
    });
});


document.getElementById("sign_in_facebook_button").addEventListener("click", function() {
    firebase.auth().signInWithPopup(facebookProvider).then(function(result) {
        // This gives you a Facebook Access Token. You can use it to access the Facebook API.
        var token = result.credential.accessToken;
        // The signed-in user info.
        var user = result.user;

        window.location.reload(); //Reload the page if the user signs in.

    }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        alert("Sign-in error occurred: \n" + "Error code: " + errorCode + "\Error message: " + errorMessage);
    });
});


document.getElementById("settings_item_sign_out").addEventListener("click", function() {

    document.getElementById("main_content_wrapper").style.display = "none";
    firebase.auth().signOut().then(function() {
        window.location.reload(); //Reload the page if the user signs out. By doing this, we can avoid including a lot of code for resetting the environment for when a different user signs in.

    }).catch(function(error) {
        // An error happened.
        alert("Sign-out error occurred \n" + "Error code: " + errorCode + "\nError message: " + errorMessage);
    });
});



/************************************************************/
/**********************END FIREBASE CODE*********************/
/************************************************************/






/****************************************************/
/**************START DATE HANDLING CODE**************/
/****************************************************/


//When user first loads the page, this sets the currentlyActiveWeekDates[] array to the current week and then sets the dates to the page elements
function initializeDates() {

    currentlyActiveWeekDates[0] = '1000000000000';

    for (var i=1; i<8; i++) {
        currentlyActiveWeekDates[i] = moment().startOf('isoWeek').add(i-1, 'days');
    }

    todaysDateIndex = moment().isoWeekday() - 1;  //Stores  a number 0-6 indicating the current day of the week from Monday to Sunday. For instance, Monday = 0 and Thursday = 3.
    setDaysOfWeek(currentlyActiveWeekDates);
}


//sets the dates to the dateLabel elements in each dayDivArray[] element
function setDaysOfWeek() {
    for (var i=1; i<8; i++) {

        if (currentlyActiveWeekDates[i].format("dddd, MMMM D, YYYY") === moment().format("dddd, MMMM D, YYYY")) {
            dayDivArray[i].firstChild.firstChild.textContent = currentlyActiveWeekDates[i].format("dddd, MMMM D, YYYY") + " (Today)";  //if currentlyActiveWeekDates[i] is storing today's date, append " (Today)" at the end.
        }
        else if (currentlyActiveWeekDates[i].format("dddd, MMMM D, YYYY") === moment().add(1, 'days').format("dddd, MMMM D, YYYY")) {
            dayDivArray[i].firstChild.firstChild.textContent = currentlyActiveWeekDates[i].format("dddd, MMMM D, YYYY") + " (Tomorrow)";  //if currentlyActiveWeekDates[i] is storing tomorrow's date, append " (Tomorrow)" at the end.
        }
        else {
            dayDivArray[i].firstChild.firstChild.textContent = currentlyActiveWeekDates[i].format("dddd, MMMM D, YYYY"); //Get firstChild of each dayDivArray, which is the dateLabel element. Then we set its textContent equal to the corresponding entry in the currentlyActiveWeekDates[] array.
        }
    }


    //Below we set currentWeekText in week switcher div
    var currentWeekText = document.getElementById("current_week_text");

    if (currentlyActiveWeekDates[1].month() === currentlyActiveWeekDates[7].month()) {  //if the current week is all contained within a single month, we display it like this
        currentWeekText.textContent = currentlyActiveWeekDates[1].format("MMMM D") + " - " + currentlyActiveWeekDates[7].format("D");
    }
    else { //if the current week crosses over months, we display it like this
        currentWeekText.textContent = currentlyActiveWeekDates[1].format("MMMM D") + " - " + currentlyActiveWeekDates[7].format("MMMM D");
    }

}




/****************************************************/
/***************END DATE HANDLING CODE***************/
/****************************************************/






/************************************************************/
/******************START UTILITY FUNCTIONS*******************/
/************************************************************/



//Turns taskDivArray, dayTaskJsonArray, and classDivArray into 2D arrays (each of their elements stores its own array)
function initialize2dArrays(bIncludeClassDivArray) {
    for (var i = 0; i < 8; i++) {

        addedTaskDivArray[i] = [];
        dayTaskJsonArray[i] = [];
        if (bIncludeClassDivArray) {
            classDivArray[i] = [];
        }
    }
}




function fetchingOtherWeeks() {
    var previousWeekButtonImage = document.getElementById("previous_week_button_image");
    var nextWeekButtonImage = document.getElementById("next_week_button_image");
    var dayDivWrapper = $('#day_div_wrapper');

    if (fetchingPreviousWeek) {
        fetchingPreviousWeek = false;
        dayDivWrapper.animate({  //Do this first. Animate element from its starting position to this newly specified position.
            left: '0'
        }, 400, function() {
            previousWeekButtonImage.src = "img/left_arrow.png";
        });
    }

    if (fetchingNextWeek) {
        fetchingNextWeek = false;
        dayDivWrapper.animate({  //Do this first. Animate element from its starting position to this newly specified position.
            left: '0'
        }, 400, function() {
            nextWeekButtonImage.src = "img/right_arrow.png";
        });
    }
}




//Adds various eventListeners to make the Settings button work.
function initializeSettingsButton(bUserSignedIn) {

    var settingsButton = document.getElementById("settings_button");
    var settingsList = document.getElementById("settings_list");

    //When the user clicks on the button, toggle between hiding and showing the dropdown list
    settingsButton.addEventListener("click", function () {
        if (bUserSignedIn) {
            settingsList.classList.toggle('show');
            document.getElementById('settings_item_profile_info').style.display = "block";
            document.getElementById('settings_item_open_modal').style.display = "block";
            document.getElementById('settings_item_sign_out').style.display = "block";
        }
        else {
            settingsList.classList.toggle('show');
            document.getElementById('settings_item_profile_info').style.display = "none";
            document.getElementById('settings_item_open_modal').style.display = "none";
            document.getElementById('settings_item_sign_out').style.display = "none";
        }
    });

    settingsButton.addEventListener("mouseover", function () {
        settingsButton.src = "img/settings_black.png";
    });

    settingsButton.addEventListener("mouseout", function () {
        if (!settingsList.classList.contains('show')) {
            settingsButton.src = "img/settings_gray.png";
        }
    });

    settingsButton.addEventListener("touchstart", function() {
        if (settingsList.classList.contains("show")) {
            settingsButton.src = "img/settings_gray.png";
        }
        else {
            settingsButton.src = "img/settings_black.png";
        }
    });


    document.getElementById("settings_item_open_modal").addEventListener("click", function () {
        setUpModalWizard(false);
        document.getElementById("class_modal").style.display = "block";
        var html = $('html');

        if ($(document).height() > $(window).height()) {
            var scrollTop = (html.scrollTop()) ? html.scrollTop() : $('body').scrollTop(); //prevents body scrolling when modal visible
            html.addClass('noscroll').css('top',-scrollTop);
        }
    });

    document.getElementById("settings_item_about_this_app").addEventListener("click", function () {
        alert("Created by Gavin and Adam Wright, 2017");
    });
}




function initializeClassInfoButtons(classNameDiv) {
    classNameDiv.addEventListener('click', function() {
        var thisClassInfoList = classNameDiv.childNodes[1];

        if(thisClassInfoList.classList.contains('show')) {
            $('.class_info_list').removeClass('show');
            thisClassInfoList.className = "class_info_list show";
        }
        else {
            $('.class_info_list').removeClass('show');
        }
        thisClassInfoList.classList.toggle('show');
    });



    window.onclick = function (event) {  //close dropdown menus if the user clicks outside of them
        if (!event.target.matches('.class_name_div,.class_info_button,.class_info_div')) {
            $('.class_info_list').removeClass('show');
        }

        if (!event.target.matches('.settings_button')) {
            document.getElementById('settings_list').classList.remove('show');
            document.getElementById('settings_button').src = "img/settings_gray.png";
        }
    };
}



function initializeWeekSwitcherButtons() {
    var previousWeekButton = document.getElementById("previous_week_button");
    var nextWeekButton = document.getElementById("next_week_button");
    var previousWeekButtonImage = document.getElementById("previous_week_button_image");
    var nextWeekButtonImage = document.getElementById("next_week_button_image");
    var previousWeekButtonTouched, nextWeekButtonTouched = false;

    //Sets up eventListeners the "Previous week" button
    previousWeekButton.addEventListener("click", function () {

        previousWeekButtonImage.src = "img/left_arrow_hover.png";
        var dayDivWrapper = $('#day_div_wrapper');

        fetchingPreviousWeek = true;
        dayDivWrapper.animate({  //Do this first. Animate element from its starting position to this newly specified position.
            left: '110%'
        }, 400, function() {  //Do this callback function after the above animation is finished. Instantly move element to specified position, and then animate it back to its starting position of left:0.
            dayDivWrapper.css('left', '-110%');
        });

        snackbar.style.visibility = "hidden";
        currentlyActiveWeekIndex--; //decrement currentlyActiveWeekIndex

        if (currentlyActiveWeekIndex === 0) {
            previousWeekButton.disabled = true;  //If user is viewing the current week, disable Previous week button.
            previousWeekButtonImage.src = "img/left_arrow.png";
        }

        for (var i=1; i<currentlyActiveWeekDates.length; i++) {
            //subtract 7 days from each element of the currentlyActiveWeekDates[] array
            currentlyActiveWeekDates[i] = currentlyActiveWeekDates[i].add(-7, 'days');
            initialize2dArrays(false); //clear 2d arrays before populating them with elements from the new week
        }

        setTimeout(function(){
            readTaskData();  //read user data for new week
            setDaysOfWeek(currentlyActiveWeekDates);
            resetDomElements();
        }, 400);
    });


    //Sets up eventListeners the "Next week" button
    nextWeekButton.addEventListener("click", function () {

        nextWeekButtonImage.src = "img/right_arrow_hover.png";
        var dayDivWrapper = $('#day_div_wrapper');

        fetchingNextWeek = true;
        dayDivWrapper.animate({  //Do this first. Animate element from its starting position to this newly specified position.
            left: '-110%'
        }, 400, function() {   //Do this callback function after the above animation is finished. Instantly move element to specified position, and then animate it back to its starting position of left:0.
            dayDivWrapper.css('left', '110%');
        });

        currentlyActiveWeekIndex++; //increment currentlyActiveWeekIndex
        document.getElementById("previous_week_button").disabled = false;

        snackbar.style.visibility = "hidden";

        for (var i=1; i<currentlyActiveWeekDates.length; i++) {
            //add 7 days to each element of the currentlyActiveWeekDates[] array
            currentlyActiveWeekDates[i] = currentlyActiveWeekDates[i].add(7, 'days');
            initialize2dArrays(false); //clear 2d arrays before populating them with elements from the new week
        }

        setTimeout(function(){
            readTaskData();  //read user data for new week
            setDaysOfWeek(currentlyActiveWeekDates);
            resetDomElements();
        }, 400);
    });
}


function setUpModalWizard (bIsFirstLoad) {
    var currentSessionInput = document.getElementById('current_session_input');
    var html = $('html');

    // Get the modal
    var modal = document.getElementById('class_modal');

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    if (bIsFirstLoad) {
        span.style.display = "none";
    }
    else {
        // When the user clicks on <span> (x), close the modal
        span.onclick = function () {
            modal.style.display = "none";
            var scrollTop = parseInt(html.css('top')); //allows scrolling again when modal dismissed
            html.removeClass('noscroll');
            $('html,body').scrollTop(-scrollTop);
        };

        // When the user clicks anywhere outside of the modal, close it
        document.onclick = function (event) {
            if (event.target === modal) {
                modal.style.display = "none";
                var scrollTop = parseInt(html.css('top')); //allows scrolling again when modal dismissed
                html.removeClass('noscroll');
                $('html,body').scrollTop(-scrollTop);
            }
        };
        showClassSummary();

        for (var i=1; i<classScheduleData.length; i++) {
            document.getElementById(classScheduleData[i].idOfColorElementSelected).style.display = "none";
        }

        document.getElementById('current_session_prompt_div').style.display = "none";
        document.getElementById('class_summary_div').style.display = "block";
    }

    $('.color-div').click(function() {
        $('.color-div').css('outline', 'none');
        $(this).css('outline', '3px solid dodgerblue');
        idOfColorElementSelected = $(this).attr('id'); //classColorSelected is the value that will be saved to the classScheduleData object when user hits Save class button
    });

    document.getElementById("continue_button_current_session").addEventListener('click', function () {
        if (currentSessionInput.value.length === 0) {
            document.getElementById('current_session_prompt_input_validation_text').style.visibility = "visible";
        }
        else {
            classScheduleData[0] = currentSessionInput.value;
            showAddClassPrompt();
        }
    });

    document.getElementById("save_class_button").addEventListener('click', function () {
        if (document.getElementById('class_name_input').value.length === 0 ||
            document.getElementById("day_picker_dropdown_title").textContent === " " ||
            document.getElementById('class_location_input').value.length === 0 ) {
            document.getElementById('add_class_prompt_input_validation_text').style.visibility = "visible";
        }
        else {
            classScheduleData[classScheduleData.length] = {
                   className: document.getElementById('class_name_input').value,
                   classLocation: document.getElementById('class_location_input').value,
                   classDays: document.getElementById("day_picker_dropdown_title").textContent,
                   classTime: $('.beginning-timepicker').wickedpicker('time') + " - " + $('.ending-timepicker').wickedpicker('time'),
                   idOfColorElementSelected: idOfColorElementSelected
            };

            document.getElementById('class_name_input').value = "";
            document.getElementById('class_location_input').value = "";
            document.getElementById("day_picker_dropdown_title").textContent = " ";
            $(':checkbox').prop('checked', false); //unchecks all checkboxes in daypicker dropdown
            document.getElementById(idOfColorElementSelected).style.display = "none";

            showClassSummary();
        }
    });

    document.getElementById("cancel_class_button").addEventListener('click', function () {
        showClassSummary();
     });

    document.getElementById("add_class_button").addEventListener('click', function () {
        document.getElementById('add_class_prompt_input_validation_text').style.visibility = "hidden";
        document.getElementById('class_summary_input_validation_text').style.visibility = "hidden";

        showAddClassPrompt();
    });

    document.getElementById('save_and_finish_button').addEventListener('click', function() {
        if (classScheduleData.length === 1) {
            document.getElementById('class_summary_input_validation_text').style.visibility = "visible";
        }
        else {
            var userId = firebase.auth().currentUser.uid;
            firebase.database().ref('users/' + userId).update({lastCheckedForOverdueTasksDate: moment().startOf('day').format('x')}) ;

            //write class data to Firebase
            firebase.database().ref('users/' + userId + "/classes").set(classScheduleData).then(function() {
                window.location.reload(); //Reload the page after user submits class data.
            });
        }
    });

    initializeDayPicker();
    initializeTimePickers();
}



function showAddClassPrompt() {
    var modalMainContent = document.getElementById('modal_main_content');
    document.getElementById('current_session_prompt_div').style.display = "none";
    document.getElementById('add_class_prompt_div').style.display = "block";
    document.getElementById('class_summary_div').style.display = "none";
    document.getElementById('class_summary_button_div').style.display = "none";
    document.getElementById('modal_header_text').textContent = "\xa0\xa0\xa0\xa0\xa0Add a class";

    if ($(window).height() > 500) {
        modalMainContent.style.top = "calc(50% - 235px)";
    }
    else {
        modalMainContent.style.top = "5px";
    }
    modalMainContent.style.height = "500px";

    var firstVisibleColorDiv =  $('.color-div:visible:first');
    firstVisibleColorDiv.css('outline', '3px solid dodgerblue'); //find first visible color-div and outline it
    idOfColorElementSelected = firstVisibleColorDiv.attr('id'); //classColorSelected is the value that will be saved to the classScheduleData object when user hits Save class button
}



function showClassSummary() {
    var modalMainContent = document.getElementById('modal_main_content');
    document.getElementById('class_summary_button_div').style.display = "block";
    var classSummaryDiv = document.getElementById('class_summary_div');
    classSummaryDiv.style.display = "block";
    document.getElementById('modal_header_text').textContent = "\xa0\xa0\xa0Class summary - " + classScheduleData[0];
    document.getElementById('add_class_prompt_div').style.display = "none";
    document.getElementById('current_session_prompt_div').style.display = "none";

    if ($(window).height() > 500) {
        modalMainContent.style.top = "calc(50% - 235px)";
    }
    else {
        modalMainContent.style.top = "5px";
    }
    modalMainContent.style.height = "470px";

    $('.class-summary-row').remove(); //remove any existing class-summary-rows from DOM, since we're repopulating them every time

    for (var i=1; i<classScheduleData.length; i++) {
        (function (i) {   //Solves closure problem described here: http://stackoverflow.com/questions/13343340/calling-an-asynchronous-function-within-a-for-loop-in-javascript.
            var classSummaryRow = document.createElement('div');
            classSummaryRow.style.backgroundColor = document.getElementById(classScheduleData[i].idOfColorElementSelected).style.backgroundColor;
            classSummaryRow.className = "class-summary-row";

            var classNameSummary = document.createElement('div');
            classNameSummary.className = "class-summary-name";
            classNameSummary.textContent = classScheduleData[i].className;
            classSummaryRow.appendChild(classNameSummary);

            var expandSummaryDetailsImage = document.createElement("img");
            expandSummaryDetailsImage.src = "img/expand_summary_details.png";
            expandSummaryDetailsImage.className = "expand-summary-details-image";
            classSummaryRow.appendChild(expandSummaryDetailsImage);

            expandSummaryDetailsImage.addEventListener('click', function() {
               $(this).siblings('.class-summary-details').toggle();
               if ($(this).siblings('.class-summary-details').css('display') === "block") {
                   expandSummaryDetailsImage.src = "img/collapse_summary_details.png";
               }
               else {
                   expandSummaryDetailsImage.src = "img/expand_summary_details.png";
               }
            });

            var classLocationSummary = document.createElement('div');
            classLocationSummary.className = "class-summary-details";
            classLocationSummary.textContent = classScheduleData[i].classLocation;
            classSummaryRow.appendChild(classLocationSummary);

            var classDaysSummary = document.createElement('div');
            classDaysSummary.className = "class-summary-details";
            classDaysSummary.textContent = classScheduleData[i].classDays;
            classSummaryRow.appendChild(classDaysSummary);

            var classTimeSummary = document.createElement('div');
            classTimeSummary.className = "class-summary-details";
            classTimeSummary.textContent = classScheduleData[i].classTime;
            classSummaryRow.appendChild(classTimeSummary);

            var classDeleteSummary = document.createElement('img');
            classDeleteSummary.className = "class-summary-details";
            classDeleteSummary.id = "class_delete_summary";
            classDeleteSummary.src = "img/class_delete_summary.png";
            classSummaryRow.appendChild(classDeleteSummary);

            classDeleteSummary.addEventListener('click', function() {
               this.parentNode.parentNode.removeChild(this.parentNode);
               document.getElementById(classScheduleData[i].idOfColorElementSelected).style.display = "inline-block";
               classScheduleData.splice(i, 1);
            });

            classSummaryDiv.appendChild(classSummaryRow);
        }(i));  //This is the end of the function that exists solely to solve closure problem. It's also where we pass in the value of i so that it's accessible within the above code.
    }
}

function initializeDayPicker() {
    var checkList = document.getElementById('daypicker_dropdown');
    var items = document.getElementById('day_picker_items');

    checkList.getElementsByClassName('anchor')[0].onclick = function() {
        if (items.classList.contains('visible')) {
            items.classList.remove('visible');
            items.style.display = "none";
        }
        else {
            items.classList.add('visible');
            items.style.display = "block";
        }
    };


    $(':checkbox').click(function(e) {
        e.stopPropagation();
    });

    $('.day_picker_list_item').click(function() {
       var currentCheckbox = $(this).find(">:first-child");

       if (!currentCheckbox.prop('checked')) {
           currentCheckbox.prop('checked', true);
       }
       else {
           currentCheckbox.prop('checked', false);
       }
       buildDaypickerTitle();
    });

    $("input[type='checkbox']").click(function() {
        buildDaypickerTitle();
    });

    items.onblur = function(evt) {
        items.classList.remove('visible');
    };

    $(document).click(function(){
        $(".day-picker-items").hide();
        items.classList.remove('visible');
    });

    $('.daypicker-dropdown').click(function(e){
        $('.wickedpicker').hide();
        e.stopPropagation();  //clicks within the dropdown will prevent click events from bubbling up any further
    });
}



function buildDaypickerTitle () {
    var dropdownTitle = document.getElementById("day_picker_dropdown_title");
    dropdownTitle.textContent = "";

    if (document.getElementById("monday_dropdown_checkbox").checked) {
        dropdownTitle.textContent = "M";
    }
    if (document.getElementById("tuesday_dropdown_checkbox").checked) {
        dropdownTitle.textContent = dropdownTitle.textContent + " Tu";
    }
    if (document.getElementById("wednesday_dropdown_checkbox").checked) {
        dropdownTitle.textContent = dropdownTitle.textContent + " W";
    }
    if (document.getElementById("thursday_dropdown_checkbox").checked) {
        dropdownTitle.textContent = dropdownTitle.textContent + " Th";
    }
    if (document.getElementById("friday_dropdown_checkbox").checked) {
        dropdownTitle.textContent = dropdownTitle.textContent + " F";
    }
    if (document.getElementById("saturday_dropdown_checkbox").checked) {
        dropdownTitle.textContent = dropdownTitle.textContent + " Sa";
    }
    if (document.getElementById("sunday_dropdown_checkbox").checked) {
        dropdownTitle.textContent = dropdownTitle.textContent + " Su";
    }
    if (dropdownTitle.textContent === "") {
        dropdownTitle.textContent = "\xa0";
    }
}



function initializeTimePickers() {
    var beginningTimepicker = $('.beginning-timepicker').wickedpicker();
    var endingTimepicker = $('.ending-timepicker').wickedpicker({now: "13:30"});

    document.getElementById('beginning_timepicker').addEventListener('mousedown', function(e){ e.preventDefault(); }, false);  //prevent highlighting of timepicker text
    document.getElementById('ending_timepicker').addEventListener('mousedown', function(e){ e.preventDefault(); }, false);  //prevent highlighting of timepicker text
}





/************************************************************/
/*******************END UTILITY FUNCTIONS********************/
/************************************************************/
