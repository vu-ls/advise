import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = 'csrftoken'


export default class FormAPI{

    constructor(){}

    getForm(c) {
        const url = `${API_URL}/api/manage/form/${c.form}/`;
        return axios.get(url).then(response => response.data);
    }

    getQuestions(c) {
	const url = `${API_URL}/api/manage/form/${c.form}/question/`;
	return axios.get(url).then(response => response.data);
    }

    addQuestion(c, data) {
	const url = `${API_URL}/api/manage/form/${c.form}/question/`;
	return axios.post(url, data).then(response => response.data);
    }

    updateQuestion(c, data) {
	const url = `${API_URL}/api/manage/form/question/${c}/`;
	return axios.patch(url, data).then(response => response.data);
    }

    deleteQuestion(c) {
    	const url = `${API_URL}/api/manage/form/question/${c}/`;
	return axios.delete(url).then(response => response.data);
    }

    getSubmissions() {
        const url = `${API_URL}/api/form/submissions/`;
	return axios.get(url);
    }
    
}
