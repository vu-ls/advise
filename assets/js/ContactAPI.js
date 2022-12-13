import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = 'csrftoken'


export default class ContactAPI{

    constructor(){}

    /* this gets both groups and contacts */
    getGroups() {
	const url = `${API_URL}/api/groups/`;
        return axios.get(url).then(response => response.data);
    }

    getGroupContacts(c) {
	const url = `${API_URL}/api/groups/${c}/contacts/`;
	return axios.get(url);
    }

    updateMyGroup(c, data) {
	const url = `${API_URL}/api/manage/group/${c}/admin/`;
        return axios.patch(url, data, {
	    headers: {
                'Content-Type': 'multipart/form-data'
	    }})
    }

    createAPIKey(group) {
	const url = `${API_URL}/api/manage/group/${group}/api/`;
	return axios.post(url, {});
    }

    removeAPIKey(group, id) {
	const url = `${API_URL}/api/manage/group/${group}/api/${id}/`;
        return axios.delete(url);
    }

    refreshAPIKey(group, id) {
	const url = `${API_URL}/api/manage/group/${group}/api/${id}/`;
        return axios.patch(url);
    }
    
    getAPIKeys(group) {
	const url = `${API_URL}/api/manage/group/${group}/api/`;
        return axios.get(url);
    }

    
    getMyGroup(c) {
	const url = `${API_URL}/api/manage/group/${c}/admin/`;
	return axios.get(url);
    }
    
    addGroupContact(c, data) {
	const url = `${API_URL}/api/groups/${c}/contacts/`;
        return axios.post(url, data)
    }

    removeGroupContact(c) {
	const url = `${API_URL}/api/groups/contacts/${c}/`;
        return axios.delete(url)
    }
    
    updateGroupContact(c, data) {
	const url = `${API_URL}/api/groups/contacts/${c}/`;
	return axios.patch(url, data)
    }

    getMyGroups() {
	const url = `${API_URL}/api/manage/group/admin/`;
        return axios.get(url).then(response => response.data);
    }

    
    getGroup(g) {
        const url = `${API_URL}/api/group/${g}/`;
        return axios.get(url);
    }
    
    searchGroups(urlstr) {
	const url = `${API_URL}/api/groups/?${urlstr}`;
	return axios.get(url).then(response => response.data);
    }
    
    getContacts() {
	const url = `${API_URL}/api/contacts/`;
        return axios.get(url).then(response => response.data);
    }

    
    getGroupForm() {
	const url = `${API_URL}/groups/new/`;
        return axios.get(url).then(response => response.data);
    }

    addGroup(data) {
	const url = `${API_URL}/api/group/`;
        return axios.post(url, data);
    }

    searchThreadContacts(thread, search) {
	console.log("IN THREAD CONTACTS", thread);
	const url = `${API_URL}/groups/search/`;
	let formField = new FormData();
	formField.append('search', search);
	formField.append('thread', thread);
	return axios.post(url, formField).then(response => response.data);
    }

    searchCaseContacts(c, search) {
	console.log("IN SEARCH CONTACTS", c);
        const url = `${API_URL}/groups/search/`;
        let formField = new FormData();
        formField.append('search', search);
        formField.append('case', c);
        return axios.post(url, formField).then(response => response.data);
    }

    searchAllContacts(search) {
        const url = `${API_URL}/groups/search/`;
        let formField = new FormData();
        formField.append('search', search);
        return axios.post(url, formField).then(response => response.data);
    }

}
