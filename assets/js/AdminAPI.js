import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = 'csrftoken'


export default class AdminAPI{

    constructor(){}

    getPendingUsers() {
	const url = `${API_URL}/api/manage/users/pending/`;
        return axios.get(url).then(response => response.data);
    }

    approvePendingUser(user) {
	let  data = {'pending': false};
	const url = `${API_URL}/api/manage/users/pending/${user.id}/`;
        return axios.patch(url, data).then(response => response.data);
    }

    getNewUsers() {
	const url = `${API_URL}/api/manage/users/new/`;
        return axios.get(url).then(response => response.data);
    }
    
    getAssignments() {
        const url = `${API_URL}/api/manage/autoassignment/`;
        return axios.get(url).then(response => response.data);
    }

    addAssignment(role, data) {
	console.log(role);
	const url = `${API_URL}/api/manage/autoassignment/${role}/`;
	return axios.patch(url, data).then(response => response.data);
    }

    removeAssignment(role, data) {
	const url = `${API_URL}/api/manage/autoassignment/${role}/`;
	return axios.patch(url, data).then(response => response.data);
    }

    addRole(data) {
	const url = `${API_URL}/api/manage/autoassignment/`;
	return axios.post(url, data).then(response => response.data);
    }

    removeRole(c) {
    	const url = `${API_URL}/api/manage/autoassignment/${c}/`;
	return axios.delete(url).then(response => response.data);
    }

    deleteCVEAccount(c) {
	const url = `${API_URL}/api/manage/cve/account/${c}/`;
        return axios.delete(url).then(response => response.data);
    }
    
    getCVEAccounts() {
	const url = `${API_URL}/api/manage/cve/account/`;
	return axios.get(url).then(response => response.data);
    }

    getActiveCVEAccounts() {
	const url = `${API_URL}/api/manage/cve/account/?active=true`;
	return axios.get(url)
    }
   

    getCVEAccount(c) {
	const url = `${API_URL}/api/manage/cve/account/${c}/`;
	return axios.get(url).then(response => response.data);
    }

    updateCVEAccount(c, data) {
	const url = `${API_URL}/api/manage/cve/account/${c}/`;
        return axios.patch(url, data).then(response => response.data).catch(function(error) {
	    console.log(error.response.data);
	});
    }

    getCaseEmailTemplates() {
	const url = `${API_URL}/api/manage/email/templates/?template_type=0`;
	return axios.get(url).then(response => response.data);
    }
    
}
