// ==UserScript==
// @name         Canvas All Info
// @namespace    https://theusaf.github.io
// @version      1.2.4
// @icon         https://canvas.instructure.com/favicon.ico
// @copyright    2020-2021, Daniel Lau
// @description  Place all information on a single page (https://canvas.example.com/all or https://example.instructure.com/all)
// @author       theusaf
// @include      /^https:\/\/canvas\.[a-z0-9]*?\.[a-z]*?\/all\/?(\?.*)?$/
// @include      /^https:\/\/[a-z0-9]*?\.instructure\.com\/all\/?(\?.*)?$/
// @grant        none
// ==/UserScript==

/*
  Note:
  - This userscript uses public APIs accessed by canvas
    - Gets class information
    - Gets assignments
    - Gets basic teacher information
  - This userscript does not store or upload any information gathered by the script
  - This userscript overwrites /all in canvas
  - This userscript was originally developed for Oregon State University
*/

/* Useful Links (for use later?)
/api/v1/conversations?scope=inbox&filter_mode=and&include_private_conversation_enrollments=false
- Canvas mail
/api/v1/conversations/(mailbox_id)?include_participant_contexts=false&include_private_conversation_enrollments=false
- Specific mail
/courses/(class_id)/modules/items/assignment_info
- Module items
*/

/**
 * Load - Loads everything
 */
async function Load(){

  document.title = "Dashboard - All";

  /**
   * Main - the main application div
   * iFrameLoader - The div for loading iframes for getting data
   * Styles - A style element
   */
  const Main = document.getElementById("main"),
    iFrameLoader = document.createElement("div");
  Main.innerHTML = `<style>
    #osu-all-iframe-loader{
      visibility: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
      pointer-events: none;
      left: 0;
    }
    #osu-all-iframe-loader > iframe{
      width: 100%;
      height: 100%;
      position: absolute;
      left: 0;
      top: 0;
    }
    #main{
      display: flex;
      flex-flow: column;
      padding: 1rem;
    }
    #main>span{
      flex: 0;
      margin-bottom: 1rem;
    }
    #main>div{
      flex: 1;
    }
    #osuall_main_wrapper{
      display: flex;
    }
    #osuall_main_wrapper>div{
      flex: 75%;
    }
    #osuall_class_grades{
      display: flex;
      flex-flow: column;
      background: #fff5e0;
      padding: 0.5rem;
      border-radius: 0.5rem;
    }
    #osuall_assignments_wrapper{
      padding: 0.5rem;
      background: #fff5e0;
      border-radius: 0.5rem;
    }
    #osuall_main_wrapper>#osuall_announcement_wrapper{
      flex: 25%;
      padding: 0.5rem;
    }
    #osuall_assignment_filter_list_chosen{
      display: inline-block;
    }
    #osuall_assignment_filter_list_chosen>option{
      display: inline-block;
      background: grey;
      color: white;
      padding: 0.25rem;
      margin: 0.25rem;
      cursor: pointer;
    }
    #osuall_assignment_filter_list_chosen>option::before{
      content: "x ";
    }
    .osuall_announcement_wrapper{
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      border-radius: 0.5rem;
    }
    .osuall_announcement_wrapper:nth-child(2n+1){
      background: #fff5e0;
    }
    .osuall_announcement_wrapper:nth-child(2n){
      background: #ddd;
    }
    .osuall_announcement_title{
      font-size: 1.25rem;
      font-weight: bold;
    }
    .osuall_announcement_class,
    .osuall_announcement_when{
      font-size: 0.75rem;
    }
    .osuall_announcement_class>a{
      color: grey;
    }
    .osuall_class_grade_wrapper:nth-child(2n+1){
      background: white;
    }
    .osuall_class_grade_wrapper:nth-child(2n){
      background: #eee;
    }
    .osuall_class_grade_wrapper{
      flex: 1;
      display: flex;
      border-radius: 0.5rem;
    }
    .osuall_class_grade_wrapper>div{
      flex: 1;
      padding: 0.5rem;
      word-break: break-all;
    }
    .osuall_assignment_wrapper:nth-child(2n+1){
      background: rgba(255,255,255,0.8);
    }
    .osuall_assignment_wrapper:nth-child(2n){
      background: rgba(255,255,255,0.4);
    }
    .osuall_assignment_wrapper{
      display: flex;
      padding: 0.5rem;
      border-radius: 0.5rem;
    }
    .osuall_assignment_wrapper>div{
      flex: 1;
      padding-right: 0.25rem;
      padding-left: 0.25rem;
    }
    .osuall_assignment_title{
      display: flex;
      align-items: center;
    }
    .osuall_assignment_title>img{
      height: 1.5rem;
      width: 1.5rem;
      margin-right: 0.5rem;
    }
    .osuall_status_submit,
    .osuall_status_submit a{
      color: green;
    }
    .osuall_status_done{
      text-decoration: line-through;
    }
    .osuall_status_late{
      background: orange !important;
      color: white;
    }
    .osuall_status_late a{
      color: white;
    }
    .osuall_status_missing{
      background: red !important;
      color: white;
    }
    .osuall_status_missing a{
      color: white;
    }
    .osuall_status_feedback>.osuall_assignment_title::after{
      content: " (Feedback available)"
    }
  </style>
  <span id="osuall_fetching_information">Fetching information... please wait...</span>
  <div id="osuall_main_wrapper">
    <div>
      <div id="osuall_class_wrapper">
        <!-- Classes, Grades, etc. -->
        <h3>Classes</h3>
        <div id="osuall_class_grades">
          <div id="osuall_class_grade_header" class="osuall_class_grade_wrapper">
            <div><span>Class</span></div>
            <div><span>Grade</span></div>
            <div><span>Professor</span></div>
          </div>
        </div>
      </div>
      <h3>Current Assignments</h3>
      <div>
        <span>Filters:</span>
        <select id="osuall_assignment_filter_status">
          <option value="">Select</option>
          <option value="submit">Hide Submitted</option>
          <option value="done">Hide Graded</option>
          <option value="late">Hide Late</option>
          <option value="missing">Hide Missing</option>
          <option value="quiz">Hide Quiz</option>
          <option value="assignment">Hide Assignment</option>
        </select>
        <div id="osuall_assignment_filter_list_chosen">
        </div>
      </div>
      <div id="osuall_assignments_wrapper">
        <div class="osuall_assignment_wrapper">
          <div>
            <span>Assignment Name</span>
          </div>
          <div>
            <span>Class</span>
          </div>
          <div>
            <span>Due Date</span>
          </div>
        </div>
      </div>
    </div>
    <div id="osuall_announcement_wrapper">
      <h3>Announcements</h3>
    </div>
  </div>`;
  iFrameLoader.id = "osu-all-iframe-loader";
  Main.append(iFrameLoader);

  /**
   * Classes - Class information
   * ClassAssignments - Assignments for classes
   * MainFrame - The main iframe
   * ENV - Global variables with useful data
   * current_user_id - The current user id
   */
  console.log("[OSU-ALL] - Getting Classes");
  const Classes = await GetClasses(),
    ClassAssignments = [],
    ClassGrades = {},
    {ENV} = window,
    {current_user_id} = ENV,
    ClassGradeDiv = Main.querySelector("#osuall_class_grades"),
    AssignmentsDiv = Main.querySelector("#osuall_assignments_wrapper"),
    AnnouncementsDiv = Main.querySelector("#osuall_announcement_wrapper"),
    StatusFilter = Main.querySelector("#osuall_assignment_filter_status"),
    StatusFilterList = Main.querySelector("#osuall_assignment_filter_list_chosen");

  // Filters
  StatusFilter.addEventListener("change",()=>{
    if(StatusFilter.value === ""){
      // ignore reset to empty value
      return;
    }
    const elem = StatusFilter.querySelector(`option[value="${StatusFilter.value}"]`),
      temp = document.createElement("template"),
      now = Date.now();
    temp.innerHTML = `<style id="osuall_filter_${now}">
      .osuall_status_${StatusFilter.value}{
        display: none;
      }
    </style>`;
    document.body.append(temp.content.cloneNode(true));
    StatusFilterList.append(elem);
    StatusFilter.value = "";
    function click(){
      // remove style
      StatusFilter.append(elem);
      document.querySelector(`#osuall_filter_${now}`).outerHTML = "";
      StatusFilter.value = "";
      elem.removeEventListener("click",click);
    }
    elem.addEventListener("click",click);
  });

  // Begin writing class information
  for(let i = 0;i<Classes.length;i++){
    const Class = Classes[i],
      template = document.createElement("template");
    template.innerHTML = `<div class="osuall_class_grade_wrapper" osuall-class-id="${Class.id}">
      <div class="osuall_class_grade_name">
        <span>${i + 1}. <a href="/courses/${Class.id}">${Class.name}</a></span>
      </div>
      <div class="osuall_class_grade_score">
        <span>(Loading scores...)</span>
      </div>
      <div class="osuall_class_grade_instructor">
        <span>(Loading instructors...)</span>
      </div>
    </div>`;
    ClassGradeDiv.append(template.content.cloneNode(true));
  }

  console.log("[OSU-ALL] - Getting Class Assignments and grades");
  for(const i in Classes){
    ClassAssignments.push.apply(ClassAssignments,await GetClassAssignments(Classes[i].id,current_user_id));
    // Get grades
    LoadFrame(iFrameLoader,`/courses/${Classes[i].id}/grades`).then((ClassGradeFrame)=>{
      const {document:d,window:w} = ClassGradeFrame;
      let Grades = d.querySelectorAll(".grade"),
        Titles = d.querySelectorAll(".title"),
        PossiblePoints = d.querySelectorAll(".points_possible"),
        DueDates = d.querySelectorAll(".due");
      ClassGrades[Classes[i].id] = {
        Grades,
        Titles,
        PossiblePoints,
        DueDates
      };
      // Write grades
      const GradeDiv = ClassGradeDiv.querySelector(`[osuall-class-id="${Classes[i].id}"] > .osuall_class_grade_score`),
        Grade = Array.from(Grades).reverse()[0].textContent,
        {ENV} = w,
        {grading_scheme} = ENV,
        [Letter] = grading_scheme.find((scheme)=>{
          if(isNaN(+Grade.textContent)){
            return 1 >= scheme[1];
          }
          return +Grade.textContent >= scheme[1];
        });
      GradeDiv.innerHTML = `<span>${Letter} (${Grade})</span>`;
      if(Object.keys(ClassGrades).length === Classes.length){
        // Done loading iframes all data, can remove any pointless memory now!
        iFrameLoader.innerHTML = "";
        for(const i in ClassGrades){
          delete ClassGrades[i];
        }
        Grades = Titles = PossiblePoints = DueDates = null;
      }
    });
    // Get instructors
    GetClassTeacher(Classes[i].id).then(async (Teacher)=>{
      const TeacherDiv = ClassGradeDiv.querySelector(`[osuall-class-id="${Classes[i].id}"] > .osuall_class_grade_instructor`);
      TeacherDiv.innerHTML = `<span>${Teacher.name}</span>`;
    }).catch(()=>{
      // no teacher, or failed to get teacher
      const TeacherDiv = ClassGradeDiv.querySelector(`[osuall-class-id="${Classes[i].id}"] > .osuall_class_grade_instructor`);
      TeacherDiv.innerHTML = "<span>No instructor found.</span>";
    });
  }
  // Write assignments
  ClassAssignments.sort((a,b)=>{
    // sort by "due date"
    // also places non-due-date at end. (+1 week)
    const DueA = new Date(a.plannable.due_at || b.plannable.created_at || Date.now() + 604800e3),
      DueB = new Date(b.plannable.due_at || b.plannable.created_at || Date.now() + 604800e3);
    return DueA.getTime() - DueB.getTime();
  });
  for(let j = 0;j<ClassAssignments.length;j++){
    const Assignment = ClassAssignments[j],
      template = document.createElement("template");
    if(Assignment.plannable_type === "announcement"){
      // Put in announcement thing
      template.innerHTML = `<div class="osuall_announcement_wrapper">
          <div class="osuall_announcement_title">
            <a href="${Assignment.html_url}">${Assignment.plannable.title}</a>
          </div>
          <div class="osuall_announcement_class">
            <a href="/courses/${Assignment.course_id}">${Assignment.context_name}</a>
          </div>
          <div class="osuall_announcement_when">
            <span>${(new Date(Assignment.plannable.created_at)).toString().split(" ").slice(0,5).join(" ").replace(/:\d{2}$/,"").replace(/\s(?=\w{3}\s\d{2})/,", ").replace(/\d{4}/,"at")}</span>
          </div>
        </div>`;
      AnnouncementsDiv.append(template.content.cloneNode(true));
      continue;
    }
    let icon;
    switch (Assignment.plannable_type){
      case "assignment":{
        icon = "https://cdn.discordapp.com/attachments/775828441127714837/796079921109270598/assignment.svg";
        break;
      }
      case "quiz":{
        icon = "https://cdn.discordapp.com/attachments/775828441127714837/796171033434521671/quiz.svg";
        // old icon - "https://cdn.discordapp.com/attachments/775828441127714837/796080854190260274/quiz.svg";
        break;
      }
    }
    const classes = [],
      {submissions} = Assignment;
    if(submissions){
      const {excused,graded,has_feedback,late,missing,submitted} = submissions;
      if(excused || graded){
        classes.push("osuall_status_done");
      }
      if(submitted){
        classes.push("osuall_status_submit");
      }
      if(late){
        classes.push("osuall_status_late");
      }
      if(missing){
        classes.push("osuall_status_missing");
      }
      if(has_feedback){
        classes.push("osuall_status_feedback");
      }
    }
    classes.push("osuall_status_" + Assignment.plannable_type);
    template.innerHTML = `<div class="osuall_assignment_wrapper ${classes.join(" ")}" class-id="${Assignment.course_id}">
      <div class="osuall_assignment_title osuall_assignment_type_${icon}">
        <img src="${icon}" alt="${Assignment.plannable_type}" class="osuall_assignment_icon">
        <a href="${Assignment.html_url}">${Assignment.plannable.title}</a>
      </div>
      <div class="osuall_assignment_class">
        <a href="/courses/${Assignment.course_id}">${Assignment.context_name}</a>
      </div>
      <div class="osuall_assignment_due">
        <span>${Assignment.plannable.due_at ? (new Date(Assignment.plannable.due_at)).toString().split(" ").slice(0,5).join(" ").replace(/:\d{2}$/,"").replace(/\s(?=\w{3}\s\d{2})/,", ").replace(/\d{4}/,"at") : "No due date"}</span>
      </div>
    </div>`;
    AssignmentsDiv.append(template.content.cloneNode(true));
  }
  ClassAssignments.splice(0); // Free up memory
  document.querySelector("#osuall_fetching_information").outerHTML = "";
}
// /api/v1/users/:user_id/communication_channels
/**
 * GetClasses - Gets all the classes of the user
 *
 * @returns {Promise<Array>} A list of class information
 */
function GetClasses(){
  return new Promise((res,rej)=>{
    const x = new XMLHttpRequest();
    x.open("GET","/api/v1/users/self/favorites/courses?include[]=term&exclude[]=enrollments&sort=nickname");
    x.setRequestHeader("X-Requested-With","XMLHttpRequest");
    x.setRequestHeader("accept","application/json, text/javascript, application/json+canvas-string-ids, */*; q=0.01");
    x.send();
    x.onload = ()=>{
      res(JSON.parse(x.responseText));
    };
    x.onerror = ()=>{
      rej();
    };
  });
}

/**
 * GetClassAssignments - Gets the class assignments
 *
 * @param  {String} ClassID The class id
 * @param  {String} UserID The user id
 * @returns {Promise<Array>} The list of assignments
 */
function GetClassAssignments(ClassID,UserID){
  return new Promise((res,rej)=>{
    const x = new XMLHttpRequest(),
      now = new Date(),
      offset = now.getTimezoneOffset() / 60;
    now.addDays(-14);
    now.setHours(8 - offset);
    now.setMinutes(0);
    now.setSeconds(0);
    now.setMilliseconds(0);
    x.open("GET",`/api/v1/planner/items?start_date=${now.toISOString()}&order=asc&context_codes[]=course_${ClassID}&context_codes[]=user_${UserID}`);
    x.setRequestHeader("X-Requested-With","XMLHttpRequest");
    x.setRequestHeader("accept","application/json+canvas-string-ids, application/json+canvas-string-ids, application/json, text/plain, */*");
    x.send();
    x.onerror = ()=>{
      rej();
    };
    x.onload = ()=>{
      res(JSON.parse(x.responseText));
    };
  });
}

/**
 * GetClassTeacher - Gets the teacher of the class
 *
 * @param  {String} ClassID The class id
 * @returns {Object} The teacher
 */
function GetClassTeacher(ClassID){
  const x = new XMLHttpRequest();
  x.open("GET",`/api/v1/search/recipients?search=&per_page=20&permissions[]=send_messages_all&messageable_only=true&synthetic_contexts=true&context=course_${ClassID}_teachers`);
  x.setRequestHeader("X-Requested-With","XMLHttpRequest");
  x.setRequestHeader("Accept","application/json, text/javascript, application/json+canvas-string-ids, */*; q=0.01");
  x.send();
  return new Promise((res,rej)=>{
    x.onload = ()=>{
      res(JSON.parse(x.responseText)[0]);
    };
    x.onerror = ()=>{
      rej();
    };
  });
}

/**
 * LoadFrame - Loads an iframe
 *
 * @param  {HTMLElement} iFrameLoader The element to append iframes to
 * @param  {String} src The iframe url to load
 * @returns {Promise<Object>} returns an object with the "window" and "document" of the iframe
 */
function LoadFrame(iFrameLoader,src){
  return new Promise((Resolve)=>{
    const MainFrame = document.createElement("iframe");
    MainFrame.src = src || "/";
    iFrameLoader.append(MainFrame);
    MainFrame.addEventListener("load",()=>{
      const Document = {document:MainFrame.contentDocument,window:MainFrame.contentWindow};
      Resolve(Document);
    });
  });
}

Load();
