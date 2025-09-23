import API from "../../API"


export default class APIController {
    static getStudents(courseID) {
        const token = window.localStorage.getItem("token");
        return API.GET(`courses/${courseID}/students`, token);
    }

    static getStudentsList() {
        const token = window.localStorage.getItem("token");
        return API.GET(`students`, token);
    }

    static getCoursesStudent(userID) {
        const token = window.localStorage.getItem("token");
        return API.GET(`courses/${userID}/users`, token);
    }

    static getCoursesUser(userID) {
        const token = window.localStorage.getItem("token");
        return API.GET(`courses/${userID}`, token);
    }

    static getProfessors(courseID) {
        const token = window.localStorage.getItem("token");
        return API.GET(`courses/${courseID}/professors`, token);
    }

    static createCourse(userID, courseData) {
        const token = window.localStorage.getItem("token");
        return API.POST(`courses/${userID}`, courseData, token);
    }

    static createProfessor(professorData, courseID) {
        const token = window.localStorage.getItem("token");
        return API.POST(`courses/${courseID}/professors`, professorData, token);
    }

    static createStudentAux(studentData, courseID) {
        const token = window.localStorage.getItem("token");
        return API.POST(`courses/${courseID}/students`, studentData, token);
    }

    static createStudent(studentData) {
        const token = window.localStorage.getItem("token");
        return API.POST(`courses/students/add`, studentData, token);
    }

    static updateStudent(studentID, studentData){
        const token = window.localStorage.getItem("token");
        return API.PUT(`student/${studentID}`, studentData, token);
    }

    static updateStudentCount(courseID, studentID, selectedDate, studentData){
        const token = window.localStorage.getItem("token");
        return API.PUT(`data/student/${courseID}/${studentID}/${selectedDate}`, studentData, token);
    }

    static getSessionCount(courseID) {
        const token = window.localStorage.getItem("token");
        return API.GET(`session/count/${courseID}`, token);
    }

    static updateSessionCount(courseID){
        const token = window.localStorage.getItem("token");
        return API.PUT(`session/count/${courseID}`, token);
    }

    static addStudentCourse(studentData, courseId){
        const token = window.localStorage.getItem("token");
        return API.PUT(`assign-course/${courseId}`, studentData, token);
    }

    static deleteStudent(studentID){
        const token = window.localStorage.getItem("token");
        return API.DELETE(`student/${studentID}`, token);
    }

    static deleteStudentImage(studentEmail){
        const token = window.localStorage.getItem("token");
        return API.DELETE(`image/${studentEmail}`, token);
    }

    static deleteCourse(courseID) {
        const token = window.localStorage.getItem("token");
        return API.DELETE(`courses/${courseID}`, token);
    }

    static getUsers(){
        const token = window.localStorage.getItem("token");
        return API.GET(`users`, token);
    }

    static addUsers(userData){
        const token = window.localStorage.getItem("token");
        return API.POST(`users`, userData, token);
    }

    static updateUsers(userID, userData){
        const token = window.localStorage.getItem("token");
        return API.PUT(`users/${userID}`, userData, token);
    }

    static deleteUsers(userID){
        const token = window.localStorage.getItem("token");
        return API.DELETE(`users/${userID}`, token);
    }

    static loginProfessors(email, password) {
        const userData = { Email: email, Password: password };
        return API.POST("users/login", userData);
    }

    static loginStudents(email) {
        const userData = { Email: email };
        return API.POST("students/login", userData);
    }

    static uploadStudentImage(studentID, imageData) {
        const token = window.localStorage.getItem("token");
        const formData = new FormData();
        formData.append('image', imageData);

        return API.POST(`upload_student_image/${studentID}`, formData, token, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
    }

    static getParticipationAssistance(courseID, date, studentData) {
        const token = window.localStorage.getItem("token");
        return API.POST(`participation/assistance/${courseID}/${date}`, studentData, token);
    }

    static getDateRange(courseID, dates, studentData) {
        const token = window.localStorage.getItem("token");
        return API.POST(`dateranges/${courseID}/${dates}`, studentData, token);
    }

}

